"use client"

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { DraggableVideoChat } from './draggable-video-chat';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

type VideoChatContextType = {
  startVideoChat: (partnerId: string, username: string, isGroupChat?: boolean, groupCode?: string) => void;
  endVideoChat: () => void;
  isVideoChatActive: boolean;
  isWebRTCSupported: boolean;
};

const VideoChatContext = createContext<VideoChatContextType | undefined>(undefined);

export function useVideoChat() {
  const context = useContext(VideoChatContext);
  if (!context) {
    throw new Error('useVideoChat must be used within a VideoChatProvider');
  }
  return context;
}

type VideoChatProviderProps = {
  children: ReactNode;
};

// Check if browser supports WebRTC
const checkWebRTCSupport = (): boolean => {
  // Safeguard for SSR
  if (typeof window === 'undefined') {
    return false;
  }
  
  // Check if all required WebRTC APIs are available
  try {
    return (
      !!navigator.mediaDevices &&
      !!navigator.mediaDevices.getUserMedia &&
      !!window.RTCPeerConnection
    );
  } catch (e) {
    return false;
  }
};

export function VideoChatProvider({ children }: VideoChatProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [isWebRTCSupported, setIsWebRTCSupported] = useState(false);
  const [partnerInfo, setPartnerInfo] = useState<{
    partnerId: string;
    username: string;
    isGroupChat?: boolean;
    groupCode?: string;
  } | null>(null);

  // Check WebRTC support on mount
  useEffect(() => {
    const supported = checkWebRTCSupport();
    setIsWebRTCSupported(supported);
    
    if (!supported) {
      logger.warn("VideoChat", "WebRTC is not supported in this browser");
    }
  }, []);

  const startVideoChat = (partnerId: string, username: string, isGroupChat = false, groupCode?: string) => {
    if (!isWebRTCSupported) {
      toast.error("Video chat not supported", {
        description: "Your browser does not support WebRTC. Please try using Chrome, Firefox, or Safari.",
      });
      return;
    }

    // Get the raw WebSocket object from window
    const socket = (window as any).socket;
    
    // Add debug logs for better troubleshooting
    logger.info("VideoChat", "Attempting to start video chat", {
      socket: socket ? "found" : "not found",
      socketState: socket ? socket.readyState : "N/A",
      partnerId,
      isGroupChat,
      groupCode
    });
    
    // Check if socket is a WebSocket instance and is connected
    if (!socket || (socket.readyState !== WebSocket.OPEN)) {
      toast.error("Cannot start video chat", {
        description: "You are not connected to the chat server.",
      });
      return;
    }

    setPartnerInfo({
      partnerId,
      username,
      isGroupChat,
      groupCode,
    });
    setIsActive(true);
    
    logger.info("VideoChat", "Starting video chat", {
      partnerId,
      isGroupChat,
      groupCode
    });
    
    toast.success("Starting video chat", {
      description: "Please accept camera and microphone permissions.",
    });
  };

  const endVideoChat = () => {
    if (isActive) {
      logger.info("VideoChat", "Ending video chat");
    }
    
    setIsActive(false);
    setPartnerInfo(null);
  };

  return (
    <VideoChatContext.Provider
      value={{
        startVideoChat,
        endVideoChat,
        isVideoChatActive: isActive,
        isWebRTCSupported
      }}
    >
      {children}
      
      {isActive && partnerInfo && (
        <DraggableVideoChat
          partnerId={partnerInfo.partnerId}
          username={partnerInfo.username}
          isGroupChat={partnerInfo.isGroupChat}
          groupCode={partnerInfo.groupCode}
          onClose={endVideoChat}
        />
      )}
    </VideoChatContext.Provider>
  );
} 
