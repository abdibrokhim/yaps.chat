import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import React, { useState } from "react"
import { Stop, Microphone } from "@phosphor-icons/react/dist/ssr"
  
type ButtonRecordProps = {
  isUserSpeaking: boolean
}

export function ButtonRecord({
  isUserSpeaking
}: ButtonRecordProps) {
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
          <Button
              variant="ghost"
              size="icon"
              className={`border-border dark:bg-transparent size-8 rounded-lg border`}
              aria-label={isUserSpeaking ? "Stop recording" : "Start recording"}
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