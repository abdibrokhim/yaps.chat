"use client";

import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import React, { useEffect, useState, useRef } from "react"
import { Stop, Microphone } from "@phosphor-icons/react/dist/ssr"
import { toast } from "sonner"
import { logger } from "@/lib/logger"

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
  
type ButtonRecordProps = {
  isUserSpeaking: boolean,
  onTranscript: (text: string) => void,
  onSpeakingStateChange: (isSpeaking: boolean) => void
}

export function ButtonRecord({
  isUserSpeaking,
  onTranscript,
  onSpeakingStateChange
}: ButtonRecordProps) {
  const recognitionRef = useRef<any>(null);
  const [shouldKeepListening, setShouldKeepListening] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize SpeechRecognition only once on component mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      logger.error("ButtonRecord", "Speech recognition not supported");
      toast.error("Speech recognition not supported", {
        description: "Your browser doesn't support speech recognition. Please try a different browser."
      });
      return;
    }

    // Create recognition instance only once
    if (!recognitionRef.current) {
      const recog = new SpeechRecognition();
      recog.continuous = true; // Keep listening until stopped
      recog.interimResults = true; // Show real-time results
      recog.lang = "en-US"; // Set language (customizable)
      
      recognitionRef.current = recog;
      setIsInitialized(true);
      logger.info("ButtonRecord", "Speech recognition initialized");
    }

    return () => {
      // Clean up recognition on unmount
      if (recognitionRef.current) {
        try {
          if (shouldKeepListening) {
            recognitionRef.current.stop();
            setShouldKeepListening(false);
          }
        } catch (error) {
          // Ignore errors on cleanup
        }
      }
    };
  }, []);

  // Set up event handlers whenever the recognition instance or dependencies change
  useEffect(() => {
    if (!recognitionRef.current || !isInitialized) return;

    const recognition = recognitionRef.current;
    
    // Handle transcription results
    const handleResult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (transcript.trim() !== "") {
        onTranscript(transcript); // Send transcript to parent
      }
    };

    // Handle automatic stopping and restarting
    const handleEnd = () => {
      logger.info("ButtonRecord", "Speech recognition ended");
      
      // If we should keep listening, restart recognition
      if (shouldKeepListening) {
        try {
          // Add a small delay before restarting to prevent rapid-fire restarts
          setTimeout(() => {
            if (shouldKeepListening) {
              recognition.start();
              logger.info("ButtonRecord", "Restarting speech recognition");
            }
          }, 300);
        } catch (error) {
          logger.error("ButtonRecord", "Error restarting speech recognition", { error });
          setShouldKeepListening(false);
          onSpeakingStateChange(false);
          toast.error("Speech recognition error", {
            description: "Failed to restart recording. Please try again.",
          });
        }
      } else {
        onSpeakingStateChange(false);
      }
    };

    // Log errors (e.g., no speech, mic access denied)
    const handleError = (event: any) => {
      logger.error("ButtonRecord", "Speech recognition error", { error: event.error });
      
      if (event.error === 'not-allowed') {
        toast.error("Microphone access denied", {
          description: "Please allow microphone access to use speech recognition."
        });
        setShouldKeepListening(false);
        onSpeakingStateChange(false);
      } else if (event.error === 'no-speech') {
        // This is common and not necessarily an error, just log it
        logger.info("ButtonRecord", "No speech detected");
      } else {
        toast.error("Speech recognition error", {
          description: "An error occurred while recording. Please try again."
        });
      }
    };

    // Add event listeners
    recognition.onresult = handleResult;
    recognition.onend = handleEnd;
    recognition.onerror = handleError;

    return () => {
      // Remove event listeners when component unmounts or dependencies change
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
    };
  }, [onTranscript, onSpeakingStateChange, shouldKeepListening, isInitialized]);

  // Effect to sync isUserSpeaking with our internal state
  useEffect(() => {
    if (!isUserSpeaking && shouldKeepListening) {
      // External state says we're not speaking, but internally we think we are
      setShouldKeepListening(false);
      try {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      } catch (error) {
        logger.error("ButtonRecord", "Error stopping speech recognition", { error });
      }
    }
  }, [isUserSpeaking, shouldKeepListening]);

  // Start recording
  const startRecording = () => {
    if (!recognitionRef.current || !isInitialized) {
      toast.error("Speech recognition not available", {
        description: "Please try reloading the page."
      });
      return;
    }

    setShouldKeepListening(true);
    try {
      recognitionRef.current.start();
      onSpeakingStateChange(true);
      toast.success("Recording started", {
        description: "Speak clearly into your microphone."
      });
      logger.info("ButtonRecord", "Recording started");
    } catch (error) {
      logger.error("ButtonRecord", "Error starting speech recognition", { error });
      setShouldKeepListening(false);
      onSpeakingStateChange(false);
      toast.error("Failed to start recording", {
        description: "Please try again."
      });
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (!recognitionRef.current) return;

    setShouldKeepListening(false);
    try {
      recognitionRef.current.stop();
      logger.info("ButtonRecord", "Recording stopped by user");
    } catch (error) {
      logger.error("ButtonRecord", "Error stopping speech recognition", { error });
    }
    onSpeakingStateChange(false);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
          <Button
              variant="ghost"
              size="icon"
              className={`border-border dark:bg-transparent size-8 rounded-full border ${isUserSpeaking ? 'border-foreground' : ''}`}
              aria-label={isUserSpeaking ? "Stop recording" : "Start recording"}
              onClick={isUserSpeaking ? stopRecording : startRecording}
              >
              {isUserSpeaking ? (
                  <Stop className="size-4" weight="fill" />
              ) : (
                  <Microphone className="size-4" />
              )}
          </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isUserSpeaking ? "Click to stop recording" : "Click to start recording"}
      </TooltipContent>
    </Tooltip>
  )
}
