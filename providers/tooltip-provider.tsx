import React from "react"
import { TooltipProvider as ShadcnTooltipProvider } from "@/components/ui/tooltip"

interface TooltipProviderProps {
  children: React.ReactNode
}

export function TooltipProvider({ children }: TooltipProviderProps) {
  return <ShadcnTooltipProvider>{children}</ShadcnTooltipProvider>
} 