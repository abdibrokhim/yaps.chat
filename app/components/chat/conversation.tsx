import { ScrollButton } from "@/components/prompt-kit/scroll-button"
import { ChatContainer } from "@/components/prompt-kit/chat-container"
import { Loader } from "@/components/prompt-kit/loader"
import { useEffect, useRef, useState } from "react"
import { Message } from "./message"
import { Message as MessageType, TextMessage, FileMessage, NotificationMessage } from "@/lib/types/chat"
import { ChatHeader } from "./chat-header"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "motion/react"

type ConversationProps = {
  messages: MessageType[]
  status?: "streaming" | "ready" | "submitted" | "error"
  onDelete: (id: string) => void
  onEdit: (id: string, newText: string) => void
  onReload: () => void
  onReply?: (id: string) => void
  onDownload?: (attachment: any) => void
  isGroupChat?: boolean
  activeGroupCode?: string
  groupMembers?: any[]
  partnerTyping?: boolean
  fileSending?: boolean
  fileId?: string
  fileProgress?: number
}

export function Conversation({
  messages,
  status = "ready",
  onDelete,
  onEdit,
  onReload,
  onReply,
  onDownload,
  isGroupChat = false,
  activeGroupCode,
  groupMembers = [],
  partnerTyping = false,
  fileSending = false,
  fileId,
  fileProgress = 0
}: ConversationProps) {
  const initialMessageCount = useRef(messages.length)
  const scrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [progressiveImage, setProgressiveImage] = useState<{ id: string, progress: number } | null>(null)

  // Helper to check if the last message is from the user
  const isLastMessageFromUser = () => {
    if (messages.length === 0) return false;
    return messages[messages.length - 1].role === "user";
  };

  // Effect to handle file sending progress animation
  useEffect(() => {
    if (fileSending && fileId) {
      // Set an interval to increment the progress for animation
      const intervalId = setInterval(() => {
        setProgressiveImage(prev => {
          if (!prev) return { id: fileId, progress: 10 };
          
          // Increment progress gradually to simulate progressive loading
          // But only up to 80% - the final completion happens when actual file arrives
          const newProgress = Math.min(80, prev.progress + 5);
          return { ...prev, progress: newProgress };
        });
      }, 100);
      
      return () => clearInterval(intervalId);
    } else {
      // Clear progressive image state when not sending
      setProgressiveImage(null);
    }
  }, [fileSending, fileId]);

  // Handle replying to a message, with optional scroll to the referenced message
  const handleReplyToMessage = (id: string) => {
    setReplyingToId(id);
    
    // If we have a parent reply handler, call it
    if (onReply) {
      onReply(id);
    }
  };

  const displayMessages = messages;

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-x-hidden overflow-y-auto">
      <ChatHeader 
        isGroupChat={isGroupChat}
        activeGroupCode={activeGroupCode}
        groupMembers={groupMembers}
      />
      <ChatContainer
        className="relative flex w-full max-w-2xl flex-col items-center p-4"
        autoScroll={true}
        ref={containerRef}
        scrollToRef={scrollRef}
        style={{
          scrollbarGutter: "stable both-edges",
        }}
      >
        {displayMessages?.map((message, index) => {
          const isLast = index === displayMessages.length - 1 && status !== "submitted"
          const hasScrollAnchor =
            isLast && displayMessages.length > initialMessageCount.current

          return (
            <div 
              key={message.id} 
              id={`message-${message.id}`}
              className={cn(
                "w-full",
              )}
            >
              <Message
                id={message.id}
                variant={message.role}
                isLast={isLast}
                onDelete={onDelete}
                onEdit={onEdit}
                onReload={onReload}
                onReply={handleReplyToMessage}
                onDownload={onDownload}
                hasScrollAnchor={hasScrollAnchor}
                message={message}
              />
            </div>
          )
        })}
        
        {/* Progressive Image Loading */}
        <AnimatePresence>
          {progressiveImage && (
            <motion.div 
              className="group min-h-scroll-anchor flex w-full max-w-2xl flex-col items-start gap-2 px-6 pb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex flex-col max-w-xs overflow-hidden bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                <div className="h-40 w-40 bg-zinc-200 dark:bg-zinc-700 rounded-lg overflow-hidden relative">
                  <div 
                    className="absolute bottom-0 left-0 bg-pink-400/30 dark:bg-pink-500/30 h-full"
                    style={{ 
                      width: '100%', 
                      height: `${progressiveImage.progress}%`, 
                      transition: 'height 0.3s ease-in-out'
                    }}
                  ></div>
                  <div className="absolute top-2 left-2 text-[10px] text-zinc-800 dark:text-zinc-200 font-medium bg-zinc-200/80 dark:bg-zinc-700/80 px-1.5 py-0.5 rounded">
                    Loading image...
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
                    {Math.round(progressiveImage.progress)}%
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {partnerTyping && (
            <motion.div 
              className="group min-h-scroll-anchor flex w-full max-w-2xl flex-col items-start gap-2 text-xs pl-2 pb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Loader text="typing"/>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* File sending indicator for current user's outgoing file */}
        <AnimatePresence>
          {status === "submitted" && messages.length > 0 && isLastMessageFromUser() && fileSending && (
            <motion.div 
              className="group min-h-scroll-anchor flex w-full max-w-2xl flex-col items-end gap-2 text-xs pl-2 pb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Loader text="sending file" variant="user" />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Text message sending indicator */}
        <AnimatePresence>
          {status === "submitted" && messages.length > 0 && isLastMessageFromUser() && !fileSending && (
            <motion.div 
              className="group min-h-scroll-anchor flex w-full max-w-2xl flex-col items-end gap-2 text-xs pl-2 pb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Loader text="sending" variant="user" />
            </motion.div>
          )}
        </AnimatePresence>
      </ChatContainer>
      <div className="absolute bottom-0 w-full max-w-2xl">
        <ScrollButton
          className="absolute top-[-50px] right-[10px]"
          containerRef={containerRef}
          scrollRef={scrollRef}
        />
      </div>
    </div>
  )
}
