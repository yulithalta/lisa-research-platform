import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import Joyride, { CallBackProps, Step, STATUS, Status } from 'react-joyride';
import { useLocalStorage } from './use-local-storage';
import { useToast } from './use-toast';

// Define types for the onboarding context
type OnboardingContextType = {
  start: (tourId: string) => void;
  end: () => void;
  addSteps: (steps: Step[]) => void;
  resetSteps: () => void;
  isActive: boolean;
  hasCompletedOnboarding: boolean;
  markOnboardingComplete: () => void;
  resetOnboardingStatus: () => void;
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  // Track if user has completed onboarding
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useLocalStorage<boolean>(
    'hasCompletedOnboarding', 
    false
  );
  // Steps for the current tour
  const [steps, setSteps] = useState<Step[]>([]);
  // Currently active tour
  const [activeTour, setActiveTour] = useState<string | null>(null);
  // Run state for Joyride
  const [run, setRun] = useState(false);
  // Step index for Joyride
  const [stepIndex, setStepIndex] = useState(0);

  // Handle Joyride callbacks
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, index } = data;

    // Update step index
    if (type === 'step:after') {
      setStepIndex(index + 1);
    }

    // End tour when finished or skipped
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      setActiveTour(null);
      setStepIndex(0);
      
      // Show completion toast only if finished (not skipped)
      if (status === STATUS.FINISHED) {
        toast({
          title: "Onboarding Complete",
          description: "You've completed the tour! You can access it again anytime from the Help menu.",
        });
      }
    }
  };

  // Start a tour with the given ID
  const start = (tourId: string) => {
    setActiveTour(tourId);
    setRun(true);
    setStepIndex(0);
  };

  // End the current tour
  const end = () => {
    setRun(false);
    setActiveTour(null);
    setStepIndex(0);
  };

  // Add steps to the tour
  const addSteps = (newSteps: Step[]) => {
    setSteps(current => [...current, ...newSteps]);
  };

  // Reset steps
  const resetSteps = () => {
    setSteps([]);
    setStepIndex(0);
  };

  // Mark onboarding as complete
  const markOnboardingComplete = () => {
    setHasCompletedOnboarding(true);
  };

  // Reset onboarding status (for testing or user preference)
  const resetOnboardingStatus = () => {
    setHasCompletedOnboarding(false);
  };

  // Check if first-time visitor (on mount) only after authentication
  useEffect(() => {
    // We'll use a flag to ensure the toast is only shown on main routes (after login)
    const isMainRoute = window.location.pathname !== '/auth';
    
    // If first visit, not in a tour already, and on the main app (not login page), offer to start onboarding
    if (!hasCompletedOnboarding && !activeTour && isMainRoute) {
      const timer = setTimeout(() => {
        toast({
          title: "Welcome to the Lab Monitoring System",
          description: "Would you like to take a quick tour to get familiar with the system?",
          action: (
            <div className="flex space-x-2">
              <button 
                onClick={() => {
                  // These are DOM events, so we need to prevent propagation to avoid conflicts
                  // with the toast dismissal mechanism
                  try {
                    start('main-tour');
                    markOnboardingComplete();
                  } catch (err) {
                    console.error("Error starting tour:", err);
                  }
                }}
                className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90"
              >
                Yes, show me around
              </button>
              <button 
                onClick={(e) => {
                  // Prevent event bubbling
                  e.stopPropagation();
                  markOnboardingComplete();
                }}
                className="px-3 py-1 rounded-md bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80"
              >
                No, skip tour
              </button>
            </div>
          ),
          duration: 20000, // Keep visible longer than default
        });
      }, 1800); // Slightly longer delay to ensure the page is fully loaded
      
      return () => clearTimeout(timer);
    }
  }, [hasCompletedOnboarding, activeTour]);

  return (
    <OnboardingContext.Provider
      value={{
        start,
        end,
        addSteps,
        resetSteps,
        isActive: run,
        hasCompletedOnboarding,
        markOnboardingComplete,
        resetOnboardingStatus,
      }}
    >
      {children}
      <Joyride
        callback={handleJoyrideCallback}
        continuous
        hideCloseButton
        run={run}
        scrollToFirstStep
        showProgress
        showSkipButton
        steps={steps}
        stepIndex={stepIndex}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: '#0ea5e9', // Match primary color from theme
          },
          spotlight: {
            backgroundColor: 'transparent',
          },
          tooltipContainer: {
            textAlign: 'left',
          },
          buttonBack: {
            marginRight: 10,
          },
          buttonNext: {
            backgroundColor: '#0ea5e9',
          },
        }}
        disableScrolling={false}
        spotlightClicks
      />
    </OnboardingContext.Provider>
  );
};

// Custom hook to use the onboarding context
export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};