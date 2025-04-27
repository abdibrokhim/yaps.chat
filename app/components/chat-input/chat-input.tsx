"use client"

import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input"
import { Button } from "@/components/ui/button"
import { Loader } from "@/components/ui/loader"
import { ArrowBendUpLeft, ArrowUp, Paperclip, X } from "@phosphor-icons/react/dist/ssr"
import React, { useCallback, useEffect, useRef, useState, SyntheticEvent } from "react"
import { ButtonFileUpload } from "./button-file-upload"
import { ButtonVideoChat } from "./button-video-chat"
import { FileList } from "./file-list"
import { ButtonEmojiPicker } from "./button-emoji-picker"
import { ButtonGifPicker } from "./button-gif-picker"
import { toast } from "sonner"
import { logger } from "@/lib/logger"
import { UpgradeToProDialog } from "../essentials/upgrade-to-pro"
import { Stop } from "@phosphor-icons/react"
import { useVideoChat } from "../video-chat/video-chat-provider"
import { ButtonRecord } from "./button-record"

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

type ChatInputProps = {
  value: string
  onValueChange: (value: string) => void
  onSend: () => void
  isSubmitting?: boolean
  files: File[]
  onFileUpload: (files: File[]) => void
  onFileRemove: (file: File) => void
  stop: () => void
  status?: "submitted" | "streaming" | "ready" | "error"
  currentReplyTo?: string
  setReplyTo?: (id?: string) => void
  onSendMessage?: (content: string | ArrayBuffer, replyToId?: string) => Promise<void>
  sendTypingIndicator?: (isTyping: boolean) => void
  connected?: boolean
  partnerDisconnected?: boolean
  partnerId?: string
  partnerUsername?: string
  isGroupChat?: boolean
  groupCode?: string
}

export function ChatInput({
  value,
  onValueChange,
  onSend,
  isSubmitting,
  files,
  onFileUpload,
  onFileRemove,
  stop,
  status,
  currentReplyTo,
  setReplyTo,
  onSendMessage,
  sendTypingIndicator,
  connected = true,
  partnerDisconnected = false,
  partnerId,
  partnerUsername,
  isGroupChat = false,
  groupCode
}: ChatInputProps) {
  const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);
  const [pendingAttachmentUrl, setPendingAttachmentUrl] = useState<string | null>(null);
  const { startVideoChat, isVideoChatActive } = useVideoChat();
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  
  // Reset pending attachment when files are cleared
  useEffect(() => {
    if (files.length === 0 && pendingAttachment !== null) {
      setPendingAttachment(null);
      if (pendingAttachmentUrl) {
        URL.revokeObjectURL(pendingAttachmentUrl);
        setPendingAttachmentUrl(null);
      }
    }
  }, [files.length, pendingAttachment, pendingAttachmentUrl]);
  
  // Additional effect to reset pending attachment when status changes to ready
  useEffect(() => {
    if (status === "ready" && !isSubmitting && pendingAttachment !== null) {
      setPendingAttachment(null);
      if (pendingAttachmentUrl) {
        URL.revokeObjectURL(pendingAttachmentUrl);
        setPendingAttachmentUrl(null);
      }
    }
  }, [status, isSubmitting, pendingAttachment, pendingAttachmentUrl]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)

  // Handle typing indicator with debounce
  useEffect(() => {
    // Don't activate typing indicator when submitting a message
    if (sendTypingIndicator && value && !typingTimeoutRef.current && !isSubmitting && status !== "submitted") {
      sendTypingIndicator(true);
    }
    
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [value, sendTypingIndicator, isSubmitting, status]);

  // Update typing indicator timeout
  useEffect(() => {
    if (sendTypingIndicator && typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Only set typing timeout when not submitting
    if (sendTypingIndicator && value && !isSubmitting && status !== "submitted") {
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(false);
        typingTimeoutRef.current = null;
      }, 1000);
    }
    
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [value, sendTypingIndicator, isSubmitting, status]);

  // Display reply feedback in the input
  useEffect(() => {
    if (currentReplyTo !== undefined && textareaRef.current) {
      textareaRef.current.placeholder = "Type your reply...";
      textareaRef.current.focus();
      logger.info("ChatInput", "Replying to message", { replyToId: currentReplyTo });
    }
  }, [currentReplyTo]);

  // Textarea auto-resize
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const adjustHeight = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    };
    
    textarea.addEventListener('input', adjustHeight);
    
    return () => {
      textarea.removeEventListener('input', adjustHeight);
    };
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isSubmitting) return

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        onSend()
      }
    },
    [onSend, isSubmitting]
  )

  const handleInputChange = (newValue: string) => {
    if (pendingAttachment) return; // Disable text input if image is selected
    
    if (newValue.length > 1000) {
      toast("Message too long", { 
        description: "Please keep your message under 1000 characters.",
        duration: 2000,
      });
      return;
    }
    
    onValueChange(newValue);
  };

  const handleCancelReply = () => {
    if (setReplyTo) {
      setReplyTo(undefined);
      logger.info("ChatInput", "Reply canceled");
    }
  };

  const handleEmojiClick = (emoji: string) => {
    console.log("Handling emoji click in ChatInput:", emoji);
    if (pendingAttachment) {
      console.log("Ignoring emoji - pending attachment exists");
      return; // Disable emoji if image is selected
    }
    
    try {
      // Get current cursor position
      const cursorPosition = textareaRef.current?.selectionStart || value.length;
      const newValue = value.slice(0, cursorPosition) + emoji + value.slice(cursorPosition);
      
      // Update value
      onValueChange(newValue);
      
      // Focus the textarea and set cursor position after the inserted emoji
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newPosition = cursorPosition + emoji.length;
          textareaRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 10);
      
      logger.info("ChatInput", "Emoji selected", { 
        emoji,
        emojiLength: emoji.length,
        cursorPosition,
        emojiCodePoints: Array.from(emoji).map(char => char.codePointAt(0)?.toString(16))
      });
    } catch (error) {
      console.error("Error inserting emoji:", error);
    }
  };

  const handleGifSelect = (gif: any) => {
    logger.info("ChatInput", "GIF selected", { 
      id: gif.id,
      url: gif.images.original.url
    });
    
    // Fetch the GIF as a blob
    fetch(gif.images.original.url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch GIF: ${response.status} ${response.statusText}`);
        }
        return response.blob();
      })
      .then(blob => {
        // Convert blob to file
        const file = new File([blob], `giphy-${gif.id}.gif`, { type: 'image/gif' });
        onFileUpload([file]);
        
        toast.success(
          "GIF selected", {
          description: "GIF ready to send. Click send to share it.",
          duration: 2000,
        });
      })
      .catch(error => {
        logger.error("ChatInput", "Error fetching GIF", { error });
        toast.error("Failed to load GIF", {
          description: "Please try another one.",
        });
      });
  };

  const handleFileUploadInternal = (files: File[]) => {
    const file = files[0] || null;
    if (!file) return;

    // we support only image files for now
    if (!isValidImageFile(file)) {
      toast.error("Invalid file type", {
        description: "Only JPG, PNG, GIF, and WEBP files are supported.",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Maximum file size is 5MB.",
      });
      return;
    }

    setPendingAttachment(file);
    setPendingAttachmentUrl(URL.createObjectURL(file));
    onFileUpload(files);
    
    logger.info("ChatInput", "File selected", { 
      fileName: file.name, 
      fileSize: file.size,
      fileType: file.type,
    });
  };

  const handleMainButtonClick = () => {
    if (isSubmitting && status !== "streaming") {
      return;
    }

    if (isSubmitting && status === "streaming") {
      stop();
      return;
    }

    // Clear typing indicator timeout before sending
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    // Explicitly set typing indicator to false
    if (sendTypingIndicator) {
      sendTypingIndicator(false);
    }

    onSend();
  };

  const handleStartVideoChat = () => {
    if (!connected || partnerDisconnected) {
      toast.error("Cannot start video chat", {
        description: "You need to be connected to start a video chat.",
      });
      return;
    }

    if (!partnerId) {
      toast.error("Cannot start video chat", {
        description: "No partner available for video chat.",
      });
      return;
    }

    // Start the video chat with partner info
    startVideoChat(
      partnerId, 
      partnerUsername || "Partner", 
      isGroupChat, 
      groupCode
    );
    
    logger.info("ChatInput", "Video chat started", { 
      partnerId, 
      isGroupChat, 
      groupCode 
    });
    
    toast.info("Starting video chat", {
      description: "Connecting to peer...",
    });
  };

  // Handle speech transcript from ButtonRecord
  const handleTranscript = (transcript: string) => {
    if (!transcript || transcript.trim() === '') return;
    
    // Always append new transcript to existing text
    // Only capitalize if this is the start of a new message
    let processedTranscript = transcript;
    
    if (value === '') {
      // Capitalize first letter if it's a brand new message
      processedTranscript = transcript.charAt(0).toUpperCase() + transcript.slice(1);
    }
    
    // Check if we need to add space between existing text and new transcript
    const needsSpace = value !== '' && !value.endsWith(' ') && !processedTranscript.startsWith(' ');
    const separator = needsSpace ? ' ' : '';
    
    // Always concatenate, never replace
    onValueChange(value + separator + processedTranscript);
    
    // Auto-resize the textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
    
    logger.info("ChatInput", "Speech transcript received", { 
      transcriptLength: transcript.length
    });
  };

  // Handle speaking state changes from ButtonRecord
  const handleSpeakingStateChange = (isSpeaking: boolean) => {
    setIsUserSpeaking(isSpeaking);
    
    if (isSpeaking) {
      logger.info("ChatInput", "Speech recording started");
    } else {
      logger.info("ChatInput", "Speech recording stopped");
    }
  };

  return (
    <>
      {currentReplyTo !== undefined && setReplyTo && (
        <div className="mb-2 px-2">
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs py-1.5 px-3 rounded-md border border-zinc-200 dark:border-zinc-700">
            <ArrowBendUpLeft className="h-3.5 w-3.5 text-primary" />
            <span className="flex-1">Replying to message</span>
            <X 
              className="h-3.5 w-3.5 cursor-pointer hover:text-primary" 
              onClick={handleCancelReply} 
            />
          </div>
        </div>
      )}
      <div className="relative order-2 px-2 sm:px-0 pb-5 md:order-1">
        <PromptInput
          className={`border-input bg-card/80 relative z-10 overflow-hidden border p-0 pb-2 shadow-xs backdrop-blur-xl ${currentReplyTo !== undefined ? 'border-primary' : ''}`}
          maxHeight={200}
          value={value}
          onValueChange={handleInputChange}
        >
          <FileList files={files} onFileRemove={onFileRemove} />
          <PromptInputTextarea
            placeholder={connected ? (
              isUserSpeaking 
                ? "Listening... Speak clearly" 
                : (files.length > 0 
                  ? "Image selected. Click send to share it." 
                  : "Type a message...")
            ) : "Connect to start chatting..."}
            onKeyDown={handleKeyDown}
            className={`mt-2 ml-2 min-h-[44px] max-h-[150px] text-base leading-[1.3] sm:text-base md:text-base ${isUserSpeaking ? 'placeholder-red-500' : ''}`}
            disabled={isSubmitting || files.length > 0 || pendingAttachment !== null}
            ref={textareaRef}
          />
          <PromptInputActions className="mt-2 w-full justify-between px-2">
            <div className="flex gap-2">
              {/* File Upload */}
              <div>
                <ButtonFileUpload
                  onFileUpload={handleFileUploadInternal}
                  disabled={isSubmitting || !connected || partnerDisconnected || files.length > 0 || isUserSpeaking}
                />
              </div>
              
              {/* Emoji Picker */}
              <div>
                <ButtonEmojiPicker
                  onEmojiSelect={(emoji) => {
                    console.log("Emoji selected in chat input:", emoji);
                    handleEmojiClick(emoji);
                  }}
                  disabled={(isSubmitting && status === "submitted") || isUserSpeaking}
                />
              </div>
              
              {/* GIF Picker */}
              <div>
                <ButtonGifPicker
                  onGifSelect={(gif) => {
                    console.log("GIF selected in chat input:", gif.id);
                    handleGifSelect(gif);
                  }}
                  disabled={(isSubmitting && status === "submitted") || isUserSpeaking}
                />
              </div>
            </div>
            <div className="flex gap-2">
              {/* Video Chat Button */}
              <div>
                <ButtonVideoChat
                  onStartVideoChat={handleStartVideoChat}
                  disabled={!connected || partnerDisconnected || isVideoChatActive || isUserSpeaking}
                />
              </div>
              
              {/* Record Button */}
              <div>
                <ButtonRecord
                  isUserSpeaking={isUserSpeaking}
                  onTranscript={handleTranscript}
                  onSpeakingStateChange={handleSpeakingStateChange}
                />
              </div>
              
              {/* Send Message Button */}
              <PromptInputAction
                tooltip={isSubmitting ? "Stop generating" : (value.length > 0 || files.length > 0 ? "Send message" : "Enter a message")}
              >
                <Button
                  variant="default"
                  size="sm"
                  className={`size-8 rounded-full transition-all duration-300 ease-out ${isSubmitting && "cursor-wait"} ${(value.length > 0 || files.length > 0) ? "cursor-pointer" : "cursor-not-allowed"}`}
                  onClick={handleMainButtonClick}
                  disabled={!(value.length > 0 || files.length > 0) || !connected || partnerDisconnected || (isSubmitting && status !== "streaming")}
                  type="button"
                  aria-label={isSubmitting && status === "streaming" ? "Stop generating" : "Send message"}
                >
                  {isSubmitting && status === "streaming" ? (
                    <Stop className="size-4" weight="fill"/>
                  ) : (
                    <ArrowUp className="size-4" />
                  )}
                </Button>
              </PromptInputAction>
            </div>
          </PromptInputActions>
        </PromptInput>
      </div>
    </>
  )
}
