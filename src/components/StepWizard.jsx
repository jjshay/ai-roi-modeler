import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import ProgressBar from './ProgressBar';
import Step1_CompanyContext from './steps/Step1_CompanyContext';
import Step3_ProcessDetails from './steps/Step3_ProcessDetails';
import { runCalculations } from '../logic/calculations';
import { formatCurrency } from '../utils/formatters';

const TOTAL_STEPS = 2;

const STEP_COMPONENTS = [
  Step3_ProcessDetails,
  Step1_CompanyContext,
];

const STEP_LABELS = [
  'Your Project',
  'Your Company',
];

const REQUIRED_FIELDS = {
  1: ['projectArchetype'],
  2: ['industry', 'companySize', 'changeReadiness', 'dataReadiness', 'execSponsor'],
};

// Minimum fields needed to attempt a preview calculation
const PREVIEW_REQUIRED = ['industry', 'companySize', 'projectArchetype', 'teamSize'];

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

function LivePreview({ formData }) {
  const preview = useMemo(() => {
    // Check all required fields are present
    const canPreview = PREVIEW_REQUIRED.every((field) => {
      const val = formData[field];
      return val !== undefined && val !== null && val !== '' && !(typeof val === 'number' && val === 0);
    });
    if (!canPreview) return null;

    try {
      const result = runCalculations({ ...formData, _mcMode: 'fast' });
      const base = result.scenarios?.base;
      if (!base) return null;
      return {
        npv: base.npv,
        payback: base.paybackMonths,
        roic: base.roic,
      };
    } catch {
      return null;
    }
  }, [formData]);

  if (!preview) return null;

  const npvColor = preview.npv >= 0 ? 'text-emerald-600' : 'text-red-500';

  return (
    <Motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 rounded-lg bg-navy/5 px-3 py-2 text-xs"
    >
      <span className="font-medium text-navy/50">Live estimate:</span>
      <span className={`font-bold ${npvColor}`}>
        NPV {formatCurrency(preview.npv)}
      </span>
      <span className="text-navy/70">
        {preview.payback <= 60 ? `${preview.payback}mo payback` : '60+ mo'}
      </span>
      <span className="text-navy/70">
        {(preview.roic * 100).toFixed(0)}% ROIC
      </span>
    </Motion.div>
  );
}

export default function StepWizard({ formData, setFormData, onComplete, onBack }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [flowCompleteByStep, setFlowCompleteByStep] = useState({ 1: false, 2: false });

  const updateField = useCallback(
    (key, value) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    [setFormData]
  );

  const isStepValid = useCallback(() => {
    const requiredFields = REQUIRED_FIELDS[currentStep] || [];
    const requiredFieldsComplete = requiredFields.every((field) => {
      const val = formData[field];
      if (val === undefined || val === null || val === '') return false;
      if (typeof val === 'number' && val === 0) return false;
      return true;
    });
    return requiredFieldsComplete && flowCompleteByStep[currentStep];
  }, [currentStep, flowCompleteByStep, formData]);

  const handleFlowStateChange = useCallback((isComplete) => {
    setFlowCompleteByStep((previous) => (
      previous[currentStep] === isComplete
        ? previous
        : { ...previous, [currentStep]: isComplete }
    ));
  }, [currentStep]);

  const handleNext = useCallback(() => {
    if (!isStepValid()) return;
    if (currentStep === TOTAL_STEPS) {
      onComplete();
      return;
    }
    setDirection(1);
    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  }, [currentStep, isStepValid, onComplete]);

  const handleBack = () => {
    setDirection(-1);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Enter') return;
      const tag = e.target.tagName;
      if (tag === 'TEXTAREA') return;
      e.preventDefault();
      if (isStepValid()) handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, isStepValid]);

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
              onFlowStateChange={handleFlowStateChange}
            />
          </Motion.div>
        </AnimatePresence>
      </div>

      {/* Local screens own their Continue actions. Show the wrapper action
          only once that local flow is explicitly complete, so it never
          obstructs long forms or lets someone skip required questions. */}
      {isStepValid() && (
        <div className="sticky bottom-0 z-10 border-t border-gray-100 bg-white/95 px-4 pb-safe backdrop-blur-sm sm:px-6">
          {currentStep >= 2 && formData.costTransitionComplete && <LivePreview formData={formData} />}
          <div className="flex justify-end py-4">
            <button
              type="button"
              onClick={handleNext}
              className="min-h-[48px] w-full rounded-lg bg-gold px-8 py-3 text-sm font-semibold text-navy shadow-sm transition-all duration-150 hover:bg-sky focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 sm:w-auto"
            >
              {currentStep === TOTAL_STEPS ? 'Calculate ROI' : 'Next'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
