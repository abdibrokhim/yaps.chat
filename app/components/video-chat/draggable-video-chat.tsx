import React, { useRef, useState, useEffect, TouchEvent } from "react";
import { X, VideoCamera, Microphone, MicrophoneSlash, ArrowsOut, PhoneX } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import { 
  initializeWebRTCEvents,
  sendOffer,
  sendAnswer,
  sendIceCandidate,
  sendEndCall,
  WebRTCEvents
} from "./webrtc-events";

type DraggableVideoChatProps = {
  partnerId: string;
  username: string;
  isGroupChat?: boolean;
  groupCode?: string;
  onClose: () => void;
};

export function DraggableVideoChat({
  partnerId,
  username,
  isGroupChat = false,
  groupCode,
  onClose
}: DraggableVideoChatProps) {
  // Refs for video elements and stream storage for cleanup
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  
  // WebRTC states
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitiator, setIsInitiator] = useState(false);
  
  // Dragging state
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Setup WebRTC connection and media stream
  useEffect(() => {
    logger.info("VideoChat", "Setting up WebRTC connection", { 
      partnerId, 
      isGroupChat,
      groupCode 
    });
    
    const socket = (window as any).socket;
    
    // Log socket details for debugging
    logger.info("VideoChat", "WebSocket connection check", {
      socketExists: !!socket,
      socketType: socket ? typeof socket : 'none',
      readyState: socket?.readyState,
      isWebSocket: socket instanceof WebSocket,
      wsOPEN: WebSocket.OPEN
    });

    // Initialize peer connection
    const pc = new RTCPeerConnection({
      iceServers: [
        // STUN servers
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
        // Free TURN servers (for reliable connections through firewalls)
        {
          urls: "turn:openrelay.metered.ca:80",
          username: "openrelayproject",
          credential: "openrelayproject"
        },
        {
          urls: "turn:openrelay.metered.ca:443",
          username: "openrelayproject",
          credential: "openrelayproject"
        },
        {
          urls: "turn:openrelay.metered.ca:443?transport=tcp",
          username: "openrelayproject",
          credential: "openrelayproject"
        }
      ],
      iceCandidatePoolSize: 10
    });
    setPeerConnection(pc);

    // Async media initialization function
    const initMedia = async () => {
      try {
        // Request camera and microphone
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true, preferCurrentTab: true });
        setLocalStream(stream);
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        // Add each track to the peer connection
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });
        // Random delay to avoid both peers initiating simultaneously
        setTimeout(() => {
          setIsInitiator(true);
        }, Math.random() * 1000);
      } catch (error) {
        logger.error("VideoChat", "Error accessing media devices", error);
        toast.error("Cannot access camera or microphone", {
          description: "Please check your device permissions and ensure you're running on HTTPS.",
        });
        onClose();
      }
    };
    
    // Check if the socket is valid before proceeding. 
    // If socket is not available, you can still initiate media.
    if (!socket || !(socket instanceof WebSocket) || socket.readyState !== WebSocket.OPEN) {
      logger.error("VideoChat", "Socket not connected or invalid", {
        socketExists: !!socket,
        socketType: socket ? typeof socket : 'none',
        readyState: socket?.readyState,
        isWebSocket: socket instanceof WebSocket
      });
      toast.error("Cannot connect to video chat", {
        description: "Socket connection not available. Please try refreshing the page.",
      });
      // Proceed to get media even without a socket so that the user sees their local stream
      initMedia();
    } else {
      initMedia();
    }

    // Setup event handlers on the peer connection
    pc.ontrack = (event) => {
      logger.info("VideoChat", "Received remote track", {
        kind: event.track.kind,
        hasStreams: event.streams.length > 0
      });
      
      if (remoteVideoRef.current && event.streams && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setIsConnected(true);
        toast.success("Connected to remote peer", { id: "video-connected" });
      }
    };

    pc.onconnectionstatechange = () => {
      logger.info("VideoChat", "Connection state changed", { state: pc.connectionState });
      if (pc.connectionState === "connected") {
        setIsConnected(true);
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setIsConnected(false);
        toast.error("Video connection lost", { description: "Trying to reconnect..." });
      } else if (pc.connectionState === "closed") {
        setIsConnected(false);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        logger.info("VideoChat", "Generated ICE candidate");
        sendIceCandidate(socket, event.candidate, partnerId, isGroupChat, groupCode);
      }
    };

    pc.oniceconnectionstatechange = () => {
      logger.info("VideoChat", "ICE connection state changed", { state: pc.iceConnectionState });
    };

    // Initialize WebRTC event handlers
    const { cleanup: cleanupEvents } = initializeWebRTCEvents(socket, {
      onOffer: (data) => {
        logger.info("VideoChat", "Received offer", { from: data.sender_id });
        if (data.sender_id === partnerId || isGroupChat) {
          try {
            const remoteOffer = new RTCSessionDescription(data.offer!);
            pc.setRemoteDescription(remoteOffer)
              .then(() => pc.createAnswer())
              .then(answer => pc.setLocalDescription(answer))
              .then(() => {
                if (pc.localDescription) {
                  sendAnswer(socket, pc.localDescription, data.sender_id, isGroupChat, groupCode);
                }
              })
              .catch(error => {
                logger.error("VideoChat", "Error handling offer", error);
                toast.error("Error setting up call", { description: "Please try again." });
              });
          } catch (error) {
            logger.error("VideoChat", "Error processing offer", error);
          }
        }
      },
      onAnswer: (data) => {
        logger.info("VideoChat", "Received answer", { from: data.sender_id });
        if (data.sender_id === partnerId || isGroupChat) {
          try {
            const remoteAnswer = new RTCSessionDescription(data.answer!);
            pc.setRemoteDescription(remoteAnswer).catch(error => {
              logger.error("VideoChat", "Error handling answer", error);
            });
          } catch (error) {
            logger.error("VideoChat", "Error processing answer", error);
          }
        }
      },
      onIceCandidate: (data) => {
        logger.info("VideoChat", "Received ICE candidate", { from: data.sender_id });
        if (data.sender_id === partnerId || isGroupChat) {
          try {
            const candidate = new RTCIceCandidate(data.candidate);
            pc.addIceCandidate(candidate).catch(error => {
              logger.error("VideoChat", "Error adding ICE candidate", error);
            });
          } catch (error) {
            logger.error("VideoChat", "Error processing ICE candidate", error);
          }
        }
      },
      onEndCall: (data) => {
        if (data.sender_id === partnerId || isGroupChat) {
          toast.info("Call ended by peer");
          onClose();
        }
      }
    });

    // Cleanup function to close connections and stop media
    return () => {
      cleanupEvents();
      logger.info("VideoChat", "Cleaning up WebRTC");
      if (pc) {
        pc.close();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [partnerId, isGroupChat, groupCode, onClose]);

  // Initiate call when designated as initiator
  useEffect(() => {
    if (!isInitiator || !peerConnection || !localStream) return;
    logger.info("VideoChat", "Initiating call as initiator");
    
    const socket = (window as any).socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    // Track ICE gathering state
    peerConnection.onicegatheringstatechange = () => {
      logger.info("VideoChat", "ICE gathering state changed", {
        state: peerConnection.iceGatheringState
      });
    };

    peerConnection.createOffer()
      .then(offer => {
        logger.info("VideoChat", "Offer created, setting local description");
        return peerConnection.setLocalDescription(offer);
      })
      .then(() => {
        // Wait for ICE gathering to complete before sending offer
        const checkIceGatheringState = () => {
          if (peerConnection.iceGatheringState === 'complete') {
            logger.info("VideoChat", "ICE gathering complete, sending offer");
            if (peerConnection.localDescription) {
              sendOffer(socket, peerConnection.localDescription, partnerId, isGroupChat, groupCode);
            }
          } else {
            // Wait a bit and check again
            setTimeout(checkIceGatheringState, 500);
          }
        };
        
        // Start checking ICE gathering state
        checkIceGatheringState();
      })
      .catch(error => {
        logger.error("VideoChat", "Error creating offer", error);
        toast.error("Failed to start call", { description: "Please try again." });
      });
  }, [isInitiator, peerConnection, localStream, partnerId, isGroupChat, groupCode]);

  // Toggle mute
  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // End call
  const endCall = () => {
    const socket = (window as any).socket;
    if (socket && socket.readyState === WebSocket.OPEN) {
      sendEndCall(socket, partnerId, isGroupChat, groupCode);
    }
    
    if (peerConnection) {
      peerConnection.close();
    }
    
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    
    onClose();
  };

  // Dragging handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (containerRef.current) {
      setIsDragging(true);
      const rect = containerRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      setDragOffset({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent | MouseEvent) => {
    if (isDragging && containerRef.current) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep the element within the viewport bounds
      const maxX = window.innerWidth - containerRef.current.offsetWidth;
      const maxY = window.innerHeight - containerRef.current.offsetHeight;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent | TouchEvent) => {
    if (isDragging && containerRef.current && e.touches.length === 1) {
      e.preventDefault(); // Prevent scrolling while dragging
      const touch = e.touches[0];
      const newX = touch.clientX - dragOffset.x;
      const newY = touch.clientY - dragOffset.y;
      
      // Keep the element within the viewport bounds
      const maxX = window.innerWidth - containerRef.current.offsetWidth;
      const maxY = window.innerHeight - containerRef.current.offsetHeight;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    // Add global mouse event listeners
    document.addEventListener("mousemove", handleMouseMove as any);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleTouchMove as any, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove as any);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove as any);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, dragOffset]);

  // Toggle expanded mode
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed z-50 bg-card border rounded-lg shadow-lg overflow-hidden",
        isExpanded ? "aspect-w-16 aspect-h-9" : "aspect-w-16 aspect-h-9",
        isDragging ? "cursor-grabbing" : "cursor-grab"
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transition: isDragging ? "none" : "all 0.2s ease-in-out",
      }}
    >
      {/* Header for dragging */}
      <div
        className="bg-muted p-2 flex justify-between items-center"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="text-sm font-medium flex items-center">
          <VideoCamera className="mr-2 size-4" />
          <span>
            Video Chat with {username} 
            {isConnected ? " • Connected" : " • Connecting..."}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="size-7 p-0"
            onClick={toggleExpand}
          >
            <ArrowsOut className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="size-7 p-0"
            onClick={endCall}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Video container */}
      <div className="relative w-full h-full">
        {/* Remote video (full size) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full bg-black "
        />

        {/* Local video (picture-in-picture) */}
        <div className="absolute bottom-2 right-2 w-1/4 h-1/4 border border-border rounded-md overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full bg-muted"
          />
        </div>

        {/* Connection status for debugging */}
        {!isConnected && (
          <div className="absolute top-2 left-2 bg-background/80 rounded px-2 py-1 text-xs">
            Connecting... Please wait
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full"
            onClick={toggleMute}
          >
            {isMuted ? (
              <MicrophoneSlash className="size-4" />
            ) : (
              <Microphone className="size-4" />
            )}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="rounded-full"
            onClick={endCall}
          >
            <PhoneX className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
} 
