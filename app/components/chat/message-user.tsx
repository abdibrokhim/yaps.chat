"use client"

import {
  MorphingDialog,
  MorphingDialogClose,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogImage,
  MorphingDialogTrigger,
} from "@/components/motion-primitives/morphing-dialog"
import {
  MessageAction,
  MessageActions,
  Message as MessageContainer,
  MessageContent,
} from "@/components/prompt-kit/message"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Check, Copy, Trash, DownloadSimple, ArrowBendUpLeft, Eye, EyeSlash } from "@phosphor-icons/react"
import { useRef } from "react"
import { toast } from "sonner"

const getTextFromDataUrl = (dataUrl: string) => {
  const base64 = dataUrl.split(",")[1]
  return base64
}

type Attachment = {
  name: string;
  contentType: string;
  size?: number;
  url: string;
};

export type MessageUserProps = {
  isOwnMessage: boolean
  hasScrollAnchor?: boolean
  content: string
  copied: boolean
  copyToClipboard: () => void
  onDelete: (id: string) => void
  onReply?: (id: string) => void
  onDownload?: (attachment: Attachment) => void
  id: string
  attachments?: Attachment[]
  isHidden?: boolean
  onToggleHide?: () => void
  sender?: string
}

// Helper to format file size
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return "Unknown size";
  
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
};

export function MessageUser({
  isOwnMessage,
  hasScrollAnchor,
  content,
  copied,
  copyToClipboard,
  onDelete,
  onReply,
  onDownload,
  id,
  attachments = [],
  isHidden = false,
  onToggleHide,
  sender = "User"
}: MessageUserProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  // Format username for display
  const displayName = isOwnMessage ? "You" : (sender && sender.startsWith("User_") ? sender : `User_${sender.substring(0, 5)}`);

  const handleDelete = () => {
    onDelete(id)
  }

  const handleReply = () => {
    if (onReply) {
      onReply(id)
      toast("Replying to message", {
        description: "Type your reply and send.",
        duration: 2000,
      })
    }
  }

  // Check if attachment is an image
  const isImageType = (contentType: string) => {
    return contentType && contentType.startsWith("image/")
  }

  // Check if attachment is a PDF
  const isPdfType = (contentType: string) => {
    return contentType === "application/pdf"
  }

  // Handle image download
  const handleDownload = (attachment: Attachment) => {
    if (onDownload) {
      onDownload(attachment);
    }
  };

  // Determine if content is just a placeholder for an image
  const isPlaceholderContent = content === "Image file" || content === "File" || content === "image.png";

  return (
    <MessageContainer
      className={cn(
        "group flex w-full flex-col gap-1",
        isOwnMessage ? "items-end pb-2" : "items-start pb-4",
        hasScrollAnchor && "min-h-scroll-anchor"
      )}
    >
      {attachments?.map((attachment, index) => (
        <div
          className="flex flex-row gap-2"
          key={`${attachment.name}-${index}`}
        >
          {isImageType(attachment.contentType) ? (
            <MorphingDialog
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 18,
                mass: 0.3,
              }}
            >
              <MorphingDialogTrigger className="z-10 relative">
                <div className="relative">
                  {!isOwnMessage && (
                    <div className="absolute -top-5 left-0 text-[10px] font-medium text-muted-foreground">
                      {displayName}
                    </div>
                  )}
                  <img
                    className="mb-1 w-40 rounded-md"
                    key={attachment.name}
                    src={attachment.url}
                    alt={attachment.name}
                  />
                  <Badge 
                    variant="secondary" 
                    className="absolute top-1 left-1 text-[10px] opacity-80"
                  >
                    {formatFileSize(attachment.size)}
                  </Badge>
                </div>
              </MorphingDialogTrigger>
              <MorphingDialogContainer>
                <MorphingDialogContent className="relative rounded-lg">
                  <MorphingDialogImage
                    src={attachment.url}
                    alt={attachment.name || ""}
                    className="max-h-[90vh] max-w-[90vw] object-contain"
                  />
                  <div className="absolute bottom-2 right-2 flex gap-2">
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={() => onDownload?.(attachment)}
                    >
                      <DownloadSimple className="mr-2 size-4" />
                      Download
                    </Button>
                  </div>
                </MorphingDialogContent>
                <MorphingDialogClose className="text-primary" />
              </MorphingDialogContainer>
            </MorphingDialog>
          ) : isPdfType(attachment.contentType) ? (
            <div className="flex flex-col">
              <div className="bg-primary/10 mb-1 flex h-32 w-40 items-center justify-center rounded-md border relative">
                <Badge 
                  variant="secondary" 
                  className="absolute top-1 left-1 text-[10px] opacity-80"
                >
                  {formatFileSize(attachment.size)}
                </Badge>
                <span className="text-primary flex flex-col items-center text-xs">
                  <svg className="mb-2 h-10 w-10" viewBox="0 0 384 512">
                    <path fill="currentColor" d="M320 464C328.8 464 336 456.8 336 448V416H384V448C384 483.3 355.3 512 320 512H64C28.65 512 0 483.3 0 448V416H48V448C48 456.8 55.16 464 64 464H320zM256 160C238.3 160 224 145.7 224 128V48H64C55.16 48 48 55.16 48 64V192H0V64C0 28.65 28.65 0 64 0H229.5C246.5 0 262.7 6.743 274.7 18.75L365.3 109.3C377.3 121.3 384 137.5 384 154.5V192H336V160H256zM88 224C118.9 224 144 249.1 144 280C144 310.9 118.9 336 88 336H80V368H88C136.6 368 176 328.6 176 280C176 231.4 136.6 192 88 192H56C42.75 192 32 202.8 32 216V408C32 421.3 42.75 432 56 432H80V400H56V224H88zM224 224H288V368H320V224H352V432H320V400H288V432H224V224zM176 400H208V368H176V400z"/>
                  </svg>
                  PDF Document
                </span>
              </div>
              <Button 
                size="sm" 
                variant="secondary" 
                className="w-full"
                onClick={() => onDownload?.(attachment)}
              >
                <DownloadSimple className="mr-1 size-3" />
                Download
              </Button>
            </div>
          ) : attachment.contentType?.startsWith("text") ? (
            <div className="text-primary mb-3 h-24 w-40 overflow-hidden rounded-md border p-2 text-xs relative">
              <Badge 
                variant="secondary" 
                className="absolute top-1 left-1 text-[10px] opacity-80"
              >
                {formatFileSize(attachment.size)}
              </Badge>
              {getTextFromDataUrl(attachment.url)}
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="bg-accent mb-1 flex h-24 w-40 items-center justify-center rounded-md border relative">
                <Badge 
                  variant="secondary" 
                  className="absolute top-1 left-1 text-[10px] opacity-80"
                >
                  {formatFileSize(attachment.size)}
                </Badge>
                <span className="text-muted-foreground flex flex-col items-center text-xs">
                  <svg className="mb-1 h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {attachment.name || "File"}
                </span>
              </div>
              <Button 
                size="sm" 
                variant="secondary" 
                className="w-full"
                onClick={() => onDownload?.(attachment)}
              >
                <DownloadSimple className="mr-1 size-3" />
                Download
              </Button>
            </div>
          )}
        </div>
      ))}
      {!isOwnMessage && !(attachments.length > 0) && (
        <div className="text-[10px] font-medium text-muted-foreground mb-0.5">
          {displayName}
        </div>
      )}
      {!(attachments.length > 0) && (
        <MessageContent
          className={cn(
            "relative max-w-[70%] rounded-3xl px-4 py-2",
            isOwnMessage 
              ? "bg-muted text-foreground" 
              : "bg-popover text-foreground",
            isHidden && "blur-sm hover:blur-xs transition-all duration-200"
          )}
          markdown={true}
          ref={contentRef}
        >
          {content}
        </MessageContent>
      )}
      <MessageActions className={`flex gap-0 opacity-0 transition-opacity group-hover:opacity-100 ${!isOwnMessage ? "flex-row-reverse" : ""}`}>
        {onReply && (
          <MessageAction
            tooltip="Reply to message"
            side="bottom"
            delayDuration={0}
          >
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent transition"
              aria-label="Reply to message"
              onClick={handleReply}
              type="button"
            >
              <ArrowBendUpLeft className="size-4" />
            </button>
          </MessageAction>
        )}
        <MessageAction
          tooltip={copied ? "Copied!" : "Copy text"}
          side="bottom"
          delayDuration={0}
        >
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent transition"
            aria-label="Copy text"
            onClick={copyToClipboard}
            type="button"
          >
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
        </MessageAction>
        {attachments.length > 0 && (
          <MessageAction
            tooltip="Download attachments"
            side="bottom"
            delayDuration={0}
          >
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent transition"
              aria-label="Download attachments"
              onClick={() => attachments.forEach(attachment => onDownload?.(attachment))}
              type="button"
            >
              <DownloadSimple className="size-4" />
            </button>
          </MessageAction>
        )}
        {onToggleHide && (
          <MessageAction 
            tooltip={isHidden ? "Show message" : "Hide message"}
            side="bottom"
            delayDuration={0}
          >
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent transition"
              aria-label={isHidden ? "Show message" : "Hide message"}
              onClick={onToggleHide}
              type="button"
            >
              {isHidden ? <Eye className="size-4" /> : <EyeSlash className="size-4" />}
            </button>
          </MessageAction>
        )}
        <MessageAction
          tooltip="Delete message"
          side="bottom"
          delayDuration={0}
        >
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent transition hover:text-red-500"
            aria-label="Delete message"
            onClick={handleDelete}
            type="button"
          >
            <Trash className="size-4" />
          </button>
        </MessageAction>
      </MessageActions>
    </MessageContainer>
  )
}
