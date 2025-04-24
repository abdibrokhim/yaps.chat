"use client"

import { LockKey, User, Users } from "@phosphor-icons/react/dist/ssr"
import { TooltipContent } from "@/components/ui/tooltip"
import { Tooltip } from "@/components/ui/tooltip"
import { TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import { ShareGroupCodeDialog } from "@/app/components/essentials/share-group-code"
import { UpgradeToProDialog } from "@/app/components/essentials/upgrade-to-pro"

type ChatHeaderProps = {
  isGroupChat?: boolean
  activeGroupCode?: string
  groupMembers?: any[]
}

export function ChatHeader({ 
  isGroupChat = false, 
  activeGroupCode, 
  groupMembers = [] 
}: ChatHeaderProps) {
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)

  return (
    <>
      <div className="flex w-full items-center justify-between py-4">
        <div className="flex-1 flex justify-center items-center gap-4">
          {isGroupChat && activeGroupCode && (
            <div className="flex items-center space-x-8">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-0 z-20">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <LockKey className="size-4" />
                    </div>
                    <Badge 
                      variant="ghost" 
                      className="text-sm cursor-pointer m-0 text-muted-foreground hover:text-primary"
                      onClick={() => setShowShareDialog(true)}
                      >
                      {activeGroupCode}
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Click to share this chat</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center text-xs text-muted-foreground z-20">
                    {groupMembers.length > 1 
                      ? <Users className="size-4 mr-2" />
                      : <User className="size-4 mr-2" />
                    }
                    <span className="text-sm">{groupMembers.length}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Group members</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </div>

      {/* upgrade to pro dialog */}
      <UpgradeToProDialog 
        open={showUpgradeDialog} 
        onOpenChange={setShowUpgradeDialog} 
      />

      {/* Share Group Code Dialog */}
      {activeGroupCode && (
        <ShareGroupCodeDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          groupCode={activeGroupCode}
        />
      )}
    </>
  )
}