import { ReactNode, useEffect, useState, useRef } from "react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";

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

interface TooltipPosition {
  top: number;
  left: number;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right';
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
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const [elementRect, setElementRect] = useState<DOMRect | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calculate position after a delay to ensure DOM is ready
  useEffect(() => {
    const timer = setTimeout(() => {
      const shouldShow = shouldShowTooltip(tooltipKey);
      setIsVisible(shouldShow);
    }, 300);

    return () => clearTimeout(timer);
  }, [shouldShowTooltip, tooltipKey]);

  // Calculate tooltip position based on target element
  useEffect(() => {
    if (!isVisible || !elementRef.current) return;

    const calculatePosition = () => {
      const element = elementRef.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      setElementRect(rect);

      const tooltipWidth = 320;
      const tooltipHeight = 180;
      const gap = 16;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = 0;
      let left = 0;
      let arrowPosition: 'top' | 'bottom' | 'left' | 'right' = position;

      // Calculate position based on preferred direction
      switch (position) {
        case 'bottom':
          top = rect.bottom + gap;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          arrowPosition = 'top';
          break;
        case 'top':
          top = rect.top - tooltipHeight - gap;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          arrowPosition = 'bottom';
          break;
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - tooltipWidth - gap;
          arrowPosition = 'right';
          break;
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + gap;
          arrowPosition = 'left';
          break;
      }

      // Keep tooltip within viewport
      if (left < 16) left = 16;
      if (left + tooltipWidth > viewportWidth - 16) left = viewportWidth - tooltipWidth - 16;
      if (top < 16) top = 16;
      if (top + tooltipHeight > viewportHeight - 16) top = viewportHeight - tooltipHeight - 16;

      setTooltipPosition({ top, left, arrowPosition });
    };

    calculatePosition();
    window.addEventListener('resize', calculatePosition);
    window.addEventListener('scroll', calculatePosition);

    return () => {
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition);
    };
  }, [isVisible, position]);

  const handleNext = () => {
    setIsVisible(false);
    markTooltipSeen(tooltipKey);
    
    // If this is the last step, complete onboarding
    if (step === totalSteps) {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    markTooltipSeen(tooltipKey);
    completeOnboarding();
  };

  const arrowStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-primary',
    bottom: 'top-full left-1/2 -translate-x-1/2 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-primary',
    left: 'right-full top-1/2 -translate-y-1/2 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-primary',
    right: 'left-full top-1/2 -translate-y-1/2 border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent border-l-primary',
  };

  return (
    <>
      <div ref={elementRef} className="relative">
        {children}
      </div>

      {isVisible && createPortal(
        <AnimatePresence>
          {/* Overlay backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/60"
            onClick={handleSkip}
          />

          {/* Spotlight cutout */}
          {elementRect && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed z-[9999] pointer-events-none"
              style={{
                top: elementRect.top - spotlightPadding,
                left: elementRect.left - spotlightPadding,
                width: elementRect.width + spotlightPadding * 2,
                height: elementRect.height + spotlightPadding * 2,
                borderRadius: 12,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
              }}
            />
          )}

          {/* Allow interaction with spotlight element */}
          {elementRect && (
            <div
              className="fixed z-[10000]"
              style={{
                top: elementRect.top - spotlightPadding,
                left: elementRect.left - spotlightPadding,
                width: elementRect.width + spotlightPadding * 2,
                height: elementRect.height + spotlightPadding * 2,
              }}
            />
          )}

          {/* Tooltip */}
          {tooltipPosition && (
            <motion.div
              ref={tooltipRef}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed z-[10001]"
              style={{
                top: tooltipPosition.top,
                left: tooltipPosition.left,
              }}
            >
              <div className="relative bg-primary text-primary-foreground rounded-xl shadow-2xl p-5 w-[320px]">
                {/* Arrow */}
                <div className={`absolute w-0 h-0 ${arrowStyles[tooltipPosition.arrowPosition]}`} />

                {/* Skip button */}
                <button
                  onClick={handleSkip}
                  className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-primary-foreground/20 transition-colors"
                  aria-label="Skip tour"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Progress indicator */}
                <div className="flex items-center gap-1.5 mb-3">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i + 1 <= step
                          ? 'bg-primary-foreground w-6'
                          : 'bg-primary-foreground/30 w-1.5'
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-xs text-primary-foreground/70">
                    {step} of {totalSteps}
                  </span>
                </div>

                {/* Content */}
                <div className="pr-6">
                  <h4 className="font-semibold text-base mb-2">{title}</h4>
                  <p className="text-sm text-primary-foreground/90 leading-relaxed">
                    {description}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={handleSkip}
                    className="text-xs text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                  >
                    Skip tour
                  </button>
                  <Button
                    size="sm"
                    onClick={handleNext}
                    className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 gap-1"
                  >
                    {step === totalSteps ? 'Get Started' : 'Next'}
                    {step !== totalSteps && <ChevronRight className="h-3 w-3" />}
                  </Button>
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
