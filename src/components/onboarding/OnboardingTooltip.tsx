import { ReactNode, useEffect, useState } from "react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface OnboardingTooltipProps {
  children: ReactNode;
  tooltipKey: 'hasSeenActorTooltip' | 'hasSeenScriptTooltip' | 'hasSeenGenerateTooltip' | 'hasSeenCreditsTooltip';
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  step?: number;
  totalSteps?: number;
}

export function OnboardingTooltip({
  children,
  tooltipKey,
  title,
  description,
  position = 'bottom',
  step = 1,
  totalSteps = 4,
}: OnboardingTooltipProps) {
  const { shouldShowTooltip, markTooltipSeen, onboardingState } = useOnboarding();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Delay showing tooltip slightly for better UX
    const timer = setTimeout(() => {
      setIsVisible(shouldShowTooltip(tooltipKey));
    }, 500);

    return () => clearTimeout(timer);
  }, [shouldShowTooltip, tooltipKey, onboardingState]);

  const handleDismiss = () => {
    setIsVisible(false);
    markTooltipSeen(tooltipKey);
  };

  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-primary',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-primary',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-primary',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-primary',
  };

  return (
    <div className="relative">
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={`absolute z-50 ${positionClasses[position]}`}
          >
            <div className="relative bg-primary text-primary-foreground rounded-lg shadow-lg p-4 min-w-[280px] max-w-[320px]">
              {/* Arrow */}
              <div className={`absolute w-0 h-0 border-8 ${arrowClasses[position]}`} />
              
              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-primary-foreground/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Content */}
              <div className="pr-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-primary-foreground/20 px-2 py-0.5 rounded-full">
                    Step {step} of {totalSteps}
                  </span>
                </div>
                <h4 className="font-semibold text-sm mb-1">{title}</h4>
                <p className="text-xs opacity-90">{description}</p>
              </div>

              {/* Action button */}
              <Button
                size="sm"
                variant="secondary"
                className="w-full mt-3 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                onClick={handleDismiss}
              >
                Got it
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
