"use client"

import { ChatInput } from "@/app/components/chat-input/chat-input"
import { Conversation } from "@/app/components/chat/conversation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useChatContext } from "../layout/playground"
import { logger } from "@/lib/logger"
import { useTheme } from "next-themes"
import { MAX_FILE_SIZE } from "@/lib/config"
import { validateFile } from "@/lib/file-handling"

// Helper function to read file as ArrayBuffer for sending images
const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject("Failed to read file as ArrayBuffer.");
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

// Helper to validate image file types
const isValidImageFile = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(file.type);
};

export default function Chat() {
  const { 
    sendMessage, 
    connected, 
    partnerDisconnected, 
    sendTypingIndicator,
    connecting,
    currentReplyTo,
    setReplyTo,
    messages,
    groupCode,
    groupMembers,
    partnerTyping,
  } = useChatContext()

  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [status, setStatus] = useState<"submitted" | "streaming" | "ready" | "error">("ready")
  const [fileSending, setFileSending] = useState(false)
  const [fileId, setFileId] = useState<string | undefined>(undefined)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { theme } = useTheme()
  
  // Handle file upload events from server
  useEffect(() => {
    // Create a handler for the 'file_sending_started' event
    const handleFileSendingStarted = (data: any) => {
      // Only set this if it's not our own file upload
      if (!data.isOwnMessage) {
        setFileSending(true);
        setFileId(data.fileId);
      }
    };

    // Create a handler for the 'file_sending_ended' event
    const handleFileSendingEnded = (data: any) => {
      // Only handle if it's not our own file upload
      if (!data.isOwnMessage) {
        setFileSending(false);
        setFileId(undefined);
      }
    };

    // Add event listeners to window for the custom events
    window.addEventListener('file_sending_started', (e: any) => handleFileSendingStarted(e.detail));
    window.addEventListener('file_sending_ended', (e: any) => handleFileSendingEnded(e.detail));

    // Clean up event listeners
    return () => {
      window.removeEventListener('file_sending_started', (e: any) => handleFileSendingStarted(e.detail));
      window.removeEventListener('file_sending_ended', (e: any) => handleFileSendingEnded(e.detail));
    };
  }, []);

  // Check if this is the first message
  const isFirstMessage = useMemo(() => {
    return messages.length === 0
  }, [messages])

  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value)
    },
    []
  )

  const handleFileUpload = useCallback(async (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    
    // Use validateFile from file-handling.ts
    const file = newFiles[0];
    const validation = await validateFile(file);
    
    if (!validation.isValid) {
      toast.error("Invalid file", {
        description: validation.error || "File type not supported or too large.",
      });
      return;
    }
    
    setFiles((prev) => [...prev, ...newFiles])
    logger.info("Chat", "File uploaded", { fileName: file.name });
  }, [])

  const handleFileRemove = useCallback((file: File) => {
    setFiles((prev) => prev.filter((f) => f !== file))
    logger.info("Chat", "File removed", { fileName: file.name });
  }, [])

  const handleDelete = async (id: string) => {
    // Delete the message on the server
    try {
      // Make a WebSocket event to delete the message
      const socket = (window as any).socket;
      if (socket && socket.connected) {
        socket.emit("delete_message", {
          message_id: id,
          is_group_chat: !!groupCode,
          group_code: groupCode || undefined
        });
        
        toast.success("Message deleted", {
          description: "The message has been removed from chat.",
        });
        logger.info("Chat", "Message deleted", { messageId: id });
      } else {
        toast.error("Cannot delete message", {
          description: "You are not connected to the chat server.",
        });
      }
    } catch (error) {
      logger.error("Chat", "Error deleting message", error);
      toast.error("Error deleting message", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const handleEdit = async (id: string, newText: string) => {
    // This would handle message editing in a real implementation
    toast.success("Message edited", {
      description: "Your message has been updated.",
    });
    logger.info("Chat", "Message edited", { messageId: id, newText: newText.substring(0, 20) + "..." });
  }

  const handleReload = () => {
    // This would handle message regeneration in a real implementation
    toast.info("Regenerating response", {
      description: "Please wait while we regenerate the response.",
    });
    logger.info("Chat", "Response regeneration requested");
  }

  const handleReply = (id: string) => {
    if (setReplyTo) {
      setReplyTo(id);
      logger.info("Chat", "Replying to message", { messageId: id });
    }
  };

  const handleDownload = (attachment: any) => {
    try {
      // Create an anchor element
      const link = document.createElement('a');
      
      // Set the download attribute and filename
      link.download = attachment.name || 'download';
      
      // Set the href to the file URL
      link.href = attachment.url;
      
      // Append to the document
      document.body.appendChild(link);
      
      // Trigger the download
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      
      logger.info("Chat", "Downloaded file", { fileName: attachment.name });
    } catch (error) {
      logger.error("Chat", "Error downloading file", error);
      toast.error("Error downloading file", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleSend = async () => {
    if (!connected) {
      toast.error("Not connected", {
          description: "You are not connected to a chat session.",
      });
      return;
    }
    
    if (input.trim() || files.length > 0) {
      setIsLoading(true);
      setStatus("submitted");
      
      // Stop typing indicator immediately when sending
      if (sendTypingIndicator) {
        sendTypingIndicator(false);
      }
      
      try {
        // Handle file attachments
        if (files.length > 0) {
          setInput("");
          const file = files[0];
          
          // Generate a unique file ID for tracking progress
          const newFileId = `file-${Date.now()}`;
          setFileId(newFileId);
          setFileSending(true);
          
          // Also dispatch a custom event for own file sending (similar to what the server would do)
          window.dispatchEvent(new CustomEvent('file_sending_started', {
            detail: {
              fileId: newFileId,
              username: localStorage.getItem('username') || 'You',
              isOwnMessage: true
            }
          }));
          
          // Convert and send the file
          const arrayBuffer = await readFileAsArrayBuffer(file);
          logger.info("Chat", "Sending file", { fileName: file.name, fileType: file.type, fileId: newFileId });
          
          // Include currentReplyTo when sending image
          await sendMessage(arrayBuffer, currentReplyTo);
          
          // Clean up file sending state after sending is complete
          setFileSending(false);
          setFileId(undefined);
          
          // Dispatch file sending ended event
          window.dispatchEvent(new CustomEvent('file_sending_ended', {
            detail: {
              fileId: newFileId,
              username: localStorage.getItem('username') || 'You',
              isOwnMessage: true
            }
          }));
        } 
        // Handle text message
        else if (input.trim()) {
          logger.info("Chat", "Sending text message");
          // Include currentReplyTo when sending text message
          await sendMessage(input.trim(), currentReplyTo);
        }
        
        // Clear input and files after sending
        setInput("");
        setFiles([]);
        
        // Reset the reply after sending if one was set
        if (currentReplyTo !== undefined && setReplyTo) {
          setReplyTo(undefined);
        }
      } catch (error) {
        logger.error("Chat", "Error sending message", error);
        toast.error("Error sending message", { 
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        // Always reset states no matter what happens
        setFileSending(false);
        setFileId(undefined);
        setStatus("ready");
        setIsLoading(false);
        // Ensure files are cleared even on error
        setFiles([]);
        
        // Ensure typing indicator is turned off
        if (sendTypingIndicator) {
          sendTypingIndicator(false);
        }
      }
    }
  };

  const handleStop = () => {
    // In a real implementation, this would stop streaming
    setStatus("ready");
    setFileSending(false);
    setFileId(undefined);
    logger.info("Chat", "Message generation stopped");
  };

  const getPartnerId = () => {
    // Get the partner ID from the current chat context
    if (groupCode) {
      // For group chats, return the group code as the ID
      return groupCode;
    }
    
    // For direct chats, find the first message from the partner to get their ID
    // or use socket information if available
    const socket = (window as any).socket;
    if (socket && socket.partnerId) {
      return socket.partnerId;
    }
    
    // Try to get from messages
    const partnerMessage = messages.find(m => m.sender !== "user");
    if (partnerMessage && partnerMessage.sender) {
      return partnerMessage.sender;
    }
    
    // Fallback
    return undefined;
  };

  const getPartnerUsername = () => {
    // For group chats, return the group name/code
    if (groupCode) {
      return `Group ${groupCode}`;
    }
    
    // For direct chats, find the username from messages or localStorage
    const partnerMessage = messages.find(m => m.sender !== "user");
    if (partnerMessage && partnerMessage.sender) {
      // Use the sender field as the username
      return partnerMessage.sender;
    }
    
    // Check if partner info is stored in socket or localStorage
    const socket = (window as any).socket;
    if (socket && socket.partnerUsername) {
      return socket.partnerUsername;
    }
    
    // Try to get from localStorage
    const storedPartnerName = localStorage.getItem('partnerUsername');
    if (storedPartnerName) {
      return storedPartnerName;
    }
    
    return "Chat Partner";
  };

  return (
    <div
      className={cn(
        "@container/main relative flex h-full w-full flex-col items-center justify-end"
      )}
    >
      <AnimatePresence initial={true} mode="popLayout">
        <Conversation
          key="conversation"
          messages={messages}
          status={status}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onReload={handleReload}
          onReply={handleReply}
          onDownload={handleDownload}
          isGroupChat={!!groupCode}
          activeGroupCode={groupCode || undefined}
          groupMembers={groupMembers || []}
          partnerTyping={partnerTyping}
          fileSending={fileSending}
          fileId={fileId}
        />
      </AnimatePresence>
      <motion.div
        className={cn("relative inset-x-0 bottom-0 z-40 mx-auto w-full max-w-2xl")}
        layout="position"
        layoutId="chat-input-container"
        transition={{
          layout: {
            duration: messages.length === 1 ? 0.3 : 0,
          },
        }}
      >
        <ChatInput
          value={input}
          onValueChange={handleInputChange}
          onSend={handleSend}
          isSubmitting={isLoading}
          files={files}
          onFileUpload={handleFileUpload}
          onFileRemove={handleFileRemove}
          stop={handleStop}
          status={status}
          currentReplyTo={currentReplyTo}
          setReplyTo={setReplyTo}
          onSendMessage={sendMessage}
          sendTypingIndicator={sendTypingIndicator}
          connected={connected}
          partnerDisconnected={partnerDisconnected}
          partnerId={getPartnerId()}
          partnerUsername={getPartnerUsername()}
          isGroupChat={!!groupCode}
          groupCode={groupCode || undefined}
        />
      </motion.div>
    </div>
  )
}
