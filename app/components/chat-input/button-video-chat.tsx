import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { VideoCamera } from "@phosphor-icons/react"
import React from "react"

type ButtonVideoChatProps = {
  onStartVideoChat: () => void
  disabled?: boolean
}

export function ButtonVideoChat({
  onStartVideoChat,
  disabled
}: ButtonVideoChatProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className={`border-border dark:bg-transparent size-8 rounded-full border bg-transparent dark:hover:bg-muted ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          type="button"
          aria-label="Start video chat"
          onClick={onStartVideoChat}
          disabled={disabled}
        >
          <VideoCamera className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Start video chat</TooltipContent>
    </Tooltip>
  )
} 