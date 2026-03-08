import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SegmentedSelect from '../inputs/SegmentedSelect';
import SliderInput from '../inputs/SliderInput';
import ReadinessSlider from '../inputs/ReadinessSlider';
import ToggleQuestion from '../inputs/ToggleQuestion';
import { AI_TEAM_SALARY } from '../../logic/benchmarks';
import { formatCurrency } from '../../utils/formatters';

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
  { label: 'Startup', sublabel: '1-50', value: 'Startup (1-50)' },
  { label: 'SMB', sublabel: '51-500', value: 'SMB (51-500)' },
  { label: 'Mid-Market', sublabel: '501-5,000', value: 'Mid-Market (501-5,000)' },
  { label: 'Enterprise', sublabel: '5,001-50,000', value: 'Enterprise (5,001-50,000)' },
  { label: 'Large Enterprise', sublabel: '50,000+', value: 'Large Enterprise (50,000+)' },
];

const TEAM_LOCATIONS = [
  { label: 'US - Major Tech Hub', sublabel: 'SF, NYC, Seattle, Boston', value: 'US - Major Tech Hub' },
  { label: 'Remote / Distributed', sublabel: 'Mixed US locations', value: 'Remote / Distributed' },
  { label: 'Blended (US + Offshore)', sublabel: 'US employees + offshore contractors', value: 'Blended' },
  { label: 'Offshore - Employee', sublabel: 'India, Eastern Europe, LatAm', value: 'Offshore - Employee' },
  { label: 'Offshore - Contractor', sublabel: 'Third-party offshore vendor', value: 'Offshore - Contractor' },
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

export default function Step1_CompanyContext({ formData, updateField }) {
  const [subStep, setSubStep] = useState(0);
  const advanceTimer = useRef(null);

  const autoAdvance = useCallback(
    (nextSubStep) => {
      clearTimeout(advanceTimer.current);
      if (nextSubStep <= 5) {
        advanceTimer.current = setTimeout(() => {
          setSubStep(nextSubStep);
        }, 300);
      }
    },
    [],
  );

  const handleIndustryChange = (e) => {
    updateField('industry', e.target.value);
    if (e.target.value) autoAdvance(1);
  };

  const handleCompanySize = (val) => {
    updateField('companySize', val);
    const teamSizeDefaults = {
      'Startup (1-50)': 5,
      'SMB (51-500)': 15,
      'Mid-Market (501-5,000)': 30,
      'Enterprise (5,001-50,000)': 50,
      'Large Enterprise (50,000+)': 75,
    };
    if (teamSizeDefaults[val]) {
      updateField('teamSize', teamSizeDefaults[val]);
    }
    autoAdvance(2);
  };

  const handleLocation = (val) => {
    updateField('teamLocation', val);
    if (val === 'Blended') {
      // Set default contractor % and compute blended salary
      const pct = formData.contractorPct ?? 0.30;
      updateField('contractorPct', pct);
      const blended = Math.round((1 - pct) * AI_TEAM_SALARY['US - Major Tech Hub'] + pct * AI_TEAM_SALARY['Offshore - Contractor']);
      updateField('blendedAISalary', blended);
      // Don't auto-advance — let user adjust the slider
    } else {
      autoAdvance(3);
    }
  };

  const handleContractorPct = (pctInt) => {
    const pct = pctInt / 100;
    updateField('contractorPct', pct);
    const blended = Math.round((1 - pct) * AI_TEAM_SALARY['US - Major Tech Hub'] + pct * AI_TEAM_SALARY['Offshore - Contractor']);
    updateField('blendedAISalary', blended);
  };

  const handleChangeReadiness = (val) => {
    updateField('changeReadiness', val);
    autoAdvance(4);
  };

  const handleDataReadiness = (val) => {
    updateField('dataReadiness', val);
    autoAdvance(5);
  };

  const handleExecSponsor = (val) => {
    updateField('execSponsor', val);
  };

  // Determine section header based on substep
  const isReadinessSection = subStep >= 3;

  return (
    <div className="mx-auto w-full max-w-xl">
      <h2 className="mb-2 text-2xl font-bold text-navy sm:text-3xl">
        {isReadinessSection ? "Let's assess your readiness" : "Let's start with the basics"}
      </h2>
      <div className="mb-4 h-1 w-16 rounded bg-gold" />
      {isReadinessSection && (
        <div className="mb-6 space-y-2">
          <p className="text-sm leading-relaxed text-gray-600">
            <span className="font-bold underline">These questions drive all cost and timeline estimates.</span>
          </p>
          <div className="rounded-xl bg-navy px-4 py-3">
            <p className="text-sm text-white">
              <span className="text-base font-extrabold italic">70&ndash;85%</span> of AI implementations underperform because they skip this step.
            </p>
          </div>
        </div>
      )}
      {!isReadinessSection && <div className="mb-4" />}

      <AnimatePresence mode="wait">
        {subStep === 0 && (
          <motion.div
            key="industry"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div className="space-y-3">
              <label
                htmlFor="industry-select"
                className="block text-base font-semibold text-navy sm:text-lg"
              >
                What industry are you in?
              </label>
              <select
                id="industry-select"
                value={formData.industry || ''}
                onChange={handleIndustryChange}
                className="
                  w-full cursor-pointer appearance-none rounded-lg border-2
                  border-gray-200 bg-white px-4 py-4 text-lg font-medium
                  text-navy transition-colors duration-150
                  focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30
                "
              >
                <option value="" disabled>Select your industry...</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
              <p className="text-sm text-gray-500">
                Industry benchmarks affect realistic adoption timelines and success rates.
              </p>
              {formData.industry && (
                <button
                  type="button"
                  onClick={() => setSubStep(1)}
                  className="mt-4 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-navy shadow-sm transition-all duration-150 hover:bg-sky focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                >
                  Continue
                </button>
              )}
            </div>
          </motion.div>
        )}

        {subStep === 1 && (
          <motion.div
            key="companySize"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div className="space-y-3">
              <SegmentedSelect
                label="How large is your organization?"
                options={COMPANY_SIZES}
                value={formData.companySize}
                onChange={handleCompanySize}
                helperText="Larger organizations typically see longer implementation timelines but higher absolute ROI."
              />
              {formData.companySize && (
                <button
                  type="button"
                  onClick={() => setSubStep(2)}
                  className="mt-4 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-navy shadow-sm transition-all duration-150 hover:bg-sky focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                >
                  Continue
                </button>
              )}
            </div>
          </motion.div>
        )}

        {subStep === 2 && (
          <motion.div
            key="teamLocation"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div className="space-y-4">
              <SegmentedSelect
                label="Where would the AI implementation team be based?"
                options={TEAM_LOCATIONS}
                value={formData.teamLocation}
                onChange={handleLocation}
                helperText="Drives fully-loaded salary assumptions based on historical benchmarks by location, using weighted averages of AI engineering team costs (base + benefits + taxes + overhead)."
              />

              {formData.teamLocation === 'Blended' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <SliderInput
                    label="What % of the AI team will be offshore contractors?"
                    value={Math.round((formData.contractorPct ?? 0.30) * 100)}
                    onChange={handleContractorPct}
                    min={10}
                    max={90}
                    step={5}
                    suffix="%"
                    helperText={`${100 - Math.round((formData.contractorPct ?? 0.30) * 100)}% US ($${(AI_TEAM_SALARY['US - Major Tech Hub'] / 1000).toFixed(0)}K) + ${Math.round((formData.contractorPct ?? 0.30) * 100)}% Offshore ($${(AI_TEAM_SALARY['Offshore - Contractor'] / 1000).toFixed(0)}K)`}
                  />

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-emerald-800">Blended AI Salary</span>
                      <span className="text-lg font-bold font-mono text-emerald-800">
                        {formatCurrency(formData.blendedAISalary ?? 169500)}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-600/70 mt-1">Weighted average fully-loaded cost per person</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSubStep(3)}
                    className="mt-2 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-navy shadow-sm transition-all duration-150 hover:bg-sky focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                  >
                    Continue
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {subStep === 3 && (
          <motion.div
            key="changeReadiness"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <ReadinessSlider
              label="How ready is your team for this change?"
              value={formData.changeReadiness ?? 3}
              onChange={handleChangeReadiness}
              descriptions={CHANGE_READINESS_DESCRIPTIONS}
            />
            <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 text-xs leading-relaxed text-orange-800">
              <p className="font-bold text-orange-700 text-sm mb-1">Team Readiness: #1 barrier to AI success</p>
              <p><span className="font-bold italic">70%</span> of digital transformations fail due to cultural and organizational barriers, yet companies allocate only <span className="font-bold italic">10%</span> of budgets to change management.<sup>1</sup></p>
            </div>
          </motion.div>
        )}

        {subStep === 4 && (
          <motion.div
            key="dataReadiness"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <ReadinessSlider
              label="How clean and accessible is your data?"
              value={formData.dataReadiness ?? 3}
              onChange={handleDataReadiness}
              descriptions={DATA_READINESS_DESCRIPTIONS}
            />
            <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 text-xs leading-relaxed text-orange-800">
              <p className="font-bold text-orange-700 text-sm mb-1">Data Readiness: The silent project killer</p>
              <p><span className="font-bold italic">63%</span> of organizations lack proper data management practices for AI. Gartner predicts <span className="font-bold italic">60%</span> of AI projects will be abandoned by 2026 due to data issues.<sup>2</sup></p>
            </div>
          </motion.div>
        )}

        {subStep === 5 && (
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
              value={formData.execSponsor}
              onChange={handleExecSponsor}
              yesLabel="Yes — active executive sponsor"
              noLabel="No — still building the case"
              note=""
            />
            {formData.execSponsor === true && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs leading-relaxed text-emerald-800">
                <p className="font-bold text-emerald-700 text-sm mb-1">Executive Sponsor: The success multiplier</p>
                <p>JPMorgan's CEO-driven AI strategy delivered <span className="font-bold italic">600+</span> production use cases and a <span className="font-bold italic">20%</span> gross sales lift.<sup>3</sup></p>
              </div>
            )}
            {formData.execSponsor === false && (
              <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 text-xs leading-relaxed text-orange-800">
                <p className="font-bold text-orange-700 text-sm mb-1">Executive Sponsor: The success multiplier</p>
                <p>Only <span className="font-bold italic">10%</span> of companies have structured plans to support workers through AI disruption. Without C-suite alignment, AI stays stuck in pilot.<sup>4</sup> This report can help you build that case.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {isReadinessSection && (
        <div className="mt-6 text-left text-[10px] text-gray-400 leading-relaxed space-y-0.5">
          <p><sup>1</sup> McKinsey, &ldquo;Reconfiguring Work: Change Management in the Age of GenAI&rdquo; (2024)</p>
          <p><sup>2</sup> Gartner, &ldquo;Lack of AI-Ready Data Puts AI Projects at Risk&rdquo; (Feb 2025)</p>
          <p><sup>3</sup> Harvard Business School, &ldquo;JPMorganChase: Leadership in the Age of GenAI&rdquo; (2024)</p>
          <p><sup>4</sup> Adecco Group, &ldquo;AI Disruption Readiness Report&rdquo; (2025)</p>
        </div>
      )}
    </div>
  );
}
