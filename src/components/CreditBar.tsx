import { useCredits } from "@/hooks/useCredits";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { TopUpCreditsDialog } from "./TopUpCreditsDialog";
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
  const [topUpOpen, setTopUpOpen] = useState(false);

  // Calculate percentages for the stacked bar
  const maxDisplayCredits = Math.max(credits, 350);
  const freePercentage = credits > 0 ? (freeCredits / maxDisplayCredits) * 100 : 0;
  const paidPercentage = credits > 0 ? (paidCredits / maxDisplayCredits) * 100 : 0;

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5 animate-pulse">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-1.5 w-full bg-muted rounded-full" />
      </div>
    );
  }

  // For unlimited access users, show special display
  if (hasUnlimitedAccess) {
    return (
      <div className={`flex flex-col gap-1.5 ${compact ? "w-full" : "min-w-[180px]"}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Credits</span>
          <span className="text-sm text-amber-500 flex items-center gap-0.5">
            ∞ Unlimited
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full" />
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
          Unlimited access granted
        </p>
      </div>
    );
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={`flex flex-col gap-1.5 cursor-pointer ${compact ? "w-full" : "min-w-[180px]"}`}
              onClick={() => setTopUpOpen(true)}
            >
              {/* Header: Credits label + N left > */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Credits</span>
                <span className="text-sm text-muted-foreground flex items-center gap-0.5 hover:text-foreground transition-colors">
                  {credits} left
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>

              {/* Stacked Progress Bar - Violet (free) + Primary (paid) */}
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
                {freeCredits > 0 && (
                  <div
                    className="h-full bg-violet-500 transition-all duration-500 ease-out"
                    style={{ width: `${freePercentage}%` }}
                  />
                )}
                {paidCredits > 0 && (
                  <div
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${paidPercentage}%` }}
                  />
                )}
              </div>

              {/* Reset info */}
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                Free credits reset on {getNextResetDate()}
              </p>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[200px]">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-500" />
                  Free:
                </span>
                <span className="font-medium">{freeCredits}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  Paid:
                </span>
                <span className="font-medium">{paidCredits}</span>
              </div>
              <div className="border-t border-border pt-1.5 mt-1.5 flex justify-between gap-4">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-semibold">{credits}</span>
              </div>
              <p className="text-muted-foreground pt-1 text-[10px]">Click to add more credits</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TopUpCreditsDialog open={topUpOpen} onOpenChange={setTopUpOpen} />
    </>
  );
}
