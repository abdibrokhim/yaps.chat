"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { 
  Sunglasses, 
  SunDim, 
  MoonStars, 
  Browser, 
  LockKey, 
  Waveform, 
  SpeakerSimpleHigh, 
  SpeakerSimpleSlash,
  CaretRight,
  CaretLeft,
  Palette, 
  PaintRoller
} from "@phosphor-icons/react/dist/ssr"
import { GearSix } from "@phosphor-icons/react/dist/ssr"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ResponsiveDialog } from "@/components/common/responsive-dialog"
import { toast } from "sonner"
import { playNotificationSound } from "@/lib/audio"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import Link from "next/link"

type SettingsTab = "appearance" | "sound" | "privacy"

export function SettingsDialog() {
  const { theme, setTheme } = useTheme()
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance")
  const [mobileSubview, setMobileSubview] = useState(false)
  const isMobile = !useMediaQuery("(min-width: 768px)")

  // After mounting, we can safely show the UI that depends on client-side data
  useEffect(() => {
    setMounted(true)
    
    // Load sound preference from localStorage on mount
    const storedSoundPreference = localStorage.getItem('soundEnabled')
    if (storedSoundPreference !== null) {
      setSoundEnabled(storedSoundPreference === 'true')
    }
  }, [])

  // Reset mobile view when dialog is closed
  useEffect(() => {
    if (!open) {
      setMobileSubview(false)
    }
  }, [open])

  // Toggle notification sound
  const toggleSound = () => {
    const newValue = !soundEnabled
    setSoundEnabled(newValue)
    localStorage.setItem('soundEnabled', newValue.toString())
    
    toast(
      newValue ? "Notifications enabled" : "Notifications muted", {
        description: newValue 
          ? "You will now hear notification sounds." 
          : "You will not hear notification sounds.",
        action: {
          label: "Yaps!",
          onClick: () => console.log("dismiss"),
        },
        duration: 2000,
      },
    )
  }

  // Test notification sound
  const testSound = () => {
    playNotificationSound('/audio/yapsnotify.mp3', 0.7)
    toast(
      "Testing notification sound", {
        description: "This is how notifications will sound.",
        action: {
          label: "Yaps!",
          onClick: () => console.log("dismiss"),
        },
        duration: 2000,
      },
    )
  }

  // Handle navigation in mobile view
  const handleMobileNavigation = (tab: SettingsTab) => {
    setActiveTab(tab)
    setMobileSubview(true)
  }

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) return null

  // Mobile settings option item
  const MobileSettingsItem = ({ 
    icon, 
    label, 
    onClick 
  }: { 
    icon: React.ReactNode, 
    label: string, 
    onClick: () => void 
  }) => (
    <button
      className="flex items-center justify-between w-full px-4 py-3 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all duration-200 rounded-lg"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="text-zinc-700 dark:text-zinc-300">
          {icon}
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <CaretRight className="size-4 text-zinc-400 dark:text-zinc-500" />
    </button>
  )

  const mobileBackHeader = (
    <div className="flex items-center mb-6">
      <button 
        className="flex items-center gap-1 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg p-2"
        onClick={() => setMobileSubview(false)}
      >
        <CaretLeft className="size-4" />
      </button>
    </div>
  )

  // Mobile view content
  const renderMobileContent = () => {
    if (mobileSubview) {
      return (
        <>
          {mobileBackHeader}
          {activeTab === "appearance" && (
            <div className="space-y-6 px-2">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <label 
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 cursor-pointer transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-900",
                      theme === "light" ? "bg-zinc-200/50 dark:bg-zinc-800/50 border-zinc-400 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100" : ""
                    )}
                  >
                    <Sunglasses className="size-5" />
                    <span className="text-xs font-medium">Light</span>
                    <input 
                      type="radio" 
                      name="theme" 
                      value="light" 
                      checked={theme === "light"}
                      onChange={() => setTheme("light")}
                      className="sr-only"
                    />
                  </label>
                  <label 
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 cursor-pointer transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-900",
                      theme === "dark" ? "bg-zinc-200/50 dark:bg-zinc-800/50 border-zinc-400 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100" : ""
                    )}
                  >
                    <MoonStars className="size-5" />
                    <span className="text-xs font-medium">Dark</span>
                    <input 
                      type="radio" 
                      name="theme" 
                      value="dark" 
                      checked={theme === "dark"}
                      onChange={() => setTheme("dark")}
                      className="sr-only"
                    />
                  </label>
                  <label 
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 cursor-pointer transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-900",
                      theme === "system" ? "bg-zinc-200/50 dark:bg-zinc-800/50 border-zinc-400 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100" : ""
                    )}
                  >
                    <Browser className="size-5" />
                    <span className="text-xs font-medium">System</span>
                    <input 
                      type="radio" 
                      name="theme" 
                      value="system" 
                      checked={theme === "system"}
                      onChange={() => setTheme("system")}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === "sound" && (
            <div className="space-y-4 px-2">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Notifications</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Control audio notifications when messages arrive
                </p>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    {soundEnabled ? (
                      <SpeakerSimpleHigh className="size-4" />
                    ) : (
                      <SpeakerSimpleSlash className="size-4" />
                    )}
                    <span className="text-sm">
                      Notification sounds
                    </span>
                  </div>
                  <Button
                    variant={soundEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={toggleSound}
                    className="cursor-pointer"
                  >
                    {soundEnabled ? "Enabled" : "Disabled"}
                  </Button>
                </div>
                
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testSound}
                    disabled={!soundEnabled}
                    className="cursor-pointer"
                  >
                    Test sound
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === "privacy" && (
            <div className="space-y-4 px-2">
              <div className="flex items-center gap-2">
                <LockKey className="size-5 text-zinc-700 dark:text-zinc-300" />
                <h4 className="text-sm font-medium">End-to-End Encrypted</h4>
              </div>
              
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                yaps[dot]chat uses end-to-end encryption for all messages. This means:
              </p>
              
              <ul className="space-y-2 text-xs text-zinc-500 dark:text-zinc-400 list-disc pl-5 mt-2">
                <li>Messages are encrypted on your device before being sent</li>
                <li>Only you and your chat partner(s) can read the messages</li>
                <li>Messages are never stored on our servers</li>
                <li>When the chat ends, messages are gone forever</li>
                <li>Even we cannot read your messages</li>
                <li>Just <Link href="/" className="hover:text-primary italic">refresh</Link> to delete</li>
              </ul>
              
              <Separator className="my-2 bg-zinc-200 dark:bg-zinc-800" />
              
              <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                Your privacy is our priority. yaps[dot]chat was built to provide a truly private messaging experience.
              </p>
            </div>
          )}
        </>
      )
    }
    
    // Main mobile menu
    return (
      <div className="space-y-2">
        <MobileSettingsItem 
          icon={<PaintRoller className="size-5" />}
          label="Appearance"
          onClick={() => handleMobileNavigation("appearance")}
        />
        <MobileSettingsItem 
          icon={<Waveform className="size-5" />}
          label="Sound" 
          onClick={() => handleMobileNavigation("sound")}
        />
        <MobileSettingsItem 
          icon={<LockKey className="size-5" />}
          label="Privacy" 
          onClick={() => handleMobileNavigation("privacy")}
        />
      </div>
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="ghost" size="icon" className="rounded-full cursor-pointer">
          <GearSix className="size-4" />
          <span className="sr-only">Settings</span>
        </Button>
      }
      title={isMobile && mobileSubview ? 
        (activeTab === "appearance" ? "Appearance" : 
         activeTab === "sound" ? "Sound" : "Privacy") 
        : "Settings"}
      description={isMobile && mobileSubview ? undefined : "Customize your chat experience"}
      contentClassName="sm:max-w-[700px] rounded-3xl"
      footer={null}
    >
      {isMobile ? (
        <div className="h-full pb-32">
          {renderMobileContent()}
        </div>
      ) : (
        <div className="flex flex-col md:flex-row h-[400px] gap-6 pt-4">
          {/* Navigation Sidebar */}
          <div className="md:w-56 flex flex-row md:flex-col overflow-auto space-y-2 pb-1">
            <NavItem 
              icon={<PaintRoller className="size-4" />}
              label="Appearance"
              active={activeTab === "appearance"}
              onClick={() => setActiveTab("appearance")}
            />
            <NavItem 
              icon={<Waveform className="size-4" />}
              label="Sound" 
              active={activeTab === "sound"}
              onClick={() => setActiveTab("sound")}
            />
            <NavItem 
              icon={<LockKey className="size-4" />}
              label="Privacy" 
              active={activeTab === "privacy"}
              onClick={() => setActiveTab("privacy")}
            />
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto ">
            {/* Appearance Tab */}
            {activeTab === "appearance" && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <label 
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 cursor-pointer transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-900",
                        theme === "light" ? "bg-zinc-200/50 dark:bg-zinc-800/50 border-zinc-400 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100" : ""
                      )}
                    >
                      <Sunglasses className="size-5" />
                      <span className="text-xs font-medium">Light</span>
                      <input 
                        type="radio" 
                        name="theme" 
                        value="light" 
                        checked={theme === "light"}
                        onChange={() => setTheme("light")}
                        className="sr-only"
                      />
                    </label>
                    <label 
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 cursor-pointer transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-900",
                        theme === "dark" ? "bg-zinc-200/50 dark:bg-zinc-800/50 border-zinc-400 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100" : ""
                      )}
                    >
                      <MoonStars className="size-5" />
                      <span className="text-xs font-medium">Dark</span>
                      <input 
                        type="radio" 
                        name="theme" 
                        value="dark" 
                        checked={theme === "dark"}
                        onChange={() => setTheme("dark")}
                        className="sr-only"
                      />
                    </label>
                    <label 
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 cursor-pointer transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-900",
                        theme === "system" ? "bg-zinc-200/50 dark:bg-zinc-800/50 border-zinc-400 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100" : ""
                      )}
                    >
                      <Browser className="size-5" />
                      <span className="text-xs font-medium">System</span>
                      <input 
                        type="radio" 
                        name="theme" 
                        value="system" 
                        checked={theme === "system"}
                        onChange={() => setTheme("system")}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
            
            {/* Sound Tab */}
            {activeTab === "sound" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Notifications</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Control audio notifications when messages arrive
                  </p>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      {soundEnabled ? (
                        <SpeakerSimpleHigh className="size-4" />
                      ) : (
                        <SpeakerSimpleSlash className="size-4" />
                      )}
                      <span className="text-sm">
                        Notification sounds
                      </span>
                    </div>
                    <Button
                      variant={soundEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={toggleSound}
                      className="cursor-pointer"
                    >
                      {soundEnabled ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                  
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={testSound}
                      disabled={!soundEnabled}
                    >
                      Test sound
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Privacy Tab */}
            {activeTab === "privacy" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <LockKey className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                  <h4 className="text-sm font-medium">End-to-End Encrypted</h4>
                </div>
                
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                  yaps[dot]chat uses end-to-end encryption for all messages. This means:
                </p>
                
                <ul className="space-y-2 text-xs text-zinc-500 dark:text-zinc-400 list-disc pl-5 mt-2">
                  <li>Messages are encrypted on your device before being sent</li>
                  <li>Only you and your chat partner(s) can read the messages</li>
                  <li>Messages are never stored on our servers</li>
                  <li>When the chat ends, messages are gone forever</li>
                  <li>Even we cannot read your messages</li>
                  <li>Just <Link href="/" className="hover:text-primary italic">refresh</Link> to delete</li>
                </ul>
                
                <Separator className="my-2 bg-zinc-200 dark:bg-zinc-900" />
                
                <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                  Your privacy is our priority. yaps[dot]chat was built to provide a truly private messaging experience.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </ResponsiveDialog>
  )
}

function NavItem({ 
  icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: React.ReactNode, 
  label: string, 
  active: boolean, 
  onClick: () => void 
}) {
  return (
    <button
      className={cn(
        "flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors cursor-pointer",
        active 
          ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-medium" 
          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  )
} 