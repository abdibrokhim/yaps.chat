"use client"

import React from "react"
import { RefreshCw, X, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface UpdateBannerProps {
  onRefresh: () => void
  className?: string
}

export function UpdateBanner({ onRefresh, className }: UpdateBannerProps) {
  return (
    <div 
      className={cn(
        "w-full bg-zinc-100 dark:bg-zinc-800/70 text-zinc-800 dark:text-zinc-200 px-4 py-2 flex items-center justify-between rounded-lg shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm">
        <Info className="h-4 w-4" />
        <span>New version available!</span>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm"
          className="h-7 px-2 text-zinc-700 dark:text-zinc-300 border border-zinc-400/30 dark:border-zinc-500/30 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/50 cursor-pointer transition-all duration-200"
          onClick={onRefresh}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh now
        </Button>
      </div>
    </div>
  )
} 