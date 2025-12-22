import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/hooks/useAuth";
import { ChevronRight, Coins, Sparkles } from "lucide-react";
import { useState } from "react";
import { TopUpCreditsDialog } from "./TopUpCreditsDialog";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface CreditBarProps {
  compact?: boolean;
}

export function CreditBar({ compact = false }: CreditBarProps) {
  const { credits, freeCredits, paidCredits, loading } = useCredits();
  const { subscriptionStatus } = useAuth();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const navigate = useNavigate();

  const isProPlan = subscriptionStatus?.subscribed === true;
  const hasCredits = credits > 0;

  // Calculate bar percentages - use a baseline max for display
  // This creates a visual representation relative to a sensible max
  const maxDisplayCredits = Math.max(credits, 100); // At least 100 for visual purposes
  const totalPercentage = maxDisplayCredits > 0 ? Math.min((credits / maxDisplayCredits) * 100, 100) : 0;
  
  // When we have credits, show the proportional split between free and paid
  const freePercentage = credits > 0 ? (freeCredits / credits) * totalPercentage : 0;
  const paidPercentage = credits > 0 ? (paidCredits / credits) * totalPercentage : 0;

  if (loading) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <div className="h-4 w-20 bg-muted rounded" />
      </div>
    );
  }

  // Determine which buttons to show based on plan and credits
  const showTopUp = true; // Always show top up
  const showUpgrade = !isProPlan; // Only show upgrade if not on pro plan

  return (
    <>
      <div className={`flex flex-col gap-2 ${compact ? "w-full" : "min-w-[200px]"}`}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm text-muted-foreground">Credits</span>
                <span className="text-sm font-medium flex items-center gap-1 group-hover:text-primary transition-colors">
                  {credits} left
                  <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[220px]">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-violet-500" />
                    Free credits:
                  </span>
                  <span className="font-medium">{freeCredits}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    Paid credits:
                  </span>
                  <span className="font-medium">{paidCredits}</span>
                </div>
                <div className="border-t border-border pt-1.5 mt-1.5 flex justify-between gap-4">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-semibold">{credits}</span>
                </div>
                {isProPlan && (
                  <div className="text-muted-foreground pt-1 text-[10px]">
                    ● Pro subscription active
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Progress bar with empty grey background when no credits */}
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
          {hasCredits ? (
            <>
              {/* Free credits segment - violet/purple */}
              {freeCredits > 0 && (
                <div
                  className="h-full bg-violet-500 transition-all duration-500 ease-out"
                  style={{ width: `${freePercentage}%` }}
                />
              )}
              {/* Paid credits segment - primary blue */}
              {paidCredits > 0 && (
                <div
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${paidPercentage}%` }}
                />
              )}
            </>
          ) : (
            /* Empty state - fully grey bar (bg-muted already shows) */
            null
          )}
        </div>

        {/* Action buttons based on plan and credits */}
        <div className="flex items-center gap-2 mt-1">
          {showTopUp && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-7 text-xs"
              onClick={() => setTopUpOpen(true)}
            >
              <Coins className="h-3 w-3 mr-1" />
              Top Up
            </Button>
          )}
          {showUpgrade && (
            <Button
              size="sm"
              variant="default"
              className="flex-1 h-7 text-xs"
              onClick={() => navigate("/upgrade")}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Upgrade
            </Button>
          )}
        </div>

        {/* Zero credits warning */}
        {!hasCredits && (
          <p className="text-xs text-amber-500 mt-1">
            No credits remaining. Top up to generate videos.
          </p>
        )}
      </div>

      <TopUpCreditsDialog open={topUpOpen} onOpenChange={setTopUpOpen} />
    </>
  );
}
