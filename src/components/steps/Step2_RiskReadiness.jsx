import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StarRating from '../inputs/StarRating';
import ToggleQuestion from '../inputs/ToggleQuestion';

const CHANGE_READINESS_DESCRIPTIONS = [
  "Significant resistance expected. Leadership hasn't communicated the why.",
  'Some openness but no formal change plan. Team is skeptical.',
  'Moderate readiness. Leadership supports it. Some champions exist.',
  'Strong readiness. Clear communication plan. Team is excited.',
  'Fully bought in. Change management resourced. Previous successful transformations.',
];

const DATA_READINESS_DESCRIPTIONS = [
  'Data is scattered, inconsistent, mostly manual',
  'Some structured data, lots of cleanup needed',
  'Reasonably organized, some integration work required',
  'Well-structured, accessible via APIs',
  'Enterprise data platform, clean and governed',
];

const slideVariants = {
  enter: { x: 40, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -40, opacity: 0 },
};

export default function Step2_RiskReadiness({ formData, updateField }) {
  const [subStep, setSubStep] = useState(0);
  const advanceTimer = useRef(null);

  const autoAdvance = useCallback(
    (nextSubStep) => {
      clearTimeout(advanceTimer.current);
      if (nextSubStep <= 2) {
        advanceTimer.current = setTimeout(() => {
          setSubStep(nextSubStep);
        }, 300);
      }
    },
    [],
  );

  const handleChangeReadiness = (val) => {
    updateField('changeReadiness', val);
    autoAdvance(1);
  };

  const handleDataReadiness = (val) => {
    updateField('dataReadiness', val);
    autoAdvance(2);
  };

  const handleExecSponsor = (val) => {
    updateField('execSponsor', val);
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <h2 className="mb-2 text-2xl font-bold text-navy sm:text-3xl">
        Let's assess your readiness
      </h2>
      <div className="mb-4 h-1 w-16 rounded bg-gold" />
      <p className="mb-8 text-sm leading-relaxed text-gray-600">
        These questions drive all cost and timeline estimates. 70% of AI implementations
        underperform because they skip this step. We won't.
      </p>

      <AnimatePresence mode="wait">
        {subStep === 0 && (
          <motion.div
            key="changeReadiness"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <StarRating
              label="How ready is your team for this change?"
              value={formData.changeReadiness ?? 3}
              onChange={handleChangeReadiness}
              descriptions={CHANGE_READINESS_DESCRIPTIONS}
            />
          </motion.div>
        )}

        {subStep === 1 && (
          <motion.div
            key="dataReadiness"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <StarRating
              label="How clean and accessible is your data?"
              value={formData.dataReadiness ?? 3}
              onChange={handleDataReadiness}
              descriptions={DATA_READINESS_DESCRIPTIONS}
            />
          </motion.div>
        )}

        {subStep === 2 && (
          <motion.div
            key="execSponsor"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <ToggleQuestion
              label="Is there a C-level executive sponsoring this initiative?"
              value={formData.execSponsor ?? true}
              onChange={handleExecSponsor}
              yesLabel={"Yes \u2014 active executive sponsor"}
              noLabel={"No \u2014 still building the case"}
              note="Projects without executive sponsorship fail 2x more often. This report can help you build that case."
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
