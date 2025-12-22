import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/hooks/useAuth";
import { ChevronRight, Sparkles } from "lucide-react";
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

// Get next reset date (1st of next month)
function getNextResetDate(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
}

export function CreditBar({ compact = false }: CreditBarProps) {
  const { credits, freeCredits, paidCredits, hasUnlimitedAccess, loading } = useCredits();
  const { subscriptionStatus } = useAuth();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const navigate = useNavigate();

  const isProPlan = subscriptionStatus?.subscribed === true;
  const hasCredits = credits > 0 || hasUnlimitedAccess;

  // Calculate fill percentage - use a baseline max for display
  // The max is either 100 or the current credits (whichever is higher for nice visuals)
  const maxCredits = Math.max(credits, 100);
  const fillPercentage = credits > 0 ? Math.min((credits / maxCredits) * 100, 100) : 0;

  if (loading) {
    return (
      <div className="flex flex-col gap-2 animate-pulse">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-2 w-full bg-muted rounded-full" />
      </div>
    );
  }

  // For unlimited access users, show special display
  if (hasUnlimitedAccess) {
    return (
      <div className={`flex flex-col gap-2 ${compact ? "w-full" : "min-w-[200px]"}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Credits</span>
          <span className="text-sm font-semibold flex items-center gap-1 text-amber-500">
            ∞ Unlimited
            <ChevronRight className="h-3 w-3" />
          </span>
        </div>
        <div className="h-2 w-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full" />
        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
          <span className="text-amber-500">●</span> Unlimited access granted
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={`flex flex-col gap-2 ${compact ? "w-full" : "min-w-[200px]"}`}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm font-medium text-foreground">Credits</span>
                <span className="text-sm font-semibold flex items-center gap-1 text-foreground group-hover:text-primary transition-colors">
                  {credits} left
                  <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[220px]">
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
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Progress bar - Lovable style */}
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          {hasCredits ? (
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${fillPercentage}%` }}
            />
          ) : null}
        </div>

        {/* Reset info or low credit warning */}
        {hasCredits ? (
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="text-muted-foreground">●</span> Free credits reset on {getNextResetDate()}
          </p>
        ) : (
          <p className="text-xs text-amber-500 mt-0.5">
            Low on credits?
          </p>
        )}

        {/* Action button */}
        <Button
          size="sm"
          variant={hasCredits ? "outline" : "default"}
          className="w-full h-8 text-xs mt-1"
          onClick={() => setTopUpOpen(true)}
        >
          <Sparkles className="h-3 w-3 mr-1.5" />
          Add credits
        </Button>

        {/* Upgrade button for non-pro users */}
        {!isProPlan && (
          <Button
            size="sm"
            variant="ghost"
            className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/pricing")}
          >
            Upgrade to Pro
          </Button>
        )}
      </div>

      <TopUpCreditsDialog open={topUpOpen} onOpenChange={setTopUpOpen} />
    </>
  );
}
