import { ReactNode, useEffect, useState, useRef } from "react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";
import { toast } from "sonner";

interface OnboardingSpotlightProps {
  children: ReactNode;
  tooltipKey: 'hasSeenActorTooltip' | 'hasSeenScriptTooltip' | 'hasSeenGenerateTooltip' | 'hasSeenCreditsTooltip';
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  step: number;
  totalSteps?: number;
  spotlightPadding?: number;
}

interface TooltipPos {
  top: number;
  left: number;
  arrowSide: 'top' | 'bottom' | 'left' | 'right';
}

function SvgArrow({ side }: { side: 'top' | 'bottom' | 'left' | 'right' }) {
  const style: React.CSSProperties = { position: 'absolute' };
  const size = 10;

  if (side === 'top') {
    Object.assign(style, { top: -size, left: '50%', transform: 'translateX(-50%)' });
    return (
      <svg style={style} width={size * 2} height={size} viewBox={`0 0 ${size * 2} ${size}`}>
        <path d={`M0 ${size} L${size} 0 L${size * 2} ${size}`} fill="white" />
      </svg>
    );
  }
  if (side === 'bottom') {
    Object.assign(style, { bottom: -size, left: '50%', transform: 'translateX(-50%)' });
    return (
      <svg style={style} width={size * 2} height={size} viewBox={`0 0 ${size * 2} ${size}`}>
        <path d={`M0 0 L${size} ${size} L${size * 2} 0`} fill="white" />
      </svg>
    );
  }
  if (side === 'left') {
    Object.assign(style, { left: -size, top: '50%', transform: 'translateY(-50%)' });
    return (
      <svg style={style} width={size} height={size * 2} viewBox={`0 0 ${size} ${size * 2}`}>
        <path d={`M${size} 0 L0 ${size} L${size} ${size * 2}`} fill="white" />
      </svg>
    );
  }
  // right
  Object.assign(style, { right: -size, top: '50%', transform: 'translateY(-50%)' });
  return (
    <svg style={style} width={size} height={size * 2} viewBox={`0 0 ${size} ${size * 2}`}>
      <path d={`M0 0 L${size} ${size} L0 ${size * 2}`} fill="white" />
    </svg>
  );
}

export function OnboardingSpotlight({
  children,
  tooltipKey,
  title,
  description,
  position = 'bottom',
  step,
  totalSteps = 4,
  spotlightPadding = 8,
}: OnboardingSpotlightProps) {
  const { shouldShowTooltip, markTooltipSeen, completeOnboarding } = useOnboarding();
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<TooltipPos | null>(null);
  const [elementRect, setElementRect] = useState<DOMRect | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(shouldShowTooltip(tooltipKey)), 300);
    return () => clearTimeout(timer);
  }, [shouldShowTooltip, tooltipKey]);

  useEffect(() => {
    if (!isVisible || !elementRef.current) return;

    const calculate = () => {
      const el = elementRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setElementRect(rect);

      const tw = 300, th = 160, gap = 14;
      const vw = window.innerWidth, vh = window.innerHeight;

      let top = 0, left = 0;
      let arrowSide: TooltipPos['arrowSide'] = position;

      switch (position) {
        case 'bottom': top = rect.bottom + gap; left = rect.left + rect.width / 2 - tw / 2; arrowSide = 'top'; break;
        case 'top': top = rect.top - th - gap; left = rect.left + rect.width / 2 - tw / 2; arrowSide = 'bottom'; break;
        case 'left': top = rect.top + rect.height / 2 - th / 2; left = rect.left - tw - gap; arrowSide = 'right'; break;
        case 'right': top = rect.top + rect.height / 2 - th / 2; left = rect.right + gap; arrowSide = 'left'; break;
      }

      left = Math.max(12, Math.min(left, vw - tw - 12));
      top = Math.max(12, Math.min(top, vh - th - 12));

      setTooltipPos({ top, left, arrowSide });
    };

    calculate();
    window.addEventListener('resize', calculate);
    window.addEventListener('scroll', calculate);
    return () => { window.removeEventListener('resize', calculate); window.removeEventListener('scroll', calculate); };
  }, [isVisible, position]);

  const handleNext = () => {
    setIsVisible(false);
    markTooltipSeen(tooltipKey);
    if (step === totalSteps) {
      completeOnboarding();
      toast.success("You're all set! Start creating.", {
        duration: 3000,
        icon: "✨",
      });
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    markTooltipSeen(tooltipKey);
    completeOnboarding();
  };

  const progressPercent = (step / totalSteps) * 100;

  return (
    <>
      <div ref={elementRef} className="relative">
        {children}
      </div>

      {isVisible && createPortal(
        <AnimatePresence>
          {/* Backdrop — lighter with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-[2px]"
            onClick={handleSkip}
          />

          {/* Spotlight cutout with pulsing ring */}
          {elementRect && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed z-[9999] pointer-events-none rounded-xl"
              style={{
                top: elementRect.top - spotlightPadding,
                left: elementRect.left - spotlightPadding,
                width: elementRect.width + spotlightPadding * 2,
                height: elementRect.height + spotlightPadding * 2,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)',
                animation: 'spotlight-pulse 2s ease-in-out infinite',
              }}
            />
          )}

          {/* Interactive passthrough */}
          {elementRect && (
            <div
              className="fixed z-[10000] rounded-xl"
              style={{
                top: elementRect.top - spotlightPadding,
                left: elementRect.left - spotlightPadding,
                width: elementRect.width + spotlightPadding * 2,
                height: elementRect.height + spotlightPadding * 2,
              }}
            />
          )}

          {/* Tooltip card */}
          {tooltipPos && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 6 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="fixed z-[10001]"
              style={{ top: tooltipPos.top, left: tooltipPos.left }}
            >
              <div className="relative bg-white rounded-xl shadow-xl border border-border/40 w-[300px] overflow-hidden">
                {/* SVG Arrow */}
                <SvgArrow side={tooltipPos.arrowSide} />

                {/* Left accent line */}
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary rounded-l-xl" />

                <div className="p-4 pl-5">
                  {/* Step label */}
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Step {step} of {totalSteps}
                  </span>

                  <h4 className="font-semibold text-sm text-foreground mt-1.5 mb-1">{title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={handleSkip}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 decoration-muted-foreground/40"
                    >
                      Skip tour
                    </button>
                    <Button
                      size="sm"
                      onClick={handleNext}
                      className="h-7 text-xs px-3 gap-1"
                    >
                      {step === totalSteps ? 'Get Started' : 'Next'}
                      {step !== totalSteps && <ChevronRight className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>

                {/* Progress bar at bottom */}
                <div className="h-[3px] bg-muted">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
