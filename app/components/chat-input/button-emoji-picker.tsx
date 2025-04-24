'use client';

import { useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { HandPeace } from '@phosphor-icons/react/dist/ssr';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ButtonEmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
}

export function ButtonEmojiPicker({
  onEmojiSelect,
  disabled = false
}: ButtonEmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useTheme();
  const popoverRef = useRef<HTMLDivElement>(null);

  // Handle emoji selection
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    console.log("Emoji selected:", emojiData.emoji);
    onEmojiSelect(emojiData.emoji);
    setIsOpen(false);
  };

  return (
    <Popover
      key={'popover-emoji'}
      open={isOpen}
      defaultOpen={true}
      onOpenChange={(open) => !disabled && setIsOpen(open)}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className={`border-border dark:bg-transparent size-8 rounded-full border bg-transparent dark:hover:bg-muted ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              type="button"
              aria-label="Add Emoji"
              disabled={disabled}
            >
              <HandPeace className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Add Emoji</TooltipContent>
      </Tooltip>
      <PopoverContent
        ref={popoverRef}
        className="absoulte p-0 border-none shadow-lg z-50"
        side="top"
        sideOffset={5}
        align="start"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('[role="tooltip"]')) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('[role="tooltip"]') || target.closest('button[aria-label="Add Emoji"]')) {
            e.preventDefault();
          }
        }}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
            searchDisabled={false}
            skinTonesDisabled={false}
            lazyLoadEmojis={true}
            width={300}
            height={400}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}