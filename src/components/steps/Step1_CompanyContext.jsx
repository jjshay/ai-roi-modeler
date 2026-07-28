import { useState, useCallback, useEffect, useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import SegmentedSelect from '../inputs/SegmentedSelect';
import ReadinessCards from '../inputs/ReadinessCards';
import ToggleQuestion from '../inputs/ToggleQuestion';
import CostTransitionPlan from './CostTransitionPlan';

const INDUSTRIES = [
  'Technology / Software',
  'Financial Services / Banking',
  'Healthcare / Life Sciences',
  'Manufacturing / Industrial',
  'Retail / E-Commerce',
  'Professional Services / Consulting',
  'Media / Entertainment',
  'Energy / Utilities',
  'Government / Public Sector',
  'Other',
];

const COMPANY_SIZES = [
  { label: 'Startup', sublabel: '1–50', value: 'Startup (1-50)' },
  { label: 'SMB', sublabel: '51–500', value: 'SMB (51-500)' },
  { label: 'Mid-Market', sublabel: '501–5,000', value: 'Mid-Market (501-5,000)' },
  { label: 'Enterprise', sublabel: '5,001–50,000', value: 'Enterprise (5,001-50,000)' },
  { label: 'Large Enterprise', sublabel: '50,000+', value: 'Large Enterprise (50,000+)' },
];

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

function initialSubStep(formData) {
  if (formData.costTransitionComplete) return 5;
  if (formData.industry && formData.companySize && formData.execSponsor !== null && formData.execSponsor !== undefined) return 4;
  if (formData.industry && formData.companySize) return 2;
  if (formData.industry) return 1;
  return 0;
}

export default function Step1_CompanyContext({ formData, updateField, onFlowStateChange, onComplete }) {
  const [subStep, setSubStep] = useState(() => initialSubStep(formData));
  const advanceTimer = useRef(null);

  const autoAdvance = useCallback((nextSubStep) => {
    clearTimeout(advanceTimer.current);
    if (nextSubStep <= 5) {
      advanceTimer.current = setTimeout(() => setSubStep(nextSubStep), 300);
    }
  }, []);

  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  const isComplete = subStep === 5
    && Boolean(formData.industry)
    && Boolean(formData.companySize)
    && formData.changeReadiness != null
    && formData.dataReadiness != null
    && formData.execSponsor != null
    && Boolean(formData.costTransitionComplete);

  useEffect(() => {
    onFlowStateChange?.(isComplete);
  }, [isComplete, onFlowStateChange]);

  const handleIndustryChange = (event) => {
    updateField('industry', event.target.value);
    updateField('costTransitionComplete', false);
    if (event.target.value) autoAdvance(1);
  };

  const handleCompanySize = (value) => {
    updateField('companySize', value);
    updateField('costTransitionComplete', false);
    // Company size influences the implementation planning envelope, not the number of
    // people working in this specific process.
    autoAdvance(2);
  };

  const isReadinessSection = subStep >= 2;
  const isCostTransitionSection = subStep === 5;

  return (
    <div className="mx-auto w-full max-w-xl">
      {!isCostTransitionSection && (
        <>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-navy/45">Model context</p>
          <h2 className="mb-2 text-2xl font-bold text-navy sm:text-3xl">
            {isReadinessSection ? 'How ready is the organization?' : 'Tell us about your company'}
          </h2>
          <div className="mb-4 h-1 w-16 rounded bg-gold" />
          {isReadinessSection ? (
            <div className="mb-6 rounded-xl border border-navy/10 bg-navy/[0.03] px-4 py-3">
              <p className="text-sm leading-relaxed text-gray-600">
                These inputs shape the implementation pace and the level of risk applied to the ROI estimate.
              </p>
            </div>
          ) : (
            <p className="mb-6 text-sm leading-relaxed text-gray-600">
              These planning inputs add practical context after you have defined the process economics.
            </p>
          )}
        </>
      )}

      <AnimatePresence mode="wait">
        {subStep === 0 && (
          <Motion.div key="industry" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.15, ease: 'easeOut' }}>
            <div className="space-y-3">
              <label htmlFor="industry-select" className="block text-base font-semibold text-navy sm:text-lg">
                What industry are you in?
              </label>
              <select
                id="industry-select"
                value={formData.industry || ''}
                onChange={handleIndustryChange}
                className="w-full cursor-pointer appearance-none rounded-lg border-2 border-gray-200 bg-white px-4 py-4 text-lg font-medium text-navy transition-colors duration-150 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
              >
                <option value="" disabled>Select your industry…</option>
                {INDUSTRIES.map((industry) => <option key={industry} value={industry}>{industry}</option>)}
              </select>
              <p className="text-sm text-gray-500">The industry planning envelope affects adoption, wage growth, and implementation timelines.</p>
              {formData.industry && (
                <button type="button" onClick={() => setSubStep(1)} className="mt-4 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-navy shadow-sm transition-all duration-150 hover:bg-sky focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2">
                  Continue
                </button>
              )}
            </div>
          </Motion.div>
        )}

        {subStep === 1 && (
          <Motion.div key="companySize" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.15, ease: 'easeOut' }}>
            <div className="space-y-3">
              <SegmentedSelect
                label="How large is your organization?"
                options={COMPANY_SIZES}
                value={formData.companySize}
                onChange={handleCompanySize}
                helperText="This changes implementation planning assumptions only. Your process workforce stays exactly as you entered it."
              />
              {formData.companySize && (
                <button type="button" onClick={() => setSubStep(2)} className="mt-4 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-navy shadow-sm transition-all duration-150 hover:bg-sky focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2">
                  Continue
                </button>
              )}
            </div>
          </Motion.div>
        )}

        {subStep === 2 && (
          <Motion.div key="changeReadiness" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.15, ease: 'easeOut' }}>
            <ReadinessCards
              label="How ready is your team for this change?"
              value={formData.changeReadiness ?? 3}
              onChange={(value) => {
                updateField('changeReadiness', value);
                updateField('costTransitionComplete', false);
              }}
              descriptions={CHANGE_READINESS_DESCRIPTIONS}
            />
            <button
              type="button"
              onClick={() => {
                if (formData.changeReadiness == null) updateField('changeReadiness', 3);
                setSubStep(3);
              }}
              className="mt-4 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-navy shadow-sm transition-all duration-150 hover:bg-sky focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
            >
              Continue
            </button>
          </Motion.div>
        )}

        {subStep === 3 && (
          <Motion.div key="dataReadiness" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.15, ease: 'easeOut' }}>
            <ReadinessCards
              label="How clean and accessible is your data?"
              value={formData.dataReadiness ?? 3}
              onChange={(value) => {
                updateField('dataReadiness', value);
                updateField('costTransitionComplete', false);
              }}
              descriptions={DATA_READINESS_DESCRIPTIONS}
            />
            <button
              type="button"
              onClick={() => {
                if (formData.dataReadiness == null) updateField('dataReadiness', 3);
                setSubStep(4);
              }}
              className="mt-4 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-navy shadow-sm transition-all duration-150 hover:bg-sky focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
            >
              Continue
            </button>
          </Motion.div>
        )}

        {subStep === 4 && (
          <Motion.div key="execSponsor" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.15, ease: 'easeOut' }}>
            <ToggleQuestion
              label="Is there a C-level executive sponsoring this initiative?"
              value={formData.execSponsor}
              onChange={(value) => {
                updateField('execSponsor', value);
                updateField('costTransitionComplete', false);
              }}
              yesLabel="Yes — active executive sponsor"
              noLabel="No — still building the case"
              note=""
            />
            {formData.execSponsor != null && (
              <button
                type="button"
                onClick={() => setSubStep(5)}
                className="mt-5 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-navy shadow-sm transition-all duration-150 hover:bg-sky focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
              >
                Continue to cost &amp; transition plan
              </button>
            )}
          </Motion.div>
        )}

        {subStep === 5 && (
          <Motion.div key="costTransitionPlan" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.15, ease: 'easeOut' }}>
            <CostTransitionPlan formData={formData} updateField={updateField} onComplete={onComplete} />
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
