import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Gif } from "@phosphor-icons/react/dist/ssr"
import React, { useState, useRef, useEffect } from "react"
import { Grid } from '@giphy/react-components'
import { GiphyFetch } from '@giphy/js-fetch-api'
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip"
import { TooltipTrigger } from "@/components/ui/tooltip"
import { TooltipContent } from "@/components/ui/tooltip"

// Initialize Giphy with API key
const gf = new GiphyFetch(process.env.GIPHY_API_KEY || "");

type ButtonGifPickerProps = {
  onGifSelect: (gif: any) => void
  disabled?: boolean
}

export function ButtonGifPicker({
  onGifSelect,
  disabled = false
}: ButtonGifPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Toggle GIF picker open/close
  const toggleGifPicker = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Toggle GIF picker, current state:", isOpen, "disabled:", disabled);
    
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };
  
  // Better controlled open/close handling 
  const handleOpenChange = (open: boolean) => {
    console.log("GIF picker open state changing to:", open);
    if (!disabled) {
      setIsOpen(open);
    }
  };
  
  // Handle GIF selection
  const handleGifClick = (gif: any) => {
    console.log("GIF selected:", gif.id);
    onGifSelect(gif);
    setIsOpen(false);
  };

  // Handle search input clicks to prevent popover closing
  const handleInputClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Use a slight delay to ensure the popover is fully rendered
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  
  // Custom event to open/close GIF picker from other components
  useEffect(() => {
    const handleToggleGifPicker = () => {
      if (!disabled) {
        setIsOpen(prev => !prev);
      }
    };

    document.addEventListener('toggleGifPicker', handleToggleGifPicker);
    return () => document.removeEventListener('toggleGifPicker', handleToggleGifPicker);
  }, [disabled]);

  return (
    <Popover 
      open={isOpen} 
      onOpenChange={handleOpenChange}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              ref={buttonRef}
              size="sm"
              variant="outline" 
              className={`border-border dark:bg-transparent size-8 rounded-full border bg-transparent dark:hover:bg-muted ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              type="button"
              aria-label="Add GIF"
              disabled={disabled}
              onClick={toggleGifPicker}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Gif className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Add GIF</TooltipContent>
      </Tooltip>
      <PopoverContent 
        ref={popoverRef}
        className="p-2 shadow-lg w-[350px] z-50" 
        side="top" 
        sideOffset={5} 
        align="start"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerDownOutside={(e) => {
          // Prevent interactions with tooltip from closing the popover
          const target = e.target as HTMLElement;
          if (target.closest('[role="tooltip"]')) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('[role="tooltip"]') || target.closest('button[aria-label="Add GIF"]')) {
            e.preventDefault();
          }
        }}
      >
        <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search GIFs..."
            className="w-full p-2 text-sm border rounded-md dark:bg-zinc-900 dark:border-zinc-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={handleInputClick}
            onPointerDown={(e) => e.stopPropagation()}
          />
          <div className="h-[350px] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <Grid
              key={searchTerm}
              onGifClick={handleGifClick}
              fetchGifs={(offset) => 
                searchTerm
                  ? gf.search(searchTerm, { offset, limit: 10 })
                  : gf.trending({ offset, limit: 10 })
              }
              width={326}
              columns={2}
              gutter={6}
              noLink={true}
              hideAttribution={true}
              className="cursor-pointer"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}