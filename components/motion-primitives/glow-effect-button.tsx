import { GlowEffect } from '@/components/motion-primitives/glow-effect';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type GlowEffectButtonProps = {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
  onClick?: () => void;
};

export function GlowEffectButton({ children, className, colors, onClick }: GlowEffectButtonProps) {
  return (
    <div className='relative'>
      <GlowEffect
        colors={colors}
        mode='colorShift'
        blur='soft'
        duration={3}
        scale={1}
      />
      <button 
        className={cn('relative inline-flex items-center gap-1 rounded-md bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-50 outline outline-1 outline-[#fff2f21f]', className)}
        onClick={onClick}
      >
        {children}
      </button>
    </div>
  );
}
