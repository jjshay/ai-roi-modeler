import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProgressBar from './ProgressBar';
import Step1_CompanyContext from './steps/Step1_CompanyContext';
import Step3_ProcessDetails from './steps/Step3_ProcessDetails';
import Step5_AIInvestment from './steps/Step5_AIInvestment';
import { runCalculations } from '../logic/calculations';
import { formatCurrency } from '../utils/formatters';

const TOTAL_STEPS = 3;

const STEP_COMPONENTS = [
  Step1_CompanyContext,    // Context + Readiness (merged)
  Step3_ProcessDetails,    // Project + Current Costs (merged)
  Step5_AIInvestment,      // AI Investment
];

const STEP_LABELS = [
  'Context & Readiness',
  'Project & Costs',
  'AI Investment',
];

const REQUIRED_FIELDS = {
  1: ['industry', 'companySize', 'teamLocation', 'changeReadiness', 'dataReadiness', 'execSponsor'],
  2: ['projectArchetype', 'teamSize', 'avgSalary'],
  3: [], // AI investment has auto-suggested defaults
};

// Minimum fields needed to attempt a preview calculation
const PREVIEW_REQUIRED = ['industry', 'companySize', 'projectArchetype', 'teamSize', 'avgSalary'];

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
  }, [
    formData.industry, formData.companySize, formData.projectArchetype,
    formData.teamSize, formData.avgSalary, formData.implementationBudget,
    formData.expectedTimeline, formData.ongoingAnnualCost,
    formData.changeReadiness, formData.dataReadiness, formData.execSponsor,
    formData.assumptions, formData.archetypeInputs,
    formData.currentToolCosts, formData.cashRealizationPct,
  ]);

  if (!preview) return null;

  const npvColor = preview.npv >= 0 ? 'text-emerald-600' : 'text-red-500';

  return (
    <motion.div
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
    </motion.div>
  );
}

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

  const isStepValidRef = useRef(isStepValid);
  const handleNextRef = useRef(handleNext);
  isStepValidRef.current = isStepValid;
  handleNextRef.current = handleNext;

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

      {/* Sticky bottom nav */}
      <div className="sticky bottom-0 z-10 border-t border-gray-100 bg-white/95 px-4 pb-safe backdrop-blur-sm sm:px-6">
        {/* Live preview — shows once enough data exists */}
        {currentStep >= 2 && <LivePreview formData={formData} />}

        <div className="flex justify-end py-4">
          <button
            type="button"
            onClick={handleNext}
            disabled={!isStepValid()}
            className="min-h-[48px] w-full rounded-lg bg-gold px-8 py-3 text-sm font-semibold text-navy shadow-sm transition-all duration-150 hover:bg-sky focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {currentStep === TOTAL_STEPS ? 'Calculate ROI' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
