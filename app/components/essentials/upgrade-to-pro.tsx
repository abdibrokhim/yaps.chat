"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, BadgeCheck, Building2, MessageCircleMoreIcon, Paperclip, ShieldCheck, Sparkles, WandSparkles, WandSparklesIcon, Zap } from "lucide-react"
import { ResponsiveDialog } from "@/components/common/responsive-dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { GlowEffect } from "@/components/motion-primitives/glow-effect"
import { SlidingNumber } from "@/components/motion-primitives/sliding-number"
import { TextShimmer } from "../../../components/motion-primitives/text-shimmer"
import { GlowEffectButton } from "../../../components/motion-primitives/glow-effect-button"
import { EMAIL, FOOTER_TEXT } from "@/lib/config"

interface UpgradeToProDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger?: React.ReactNode
}

export function UpgradeToProDialog({ open, onOpenChange, trigger }: UpgradeToProDialogProps) {
  const shouldRenderTrigger = !!trigger
  const [price, setPrice] = useState(0)
  
  useEffect(() => {
    if (!open) {
      setPrice(0)
      return
    }
    
    if (price >= 999) return
    
    const interval = setInterval(() => {
      setPrice(prev => {
        // Increment by smaller amounts near the target value for smoother animation
        if (prev >= 950) {
          return Math.min(prev + 1, 999)
        }
        return Math.min(prev + 100, 999)
      })
    }, 10)
    
    return () => clearInterval(interval)
  }, [price, open])
  
  const dialogTitle = (
    <div className="flex items-center justify-center md:justify-start gap-2">
      <Zap className="h-5 w-5 text-amber-500" />
      <span>Pricing</span>
    </div>
  )
  
  const renderPremiumCard = () => (
    <div className="mt-4 space-y-4 bg-secondary/50 dark:bg-card/50 p-4 rounded-2xl border border-card flex flex-col">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Premium</h3>
        <div className="flex items-end">
          <span className="text-xl font-bold">$</span>
          <div className="text-2xl font-bold">
            <SlidingNumber value={price/100} />
          </div>
          <span className="text-zinc-500 dark:text-zinc-400 text-sm">/month</span>
        </div>
      </div>
      
      <div className="pt-2 border-t border-border/30 flex flex-col space-y-3">
        <div className="flex items-start gap-3">
          <MessageCircleMoreIcon className="mt-0.5 h-5 w-5 text-blue-500" />
          <div>
            <h4 className="font-medium">Unlimited message length</h4>
            <p className="text-sm text-muted-foreground">Say more with longer messages, no character limits</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 text-yellow-500" />
          <div>
            <h4 className="font-medium">Even more features</h4>
            <p className="text-sm text-muted-foreground">Reply to messages, use emojis, send gifs, and even more!</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <Paperclip className="mt-0.5 h-5 w-5 text-pink-500" />
          <div>
            <h4 className="font-medium">Higher file upload limits</h4>
            <p className="text-sm text-muted-foreground">Share larger files up to 10MB in size</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <BadgeCheck className="mt-0.5 h-5 w-5 text-green-500" />
          <div>
            <h4 className="font-medium">Priority support</h4>
            <p className="text-sm text-muted-foreground">Get 24/7 faster responses and dedicated assistance</p>
          </div>
        </div>
      </div>

      <GlowEffectButton 
        className="w-full mt-auto items-center justify-center cursor-pointer hover:bg-zinc-950/90"
        colors={['#FF5733', '#33FF57', '#3357FF', '#F1C40F']}
        onClick={() => window.open(EMAIL, "_blank")}
      >
        Upgrade now <ArrowRight className="h-4 w-4" />
      </GlowEffectButton>
    </div>
  )
  
  const renderEnterpriseCard = () => (
    <div className="mt-4 space-y-4 bg-secondary/50 dark:bg-card/50 p-4 rounded-2xl relative overflow-hidden border border-pink-500 shadow-[0_0_20px_rgba(219,39,119,0.5)] flex flex-col">
      
      <div className="flex justify-between items-center relative z-10">
        <TextShimmer className='text-xl font-bold' duration={1}>
          Enterprise
        </TextShimmer>
        <span className="text-zinc-500 dark:text-zinc-400 text-xs">Custom pricing</span>
      </div>
      
      <div className="pt-2 border-t border-border/30 relative z-10 flex flex-col space-y-3">
        <div className="flex items-start gap-3">
          <WandSparkles className="mt-0.5 h-5 w-5 text-rose-500" />
          <div>
            <h4 className="font-medium">Everything in Premium, plus:</h4>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Building2 className="mt-0.5 h-5 w-5 text-violet-500" />
          <div>
            <h4 className="font-medium">Dedicated account manager</h4>
            <p className="text-sm text-muted-foreground">Your personal contact for all your needs</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 text-amber-500" />
          <div>
            <h4 className="font-medium">Custom features</h4>
            <p className="text-sm text-muted-foreground">Tailored solutions for your organization</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-cyan-500" />
          <div>
            <h4 className="font-medium">Enterprise-grade security</h4>
            <p className="text-sm text-muted-foreground">Advanced security and compliance features</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <BadgeCheck className="mt-0.5 h-5 w-5 text-emerald-500" />
          <div>
            <h4 className="font-medium">SLA guarantees</h4>
            <p className="text-sm text-muted-foreground">99.9% uptime and priority enterprise support</p>
          </div>
        </div>
      </div>
      
      <div className="relative mt-auto">
        <GlowEffectButton 
          className="w-full items-center justify-center cursor-pointer bg-pink-500 oulilne-[#db2777] hover:bg-pink-500/90"
          colors={["#db2777", "#ec4899", "#be185d", "#9d174d"]}
          onClick={() => window.open(`mailto:${EMAIL}?subject=Enterprise Plan Inquiry&body=Hi, I am an enterprise customer interested in your enterprise plan. I would like to learn more about the features and pricing options available.`, "_blank")}
        >
          Contact sales <ArrowRight className="h4 w-4" />
        </GlowEffectButton>
      </div>
    </div>
  )
  
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={shouldRenderTrigger ? trigger : undefined}
      title={dialogTitle}
      description="Simple and transparent pricing for all your needs"
      contentClassName="sm:max-w-3xl rounded-3xl"
      className="pb-2 min-h-[90vh]"
    >
      {/* Mobile view with tabs */}
      <div className="md:hidden w-full mt-2">
        <Tabs defaultValue="premium" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="premium">Premium</TabsTrigger>
            <TabsTrigger value="enterprise">Enterprise</TabsTrigger>
          </TabsList>
          <TabsContent value="premium">
            {renderPremiumCard()}
          </TabsContent>
          <TabsContent value="enterprise">
            {renderEnterpriseCard()}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Desktop view with side-by-side cards */}
      <div className="hidden md:grid md:grid-cols-2 md:gap-4 mt-0">
        {renderPremiumCard()}
        {renderEnterpriseCard()}
      </div>

      <p className="text-[9px] dark:text-zinc-700 text-zinc-300 text-center mt-4">{FOOTER_TEXT}</p>
    </ResponsiveDialog>
  )
} 