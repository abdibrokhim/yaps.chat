import { logger } from "@/lib/logger";

// Define interface for WebRTC signal data
export interface WebRTCSignalData {
  sender_id: string;
  is_group_chat?: boolean;
  group_code?: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  target_id?: string;
}

// Event names for WebRTC signaling
export const WebRTCEvents = {
  OFFER: "webrtc_offer",
  ANSWER: "webrtc_answer",
  ICE_CANDIDATE: "webrtc_ice_candidate",
  END_CALL: "webrtc_end_call",
};

// Initialize WebRTC event listeners on the socket
export function initializeWebRTCEvents(socket: any, callbacks: {
  onOffer?: (data: WebRTCSignalData) => void;
  onAnswer?: (data: WebRTCSignalData) => void;
  onIceCandidate?: (data: WebRTCSignalData) => void;
  onEndCall?: (data: WebRTCSignalData) => void;
}) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    logger.error("WebRTC", "Cannot initialize WebRTC events: Socket not connected");
    return {
      cleanup: () => {} // Return empty cleanup function
    };
  }

  // Custom handler for WebSocket message events to catch WebRTC specific events
  const handleSocketMessage = (event: MessageEvent) => {
    try {
      const eventData = typeof event.data === 'string' 
        ? event.data.substring(0, Math.min(100, event.data.length)) + (event.data.length > 100 ? '...' : '')
        : 'Binary data';
      
      logger.debug("WebRTC", "Received message", { data: eventData });
      
      const serverEvent = JSON.parse(event.data);
      
      // Only process WebRTC-related events
      if (!serverEvent || !serverEvent.event) {
        logger.debug("WebRTC", "Not a valid event message", { serverEvent });
        return;
      }
      
      // Check for WebRTC-specific events
      switch (serverEvent.event) {
        case WebRTCEvents.OFFER:
          logger.info("WebRTC", "Received offer via WebSocket", { type: serverEvent.event });
          if (callbacks.onOffer) callbacks.onOffer(serverEvent.data);
          break;
          
        case WebRTCEvents.ANSWER:
          logger.info("WebRTC", "Received answer via WebSocket", { type: serverEvent.event });
          if (callbacks.onAnswer) callbacks.onAnswer(serverEvent.data);
          break;
          
        case WebRTCEvents.ICE_CANDIDATE:
          logger.info("WebRTC", "Received ICE candidate via WebSocket", { type: serverEvent.event });
          if (callbacks.onIceCandidate) callbacks.onIceCandidate(serverEvent.data);
          break;
          
        case WebRTCEvents.END_CALL:
          logger.info("WebRTC", "Received end call via WebSocket", { type: serverEvent.event });
          if (callbacks.onEndCall) callbacks.onEndCall(serverEvent.data);
          break;
          
        default:
          logger.debug("WebRTC", "Not a WebRTC event", { eventType: serverEvent.event });
      }
    } catch (error) {
      logger.error("WebRTC", "Error handling WebSocket message", error);
    }
  };

  // Add our WebSocket message handler for WebRTC events
  socket.addEventListener('message', handleSocketMessage);
  logger.info("WebRTC", "Event listeners initialized");

  // Return a cleanup function to remove event listeners
  return {
    cleanup: () => {
      socket.removeEventListener('message', handleSocketMessage);
      logger.info("WebRTC", "Event listeners cleaned up");
    }
  };
}

// Send a WebRTC offer to a peer
export function sendOffer(socket: any, offer: RTCSessionDescriptionInit, targetId: string, isGroupChat = false, groupCode?: string) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    logger.error("WebRTC", "Cannot send offer: Socket not connected");
    return false;
  }
  
  const payload: WebRTCSignalData = {
    sender_id: getCurrentUserId(socket),
    offer,
    target_id: targetId,
    is_group_chat: isGroupChat,
    group_code: groupCode
  };
  
  // For WebSocket, we need to send a formatted event
  const message = JSON.stringify({
    event: WebRTCEvents.OFFER,
    data: payload
  });
  
  socket.send(message);
  
  logger.info("WebRTC", "Sent offer", { 
    targetId, 
    isGroupChat,
    groupCode 
  });
  
  return true;
}

// Send a WebRTC answer to a peer
export function sendAnswer(socket: any, answer: RTCSessionDescriptionInit, targetId: string, isGroupChat = false, groupCode?: string) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    logger.error("WebRTC", "Cannot send answer: Socket not connected");
    return false;
  }
  
  const payload: WebRTCSignalData = {
    sender_id: getCurrentUserId(socket),
    answer,
    target_id: targetId,
    is_group_chat: isGroupChat,
    group_code: groupCode
  };
  
  // For WebSocket, we need to send a formatted event
  const message = JSON.stringify({
    event: WebRTCEvents.ANSWER,
    data: payload
  });
  
  socket.send(message);
  
  logger.info("WebRTC", "Sent answer", { 
    targetId, 
    isGroupChat,
    groupCode 
  });
  
  return true;
}

// Send an ICE candidate to a peer
export function sendIceCandidate(socket: any, candidate: RTCIceCandidate, targetId: string, isGroupChat = false, groupCode?: string) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    logger.error("WebRTC", "Cannot send ICE candidate: Socket not connected");
    return false;
  }
  
  const payload: WebRTCSignalData = {
    sender_id: getCurrentUserId(socket),
    candidate,
    target_id: targetId,
    is_group_chat: isGroupChat,
    group_code: groupCode
  };
  
  // For WebSocket, we need to send a formatted event
  const message = JSON.stringify({
    event: WebRTCEvents.ICE_CANDIDATE,
    data: payload
  });
  
  socket.send(message);
  
  logger.info("WebRTC", "Sent ICE candidate", { 
    targetId, 
    isGroupChat,
    groupCode 
  });
  
  return true;
}

// Send end call signal to a peer
export function sendEndCall(socket: any, targetId: string, isGroupChat = false, groupCode?: string) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    logger.error("WebRTC", "Cannot send end call: Socket not connected");
    return false;
  }
  
  const payload: WebRTCSignalData = {
    sender_id: getCurrentUserId(socket),
    target_id: targetId,
    is_group_chat: isGroupChat,
    group_code: groupCode
  };
  
  // For WebSocket, we need to send a formatted event
  const message = JSON.stringify({
    event: WebRTCEvents.END_CALL,
    data: payload
  });
  
  socket.send(message);
  
  logger.info("WebRTC", "Sent end call", { 
    targetId, 
    isGroupChat,
    groupCode 
  });
  
  return true;
}

// Helper function to get the current user ID from socket or localStorage
function getCurrentUserId(socket: any): string {
  // Try to get from localStorage first
  const userId = localStorage.getItem('userId');
  if (userId) {
    return userId;
  }
  
  // Generate a new random ID
  const randomId = `user-${Math.random().toString(36).substring(2, 9)}`;
  localStorage.setItem('userId', randomId);
  return randomId;
} 