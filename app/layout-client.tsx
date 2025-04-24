"use client"

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner";
import { VideoChatProvider } from "@/app/components/video-chat/video-chat-provider";
// import { LogViewer } from "./components/essentials/log-viewer";

export function LayoutClient({ 
    children 
  }: { 
    children: React.ReactNode 
  }) {
  
  return (
    <TooltipProvider>
        <ThemeProvider
            enableSystem={true}
            attribute="class"
            storageKey="theme"
            defaultTheme="dark"
        >
          <VideoChatProvider>
            <Toaster position="bottom-right" theme="dark" />
            {children}
            {/* <LogViewer /> */}
          </VideoChatProvider>
        </ThemeProvider>
    </TooltipProvider>
  );
}
