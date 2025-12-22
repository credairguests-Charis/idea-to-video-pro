import { useState, useEffect, createContext, useContext } from "react";
import { useAuth } from "./useAuth";

interface OnboardingState {
  hasSeenWelcome: boolean;
  hasSeenActorTooltip: boolean;
  hasSeenScriptTooltip: boolean;
  hasSeenGenerateTooltip: boolean;
  hasSeenCreditsTooltip: boolean;
  completedSteps: string[];
}

interface OnboardingContextType {
  onboardingState: OnboardingState;
  isNewUser: boolean;
  showWelcomeDialog: boolean;
  setShowWelcomeDialog: (show: boolean) => void;
  markStepComplete: (step: string) => void;
  markTooltipSeen: (tooltip: keyof Omit<OnboardingState, 'completedSteps'>) => void;
  resetOnboarding: () => void;
  currentTooltipStep: number;
  shouldShowTooltip: (tooltip: keyof Omit<OnboardingState, 'completedSteps'>) => boolean;
}

const defaultState: OnboardingState = {
  hasSeenWelcome: false,
  hasSeenActorTooltip: false,
  hasSeenScriptTooltip: false,
  hasSeenGenerateTooltip: false,
  hasSeenCreditsTooltip: false,
  completedSteps: [],
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [onboardingState, setOnboardingState] = useState<OnboardingState>(defaultState);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // Load onboarding state from localStorage
  useEffect(() => {
    if (user) {
      const storageKey = `onboarding_state_${user.id}`;
      const savedState = localStorage.getItem(storageKey);
      
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          setOnboardingState(parsed);
          setIsNewUser(false);
        } catch {
          // Invalid state, treat as new user
          setIsNewUser(true);
          setShowWelcomeDialog(true);
        }
      } else {
        // First time user
        setIsNewUser(true);
        setShowWelcomeDialog(true);
      }
    }
  }, [user]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (user && (onboardingState.hasSeenWelcome || onboardingState.completedSteps.length > 0)) {
      const storageKey = `onboarding_state_${user.id}`;
      localStorage.setItem(storageKey, JSON.stringify(onboardingState));
    }
  }, [onboardingState, user]);

  const markStepComplete = (step: string) => {
    setOnboardingState(prev => ({
      ...prev,
      completedSteps: prev.completedSteps.includes(step) 
        ? prev.completedSteps 
        : [...prev.completedSteps, step],
    }));
  };

  const markTooltipSeen = (tooltip: keyof Omit<OnboardingState, 'completedSteps'>) => {
    setOnboardingState(prev => ({
      ...prev,
      [tooltip]: true,
    }));
  };

  const resetOnboarding = () => {
    if (user) {
      const storageKey = `onboarding_state_${user.id}`;
      localStorage.removeItem(storageKey);
      setOnboardingState(defaultState);
      setIsNewUser(true);
      setShowWelcomeDialog(true);
    }
  };

  // Determine current tooltip step based on what's been seen
  const currentTooltipStep = [
    onboardingState.hasSeenWelcome,
    onboardingState.hasSeenActorTooltip,
    onboardingState.hasSeenScriptTooltip,
    onboardingState.hasSeenGenerateTooltip,
    onboardingState.hasSeenCreditsTooltip,
  ].filter(Boolean).length;

  const shouldShowTooltip = (tooltip: keyof Omit<OnboardingState, 'completedSteps'>) => {
    if (!isNewUser && onboardingState.hasSeenWelcome) return false;
    
    // Show tooltips in sequence
    const tooltipOrder: (keyof Omit<OnboardingState, 'completedSteps'>)[] = [
      'hasSeenWelcome',
      'hasSeenActorTooltip',
      'hasSeenScriptTooltip',
      'hasSeenGenerateTooltip',
      'hasSeenCreditsTooltip',
    ];

    const tooltipIndex = tooltipOrder.indexOf(tooltip);
    if (tooltipIndex === -1) return false;

    // Check if all previous tooltips have been seen
    for (let i = 0; i < tooltipIndex; i++) {
      if (!onboardingState[tooltipOrder[i]]) return false;
    }

    // Show this tooltip if it hasn't been seen yet
    return !onboardingState[tooltip];
  };

  return (
    <OnboardingContext.Provider 
      value={{
        onboardingState,
        isNewUser,
        showWelcomeDialog,
        setShowWelcomeDialog,
        markStepComplete,
        markTooltipSeen,
        resetOnboarding,
        currentTooltipStep,
        shouldShowTooltip,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}
