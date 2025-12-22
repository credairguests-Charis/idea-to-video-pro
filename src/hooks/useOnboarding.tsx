import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

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
  completeOnboarding: () => Promise<void>;
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
  const [checkedDatabase, setCheckedDatabase] = useState(false);

  // Check database for onboarding status - this is the source of truth
  useEffect(() => {
    if (!user) {
      setOnboardingState(defaultState);
      setIsNewUser(false);
      setShowWelcomeDialog(false);
      setCheckedDatabase(false);
      return;
    }

    const checkOnboardingStatus = async () => {
      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("onboarding_completed, created_at")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching onboarding status:", error);
          setCheckedDatabase(true);
          return;
        }

        // Check if user is new (created within last 30 seconds and hasn't completed onboarding)
        const createdAt = new Date(profile?.created_at || 0);
        const now = new Date();
        const isRecentlyCreated = (now.getTime() - createdAt.getTime()) < 30000; // 30 seconds
        const hasCompletedOnboarding = profile?.onboarding_completed === true;

        // User is new if they haven't completed onboarding AND profile was recently created
        // OR if they have a localStorage flag indicating they're in onboarding
        const storageKey = `onboarding_in_progress_${user.id}`;
        const isInProgress = localStorage.getItem(storageKey) === 'true';

        if (!hasCompletedOnboarding && (isRecentlyCreated || isInProgress)) {
          setIsNewUser(true);
          setShowWelcomeDialog(true);
          // Mark as in progress so returning within session continues onboarding
          localStorage.setItem(storageKey, 'true');
        } else {
          setIsNewUser(false);
          setShowWelcomeDialog(false);
          // Clean up the in-progress flag
          localStorage.removeItem(storageKey);
        }

        setCheckedDatabase(true);
      } catch (err) {
        console.error("Error checking onboarding:", err);
        setCheckedDatabase(true);
      }
    };

    checkOnboardingStatus();
  }, [user]);

  // Complete onboarding in the database
  const completeOnboarding = useCallback(async () => {
    if (!user) return;

    try {
      await supabase
        .from("profiles")
        .update({ 
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString()
        })
        .eq("user_id", user.id);

      // Clean up localStorage
      localStorage.removeItem(`onboarding_in_progress_${user.id}`);
      
      setIsNewUser(false);
      setOnboardingState(prev => ({
        ...prev,
        hasSeenWelcome: true,
      }));
    } catch (err) {
      console.error("Error completing onboarding:", err);
    }
  }, [user]);

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
      localStorage.setItem(`onboarding_in_progress_${user.id}`, 'true');
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
    // Only show tooltips for new users who haven't completed onboarding
    if (!isNewUser || !checkedDatabase) return false;
    
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
        completeOnboarding,
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
