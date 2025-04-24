import { toast } from "sonner"
import * as fileType from "file-type"
import { MAX_FILE_SIZE } from "@/lib/config"

export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/json",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]

export type Attachment = {
  name: string
  contentType: string
  url: string
}

export async function validateFile(
  file: File
): Promise<{ isValid: boolean; error?: string }> {
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
    }
  }

  const buffer = await file.arrayBuffer()
  const type = await fileType.fileTypeFromBuffer(
    Buffer.from(buffer.slice(0, 4100))
  )

  if (!type || !ALLOWED_FILE_TYPES.includes(type.mime)) {
    return {
      isValid: false,
      error: "File type not supported or doesn't match its extension",
    }
  }

  return { isValid: true }
}

// Create a local file URL for the browser
export async function createLocalFileURL(file: File): Promise<string> {
  return URL.createObjectURL(file);
}

export function createAttachment(file: File, url: string): Attachment {
  return {
    name: file.name,
    contentType: file.type,
    url: url,
  }
}

export async function processFiles(
  files: File[],
  chatId: string,
  userId: string
): Promise<Attachment[]> {
  const attachments: Attachment[] = [];

  for (const file of files) {
    const validation = await validateFile(file);
    if (!validation.isValid) {
      console.warn(`File ${file.name} validation failed:`, validation.error);
      toast.error(validation.error);
      continue;
    }

    try {
      // Create local URL for the file
      const url = await createLocalFileURL(file);
      
      const attachment = createAttachment(file, url);
      attachments.push(attachment);
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
    }
  }

  return attachments;
}
