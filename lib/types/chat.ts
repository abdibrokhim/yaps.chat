export type MessageType = 'text' | 'file' | 'notification';

export type MessageRole = 'user' | 'assistant';

export type BaseMessage = {
  id: string;                // unique message ID
  sender: string;            // sender's ID
  isOwnMessage: boolean;     // for frontend render logic
  replyToId?: string;        // replying to which message
  messageIndex?: number;     // optional local index
  role: MessageRole;         // user | assistant
  type: MessageType;         // text | file | notification
  timestamp: number;         // epoch ms
};

export type TextMessage = BaseMessage & {
  type: 'text';
  content: string;
};

export type FileMessage = BaseMessage & {
  type: 'file';
  fileName: string;
  fileSize: number;
  fileType: string;         // e.g. "application/pdf"
  fileData: ArrayBuffer;    // encrypted binary data
};

export type NotificationMessage = BaseMessage & {
  type: 'notification';
  content: string;
};

type ImageMessage = BaseMessage & {
    type: 'image';
    imageUrl: string;
};
  

export type Message = TextMessage | FileMessage | NotificationMessage | ImageMessage;
  
export type Preference = "group";

export type RoomType = "couple" | "group";

export type GroupJoinMethod = "create" | "join";