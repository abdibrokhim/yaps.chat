import {
  FileUpload,
  FileUploadContent,
  FileUploadTrigger,
} from "@/components/prompt-kit/file-upload"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { FileArrowUp, Paperclip } from "@phosphor-icons/react"
import React, { useMemo } from "react"
import { ALLOWED_FILE_TYPES } from "@/lib/file-handling"

type ButtonFileUploadProps = {
  onFileUpload: (files: File[]) => void
  disabled?: boolean
}

export function ButtonFileUpload({
  onFileUpload,
  disabled
}: ButtonFileUploadProps) {
  // Convert the allowed MIME types to an accept string for the input
  const acceptString = useMemo(() => {
    // Common file extensions mapping
    const mimeToExtension: Record<string, string> = {
      "image/jpeg": ".jpg,.jpeg",
      "image/png": ".png",
      "image/gif": ".gif",
      "application/pdf": ".pdf",
      "text/plain": ".txt",
      "text/markdown": ".md",
      "application/json": ".json",
      "text/csv": ".csv",
      "application/vnd.ms-excel": ".xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    };
    
    return ALLOWED_FILE_TYPES.map((type: string) => mimeToExtension[type] || type).join(',');
  }, []);
  
  return (
    <FileUpload
      onFilesAdded={onFileUpload}
      multiple
      accept={acceptString}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <FileUploadTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className={`border-border dark:bg-transparent size-8 rounded-full border bg-transparent dark:hover:bg-muted ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              type="button"
              aria-label="Add files"
              disabled={disabled}
            >
              <Paperclip className="size-4" />
            </Button>
          </FileUploadTrigger>
        </TooltipTrigger>
        <TooltipContent>Add files</TooltipContent>
      </Tooltip>
      <FileUploadContent>
        <div className="border-input bg-background flex flex-col items-center rounded-lg border border-dashed p-8">
          <FileArrowUp className="text-muted-foreground size-8" />
          <span className="mt-4 mb-1 text-lg font-medium">Drop files here</span>
          <span className="text-muted-foreground text-sm">
            Drop any files here to add it to the conversation
          </span>
        </div>
      </FileUploadContent>
    </FileUpload>
  )
}
