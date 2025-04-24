"use client"

import { useState, useEffect } from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

interface ResponsiveDialogProps {
  children: React.ReactNode
  trigger: React.ReactNode
  title?: React.ReactNode
  description?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  contentClassName?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ResponsiveDialog({
  children,
  trigger,
  title,
  description,
  footer,
  className = "",
  contentClassName = "",
  open,
  onOpenChange
}: ResponsiveDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Don't render anything during SSR
  if (!isMounted) {
    return null
  }
  
  // Custom rendering for description to avoid p > div hydration issues
  const renderDescription = () => {
    if (!description) return null;
    
    // If description is a primitive value (string, number), render it in DrawerDescription
    if (typeof description === 'string' || typeof description === 'number') {
      return <DrawerDescription className="text-center">{description}</DrawerDescription>;
    }
    
    // Otherwise render it directly without DrawerDescription wrapper
    return (
      <div className="text-muted-foreground text-sm text-center mt-1">
        {description}
      </div>
    );
  };

  // For larger screens, render Dialog
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        <DialogContent className={`${contentClassName}`}>
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {typeof description === 'string' || typeof description === 'number' 
              ? description && <DialogDescription>{description}</DialogDescription>
              : description && <div className="text-muted-foreground text-sm mt-1">{description}</div>
            }
          </DialogHeader>
          {children}
          {footer && <DialogFooter>{footer}</DialogFooter>}
        </DialogContent>
      </Dialog>
    )
  }
  
  // For mobile screens, render Drawer
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>
        {trigger}
      </DrawerTrigger>
      <DrawerContent className={className}>
        <DrawerHeader className="text-center">
          {title && <DrawerTitle className="text-center">{title}</DrawerTitle>}
          {renderDescription()}
        </DrawerHeader>
        <div className="px-2 overflow-y-auto pb-8">
          {children}
        </div>
        {footer && <DrawerFooter>{footer}</DrawerFooter>}
      </DrawerContent>
    </Drawer>
  )
} 