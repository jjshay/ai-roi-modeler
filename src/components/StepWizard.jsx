import { useState, useCallback } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import ProgressBar from './ProgressBar';
import Step1_CompanyContext from './steps/Step1_CompanyContext';
import Step3_ProcessDetails from './steps/Step3_ProcessDetails';

const TOTAL_STEPS = 2;

const STEP_COMPONENTS = [
  Step3_ProcessDetails,
  Step1_CompanyContext,
];

const STEP_LABELS = [
  'Your Project',
  'Your Company',
];

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? -100 : 100,
    opacity: 0,
  }),
};

export default function StepWizard({ formData, setFormData, onComplete, onBack }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);

  const updateField = useCallback(
    (key, value) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    [setFormData]
  );

  const advanceStep = useCallback(() => {
    setDirection(1);
    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  }, []);

  const handleBack = () => {
    setDirection(-1);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const StepComponent = STEP_COMPONENTS[currentStep - 1];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col bg-white pt-6">
      {/* Header with back button and progress */}
      <div className="flex items-center gap-2">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            className="flex min-h-[44px] items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-navy transition-colors hover:bg-navy/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            aria-label="Go to previous step"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
        ) : onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex min-h-[44px] items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-navy transition-colors hover:bg-navy/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            aria-label="Go back to home"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
        ) : (
          <div className="w-[72px]" />
        )}
        <div className="flex-1">
          <ProgressBar
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
            stepLabels={STEP_LABELS}
          />
        </div>
      </div>

      {/* Step content with slide animation */}
      <div className="relative min-h-[300px] sm:min-h-[400px] flex-1 overflow-hidden px-4 py-6 sm:px-6">
        <AnimatePresence mode="wait" custom={direction}>
          <Motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <StepComponent
              formData={formData}
              updateField={updateField}
              onAdvance={advanceStep}
              onComplete={onComplete}
            />
          </Motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
