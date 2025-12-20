import { useEffect, useState } from "react";
import { useCredits } from "@/hooks/useCredits";
import { AlertTriangle, X, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TopUpCreditsDialog } from "@/components/TopUpCreditsDialog";

const LOW_CREDIT_THRESHOLD = 70;
const DISMISSED_KEY = "low_credit_warning_dismissed";

export function LowCreditWarning() {
  const { credits, loading } = useCredits();
  const [dismissed, setDismissed] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);

  useEffect(() => {
    // Check if user dismissed the warning in this session
    const dismissedTime = sessionStorage.getItem(DISMISSED_KEY);
    if (dismissedTime) {
      const dismissedAt = parseInt(dismissedTime, 10);
      // Reset dismissal after 1 hour
      if (Date.now() - dismissedAt < 60 * 60 * 1000) {
        setDismissed(true);
      } else {
        sessionStorage.removeItem(DISMISSED_KEY);
      }
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(DISMISSED_KEY, Date.now().toString());
  };

  // Don't show if loading, dismissed, or credits are sufficient
  if (loading || dismissed || credits >= LOW_CREDIT_THRESHOLD) {
    return null;
  }

  const videosRemaining = Math.floor(credits / 70);

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-foreground">
                Low Credit Balance
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                You have <span className="font-semibold text-amber-500">{credits}</span> credits remaining
                {videosRemaining > 0 ? (
                  <> — enough for {videosRemaining} video{videosRemaining !== 1 ? "s" : ""}.</>
                ) : (
                  <> — not enough for a video generation.</>
                )}
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => setTopUpOpen(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <Coins className="h-4 w-4 mr-1" />
                  Top Up Credits
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Dismiss
                </Button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss warning"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <TopUpCreditsDialog open={topUpOpen} onOpenChange={setTopUpOpen} />
    </>
  );
}
