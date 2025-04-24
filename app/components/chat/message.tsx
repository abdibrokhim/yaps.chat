"use client"

import { Message as MessageType, NotificationMessage, FileMessage, TextMessage } from "@/lib/types/chat"
import { useState } from "react"
import { MessageNotification } from "./message-notification"
import { MessageUser } from "./message-user"
import { toast } from "sonner"
import { useChatContext } from "@/app/components/layout/playground"
import { ShareGroupCodeDialog } from "@/app/components/essentials/share-group-code"

type Attachment = {
  name: string;
  contentType: string;
  size?: number;
  url: string;
};

export type MessageProps = {
  id: string
  variant: MessageType["role"]
  message: MessageType
  isLast?: boolean
  onDelete: (id: string) => void
  onEdit: (id: string, newText: string) => void
  onReload: () => void
  onReply?: (id: string) => void
  onDownload?: (attachment: any) => void
  hasScrollAnchor?: boolean
}

// Function to safely get content from different message types
const getMessageContent = (message: MessageType): string => {
  if (message.type === 'text') {
    return (message as TextMessage).content;
  } else if (message.type === 'notification') {
    return (message as NotificationMessage).content;
  } else if (message.type === 'file') {
    const fileMessage = message as FileMessage;
    return `File: ${fileMessage.fileName} (${fileMessage.fileSize} bytes)`;
  }
  return '';
};

// Create attachment array for file messages
const getAttachments = (message: MessageType): Attachment[] => {
  if (message.type === 'file') {
    const fileMessage = message as FileMessage;
    return [{
      name: fileMessage.fileName,
      contentType: fileMessage.fileType,
      size: fileMessage.fileSize,
      url: URL.createObjectURL(new Blob([fileMessage.fileData], { type: fileMessage.fileType }))
    }];
  }
  return [];
};

export function Message({
  id,
  variant,
  message,
  isLast,
  onDelete,
  onEdit,
  onReload,
  onReply,
  onDownload,
  hasScrollAnchor,
}: MessageProps) {
  const [copied, setCopied] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const { groupCode } = useChatContext();
  
  const isNotification = message.type === "notification"
  
  // Check if the message is from a file
  const isFileMessage = message.type === "file" && "fileData" in message

  // Default content is empty string
  let content = ""
  
  // Helper to handle message copying
  const handleCopy = async () => {
    if (isNotification) return

    if ("content" in message) {
      try {
        await navigator.clipboard.writeText(message.content)
        setCopied(true)
        toast.success("Copied to clipboard", {
          description: "Message content copied to clipboard.",
          duration: 1500,
        })
        setTimeout(() => setCopied(false), 1500)
      } catch (err) {
        console.error("Failed to copy text: ", err)
      }
    }
  }

  const handleToggleHide = () => {
    setHidden(!hidden)
    toast.info(hidden ? "Message visible" : "Message hidden", {
      description: hidden 
        ? "Message content is now visible." 
        : "Message content is now hidden from view.",
      duration: 1500,
    });
  };

  // Handle text messages
  if ("content" in message) {
    content = message.content
  }

  // Determine file name and url for file messages
  const attachments = isFileMessage
    ? [{
        name: (message as FileMessage).fileName || "file",
        contentType: (message as FileMessage).fileType || "application/octet-stream",
        size: (message as FileMessage).fileSize,
        url: URL.createObjectURL(new Blob([(message as FileMessage).fileData])),
      }]
    : []

  // Handle notification messages differently
  if (isNotification) {
    const notificationMessage = (message as NotificationMessage).content;

    // Check if it's a group code notification
    const isGroupCodeNotification = notificationMessage.includes("Group code:");
    if (isGroupCodeNotification && groupCode) {
      return (
        <>
          <MessageNotification 
            mKey={id + new Date().getTime()}
            notificationMessage={notificationMessage}
            groupCode={groupCode}
            onShowShareDialog={(show) => {
              setShowShareDialog(show);
            }}
          />
          
          {/* Share Group Code Dialog */}
          {groupCode && (
            <ShareGroupCodeDialog
              open={showShareDialog}
              onOpenChange={setShowShareDialog}
              groupCode={groupCode}
            />
          )}
        </>
      );
    }
    
    // Regular notification
    return (
      <div className="flex justify-center w-full py-2">
        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50 text-zinc-500 dark:text-zinc-400 rounded-md py-1 px-2 text-[10px]">
          {notificationMessage}
        </div>
      </div>
    );
  }

  // Handle user and assistant messages
  return (
    <MessageUser
      id={id}
      isOwnMessage={variant === "user"}
      hasScrollAnchor={hasScrollAnchor}
      content={content}
      copied={copied}
      copyToClipboard={handleCopy}
      onDelete={onDelete}
      onReply={onReply}
      onDownload={onDownload}
      attachments={attachments}
      isHidden={hidden}
      onToggleHide={handleToggleHide}
      sender={message.sender}
    />
  );
}
