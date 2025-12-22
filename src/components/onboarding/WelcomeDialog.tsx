import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Sparkles, Video, Users, Zap, ArrowRight, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const steps = [
  {
    icon: Sparkles,
    title: "Welcome to Charis",
    description: "Create stunning AI-powered UGC video ads in minutes. Let's get you started!",
    features: [
      "Select from diverse AI actors",
      "Write or paste your script",
      "Generate professional videos instantly",
    ],
  },
  {
    icon: Users,
    title: "Choose Your Actors",
    description: "Browse our library of realistic AI actors. Each actor brings unique personality to your ads.",
    tip: "Pro tip: Select multiple actors to create variations of your ad for A/B testing.",
  },
  {
    icon: Video,
    title: "Create Your Script",
    description: "Write your ad script or let our AI help you. The script is what your AI actor will say.",
    tip: "Keep scripts between 30-60 seconds for optimal engagement.",
  },
  {
    icon: Zap,
    title: "Generate & Download",
    description: "Hit generate and watch your video come to life. Download and use it anywhere!",
    tip: "Each video uses credits. Check your credit balance in the sidebar.",
  },
];

export function WelcomeDialog() {
  const { showWelcomeDialog, setShowWelcomeDialog, markTooltipSeen } = useOnboarding();
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handleSkip = () => {
    handleClose();
  };

  const handleClose = () => {
    markTooltipSeen('hasSeenWelcome');
    setShowWelcomeDialog(false);
    setCurrentStep(0);
  };

  const step = steps[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Dialog open={showWelcomeDialog} onOpenChange={setShowWelcomeDialog}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        {/* Progress indicator */}
        <div className="flex gap-1 px-6 pt-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                index <= currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="px-6 pb-6"
          >
            <DialogHeader className="pt-4">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-primary/10">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
              </div>
              <DialogTitle className="text-2xl text-center">{step.title}</DialogTitle>
              <DialogDescription className="text-center text-base">
                {step.description}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-3">
              {step.features?.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-sm">{feature}</span>
                </motion.div>
              ))}

              {step.tip && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">💡 Tip:</span> {step.tip}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <DialogFooter className="px-6 py-4 bg-muted/30 border-t">
          <div className="flex w-full justify-between items-center">
            <Button variant="ghost" onClick={handleSkip}>
              Skip tour
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {currentStep + 1} of {steps.length}
              </span>
              <Button onClick={handleNext}>
                {isLastStep ? (
                  "Get Started"
                ) : (
                  <>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
