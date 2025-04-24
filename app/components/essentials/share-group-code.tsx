"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Check, Copy, Link as LinkIcon, Share, Users } from "@phosphor-icons/react/dist/ssr"
import { ResponsiveDialog } from "@/components/common/responsive-dialog"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
import { FOOTER_TEXT } from "@/lib/config"

interface ShareGroupCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupCode: string
  trigger?: React.ReactNode
}

export function ShareGroupCodeDialog({ open, onOpenChange, groupCode, trigger }: ShareGroupCodeDialogProps) {
  // If no trigger is provided, don't render one (dialog will be controlled by open/onOpenChange)
  const shouldRenderTrigger = !!trigger
  
  const [isCopied, setIsCopied] = React.useState(false)
  const [isLinkCopied, setIsLinkCopied] = React.useState(false)
  const [shareUrl, setShareUrl] = React.useState(``)
  const isMobile = !useMediaQuery("(min-width: 768px)")
  
  const handleCopyGroupCode = () => {
    navigator.clipboard.writeText(groupCode)
    setIsCopied(true)
    toast(
      "Code copied", {
        description: "Group code copied to clipboard.",
        action: {
          label: "Yaps!",
          onClick: () => console.log("dismiss"),
        },
        duration: 2000,
      },
    )
    
    // Reset copied state after 2 seconds
    setTimeout(() => {
      setIsCopied(false)
    }, 2000)
  }

  const handleCopyShareLink = () => {
    const shareUrl = `https://yaps.chat/${groupCode}`
    navigator.clipboard.writeText(shareUrl)
    setIsLinkCopied(true)
    toast(
      "Share link copied", {
        description: "Shareable link copied to clipboard.",
        action: {
          label: "Yaps!",
          onClick: () => console.log("dismiss"),
        },
        duration: 2000,
      },
    )
    
    // Reset copied state after 2 seconds
    setTimeout(() => {
      setIsLinkCopied(false)
    }, 2000)
  }

  React.useEffect(() => {
    setShareUrl(`https://yaps.chat/${groupCode}`)
  }, [groupCode])
  
  const dialogTitle = (
    <div className="flex items-center justify-center md:justify-start gap-2">
      <span>Share This Chat</span>
    </div>
  )
  
  // Section for "How to share this chat?"
  const ShareMethodsContent = () => (
    <div className="space-y-4">
      <h3 className="font-medium text-center md:text-left">How to share this chat?</h3>
      <div className="bg-secondary/50 dark:bg-card/50 p-4 rounded-2xl space-y-4">
        <div className="flex items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary rounded-full p-2">
              <Users className="size-4" />
            </div>
            <span className="text-sm">Just share the code</span>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-2"
            onClick={handleCopyGroupCode}
          >
            {isMobile ? groupCode.substring(0, 6) + "..." : groupCode}
            {isCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>
        
        <div className="flex items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary rounded-full p-2">
              <LinkIcon className="size-4" />
            </div>
            <span className="text-sm">Or link</span>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-2"
            onClick={handleCopyShareLink}
          >
            {shareUrl}
            {isLinkCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
  
  // Section for "How others join this chat?"
  const JoinInstructionsContent = () => (
    <div className="space-y-4">
      <h3 className="font-medium text-center md:text-left">How others join this chat?</h3>
      <div className="bg-secondary/50 dark:bg-card/50 p-4 rounded-2xl space-y-4">
        <div className="flex justify-center">
          <Image 
            src="/assets/yapsdotchat-ui.png"
            alt="UI to enter group code" 
            width={400} 
            height={180}
            className="rounded-xl shadow-sm border border-border w-full h-auto max-w-[400px]"
          />
        </div>
        
        <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-2">
          <li>Go to <Link href="https://yaps.chat" className="font-medium text-foreground hover:text-primary italic">yaps.chat</Link>. You'll see same UI as above.</li>
          <li>Paste the <span className="font-medium text-foreground italic">code</span> or <span className="font-medium text-foreground italic">link</span> then, Click <span className="font-medium text-foreground italic">arrow right</span> button.</li>
        </ol>
      </div>
    </div>
  )
  
  // Navigation items for the sidebar
  const NavItem = ({ 
    icon, 
    label, 
    active = true
  }: { 
    icon: React.ReactNode, 
    label: string, 
    active?: boolean
  }) => (
    <div
      className={cn(
        "flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors",
        active 
          ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-medium" 
          : "text-zinc-600 dark:text-zinc-400"
      )}
    >
      {icon}
      {label}
    </div>
  )
  
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={shouldRenderTrigger ? trigger : undefined}
      title={dialogTitle}
      description="Share the code/link with others. Talk in private."
      contentClassName="sm:max-w-[700px] sm:max-h-[80vh] overflow-y-auto rounded-3xl"
      className="min-h-[90vh]"
    >
      {isMobile ? (
        // Mobile view - single column layout
        <div className="mt-4 space-y-6">
          <ShareMethodsContent />
          <JoinInstructionsContent />
        </div>
      ) : (
        // Desktop view - two column layout
        <div className="flex flex-col md:flex-row h-[380px] gap-6 pt-4">
          {/* Navigation Sidebar */}
          <div className="md:w-56 flex flex-row md:flex-col overflow-auto space-y-2 pb-1">
            <NavItem 
              icon={<Share className="size-4" />}
              label="Sharing Options"
              active={true}
            />
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto space-y-8">
            <ShareMethodsContent />
            <JoinInstructionsContent />
          </div>
        </div>
      )}

      <p className="text-[9px] dark:text-zinc-700 text-zinc-300 text-center">{FOOTER_TEXT}</p>
    </ResponsiveDialog>
  )
} 