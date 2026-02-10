import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/hooks/useOnboarding";
import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import charisLogo from "@/assets/charis-logo-new.png";

const valueProps = [
  "Select from 20+ diverse AI actors",
  "Write or generate scripts instantly",
  "Download studio-quality UGC videos",
];

export function WelcomeDialog() {
  const { showWelcomeDialog, setShowWelcomeDialog, markTooltipSeen, completeOnboarding } = useOnboarding();

  const handleTour = () => {
    markTooltipSeen('hasSeenWelcome');
    setShowWelcomeDialog(false);
  };

  const handleSkip = () => {
    markTooltipSeen('hasSeenWelcome');
    setShowWelcomeDialog(false);
    completeOnboarding();
  };

  return (
    <Dialog open={showWelcomeDialog} onOpenChange={setShowWelcomeDialog}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-border/50 shadow-2xl gap-0">
        {/* Logo area with radial gradient */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className="flex flex-col items-center pt-10 pb-6 px-8"
          style={{
            background: "radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.06) 0%, transparent 70%)",
          }}
        >
          <img
            src={charisLogo}
            alt="Charis"
            className="h-10 mb-6 object-contain"
          />
          <h2 className="text-xl font-semibold text-foreground tracking-tight text-center">
            Welcome to Charis
          </h2>
          <p className="text-sm text-muted-foreground mt-2 text-center leading-relaxed max-w-[320px]">
            Create professional AI video ads in minutes — no camera, no crew, no studio.
          </p>
        </motion.div>

        {/* Value props */}
        <div className="px-8 pb-6 space-y-3">
          {valueProps.map((prop, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08, duration: 0.3, ease: "easeOut" }}
              className="flex items-center gap-3"
            >
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm text-foreground">{prop}</span>
            </motion.div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-8 py-5 border-t border-border/50 bg-muted/20">
          <button
            onClick={handleSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 decoration-muted-foreground/40"
          >
            Skip
          </button>
          <Button onClick={handleTour} size="sm" className="px-5">
            Take a quick tour
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
