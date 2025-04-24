import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, ShieldCheckIcon } from "lucide-react";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import { GroupJoinMethod } from "@/lib/types/chat";

interface GroupChatOptionsProps {
  onStartGroupChat: (method: GroupJoinMethod, groupCode?: string) => void;
}

export const GroupChatOptions = ({ onStartGroupChat }: GroupChatOptionsProps) => {
  const [groupCode, setGroupCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleJoinByCode = () => {
    logger.info("GroupChatOptions", "Attempting to join by code", { groupCode });
    
    // Validate the group code (6-digit alphanumeric)
    if (!groupCode || groupCode.length !== 6 || !/^[a-zA-Z0-9]{6}$/.test(groupCode)) {
      toast(
        "Invalid group code", {
          description: `Please enter a valid 6-digit alphanumeric code`,
          action: {
            label: "Yaps!",
            onClick: () => console.log("dismiss"),
          },
          duration: 2000,
        },
      );
      logger.warn("GroupChatOptions", "Invalid group code format", { groupCode });
      return;
    }
    
    onStartGroupChat("join", groupCode);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && groupCode.trim()) {
      handleJoinByCode();
    }
  };

  const extractCodeFromInput = (input: string): string => {
    // Handle full URLs
    if (input.includes("://")) {
      const url = new URL(input);
      const pathSegments = url.pathname.split("/");
      const lastSegment = pathSegments[pathSegments.length - 1];
      return lastSegment.substring(0, 6);
    }
    
    // Handle path-only format (e.g. "/abc123")
    if (input.startsWith("/")) {
      return input.substring(1, 7);
    }

    // Handle direct code input
    return input.substring(0, 6);
  };

  return (
    <div className="w-full">
      <div className="w-full space-y-6">
       <div className="text-center">
          <p className="text-xs text-zinc-500 dark:text-zinc-500">Join private chat</p>
        </div>
        <div className="relative w-full">
          <Input
            ref={inputRef}
            placeholder="Enter chat code or link to join..."
            value={groupCode}
            onChange={(e) => {
              try {
                const input = e.target.value;
                // Extract code from URL or direct input
                const sanitizedCode = extractCodeFromInput(input)
                  .replace(/[^a-zA-Z0-9]/g, '')
                  .substring(0, 6);
                setGroupCode(sanitizedCode);
              } catch (error) {
                // If URL parsing fails, handle as direct input
                const sanitized = e.target.value.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6);
                setGroupCode(sanitized);
              }
            }}
            onKeyDown={handleKeyPress}
            className="pl-4 pr-12 h-11 transition-all duration-300 flex-1 bg-zinc-100 hover:bg-zinc-50 hover:dark:bg-zinc-900 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 dark:focus-visible:border-zinc-600 focus-visible:border-zinc-600 rounded-full"
          />
          {groupCode.trim() ? (
            <div className="absolute right-1 top-1/2 -translate-y-1/2">
              <Button 
                size="icon" 
                disabled={!groupCode.trim()}
                className="transition-all duration-300 bg-zinc-950 hover:bg-zinc-900 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 cursor-pointer rounded-full"
                onClick={handleJoinByCode}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            null
          )}
        </div>
        <div className="text-center">
          <p className="text-xs text-zinc-500 dark:text-zinc-500">or</p>
        </div>
        <Button 
          variant="outline"
          className="w-full h-11 transition-all duration-300 bg-zinc-950 dark:bg-white border-zinc-800 dark:border-zinc-200 hover:bg-zinc-900 dark:hover:bg-zinc-100 cursor-pointer text-white dark:text-zinc-950 hover:text-zinc-100 rounded-full"
          onClick={() => onStartGroupChat("create")}
        >
          <ShieldCheckIcon className="mr-1 h-4 w-4" />
          Start new private chat
        </Button>
      </div>
    </div>
  );
};