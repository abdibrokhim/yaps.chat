use std::{
    pin::pin,
    time::{Duration, Instant},
};
use actix_ws::{AggregatedMessage, MessageStream, Session};
use futures_util::{
    future::{select, Either},
    StreamExt as _,
};
use tokio::{sync::mpsc, time::interval};
use serde_json::Value;
use crate::server::{ChatServerHandle, ConnId, EncryptedMessage, UserProfile, ClientEvent};

/// How often heartbeat pings are sent
const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(5);

/// How long before lack of client response causes a timeout
const CLIENT_TIMEOUT: Duration = Duration::from_secs(3600);

#[derive(serde::Deserialize)]
struct SendMessageData {
    message: EncryptedMessage,
    is_group_chat: bool,
    group_code: Option<String>,
    reply_to_id: Option<i32>,
}

// New struct for file sending data
#[derive(serde::Deserialize)]
struct FileStatusData {
    file_id: String,
    is_group_chat: bool,
    group_code: Option<String>,
}

// New struct for delete message data
#[derive(serde::Deserialize)]
struct DeleteMessageData {
    message_id: String,
    is_group_chat: bool,
    group_code: Option<String>,
}

#[derive(serde::Deserialize)]
struct TypingData {
    is_group_chat: bool,
    group_code: Option<String>,
}

/// Handle WebSocket connections, process messages, and maintain connection health
pub async fn chat_ws(
    chat_server: ChatServerHandle,
    mut session: Session,
    msg_stream: MessageStream,
) {
    let max_payload_size = 5 * 1024 * 1024; // 5 MB
    // Increase permitted frame size from default (64KiB) to 5MB.
    let mut msg_stream = msg_stream
        .max_frame_size(max_payload_size)
        .aggregate_continuations()
        .max_continuation_size(max_payload_size);

    log::info!("WebSocket connection established");
    
    let mut last_heartbeat = Instant::now();
    let mut interval = interval(HEARTBEAT_INTERVAL);
    
    // Create a channel for this connection
    let (conn_tx, mut conn_rx) = mpsc::unbounded_channel();
    
    // Register with the chat server and get a connection ID
    let conn_id = chat_server.connect(conn_tx).await;
    log::info!("Client connected with ID: {}", conn_id);
    
    let close_reason = loop {
        // Set up the futures we'll select between
        let tick = pin!(interval.tick());
        let msg_rx = pin!(conn_rx.recv());
        let ws_msg = pin!(msg_stream.next());
        
        let messages = pin!(select(ws_msg, msg_rx));
        
        match select(messages, tick).await {
            // Handle messages from client
            Either::Left((Either::Left((Some(Ok(agg_msg)), _)), _)) => {
                last_heartbeat = Instant::now();
                match agg_msg {
                    AggregatedMessage::Text(text) => {
                                        // Process text message normally
                                        process_text_msg(&chat_server, &text, conn_id.clone()).await;
                                    }
                    AggregatedMessage::Binary(data) => {
                                        // Log or handle binary messages as needed
                                        log::warn!("Unexpected binary message received: {} bytes", data.len());
                                    }
                    AggregatedMessage::Ping(bytes) => {
                                        // Respond to ping with pong
                                        if let Err(e) = session.pong(&bytes).await {
                                            log::error!("Failed to send pong: {}", e);
                                            break None;
                                        }
                    }
                    AggregatedMessage::Pong(bytes) => {
                                        // Log or handle pong messages as needed
                                        log::warn!("Unexpected pong message received: {} bytes", bytes.len());
                    }
                    AggregatedMessage::Close(close_reason) => {
                                        // Log or handle close messages as needed
                                        log::warn!("Unexpected close message received: {:?}", close_reason);
                                        break Some(close_reason);
                    }
                }
            }
            // Client WebSocket stream error
            Either::Left((Either::Left((Some(Err(err)), _)), _)) => {
                log::error!("WebSocket error: {}", err);
                break None;
            }
            // Client WebSocket stream ended
            Either::Left((Either::Left((None, _)), _)) => {
                log::info!("WebSocket connection closed by client");
                break None;
            }
            // Messages from chat server to be sent to client
            Either::Left((Either::Right((Some(chat_msg), _)), _)) => {
                if let Err(e) = session.text(chat_msg).await {
                    log::error!("Failed to send message to client: {}", e);
                    break None;
                }
            }
            // All connection message senders were dropped
            Either::Left((Either::Right((None, _)), _)) => {
                log::error!("All connection message senders were dropped; chat server may have panicked");
                break None;
            }
            // Heartbeat tick
            Either::Right((_, _)) => {
                // Check if client is still responsive
                if Instant::now().duration_since(last_heartbeat) > CLIENT_TIMEOUT {
                    log::info!("Client has not sent heartbeat in over {:?}; disconnecting", CLIENT_TIMEOUT);
                    break None;
                }
                // Send heartbeat ping; if this fails, break the loop
                if let Err(e) = session.ping(b"").await {
                    log::error!("Failed to send ping: {}", e);
                    break None;
                }
            }
        }
    };
    
    // Clean up when the connection ends
    chat_server.disconnect(conn_id);
    log::info!("WebSocket connection closed");
    
    // Attempt to close connection gracefully
    let _ = session.close(Option::expect(close_reason, "No close reason provided")).await;
}

async fn process_text_msg(
    chat_server: &ChatServerHandle,
    text: &str,
    conn_id: ConnId,
) {
    // Try to parse the message as a ClientEvent
    if let Ok(client_event) = serde_json::from_str::<ClientEvent>(text) {
        match client_event.event.as_str() {
            "join_chat" => {
                if let Ok(profile) = serde_json::from_value::<UserProfile>(client_event.data) {
                    log::info!("User joining chat: {}", profile.username);
                    chat_server.join_chat(conn_id, profile).await;
                } else {
                    log::error!("Failed to parse join_chat data");
                }
            }
            
            // Handle WebRTC signaling events
            "webrtc_offer" => {
                log::info!("Received WebRTC offer from client {}", conn_id);
                let client_data = client_event.data.clone();
                
                // Log the full client_event for debugging
                log::debug!("WebRTC offer client_event: {}", 
                           serde_json::to_string_pretty(&client_event).unwrap_or_else(|_| "Invalid JSON".to_string()));
                
                if let Ok(data) = serde_json::from_value::<serde_json::Value>(client_data) {
                    // Extract relevant fields
                    let target_id = data.get("target_id").and_then(|v| v.as_str()).unwrap_or("");
                    let is_group_chat = data.get("is_group_chat").and_then(|v| v.as_bool()).unwrap_or(false);
                    let group_code = data.get("group_code").and_then(|v| v.as_str()).map(String::from);
                    
                    log::info!("WebRTC offer details: target_id={}, is_group_chat={}, has_group_code={}", 
                        target_id, is_group_chat, group_code.is_some());
                    
                    // Verify the parsed data structure is what we expect
                    log::debug!("Extracted WebRTC offer data fields: target_id={}, is_group_chat={}, group_code={:?}, has_offer={}", 
                               target_id, is_group_chat, group_code, data.get("offer").is_some());
                    
                    // Forward the offer to the target client
                    if !target_id.is_empty() {
                        // For private chat
                        if !is_group_chat {
                            log::info!("Relaying WebRTC offer from {} to {} (private chat)", conn_id, target_id);
                            chat_server.relay_webrtc_event(
                                conn_id.clone(), 
                                "webrtc_offer".to_string(), 
                                target_id.to_string(), 
                                client_event.data.clone(), 
                                false, 
                                None
                            ).await;
                        } else if let Some(code) = group_code {
                            log::info!("Relaying WebRTC offer from {} to {} (group chat: {})", conn_id, target_id, code);
                            chat_server.relay_webrtc_event(
                                conn_id.clone(), 
                                "webrtc_offer".to_string(), 
                                target_id.to_string(), 
                                client_event.data.clone(), 
                                true, 
                                Some(code)
                            ).await;
                        }
                    } else {
                        log::error!("WebRTC offer missing target_id");
                    }
                } else {
                    log::error!("Failed to parse webrtc_offer data: {}", 
                        serde_json::to_string(&client_event.data).unwrap_or_default());
                }
            }
            
            "webrtc_answer" => {
                log::info!("Received WebRTC answer from client");
                let client_data = client_event.data.clone();
                if let Ok(data) = serde_json::from_value::<serde_json::Value>(client_data) {
                    // Extract relevant fields
                    let target_id = data.get("target_id").and_then(|v| v.as_str()).unwrap_or("");
                    let is_group_chat = data.get("is_group_chat").and_then(|v| v.as_bool()).unwrap_or(false);
                    let group_code = data.get("group_code").and_then(|v| v.as_str()).map(String::from);
                    
                    // Forward the answer to the target client
                    if !target_id.is_empty() {
                        // For private chat
                        if !is_group_chat {
                            chat_server.relay_webrtc_event(
                                conn_id.clone(), 
                                "webrtc_answer".to_string(), 
                                target_id.to_string(), 
                                client_event.data.clone(), 
                                false, 
                                None
                            ).await;
                        } else if let Some(code) = group_code {
                            // For group chat
                            chat_server.relay_webrtc_event(
                                conn_id.clone(), 
                                "webrtc_answer".to_string(), 
                                target_id.to_string(), 
                                client_event.data.clone(), 
                                true, 
                                Some(code)
                            ).await;
                        }
                    }
                } else {
                    log::error!("Failed to parse webrtc_answer data");
                }
            }
            
            "webrtc_ice_candidate" => {
                log::info!("Received WebRTC ICE candidate from client");
                let client_data = client_event.data.clone();
                if let Ok(data) = serde_json::from_value::<serde_json::Value>(client_data) {
                    // Extract relevant fields
                    let target_id = data.get("target_id").and_then(|v| v.as_str()).unwrap_or("");
                    let is_group_chat = data.get("is_group_chat").and_then(|v| v.as_bool()).unwrap_or(false);
                    let group_code = data.get("group_code").and_then(|v| v.as_str()).map(String::from);
                    
                    // Forward the ICE candidate to the target client
                    if !target_id.is_empty() {
                        // For private chat
                        if !is_group_chat {
                            chat_server.relay_webrtc_event(
                                conn_id.clone(), 
                                "webrtc_ice_candidate".to_string(), 
                                target_id.to_string(), 
                                client_event.data.clone(), 
                                false, 
                                None
                            ).await;
                        } else if let Some(code) = group_code {
                            // For group chat
                            chat_server.relay_webrtc_event(
                                conn_id.clone(), 
                                "webrtc_ice_candidate".to_string(), 
                                target_id.to_string(), 
                                client_event.data.clone(), 
                                true, 
                                Some(code)
                            ).await;
                        }
                    }
                } else {
                    log::error!("Failed to parse webrtc_ice_candidate data");
                }
            }
            
            "webrtc_end_call" => {
                log::info!("Received WebRTC end call from client");
                let client_data = client_event.data.clone();
                if let Ok(data) = serde_json::from_value::<serde_json::Value>(client_data) {
                    // Extract relevant fields
                    let target_id = data.get("target_id").and_then(|v| v.as_str()).unwrap_or("");
                    let is_group_chat = data.get("is_group_chat").and_then(|v| v.as_bool()).unwrap_or(false);
                    let group_code = data.get("group_code").and_then(|v| v.as_str()).map(String::from);
                    
                    // Forward the end call to the target client
                    if !target_id.is_empty() {
                        // For private chat
                        if !is_group_chat {
                            chat_server.relay_webrtc_event(
                                conn_id.clone(), 
                                "webrtc_end_call".to_string(), 
                                target_id.to_string(), 
                                client_event.data.clone(), 
                                false, 
                                None
                            ).await;
                        } else if let Some(code) = group_code {
                            // For group chat
                            chat_server.relay_webrtc_event(
                                conn_id.clone(), 
                                "webrtc_end_call".to_string(), 
                                target_id.to_string(), 
                                client_event.data.clone(), 
                                true, 
                                Some(code)
                            ).await;
                        }
                    }
                } else {
                    log::error!("Failed to parse webrtc_end_call data");
                }
            }
            
            "send_message" => {
                if let Ok(data) = serde_json::from_value::<SendMessageData>(client_event.data) {
                    // The message received here is assumed to be already encrypted by the frontend,
                    // including type information within the encrypted payload if needed.
                    let mut message = data.message;
                    // Ensure reply_to is set if provided in the event data
                    if message.reply_to.is_none() {
                        message.reply_to = data.reply_to_id;
                    }
                    
                    chat_server.send_message(
                        conn_id,
                        message, // Pass the EncryptedMessage directly
                        data.is_group_chat,
                        data.group_code,
                    ).await;
                } else {
                    log::error!("Failed to parse send_message data");
                }
            }
            "typing_start" => {
                if let Ok(data) = serde_json::from_value::<TypingData>(client_event.data) {
                    chat_server.typing_start(
                        conn_id,
                        data.is_group_chat,
                        data.group_code,
                    ).await;
                } else {
                    log::error!("Failed to parse typing_start data");
                }
            }
            "typing_stop" => {
                if let Ok(data) = serde_json::from_value::<TypingData>(client_event.data) {
                    chat_server.typing_stop(
                        conn_id,
                        data.is_group_chat,
                        data.group_code,
                    ).await;
                } else {
                    log::error!("Failed to parse typing_stop data");
                }
            }
            // Handle file sending start
            "file_sending_start" => {
                if let Ok(data) = serde_json::from_value::<FileStatusData>(client_event.data) {
                     chat_server.file_sending_start(
                        conn_id,
                        data.file_id,
                        data.is_group_chat,
                        data.group_code,
                    ).await;
                } else {
                    log::error!("Failed to parse file_sending_start data");
                }
            }
            // Handle file sending end
            "file_sending_end" => {
                 if let Ok(data) = serde_json::from_value::<FileStatusData>(client_event.data) {
                     chat_server.file_sending_end(
                        conn_id,
                        data.file_id,
                        data.is_group_chat,
                        data.group_code,
                    ).await;
                } else {
                    log::error!("Failed to parse file_sending_end data");
                }
            }
            // Handle delete message
            "delete_message" => {
                if let Ok(data) = serde_json::from_value::<DeleteMessageData>(client_event.data) {
                    chat_server.delete_message(
                        conn_id,
                        data.message_id,
                        data.is_group_chat,
                        data.group_code,
                    ).await;
                } else {
                    log::error!("Failed to parse delete_message data");
                }
            }
            "disconnect_chat" => {
                chat_server.disconnect_chat(conn_id).await;
            }
            _ => {
                log::warn!("Unknown event type: {}", client_event.event);
            }
        }
    } else {
        log::error!("Failed to parse message as ClientEvent: {}", text);
    }
} 