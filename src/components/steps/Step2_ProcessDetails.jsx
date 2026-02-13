import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CardSelector from '../inputs/CardSelector';
import SliderInput from '../inputs/SliderInput';
import SegmentedSelect from '../inputs/SegmentedSelect';

const PROCESS_TYPES = [
  {
    icon: '\ud83d\udcdd',
    title: 'Document Processing',
    description: 'Contracts, invoices, reports, compliance docs',
    value: 'Document Processing',
  },
  {
    icon: '\ud83d\udcac',
    title: 'Customer Communication',
    description: 'Support tickets, emails, chat, call summaries',
    value: 'Customer Communication',
  },
  {
    icon: '\ud83d\udcca',
    title: 'Data Analysis & Reporting',
    description: 'Financial analysis, forecasting, dashboards',
    value: 'Data Analysis & Reporting',
  },
  {
    icon: '\ud83d\udd0d',
    title: 'Research & Intelligence',
    description: 'Market research, competitive analysis, due diligence',
    value: 'Research & Intelligence',
  },
  {
    icon: '\u2699\ufe0f',
    title: 'Workflow Automation',
    description: 'Approvals, routing, scheduling, notifications',
    value: 'Workflow Automation',
  },
  {
    icon: '\ud83c\udfa8',
    title: 'Content Creation',
    description: 'Marketing copy, presentations, documentation',
    value: 'Content Creation',
  },
  {
    icon: '\ud83d\udee1\ufe0f',
    title: 'Quality & Compliance',
    description: 'Auditing, error detection, regulatory checks',
    value: 'Quality & Compliance',
  },
  {
    icon: '\ud83d\udce6',
    title: 'Other',
    description: 'Describe your use case',
    value: 'Other',
  },
];

const ERROR_RATE_OPTIONS = [
  { label: 'Rarely', sublabel: '<5%', value: 0.025 },
  { label: 'Sometimes', sublabel: '5-15%', value: 0.10 },
  { label: 'Often', sublabel: '15-30%', value: 0.225 },
  { label: 'Frequently', sublabel: '>30%', value: 0.35 },
];

const slideVariants = {
  enter: { x: 80, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -80, opacity: 0 },
};

export default function Step2_ProcessDetails({ formData, updateField }) {
  const [subStep, setSubStep] = useState(0);
  const advanceTimer = useRef(null);

  const autoAdvance = useCallback(
    (nextSubStep) => {
      clearTimeout(advanceTimer.current);
      if (nextSubStep <= 3) {
        advanceTimer.current = setTimeout(() => {
          setSubStep(nextSubStep);
        }, 300);
      }
    },
    [],
  );

  const handleProcessType = (val) => {
    updateField('processType', val);
    autoAdvance(1);
  };

  const handleTeamSize = (val) => {
    updateField('teamSize', val);
  };

  const handleHoursPerWeek = (val) => {
    updateField('hoursPerWeek', val);
  };

  const handleErrorRate = (val) => {
    updateField('errorRate', val);
  };

  const teamSize = formData.teamSize || 10;
  const hoursPerWeek = formData.hoursPerWeek || 20;
  const totalWeeklyHours = teamSize * hoursPerWeek;

  return (
    <div className="mx-auto w-full max-w-xl">
      <h2 className="mb-2 text-2xl font-bold text-navy sm:text-3xl">
        Tell us about the process you want to automate
      </h2>
      <div className="mb-8 h-1 w-16 rounded bg-gold" />

      <AnimatePresence mode="wait">
        {subStep === 0 && (
          <motion.div
            key="processType"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <CardSelector
              label="What type of work are you looking to improve with AI?"
              options={PROCESS_TYPES}
              value={formData.processType}
              onChange={handleProcessType}
            />
          </motion.div>
        )}

        {subStep === 1 && (
          <motion.div
            key="teamSize"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="space-y-4">
              <SliderInput
                label="How many people currently work on this process?"
                value={formData.teamSize ?? 10}
                onChange={handleTeamSize}
                min={1}
                max={500}
                step={1}
                suffix=" people"
                helperText="Include full-time and part-time contributors"
              />

              <button
                type="button"
                onClick={() => setSubStep(2)}
                className="
                  mt-4 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold
                  text-navy shadow-sm transition-all duration-150
                  hover:bg-gold/90 focus:outline-none focus-visible:ring-2
                  focus-visible:ring-gold focus-visible:ring-offset-2
                "
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {subStep === 2 && (
          <motion.div
            key="hoursPerWeek"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="space-y-4">
              <SliderInput
                label="How many hours per week does EACH person spend on this?"
                value={formData.hoursPerWeek ?? 20}
                onChange={handleHoursPerWeek}
                min={1}
                max={40}
                step={1}
                suffix=" hrs"
                liveCalc={`That\u2019s ${totalWeeklyHours.toLocaleString()} total hours/week across your team`}
              />

              <button
                type="button"
                onClick={() => setSubStep(3)}
                className="
                  mt-4 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold
                  text-navy shadow-sm transition-all duration-150
                  hover:bg-gold/90 focus:outline-none focus-visible:ring-2
                  focus-visible:ring-gold focus-visible:ring-offset-2
                "
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {subStep === 3 && (
          <motion.div
            key="errorRate"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <SegmentedSelect
              label="How often does work need to be redone or corrected?"
              options={ERROR_RATE_OPTIONS}
              value={formData.errorRate}
              onChange={handleErrorRate}
              helperText="Include time spent fixing errors, reworking deliverables, and handling complaints from bad output."
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
