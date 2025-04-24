'use client'

import { Header } from "./header"
import { Footer } from "./footer"
import { FeedbackWidget } from "./feedback-widget"
import { UpdateBanner } from "../essentials/update-app-banner"
import { APP_VERSION } from "@/lib/config"
import { useState } from "react"
import { useAppVersion } from "@/hooks/use-local-storage"
import { db } from "@/lib/indexedDB"
import { useEffect } from "react"

export default function LayoutApp({
  children,
}: {
  children: React.ReactNode
}) {
  const { needsRefresh, updateVersion, isInitialized } = useAppVersion(APP_VERSION);
  const [showBanner, setShowBanner] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Only run client-side code after mounting to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Handle version checks after component mounts and DB is initialized
  useEffect(() => {
    if (mounted && isInitialized && needsRefresh) {
      setShowBanner(true);
    }
  }, [needsRefresh, mounted, isInitialized]);
  
  // Handle refresh action
  const handleRefresh = async () => {
    try {
      // Update version in IndexedDB directly before reload
      await db.version.setAppVersion(APP_VERSION);
      console.log('Version updated before refresh:', APP_VERSION);
      
      // Reload the page after a small delay to ensure DB is updated
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error('Error during refresh:', error);
      // Fallback: just reload
      window.location.reload();
    }
  };
  
  return (
    <div className="isolate">
      <div className="bg-background @container/mainview relative flex h-full w-full">
        <main className="@container relative h-dvh w-0 flex-shrink flex-grow">
          <Header />
          {/* {showBanner && (
            <div className="max-w-2xl mx-auto w-full mt-32 z-50">
              <UpdateBanner 
                onRefresh={handleRefresh}
              />
            </div>
          )} */}
          {children}
          <Footer />
        </main>
        <FeedbackWidget />
      </div>
    </div>
  )
}
