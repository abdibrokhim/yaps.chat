"use client"

import { cn } from "@/lib/utils"
import React from "react"

export interface LoaderProps {
  variant?: "loading-dots" | "user"
  size?: "sm" | "md" | "lg"
  text?: string
  className?: string
}

export function TextDotsLoader({
  className,
  text = "Thinking",
  size = "md",
  variant = "loading-dots",
}: {
  className?: string
  text?: string
  size?: "sm" | "md" | "lg"
  variant?: "loading-dots" | "user"
}) {
  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }

  return (
    <div className={cn("inline-flex items-center", className)}>
      <span className={cn(
        "font-base", 
        textSizes[size],
        variant === "user" ? "text-gray-700 dark:text-gray-300" : "text-primary"
      )}>
        {text}
      </span>
      <span className="inline-flex">
        <span className={cn(
          "animate-[loading-dots_1.4s_infinite_0.2s]",
          variant === "user" ? "text-gray-700 dark:text-gray-300" : "text-primary"
        )}>
          .
        </span>
        <span className={cn(
          "animate-[loading-dots_1.4s_infinite_0.4s]",
          variant === "user" ? "text-gray-700 dark:text-gray-300" : "text-primary"
        )}>
          .
        </span>
        <span className={cn(
          "animate-[loading-dots_1.4s_infinite_0.6s]",
          variant === "user" ? "text-gray-700 dark:text-gray-300" : "text-primary"
        )}>
          .
        </span>
      </span>
    </div>
  )
}

function Loader({ size = "md", text, className, variant = "loading-dots" }: LoaderProps) {
  return <TextDotsLoader text={text} size={size} className={className} variant={variant} />
}

export { Loader }
