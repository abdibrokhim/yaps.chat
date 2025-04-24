'use client'

import { createContext, useContext, useEffect } from "react";
import { useChat } from "@/hooks/use-chat-web-sockets";
import { GroupChatOptions } from "@/app/components/layout/chat-options";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { TextShimmer } from "@/components/motion-primitives/text-shimmer";
import Chat from "@/app/components/chat/chat";
import { NOTIFICATION_AUDIO_PATH } from "@/lib/config";
import { AnimatePresence } from "motion/react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

// Create a context for the chat state with reply functionality
type ChatContextType = ReturnType<typeof useChat>;

const ChatContext = createContext<ChatContextType | null>(null);

// Custom hook to access the chat context
export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}

export function Playground() {
  const chatState = useChat();
  
  // Preload notification sound when component mounts
  useEffect(() => {
    // Create and load audio element in advance to avoid delays on first play
    const audio = new Audio(NOTIFICATION_AUDIO_PATH);
    audio.load();
    
    logger.info("Playground", "Preloaded notification sound");
  }, []);
  
  return (
    <ChatContext.Provider value={chatState}>
      <ChatInterface />
    </ChatContext.Provider>
  );
}

// Internal component that uses the context
function ChatInterface() {
  const { 
    connected, 
    connecting,
    partnerDisconnected,
    connect,
    isGroupChat, 
    groupCode: activeGroupCode, 
    groupMembers,
  } = useChatContext();

  // Handle partner disconnection
  useEffect(() => {
    if (partnerDisconnected) {
      toast(
        "Partner disconnected", {
          description: "Your chat partner has left the conversation.",
          action: {
            label: "Yaps!",
            onClick: () => console.log("dismiss"),
          },
          duration: 2000,
        },
      );
    }
  }, [partnerDisconnected]);

  const handleStartGroupChat = (method: "create" | "join", code?: string) => {
    logger.info("Playground", "Starting group chat", { method, code });
    
    connect("group", method, code);
    
    const messages = {
      create: "Creating a new group chat...",
      join: "Joining the group chat...",
    };

    toast(
      "Connecting to group chat", {
        description: messages[method],
        action: {
          label: "Yaps!",
          onClick: () => console.log("dismiss"),
        },
        duration: 2000,
      },
    );
  };

  // Render loading state while connecting
  if (connecting) {
    return (
      <div className="relative flex h-screen w-full max-w-md flex-col overflow-hidden items-center justify-center mx-auto">
        <TextShimmer className='font-mono text-sm' duration={1}>
          Connecting...
        </TextShimmer>
      </div>
    );
  }

  // Render welcome screen when not connected
  const WelcomeScreen = () => {
    return (
      <div className="flex flex-col items-center space-y-4 px-2 sm:px-0 w-full max-w-md mx-auto">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
            yaps<span className="text-zinc-600 dark:text-zinc-400">[dot]</span>chat
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">one-time end-to-end encrypted anonymous chats</p>
        </div>
        <GroupChatOptions 
          onStartGroupChat={handleStartGroupChat}
        />
      </div>
    );
  }

  // Render chat interface when connected
  return (
    <div
      className={cn(
        "@container/main relative flex h-full flex-col items-center justify-center"
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {!connected ? (
          <motion.div
            key="onboarding"
            className="absolute mx-auto w-full max-w-md md:relative md:bottom-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            layout="position"
            layoutId="onboarding"
            transition={{
              layout: {
                duration: 0,
              },
            }}
          >
            <WelcomeScreen />
          </motion.div>
        ) : (
          <Chat />
        )}
      </AnimatePresence>
    </div>
  );
}
