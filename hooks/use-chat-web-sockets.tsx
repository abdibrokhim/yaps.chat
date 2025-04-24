'use client'

import { useState, useEffect, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { logger } from "@/lib/logger";
import { encryptMessage, decryptMessage } from "@/lib/crypto";
import { toast } from "sonner";
import { playNotificationSound } from "@/lib/audio";
import { Message, Preference, GroupJoinMethod } from "@/lib/types/chat";
import { UserProfile } from "@/lib/types/user";

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageCounter, setMessageCounter] = useState(0);
  const [connected, setConnected] = useState(false);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [groupCode, setGroupCode] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerDisconnected, setPartnerDisconnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [currentReplyTo, setCurrentReplyTo] = useState<string | undefined>(undefined);

  const socketRef = useRef<WebSocket | null>(null);
  const userIdRef = useRef<string | null>(null);
  const errorToastRef = useRef<boolean>(false);

  // Get or generate a persisted user ID
  const getUserId = () => {
    if (userIdRef.current) return userIdRef.current;
    
    let userId = localStorage.getItem('userId');
    if (!userId) {
      userId = uuidv4();
      localStorage.setItem('userId', userId);
    }
    
    userIdRef.current = userId;
    return userId;
  };
  
  // Get user gender (default to random if not set)
  const getUserGender = () => {
    return "default";
  };

  // Reset state when disconnected
  const resetState = () => {
    setMessages([]);
    setConnected(false);
    setIsGroupChat(false);
    setGroupCode(null);
    setGroupMembers([]);
    setPartnerTyping(false);
    setPartnerDisconnected(false);
  };

  const sendJsonMessage = (eventName: string, data: any) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      logger.warn("useChat", "Cannot send message, not connected");
      return;
    }

    const message = JSON.stringify({
      event: eventName,
      data: data
    });
    socketRef.current.send(message);
    logger.debug("useChat", `Sent ${eventName}`, data);
  };

  // Connect to the chat service
  const connect = useCallback(async (
    preference: Preference,
    groupJoinMethod?: GroupJoinMethod,
    customGroupCode?: string
  ) => {
    if (socketRef.current) {
      disconnect();
    }

    resetState();
    setConnecting(true);
    errorToastRef.current = false;
    
    try {
      
      // Get user profile data - convert to snake_case for Rust server
      const userProfile: UserProfile = {
        user_id: getUserId(),
        username: localStorage.getItem('username') || `User_${getUserId().substring(0, 5)}`,
        preference,
        gender: getUserGender(),
        room_type: preference === 'group' ? 'group' : 'couple',
      };

      // Add group-specific properties
      if (preference === 'group') {
        userProfile.group_join_method = groupJoinMethod;
        if (groupJoinMethod === 'join' && customGroupCode) {
          userProfile.group_code = customGroupCode;
        }
      }

      logger.info("useChat", "Connecting to chat service with profile", userProfile);

      // Only establish WebSocket connection after successful validation
      const serverUrl = process.env.WHICH_NODE_ENV == "production" 
        ? process.env.SOCKET_SERVER_URL || 'wss://notchat-server-ou3j.shuttle.app/ws/' 
        : 'ws://127.0.0.1:8000/ws/';
        
      socketRef.current = new WebSocket(serverUrl);
      
      // Store WebSocket in window object for access by video chat components
      (window as any).socket = socketRef.current;

      socketRef.current.onopen = () => {
        logger.info("useChat", "WebSocket connection established");
        // After connection is established, send join_chat event
        sendJsonMessage("join_chat", userProfile);
      };

      socketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleServerEvent(data);
        } catch (error) {
          logger.error("useChat", "Failed to parse WebSocket message", error);
        }
      };

      socketRef.current.onerror = (error) => {
        logger.error("useChat", "WebSocket error", error);
        
        // Prevent multiple error toasts
        if (!errorToastRef.current) {
          errorToastRef.current = true;
          toast.error("Failed to connect to chat server. Please try again later.");
        }
        
        // Use setTimeout to break potential state update cycles
        setTimeout(() => {
          setConnecting(false);
        }, 0);
      };

      socketRef.current.onclose = (event) => {
        logger.info("useChat", "WebSocket connection closed", { code: event.code, reason: event.reason });
        
        // Use setTimeout to break potential state update cycles
        setTimeout(() => {
          setConnecting(false);
          
          if (connected) {
            // Only show disconnection message if we were previously connected
            toast.error("Disconnected from chat server.");
            resetState();
          }
        }, 0);
      };
    } catch (error) {
      // Handle validation errors and other setup errors
      logger.error("useChat", "Connection failed", error);
      
      toast.error(error instanceof Error ? error.message : "Failed to connect. Please try again.");
      setConnecting(false);
      
      // Ensure we're disconnected on error
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    }
  }, []);

  const handleServerEvent = (serverEvent: { event: string, data: any }) => {
    const { event, data } = serverEvent;
    
    logger.debug("useChat", `Received ${event}`, data);

    switch (event) {
      case "chat_started":
        handleChatStarted(data);
        break;
      case "receive_message":
        handleReceiveMessage(data);
        break;
      case "group_members_update":
        handleGroupMembersUpdate(data);
        break;
      case "user_joined_group":
        handleUserJoinedGroup(data);
        break;
      case "user_left_group":
        handleUserLeftGroup(data);
        break;
      case "typing_started":
        handleTypingStarted(data);
        break;
      case "typing_stopped":
        handleTypingStopped();
        break;
      case "message_deleted":
        handleMessageDeleted(data);
        break;
      case "file_sending_started":
        handleFileSendingStarted(data);
        break;
      case "file_sending_ended":
        handleFileSendingEnded(data);
        break;
      case "partner_disconnected":
        handlePartnerDisconnected();
        break;
      case "waiting_for_match":
        handleWaitingForMatch();
        break;
      case "no_match_found":
        handleNoMatchFound();
        break;
      case "group_not_found":
        handleGroupNotFound();
        break;
      default:
        logger.warn("useChat", `Unknown event: ${event}`, data);
    }
  };

  const handleChatStarted = (data: any) => {
    logger.info("useChat", "Chat started", data);
    setConnected(true);
    setConnecting(false);
    setPartnerDisconnected(false);
    
    // Play notification sound when chat starts
    playNotificationSound();
    
    if (data.groupCode) {
      setIsGroupChat(true);
      setGroupCode(data.groupCode);
      setMessages([
        {
          id: uuidv4(),
          content: `You've joined a group chat. Group code: ${data.groupCode || 'N/A'}`,
          isOwnMessage: false,
          sender: 'system',
          type: 'notification',
          timestamp: Date.now(),
          messageIndex: messageCounter,
          role: 'assistant',
        },
      ]);
      setMessageCounter(prevCounter => prevCounter + 1);
    } else {
      setIsGroupChat(false);
      setMessages([
        {
          id: uuidv4(),
          content: "You're now chatting with a random stranger. Say Yaps!",
          isOwnMessage: false,
          sender: 'system',
          type: 'notification',
          timestamp: Date.now(),
          messageIndex: messageCounter,
          role: 'assistant',
        },
      ]);
      setMessageCounter(prevCounter => prevCounter + 1);
    }
  };

  const handleReceiveMessage = (data: any) => {
    logger.info("useChat", "Received message", { encrypted: true, data });
    
    try {
      // Decrypt the message
      const decryptedBuffer = decryptMessage({
        encrypted: data.message.encrypted,
        nonce: data.message.nonce
      });

      let messageContent: string;
      let messageType: 'text' | 'file' = 'text';
      let fileData: ArrayBuffer | undefined;
      let fileName: string | undefined;
      let fileSize: number | undefined;
      let fileType: string | undefined;

      // Attempt to decode the Buffer as a UTF-8 string.
      const decodedText = decryptedBuffer.toString("utf8");

      // Improved heuristic for detecting binary data vs text with unicode/emoji support
      // Check if this is explicitly an image data URL
      if (decodedText.startsWith("data:image")) {
        messageContent = decodedText;
      } else {
        // Check if this is likely binary data (not valid UTF-8 text)
        // This approach better handles unicode characters including emojis
        try {
          // If we can parse as JSON or if the content seems like valid text, treat as text
          const hasControlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(decodedText);
          const isLikelyText = !hasControlChars || 
                               decodedText.length < 1000 || 
                               /^[\p{L}\p{M}\p{Z}\p{S}\p{N}\p{P}]+$/u.test(decodedText);
          
          if (isLikelyText) {
            // It's text (which may include emoji and other unicode characters)
            messageContent = decodedText;
            logger.debug("useChat", "Detected as text message", { 
              length: decodedText.length,
              sample: decodedText.slice(0, 30)
            });
          } else {
            // Truly binary data, treat as file
            messageType = 'file';
            // Convert Buffer to ArrayBuffer for FileMessage type
            fileData = new Uint8Array(decryptedBuffer).buffer;
            fileName = 'image.png';
            fileSize = decryptedBuffer.byteLength;
            fileType = 'image/png';
            messageContent = 'Image file';
            
            logger.debug("useChat", "Detected as binary data", { 
              blobSize: decryptedBuffer.byteLength 
            });
          }
        } catch (e) {
          // If in doubt, treat as text
          messageContent = decodedText;
          logger.debug("useChat", "Error determining content type, defaulting to text", { error: e });
        }
      }
      
      // Play notification sound for new message (use lower volume for message notifications)
      playNotificationSound('/audio/yapsnotify.mp3', 0.1);
      
      // Check for reply_to information - can be either in message.reply_to or directly in the data
      let replyToId: string | undefined = undefined;
      
      if (data.message && data.message.reply_to !== undefined) {
        // Convert to string if needed
        replyToId = String(data.message.reply_to);
        logger.info("useChat", "Message contains reply_to in message object", { replyTo: replyToId });
      } else if (data.reply_to !== undefined) {
        // Convert to string if needed
        replyToId = String(data.reply_to);
        logger.info("useChat", "Message contains reply_to in data object", { replyTo: replyToId });
      }
      
      // Log detailed information about the incoming message for debugging
      logger.debug("useChat", "Parsing incoming message", { 
        hasReplyToInMessage: data.message && data.message.reply_to !== undefined,
        messageReplyTo: data.message?.reply_to,
        hasReplyToInData: data.reply_to !== undefined,
        dataReplyTo: data.reply_to,
        finalReplyToId: replyToId
      });
      
      // Add message to state with reply information
      setMessages(prev => {
        const baseMsg = {
          id: uuidv4(),
          isOwnMessage: false,
          sender: data.sender,
          replyToId: replyToId,
          messageIndex: messageCounter,
          timestamp: Date.now(),
          role: 'assistant' as const,
        };

        let newMsg: Message;
        
        if (messageType === 'file' && fileData && fileName && fileSize && fileType) {
          newMsg = {
            ...baseMsg,
            type: 'file',
            fileName,
            fileSize,
            fileType,
            fileData,
          };
        } else {
          newMsg = {
            ...baseMsg,
            type: 'text',
            content: messageContent,
          };
        }
        
        setMessageCounter(prevCounter => prevCounter + 1);
        return [...prev, newMsg];
      });
    } catch (error) {
      logger.error("useChat", "Failed to decrypt message", error);
      // Add error message to chat
      setMessages(prev => [...prev, {
        id: uuidv4(),
        content: "Could not decrypt message. Encryption key may be invalid.",
        isOwnMessage: false,
        sender: 'system',
        type: 'notification',
        timestamp: Date.now(),
        messageIndex: messageCounter,
        role: 'assistant',
      }]);
      setMessageCounter(prevCounter => prevCounter + 1);
    }
  };

  const handleGroupMembersUpdate = (members: string[]) => {
    logger.info("useChat", "Group members updated", { members });
    setGroupMembers(members);
  };

  const handleUserJoinedGroup = (username: string) => {
    logger.info("useChat", `User joined group: ${username}`);
    
    // Play notification sound when a new user joins the group
    playNotificationSound();
    
    setMessages(prev => [...prev, {
      id: uuidv4(),
      content: `${username} has joined the group chat`,
      isOwnMessage: false,
      sender: 'system',
      type: 'notification',
      timestamp: Date.now(),
      messageIndex: messageCounter,
      role: 'assistant',
    }]);
    setMessageCounter(prevCounter => prevCounter + 1);
  };

  const handleUserLeftGroup = (username: string) => {
    logger.info("useChat", `User left group: ${username}`);
    setMessages(prev => [...prev, {
      id: uuidv4(),
      content: `${username} has left the group chat`,
      isOwnMessage: false,
      sender: 'system',
      type: 'notification',
      timestamp: Date.now(),
      messageIndex: messageCounter,
      role: 'assistant',
    }]);
    setMessageCounter(prevCounter => prevCounter + 1);
  };

  const handleTypingStarted = (data: any) => {
    logger.debug("useChat", "Typing started", data);
    if (isGroupChat) {
      // For group chat, we'll handle the username logic in the UI
    } else {
      setPartnerTyping(true);
    }
  };

  const handleTypingStopped = () => {
    logger.debug("useChat", "Typing stopped");
    setPartnerTyping(false);
  };

  const handlePartnerDisconnected = () => {
    logger.info("useChat", "Partner disconnected");
    setPartnerTyping(false);
    setPartnerDisconnected(true);
    setConnected(false);
  };

  const handleWaitingForMatch = () => {
    logger.info("useChat", "Waiting for match");
    setMessages([
      {
        id: uuidv4(),
        content: "Waiting for someone to chat with you...",
        isOwnMessage: false,
        sender: 'system',
        type: 'notification',
        timestamp: Date.now(),
        messageIndex: messageCounter,
        role: 'assistant',
      }
    ]);
    setMessageCounter(prevCounter => prevCounter + 1);
  };

  const handleNoMatchFound = () => {
    logger.warn("useChat", "No match found");
    setConnected(false);
    setMessages([
      {
        id: uuidv4(),
        content: "No matching users found at the moment. Please try again later.",
        isOwnMessage: false,
        sender: 'system',
        type: 'notification',
        timestamp: Date.now(),
        messageIndex: messageCounter,
        role: 'assistant',
      }
    ]);
    setMessageCounter(prevCounter => prevCounter + 1);
    setConnecting(false);
  };

  const handleGroupNotFound = () => {
    logger.warn("useChat", "Group not found");
    setConnected(false);
    setMessages([
      {
        id: uuidv4(),
        content: "Group not found. Please check the code and try again.",
        isOwnMessage: false,
        sender: 'system',
        type: 'notification',
        timestamp: Date.now(),
        messageIndex: messageCounter,
        role: 'assistant',
      }
    ]);
    setMessageCounter(prevCounter => prevCounter + 1);
    setConnecting(false);
  };

  const handleMessageDeleted = (data: any) => {
    const messageId = data.messageId;
    logger.info("useChat", "Message deleted", { messageId });
    
    // Remove the message from the messages array
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    
    // Show a brief toast notification
    toast.info("Message removed", {
      description: "A message was removed from the chat.",
      duration: 1500,
    });
  };

  // Note: we'll never allow users to attach messages to files. 
  // for example: users uploads a file, and then writes text description.
  // it's not allowed. (we'll also basically disable writing text on textarea)
  const handleFileSendingStarted = (data: any) => {
    const { fileId, username } = data;
    logger.info("useChat", "File sending started", { fileId, username });
    
    // Don't add a notification message about file upload anymore
    // The UI will show the progressive loading indicator instead
    
    // Dispatch custom event for the Chat component to listen to
    window.dispatchEvent(new CustomEvent('file_sending_started', {
      detail: {
        fileId,
        username,
        isOwnMessage: false
      }
    }));
  };

  const handleFileSendingEnded = (data: any) => {
    const { fileId, username } = data;
    logger.info("useChat", "File sending ended", { fileId, username });
    
    // We don't need to add another message here as the file message itself will be displayed
    // when the actual file data arrives via handleReceiveMessage
    
    // Dispatch custom event for the Chat component to listen to
    window.dispatchEvent(new CustomEvent('file_sending_ended', {
      detail: {
        fileId,
        username,
        isOwnMessage: false
      }
    }));
  };

  const disconnect = useCallback(() => {
    logger.info("useChat", "Disconnecting from chat");
    if (socketRef.current) {
      sendJsonMessage("disconnect_chat", {});
      socketRef.current.close();
      socketRef.current = null;
      
      // Clean up WebSocket reference from window object
      (window as any).socket = null;
    }
    resetState();
  }, []);

  const sendMessage = (content: string | ArrayBuffer, replyToId?: string) => {
    if (!socketRef.current || !connected) {
      logger.warn("useChat", "Cannot send message, not connected");
      return Promise.reject(new Error("Not connected to chat"));
    }
    
    return new Promise<void>(async (resolve, reject) => {
      try {
        // Check if content contains emojis and ensure it's treated as text
        let messageToSend = content;
        let messageType: 'text' | 'file' = 'text';
        let fileName: string | undefined;
        let fileSize: number | undefined;
        let fileType: string | undefined;
        let fileId: string | undefined;
        
        if (typeof content === "string") {
          // Log the content type and first few characters to help debug
          logger.debug("useChat", "Sending text message", { 
            messageLength: content.length, 
            sample: content.slice(0, 20),
            containsEmoji: /\p{Emoji}/u.test(content)
          });
          
          // Content is already a string, nothing special to do
          messageToSend = content;
          messageType = 'text';
        } else if (content instanceof ArrayBuffer) {
          // Only treat as binary if it's actually an image
          // This prevents emoji unicode from being treated as binary data
          // Check the first few bytes to see if this might be an image format
          const header = new Uint8Array(content, 0, 8);
          const isProbablyImage = 
            // JPEG header starts with FF D8
            (header[0] === 0xFF && header[1] === 0xD8) ||
            // PNG header starts with 89 50 4E 47
            (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) ||
            // GIF header starts with GIF8
            (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38);

          if (!isProbablyImage) {
            // Try to decode as text if not clearly an image
            try {
              const textDecoder = new TextDecoder('utf-8');
              const textContent = textDecoder.decode(content);
              messageToSend = textContent;
              messageType = 'text';
              logger.debug("useChat", "Converted ArrayBuffer to text", { 
                length: textContent.length 
              });
            } catch (e) {
              // If can't decode as text, keep as binary
              logger.debug("useChat", "Keeping content as binary", { 
                reason: "Failed to decode as text"
              });
              messageToSend = content;
              messageType = 'file';
              fileName = 'file.bin';
              fileSize = content.byteLength;
              fileType = 'application/octet-stream';
              fileId = `file-${Date.now()}`;
            }
          } else {
            messageToSend = content;
            messageType = 'file';
            fileName = 'image.png';
            fileSize = content.byteLength;
            fileType = 'image/png';
            fileId = `file-${Date.now()}`;
            logger.debug("useChat", "Sending binary data", { 
              byteLength: content.byteLength,
              type: "image",
              fileId
            });
            
            // Send file sending start event for images
            sendJsonMessage("file_sending_start", {
              file_id: fileId,
              is_group_chat: isGroupChat,
              group_code: groupCode
            });
          }
        }
        
        // Encrypt the message
        const encryptedData = encryptMessage(messageToSend);

        // Log the size of the encrypted message (after conversion from base64, estimate its length)
        const encryptedBytes = Buffer.from(encryptedData.encrypted, 'base64');
        logger.info("ChatInterface", "Encrypted data size", { byteLength: encryptedBytes.byteLength });
        
        logger.info("useChat", "Sending encrypted message", { 
          isGroupChat, 
          groupCode,
          encrypted: true,
          replyToId: replyToId,
          contentType: messageType
        });
        
        // Add original message to local state (unencrypted for local display)
        const baseMessage = {
          id: uuidv4(),
          isOwnMessage: true,
          sender: getUserId(),
          replyToId,
          messageIndex: messageCounter,
          timestamp: Date.now(),
          role: 'user' as const,
        };
        
        let newMessage: Message;
        
        if (messageType === 'file' && messageToSend instanceof ArrayBuffer && fileName && fileSize && fileType) {
          newMessage = {
            ...baseMessage,
            type: 'file',
            fileName,
            fileSize,
            fileType,
            fileData: messageToSend,
          };
        } else if (typeof messageToSend === 'string') {
          newMessage = {
            ...baseMessage,
            type: 'text',
            content: messageToSend,
          };
        } else {
          // Fallback case - should never happen with proper type checks above
          newMessage = {
            ...baseMessage,
            type: 'text',
            content: 'Error: Could not determine message format',
          };
        }
        
        setMessages(prev => [...prev, newMessage]);
        setMessageCounter(prevCounter => prevCounter + 1);
        
        // Convert replyToId to number if needed for server compatibility
        const serverReplyToId = replyToId ? Number(replyToId) : undefined;
        
        // Send encrypted message to server
        sendJsonMessage("send_message", {
          message: encryptedData,
          is_group_chat: isGroupChat,
          group_code: groupCode,
          reply_to_id: serverReplyToId,
        });

        // Clear current reply after sending
        if (replyToId !== undefined) {
          setCurrentReplyTo(undefined);
        }
        
        // Send file sending end event for files/images
        if (messageType === 'file' && fileId) {
          // Small delay to simulate file processing time
          await new Promise(r => setTimeout(r, 500));
          
          sendJsonMessage("file_sending_end", {
            file_id: fileId,
            is_group_chat: isGroupChat,
            group_code: groupCode
          });
        }
        
        resolve();
      } catch (error) {
        logger.error("useChat", "Failed to encrypt message", error);
        // Notify user of encryption error
        toast.error("Failed to encrypt message. Please check your encryption key.");
        reject(error);
      }
    });
  };

  // Send typing indicator
  const sendTypingIndicator = (isTyping: boolean) => {
    if (!socketRef.current || !connected) return;
    
    logger.debug("useChat", `Sending typing indicator: ${isTyping}`, { isGroupChat, groupCode });
    
    if (isTyping) {
      sendJsonMessage("typing_start", { 
        is_group_chat: isGroupChat, 
        group_code: groupCode 
      });
    } else {
      sendJsonMessage("typing_stop", { 
        is_group_chat: isGroupChat, 
        group_code: groupCode 
      });
    }
  };

  // Add setReplyTo function
  const setReplyTo = (messageId?: string) => {
    setCurrentReplyTo(messageId);
    logger.info("useChat", "Set reply to message", { messageId });
  };

  // Add deleteMessage function after sendMessage function
  const deleteMessage = (messageId: string) => {
    if (!socketRef.current || !connected) {
      logger.warn("useChat", "Cannot delete message: Socket not connected");
      toast.error("Cannot delete message", {
        description: "You are currently disconnected",
        duration: 2000,
      });
      return;
    }

    logger.info("useChat", "Deleting message", { messageId });
    
    try {
      socketRef.current.send(JSON.stringify({
        event: "delete_message",
        data: {
          messageId,
          chatId: groupCode,
          isGroupChat: !!groupCode
        }
      }));
      
      // Optimistically remove message from UI
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      
      toast.success("Message deleted", {
        description: "Your message has been deleted",
        duration: 1500,
      });
    } catch (error) {
      logger.error("useChat", "Error deleting message", error);
      toast.error("Failed to delete message", {
        description: "Please try again later",
        duration: 2000,
      });
    }
  };

  return {
    messages,
    sendMessage,
    connected,
    connect,
    disconnect,
    isGroupChat,
    groupCode,
    groupMembers,
    partnerTyping,
    partnerDisconnected,
    sendTypingIndicator,
    connecting,
    setReplyTo,
    currentReplyTo,
    deleteMessage,
  };
};
