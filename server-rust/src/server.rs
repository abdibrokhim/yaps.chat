use std::collections::HashMap;
use tokio::sync::{mpsc, oneshot};
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use rand::{thread_rng, Rng};
use rand::distributions::Alphanumeric;

// Type aliases for clarity
pub type ConnId = String;
pub type RoomId = String;
pub type Msg = String;

// Message types
#[derive(Serialize, Deserialize, Clone)]
pub struct EncryptedMessage {
    pub encrypted: String,
    pub nonce: String,
    pub reply_to: Option<i32>,
}

#[derive(Deserialize)]
pub struct UserProfile {
    pub user_id: String,
    pub username: String,
    pub preference: String,
    pub gender: String,
    pub room_type: String,
    pub group_code: Option<String>,
    pub group_join_method: Option<String>,
}

// Data structures
#[allow(dead_code)]
struct User {
    id: ConnId, // socket id
    user_id: String,
    username: String,
    gender: String,
    preference: String,
    room_type: String,
    partner_id: Option<ConnId>,
    group_id: Option<RoomId>,
}

struct Group {
    code: RoomId,
    members: Vec<ConnId>, // socket ids
    usernames: Vec<String>,
}

// Server messages
#[derive(Serialize)]
pub struct ServerEvent {
    pub event: String,
    pub data: Value,
}

// ClientEvent structure for sending events to clients
#[derive(Serialize, Deserialize)]
pub struct ClientEvent {
    pub event: String,
    pub data: Value,
}

// Commands that can be sent to the chat server
enum Command {
    Connect {
        conn_tx: mpsc::UnboundedSender<Msg>,
        res_tx: oneshot::Sender<ConnId>,
    },
    Disconnect {
        conn: ConnId,
    },
    JoinChat {
        conn: ConnId,
        profile: UserProfile,
        res_tx: oneshot::Sender<()>,
    },
    SendMessage {
        conn: ConnId,
        message: EncryptedMessage,
        is_group_chat: bool,
        group_code: Option<String>,
        res_tx: oneshot::Sender<()>,
    },
    TypingStart {
        conn: ConnId,
        is_group_chat: bool,
        group_code: Option<String>,
        res_tx: oneshot::Sender<()>,
    },
    TypingStop {
        conn: ConnId,
        is_group_chat: bool,
        group_code: Option<String>,
        res_tx: oneshot::Sender<()>,
    },
    FileSendingStart {
        conn: ConnId,
        file_id: String,
        is_group_chat: bool,
        group_code: Option<String>,
        res_tx: oneshot::Sender<()>,
    },
    FileSendingEnd {
        conn: ConnId,
        file_id: String,
        is_group_chat: bool,
        group_code: Option<String>,
        res_tx: oneshot::Sender<()>,
    },
    DeleteMessage {
        conn: ConnId,
        message_id: String,
        is_group_chat: bool,
        group_code: Option<String>,
        res_tx: oneshot::Sender<()>,
    },
    DisconnectChat {
        conn: ConnId,
        res_tx: oneshot::Sender<()>,
    },
    GetSessionTx {
        conn_id: ConnId,
        res_tx: oneshot::Sender<Option<mpsc::UnboundedSender<Msg>>>,
    },
    RelayWebRTCEvent {
        sender_id: ConnId,
        event_type: String,
        target_id: String,
        data: Value,
        is_group_chat: bool,
        group_code: Option<String>,
        res_tx: oneshot::Sender<()>,
    },
}

// Chat server implementation
pub struct ChatServer {
    sessions: HashMap<ConnId, mpsc::UnboundedSender<Msg>>,
    users: HashMap<ConnId, User>,
    waiting_users: HashMap<String, Vec<ConnId>>, // preference -> Vec<socket_id>
    groups: HashMap<RoomId, Group>,
}

impl ChatServer {
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
            users: HashMap::new(),
            waiting_users: HashMap::new(),
            groups: HashMap::new(),
        }
    }

    pub fn start() -> ChatServerHandle {
        let (cmd_tx, cmd_rx) = mpsc::unbounded_channel();
        let server = Self::new();

        // Spawn a task to run the server
        tokio::spawn(async move {
            server.run(cmd_rx).await.unwrap();
        });

        ChatServerHandle { cmd_tx }
    }
    
    fn generate_group_code(&self) -> String {
        thread_rng()
            .sample_iter(&Alphanumeric)
            .take(6)
            .map(char::from)
            .collect()
    }
    
    async fn handle_disconnect(&mut self, conn: &ConnId) {
        if let Some(user) = self.users.remove(conn) {
            if user.room_type == "group" {
                if let Some(group_id) = user.group_id {
                    if let Some(group) = self.groups.get_mut(&group_id) {
                        group.members.retain(|id| id != conn);
                        group.usernames.retain(|name| name != &user.username);
                        if group.members.is_empty() {
                            self.groups.remove(&group_id);
                        } else {
                            for member_id in &group.members {
                                if let Some(tx) = self.sessions.get(member_id) {
                                    let event = ServerEvent {
                                        event: "user_left_group".to_string(),
                                        data: serde_json::json!(user.username),
                                    };
                                    let _ = tx.send(serde_json::to_string(&event).unwrap());

                                    let event = ServerEvent {
                                        event: "group_members_update".to_string(),
                                        data: serde_json::json!(group.usernames.clone()),
                                    };
                                    let _ = tx.send(serde_json::to_string(&event).unwrap());
                                }
                            }
                        }
                    }
                }
            } else {
                if let Some(partner_id) = user.partner_id {
                    if let Some(tx) = self.sessions.get(&partner_id) {
                        let event = ServerEvent {
                            event: "partner_disconnected".to_string(),
                            data: serde_json::json!({}),
                        };
                        let _ = tx.send(serde_json::to_string(&event).unwrap());
                    }
                    if let Some(partner) = self.users.get_mut(&partner_id) {
                        partner.partner_id = None;
                    }
                }
            }
        }
        for list in self.waiting_users.values_mut() {
            list.retain(|id| id != conn);
        }
    }

    async fn find_match(&mut self, conn: &ConnId) {
        if let Some(user) = self.users.get(conn) {
            let preference = &user.preference;
            let match_pool: Vec<ConnId> = self.waiting_users.get(preference).cloned().unwrap_or_default()
                .into_iter()
                .filter(|id| {
                    if let Some(potential_match) = self.users.get(id) {
                        match preference.as_str() {
                            "male" => potential_match.gender == "male",
                            "female" => potential_match.gender == "female",
                            _ => false,
                        }
                    } else {
                        false
                    }
                })
                .collect();
            
            if !match_pool.is_empty() {
                let random_index = rand::random::<usize>() % match_pool.len();
                let partner_id = match_pool[random_index].clone();
                self.connect_users(conn, &partner_id).await;
            } else {
                self.waiting_users.entry(preference.clone()).or_insert_with(Vec::new).push(conn.to_string());
                if let Some(tx) = self.sessions.get(conn) {
                    let event = ServerEvent {
                        event: "waiting_for_match".to_string(),
                        data: serde_json::json!({}),
                    };
                    let _ = tx.send(serde_json::to_string(&event).unwrap());
                }
            }
        }
    }

    async fn connect_users(&mut self, user1_id: &ConnId, user2_id: &ConnId) {
        if let Some(user1) = self.users.get_mut(user1_id) {
            user1.partner_id = Some(user2_id.to_string());
        }
        if let Some(user2) = self.users.get_mut(user2_id) {
            user2.partner_id = Some(user1_id.to_string());
        }
        for list in self.waiting_users.values_mut() {
            list.retain(|id| id != user1_id && id != user2_id);
        }
        if let Some(tx1) = self.sessions.get(user1_id) {
            let event = ServerEvent {
                event: "chat_started".to_string(),
                data: serde_json::json!({}),
            };
            let _ = tx1.send(serde_json::to_string(&event).unwrap());
        }
        if let Some(tx2) = self.sessions.get(user2_id) {
            let event = ServerEvent {
                event: "chat_started".to_string(),
                data: serde_json::json!({}),
            };
            let _ = tx2.send(serde_json::to_string(&event).unwrap());
        }
    }

    async fn create_new_group(&mut self, conn: &ConnId) {
        let group_code = self.generate_group_code();
        if let Some(user) = self.users.get_mut(conn) {
            let group = Group {
                code: group_code.clone(),
                members: vec![conn.to_string()],
                usernames: vec![user.username.clone()],
            };
            self.groups.insert(group_code.clone(), group);
            user.group_id = Some(group_code.clone());
            if let Some(tx) = self.sessions.get(conn) {
                let event = ServerEvent {
                    event: "chat_started".to_string(),
                    data: serde_json::json!({ "groupCode": group_code.clone() }),
                };
                let _ = tx.send(serde_json::to_string(&event).unwrap());

                let event = ServerEvent {
                    event: "group_members_update".to_string(),
                    data: serde_json::json!(vec![user.username.clone()]),
                };
                let _ = tx.send(serde_json::to_string(&event).unwrap());
            }
        }
    }

    async fn join_group_by_code(&mut self, conn: &ConnId, group_code: &str) {
        if let Some(group) = self.groups.get_mut(group_code) {
            if let Some(user) = self.users.get_mut(conn) {
                group.members.push(conn.to_string());
                group.usernames.push(user.username.clone());
                user.group_id = Some(group_code.to_string());
                for member_id in &group.members {
                    if let Some(tx) = self.sessions.get(member_id) {
                        let event = ServerEvent {
                            event: "group_members_update".to_string(),
                            data: serde_json::json!(group.usernames.clone()),
                        };
                        let _ = tx.send(serde_json::to_string(&event).unwrap());
                        if member_id != conn {
                            let event = ServerEvent {
                                event: "user_joined_group".to_string(),
                                data: serde_json::json!(user.username.clone()),
                            };
                            let _ = tx.send(serde_json::to_string(&event).unwrap());
                        }
                    }
                }
                if let Some(tx) = self.sessions.get(conn) {
                    let event = ServerEvent {
                        event: "chat_started".to_string(),
                        data: serde_json::json!({ "groupCode": group_code.to_string() }),
                    };
                    let _ = tx.send(serde_json::to_string(&event).unwrap());
                }
            }
        } else {
            if let Some(tx) = self.sessions.get(conn) {
                let event = ServerEvent {
                    event: "group_not_found".to_string(),
                    data: serde_json::json!({}),
                };
                let _ = tx.send(serde_json::to_string(&event).unwrap());
            }
        }
    }

    async fn join_random_group(&mut self, conn: &ConnId) {
        let group_code_option = {
            let available_groups: Vec<&Group> = self.groups.values().filter(|g| !g.members.is_empty()).collect();
            if available_groups.is_empty() {
                None
            } else {
                let random_index = rand::random::<usize>() % available_groups.len();
                Some(available_groups[random_index].code.clone())
            }
        };
        
        match group_code_option {
            Some(code) => self.join_group_by_code(conn, &code).await,
            None => self.create_new_group(conn).await,
        }
    }

    async fn run(mut self, mut cmd_rx: mpsc::UnboundedReceiver<Command>) -> Result<(), Box<dyn std::error::Error>> {
        while let Some(cmd) = cmd_rx.recv().await {
            match cmd {
                Command::Connect { conn_tx, res_tx } => {
                    let conn_id = Uuid::new_v4().to_string();
                    self.sessions.insert(conn_id.clone(), conn_tx);
                    let _ = res_tx.send(conn_id);
                }
                Command::Disconnect { conn } => {
                    self.handle_disconnect(&conn).await;
                }
                Command::JoinChat { conn, profile, res_tx } => {
                    let user = User {
                        id: conn.clone(),
                        user_id: profile.user_id.clone(),
                        username: if profile.username.is_empty() { format!("User-{}", profile.user_id[..5].to_string()) } else { profile.username.clone() },
                        gender: profile.gender.clone(),
                        preference: profile.preference.clone(),
                        room_type: profile.room_type.clone(),
                        partner_id: None,
                        group_id: None,
                    };
                    self.users.insert(conn.clone(), user);
                    if profile.room_type == "group" {
                        let join_method = profile.group_join_method.unwrap_or("random".to_string());
                        if join_method == "create" {
                            self.create_new_group(&conn).await;
                        } else if join_method == "join" && profile.group_code.is_some() {
                            self.join_group_by_code(&conn, &profile.group_code.unwrap()).await;
                        } else {
                            self.join_random_group(&conn).await;
                        }
                    } else {
                        self.find_match(&conn).await;
                    }
                    let _ = res_tx.send(());
                }
                Command::SendMessage { conn, message, is_group_chat, group_code, res_tx } => {
                    if let Some(user) = self.users.get(&conn) {
                        if is_group_chat {
                            let group_id = group_code.or(user.group_id.clone());
                            if let Some(group_id) = group_id {
                                if let Some(group) = self.groups.get(&group_id) {
                                    for member_id in &group.members {
                                        if member_id != &conn {
                                            if let Some(tx) = self.sessions.get(member_id) {
                                                let event = ServerEvent {
                                                    event: "receive_message".to_string(),
                                                    data: serde_json::json!({
                                                        "message": message.clone(),
                                                        "sender": user.username.clone(),
                                                        "reply_to": message.reply_to
                                                    }),
                                                };
                                                let _ = tx.send(serde_json::to_string(&event).unwrap());
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            if let Some(partner_id) = &user.partner_id {
                                if let Some(tx) = self.sessions.get(partner_id) {
                                    let event = ServerEvent {
                                        event: "receive_message".to_string(),
                                        data: serde_json::json!({
                                            "message": message.clone(),
                                            "sender": user.username.clone(),
                                            "reply_to": message.reply_to
                                        }),
                                    };
                                    let _ = tx.send(serde_json::to_string(&event).unwrap());
                                }
                            }
                        }
                    }
                    let _ = res_tx.send(());
                }
                Command::TypingStart { conn, is_group_chat, group_code, res_tx } => {
                    if let Some(user) = self.users.get(&conn) {
                        if is_group_chat {
                            let group_id = group_code.or(user.group_id.clone());
                            if let Some(group_id) = group_id {
                                if let Some(group) = self.groups.get(&group_id) {
                                    for member_id in &group.members {
                                        if member_id != &conn {
                                            if let Some(tx) = self.sessions.get(member_id) {
                                                let event = ServerEvent {
                                                    event: "typing_started".to_string(),
                                                    data: serde_json::json!({ "username": user.username.clone() }),
                                                };
                                                let _ = tx.send(serde_json::to_string(&event).unwrap());
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            if let Some(partner_id) = &user.partner_id {
                                if let Some(tx) = self.sessions.get(partner_id) {
                                    let event = ServerEvent {
                                        event: "typing_started".to_string(),
                                        data: serde_json::json!({}),
                                    };
                                    let _ = tx.send(serde_json::to_string(&event).unwrap());
                                }
                            }
                        }
                    }
                    let _ = res_tx.send(());
                }
                Command::TypingStop { conn, is_group_chat, group_code, res_tx } => {
                    if let Some(user) = self.users.get(&conn) {
                        if is_group_chat {
                            let group_id = group_code.or(user.group_id.clone());
                            if let Some(group_id) = group_id {
                                if let Some(group) = self.groups.get(&group_id) {
                                    for member_id in &group.members {
                                        if member_id != &conn {
                                            if let Some(tx) = self.sessions.get(member_id) {
                                                let event = ServerEvent {
                                                    event: "typing_stopped".to_string(),
                                                    data: serde_json::json!({ "username": user.username.clone() }),
                                                };
                                                let _ = tx.send(serde_json::to_string(&event).unwrap());
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            if let Some(partner_id) = &user.partner_id {
                                if let Some(tx) = self.sessions.get(partner_id) {
                                    let event = ServerEvent {
                                        event: "typing_stopped".to_string(),
                                        data: serde_json::json!({}),
                                    };
                                    let _ = tx.send(serde_json::to_string(&event).unwrap());
                                }
                            }
                        }
                    }
                    let _ = res_tx.send(());
                }
                Command::FileSendingStart { conn, file_id, is_group_chat, group_code, res_tx } => {
                    if let Some(user) = self.users.get(&conn) {
                        let event_name = "file_sending_started".to_string();
                        let event_data = serde_json::json!({
                            "fileId": file_id,
                            "username": user.username.clone()
                        });

                        if is_group_chat {
                            let group_id = group_code.or(user.group_id.clone());
                            if let Some(group_id) = group_id {
                                if let Some(group) = self.groups.get(&group_id) {
                                    for member_id in &group.members {
                                        if member_id != &conn {
                                            if let Some(tx) = self.sessions.get(member_id) {
                                                let event = ServerEvent { event: event_name.clone(), data: event_data.clone() };
                                                let _ = tx.send(serde_json::to_string(&event).unwrap());
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            if let Some(partner_id) = &user.partner_id {
                                if let Some(tx) = self.sessions.get(partner_id) {
                                    let event = ServerEvent { event: event_name, data: event_data };
                                    let _ = tx.send(serde_json::to_string(&event).unwrap());
                                }
                            }
                        }
                    }
                    let _ = res_tx.send(());
                }
                Command::FileSendingEnd { conn, file_id, is_group_chat, group_code, res_tx } => {
                    if let Some(user) = self.users.get(&conn) {
                        let event_name = "file_sending_ended".to_string();
                        let event_data = serde_json::json!({
                            "fileId": file_id,
                            "username": user.username.clone()
                        });

                        if is_group_chat {
                            let group_id = group_code.or(user.group_id.clone());
                            if let Some(group_id) = group_id {
                                if let Some(group) = self.groups.get(&group_id) {
                                    for member_id in &group.members {
                                        if member_id != &conn {
                                            if let Some(tx) = self.sessions.get(member_id) {
                                                let event = ServerEvent { event: event_name.clone(), data: event_data.clone() };
                                                let _ = tx.send(serde_json::to_string(&event).unwrap());
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            if let Some(partner_id) = &user.partner_id {
                                if let Some(tx) = self.sessions.get(partner_id) {
                                    let event = ServerEvent { event: event_name, data: event_data };
                                    let _ = tx.send(serde_json::to_string(&event).unwrap());
                                }
                            }
                        }
                    }
                    let _ = res_tx.send(());
                }
                Command::DeleteMessage { conn, message_id, is_group_chat, group_code, res_tx } => {
                    if let Some(user) = self.users.get(&conn) {
                        let event_name = "message_deleted".to_string();
                        let event_data = serde_json::json!({ "messageId": message_id });

                        if is_group_chat {
                            let group_id = group_code.or(user.group_id.clone());
                            if let Some(group_id) = group_id {
                                if let Some(group) = self.groups.get(&group_id) {
                                    for member_id in &group.members {
                                        if let Some(tx) = self.sessions.get(member_id) {
                                            let event = ServerEvent { event: event_name.clone(), data: event_data.clone() };
                                            let _ = tx.send(serde_json::to_string(&event).unwrap());
                                        }
                                    }
                                }
                            }
                        } else {
                            if let Some(partner_id) = &user.partner_id {
                                if let Some(tx) = self.sessions.get(partner_id) {
                                    let event = ServerEvent { event: event_name.clone(), data: event_data.clone() };
                                    let _ = tx.send(serde_json::to_string(&event).unwrap());
                                }
                            }
                            if let Some(tx) = self.sessions.get(&conn) {
                                let event = ServerEvent { event: event_name.clone(), data: event_data.clone() };
                                let _ = tx.send(serde_json::to_string(&event).unwrap());
                            }
                        }
                    }
                    let _ = res_tx.send(());
                }
                Command::DisconnectChat { conn, res_tx } => {
                    self.handle_disconnect(&conn).await;
                    let _ = res_tx.send(());
                }
                Command::GetSessionTx { conn_id, res_tx } => {
                    let tx = self.sessions.get(&conn_id).cloned();
                    let _ = res_tx.send(tx);
                }
                Command::RelayWebRTCEvent { sender_id, event_type, target_id, data, is_group_chat, group_code, res_tx } => {
                    self.relay_webrtc_event(sender_id, event_type, target_id, data, is_group_chat, group_code).await;
                    let _ = res_tx.send(());
                }
            }
        }
        Ok(())
    }

    // Joins a user to a group chat
    pub async fn join_group_chat(&self, _conn_id: String, _group_code: String, _username: String) -> bool {
        // ... existing code ...
        true
    }

    // Relay WebRTC signaling events between clients
    pub async fn relay_webrtc_event(
        &self,
        sender_id: String,
        event_type: String,
        target_id: String,
        data: serde_json::Value,
        is_group_chat: bool,
        group_code: Option<String>,
    ) {
        // Log full details at the start
        log::info!("relay_webrtc_event: from={}, event={}, to={}, is_group={}, group_code={:?}",
            sender_id, event_type, target_id, is_group_chat, group_code);
            
        // Find the sender's user for validation
        if !self.users.contains_key(&sender_id) {
            log::error!("WebRTC relay failed: Sender not found {}", sender_id);
            return;
        }
        
        // Debug the data structure
        log::debug!("WebRTC event data: {}", 
                   serde_json::to_string_pretty(&data).unwrap_or_else(|_| "Invalid JSON".to_string()));
        
        // Prepare the event to send
        let event = ServerEvent {
            event: event_type.clone(),
            data: data.clone(),
        };
        
        // Debug the final event structure
        log::debug!("WebRTC formatted event: {}", 
                   serde_json::to_string_pretty(&event).unwrap_or_else(|_| "Invalid JSON".to_string()));
        
        let event_json = match serde_json::to_string(&event) {
            Ok(json) => json,
            Err(e) => {
                log::error!("Failed to serialize WebRTC event: {}", e);
                return;
            }
        };
        
        // For group chat, relay to all members of the group
        if is_group_chat {
            if let Some(code) = group_code {
                if let Some(group) = self.groups.get(&code) {
                    log::info!("Relaying WebRTC {} to {} group members in group {}",
                        event_type, group.members.len(), code);
                    
                    let mut relay_count = 0;
                    for member_id in &group.members {
                        if member_id != &sender_id {
                            if let Some(tx) = self.sessions.get(member_id) {
                                if let Err(e) = tx.send(event_json.clone()) {
                                    log::error!("Failed to relay WebRTC event to {}: {}", member_id, e);
                                } else {
                                    relay_count += 1;
                                }
                            }
                        }
                    }
                    log::info!("Successfully relayed WebRTC {} to {}/{} members in group {}",
                        event_type, relay_count, group.members.len() - 1, code);
                } else {
                    log::error!("WebRTC relay failed: Group {} not found", code);
                }
            } else {
                log::error!("WebRTC relay failed: No group code provided for group chat");
            }
        } else {
            // For private chat, relay directly to target
            if let Some(tx) = self.sessions.get(&target_id) {
                match tx.send(event_json) {
                    Ok(_) => {
                        log::info!("Successfully relayed WebRTC {} from {} to {}", 
                            event_type, sender_id, target_id);
                    },
                    Err(e) => {
                        log::error!("Failed to relay WebRTC event to {}: {}", target_id, e);
                    }
                }
            } else {
                log::error!("Failed to relay WebRTC event: Target session not found {}", target_id);
            }
        }
    }

    // Disconnect a user from the chat server
    pub async fn disconnect(&self, _conn_id: &str) {
        // ... existing code ...
    }
}

// Handle and command sender for chat server
#[derive(Debug, Clone)]
pub struct ChatServerHandle {
    cmd_tx: mpsc::UnboundedSender<Command>,
}

impl ChatServerHandle {
    // Register client message sender and obtain connection ID
    pub async fn connect(&self, conn_tx: mpsc::UnboundedSender<Msg>) -> ConnId {
        let (res_tx, res_rx) = oneshot::channel();
        self.cmd_tx
            .send(Command::Connect { conn_tx, res_tx })
            .unwrap();
        res_rx.await.unwrap()
    }

    // Unregister message sender and broadcast disconnection message to current room
    pub fn disconnect(&self, conn: ConnId) {
        self.cmd_tx.send(Command::Disconnect { conn }).unwrap();
    }

    // Join chat with a user profile
    pub async fn join_chat(&self, conn: ConnId, profile: UserProfile) {
        let (res_tx, res_rx) = oneshot::channel();
        self.cmd_tx
            .send(Command::JoinChat { conn, profile, res_tx })
            .unwrap();
        res_rx.await.unwrap();
    }

    // Send a message
    pub async fn send_message(&self, conn: ConnId, message: EncryptedMessage, is_group_chat: bool, group_code: Option<String>) {
        let (res_tx, res_rx) = oneshot::channel();
        self.cmd_tx
            .send(Command::SendMessage { conn, message, is_group_chat, group_code, res_tx })
            .unwrap();
        res_rx.await.unwrap();
    }

    // Start typing
    pub async fn typing_start(&self, conn: ConnId, is_group_chat: bool, group_code: Option<String>) {
        let (res_tx, res_rx) = oneshot::channel();
        self.cmd_tx
            .send(Command::TypingStart { conn, is_group_chat, group_code, res_tx })
            .unwrap();
        res_rx.await.unwrap();
    }

    // Stop typing
    pub async fn typing_stop(&self, conn: ConnId, is_group_chat: bool, group_code: Option<String>) {
        let (res_tx, res_rx) = oneshot::channel();
        self.cmd_tx
            .send(Command::TypingStop { conn, is_group_chat, group_code, res_tx })
            .unwrap();
        res_rx.await.unwrap();
    }

    // New method for file sending start
    pub async fn file_sending_start(&self, conn: ConnId, file_id: String, is_group_chat: bool, group_code: Option<String>) {
        let (res_tx, res_rx) = oneshot::channel();
        self.cmd_tx.send(Command::FileSendingStart {
            conn,
            file_id,
            is_group_chat,
            group_code,
            res_tx,
        }).unwrap();
        res_rx.await.unwrap();
    }

    // New method for file sending end
    pub async fn file_sending_end(&self, conn: ConnId, file_id: String, is_group_chat: bool, group_code: Option<String>) {
        let (res_tx, res_rx) = oneshot::channel();
        self.cmd_tx.send(Command::FileSendingEnd {
            conn,
            file_id,
            is_group_chat,
            group_code,
            res_tx,
        }).unwrap();
        res_rx.await.unwrap();
    }

    // New method for deleting a message
    pub async fn delete_message(&self, conn: ConnId, message_id: String, is_group_chat: bool, group_code: Option<String>) {
        let (res_tx, res_rx) = oneshot::channel();
        self.cmd_tx.send(Command::DeleteMessage {
            conn,
            message_id,
            is_group_chat,
            group_code,
            res_tx,
        }).unwrap();
        res_rx.await.unwrap();
    }

    // Disconnect from chat
    pub async fn disconnect_chat(&self, conn: ConnId) {
        let (res_tx, res_rx) = oneshot::channel();
        self.cmd_tx
            .send(Command::DisconnectChat { conn, res_tx })
            .unwrap();
        res_rx.await.unwrap();
    }

    // Update the relay_webrtc_event method
    pub async fn relay_webrtc_event(
        &self,
        sender_id: ConnId, 
        event_type: String, 
        target_id: String, 
        data: Value, 
        is_group_chat: bool, 
        group_code: Option<String>
    ) {
        let (res_tx, res_rx) = oneshot::channel();
        if let Err(e) = self.cmd_tx.send(Command::RelayWebRTCEvent { 
            sender_id, event_type, target_id, data, is_group_chat, group_code, res_tx 
        }) {
            log::error!("Failed to send RelayWebRTCEvent command: {}", e);
            return;
        }
        
        if let Err(e) = res_rx.await {
            log::error!("Failed to receive RelayWebRTCEvent response: {}", e);
        }
    }

    // Helper method to get a session's transmitter
    async fn get_session_tx(&self, conn_id: &str) -> Option<mpsc::UnboundedSender<Msg>> {
        // Create a channel to get the response
        let (res_tx, res_rx) = oneshot::channel();
        
        // Send a command to get the session
        let _ = self.cmd_tx.send(Command::GetSessionTx { 
            conn_id: conn_id.to_string(), 
            res_tx 
        });
        
        // Await the response
        match res_rx.await {
            Ok(opt_tx) => opt_tx,
            Err(_) => None,
        }
    }
} 