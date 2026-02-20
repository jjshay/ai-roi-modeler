import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProgressBar from './ProgressBar';
import Step1_CompanyContext from './steps/Step1_CompanyContext';
import Step2_RiskReadiness from './steps/Step2_RiskReadiness';
import Step3_ProcessDetails from './steps/Step3_ProcessDetails';
import Step4_ReviewAssumptions from './steps/Step4_ReviewAssumptions';
import Step4_CurrentCosts from './steps/Step4_CurrentCosts';
import Step5_AIInvestment from './steps/Step5_AIInvestment';

const TOTAL_STEPS = 6;

const STEP_COMPONENTS = [
  Step1_CompanyContext,
  Step2_RiskReadiness,
  Step3_ProcessDetails,
  Step4_ReviewAssumptions,
  Step4_CurrentCosts,
  Step5_AIInvestment,
];

const REQUIRED_FIELDS = {
  1: ['industry', 'companySize', 'role', 'teamLocation'],
  2: ['changeReadiness', 'dataReadiness'],
  3: ['projectArchetype', 'teamSize', 'hoursPerWeek', 'errorRate'],
  4: [], // assumptions have defaults, all optional to override
  5: ['avgSalary'],
  6: [], // AI investment has auto-suggested defaults
};

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

export default function StepWizard({ formData, setFormData, onComplete }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);

  const updateField = useCallback(
    (key, value) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    [setFormData]
  );

  const isStepValid = () => {
    const requiredFields = REQUIRED_FIELDS[currentStep] || [];
    return requiredFields.every((field) => {
      const val = formData[field];
      if (val === undefined || val === null || val === '') return false;
      if (typeof val === 'number' && val === 0) return false;
      return true;
    });
  };

  const handleNext = () => {
    if (currentStep === TOTAL_STEPS) {
      onComplete();
      return;
    }
    setDirection(1);
    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  };

  const handleBack = () => {
    setDirection(-1);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Keep refs to avoid re-registering the keyboard listener every render
  const isStepValidRef = useRef(isStepValid);
  const handleNextRef = useRef(handleNext);
  isStepValidRef.current = isStepValid;
  handleNextRef.current = handleNext;

  // Keyboard navigation: Enter to advance
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Enter') return;
      const tag = e.target.tagName;
      if (tag === 'TEXTAREA') return;
      e.preventDefault();
      if (isStepValidRef.current()) handleNextRef.current();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        ) : (
          <div className="w-[72px]" />
        )}
        <div className="flex-1">
          <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />
        </div>
      </div>

      {/* Step content with slide animation */}
      <div className="relative min-h-[300px] sm:min-h-[400px] flex-1 overflow-hidden px-4 py-6 sm:px-6">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <StepComponent formData={formData} updateField={updateField} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sticky bottom nav for Next / Complete button */}
      <div className="sticky bottom-0 z-10 border-t border-gray-100 bg-white/95 px-4 pb-safe backdrop-blur-sm sm:px-6">
        <div className="flex justify-end py-4">
          <button
            type="button"
            onClick={handleNext}
            disabled={!isStepValid()}
            className="min-h-[48px] w-full rounded-lg bg-gold px-8 py-3 text-sm font-semibold text-navy shadow-sm transition-all duration-150 hover:bg-gold-light focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {currentStep === TOTAL_STEPS ? 'Complete' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
