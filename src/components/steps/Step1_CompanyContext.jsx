import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SegmentedSelect from '../inputs/SegmentedSelect';

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

const ROLES = [
  'C-Suite (CEO, CFO, COO, CTO, CIO)',
  'VP / SVP',
  'Director',
  'Head of Department',
  'Manager',
  'Other',
];

const TEAM_LOCATIONS = [
  { label: 'US - Major Tech Hub', sublabel: 'SF, NYC, Seattle, Boston', value: 'US - Major Tech Hub' },
  { label: 'US - Other', sublabel: 'Austin, Denver, Chicago, etc.', value: 'US - Other' },
  { label: 'UK / Western Europe', sublabel: 'London, Berlin, Paris', value: 'UK / Western Europe' },
  { label: 'Canada / Australia', sublabel: 'Toronto, Sydney, etc.', value: 'Canada / Australia' },
  { label: 'Remote / Distributed', sublabel: 'Mixed locations', value: 'Remote / Distributed' },
  { label: 'Eastern Europe', sublabel: 'Poland, Romania, Ukraine', value: 'Eastern Europe' },
  { label: 'Latin America', sublabel: 'Brazil, Mexico, Colombia', value: 'Latin America' },
  { label: 'India / South Asia', sublabel: 'Bangalore, Hyderabad, etc.', value: 'India / South Asia' },
];

const US_STATES = [
  'California', 'New York', 'Texas', 'Massachusetts', 'Washington',
  'Illinois', 'Pennsylvania', 'Georgia', 'New Jersey', 'Colorado',
  'Virginia', 'Florida', 'Other / Not Sure',
];

const slideVariants = {
  enter: { x: 40, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -40, opacity: 0 },
};

export default function Step1_CompanyContext({ formData, updateField }) {
  const [subStep, setSubStep] = useState(0);
  const advanceTimer = useRef(null);

  const isUSLocation = (formData.teamLocation || '').startsWith('US');

  const autoAdvance = useCallback(
    (nextSubStep) => {
      clearTimeout(advanceTimer.current);
      if (nextSubStep <= 4) {
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
    // Set smart team size defaults based on company size
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

  const handleRole = (e) => {
    updateField('role', e.target.value);
    if (e.target.value) autoAdvance(3);
  };

  const handleLocation = (val) => {
    updateField('teamLocation', val);
    if (val.startsWith('US')) {
      autoAdvance(4);
    }
  };

  const handleState = (e) => {
    updateField('companyState', e.target.value);
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <h2 className="mb-2 text-2xl font-bold text-navy sm:text-3xl">
        Let's start with the basics
      </h2>
      <div className="mb-8 h-1 w-16 rounded bg-gold" />

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
                <option value="" disabled>
                  Select your industry...
                </option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>

              <p className="text-sm text-gray-500">
                Industry benchmarks affect realistic adoption timelines and success rates.
              </p>

              {formData.industry && (
                <button
                  type="button"
                  onClick={() => setSubStep(1)}
                  className="
                    mt-4 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold
                    text-navy shadow-sm transition-all duration-150
                    hover:bg-gold/90 focus:outline-none focus-visible:ring-2
                    focus-visible:ring-gold focus-visible:ring-offset-2
                  "
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
                  className="
                    mt-4 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold
                    text-navy shadow-sm transition-all duration-150
                    hover:bg-gold/90 focus:outline-none focus-visible:ring-2
                    focus-visible:ring-gold focus-visible:ring-offset-2
                  "
                >
                  Continue
                </button>
              )}
            </div>
          </motion.div>
        )}

        {subStep === 2 && (
          <motion.div
            key="role"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div className="space-y-3">
              <label
                htmlFor="role-select"
                className="block text-base font-semibold text-navy sm:text-lg"
              >
                What's your role?
              </label>

              <select
                id="role-select"
                value={formData.role || ''}
                onChange={handleRole}
                className="
                  w-full cursor-pointer appearance-none rounded-lg border-2
                  border-gray-200 bg-white px-4 py-4 text-lg font-medium
                  text-navy transition-colors duration-150
                  focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30
                "
              >
                <option value="" disabled>
                  Select your role...
                </option>
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>

              <p className="text-sm text-gray-500">
                This helps us tailor the report language and metrics to what matters most in your role.
              </p>

              {formData.role && (
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
              )}
            </div>
          </motion.div>
        )}

        {subStep === 3 && (
          <motion.div
            key="teamLocation"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <SegmentedSelect
              label="Where would the AI implementation team be based?"
              options={TEAM_LOCATIONS}
              value={formData.teamLocation}
              onChange={handleLocation}
              helperText="This drives salary assumptions for the AI engineering team in the cost model."
            />
          </motion.div>
        )}

        {subStep === 4 && isUSLocation && (
          <motion.div
            key="companyState"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div className="space-y-3">
              <label
                htmlFor="state-select"
                className="block text-base font-semibold text-navy sm:text-lg"
              >
                Which state is the company headquartered in? (optional)
              </label>

              <select
                id="state-select"
                value={formData.companyState || 'Other / Not Sure'}
                onChange={handleState}
                className="
                  w-full cursor-pointer appearance-none rounded-lg border-2
                  border-gray-200 bg-white px-4 py-4 text-lg font-medium
                  text-navy transition-colors duration-150
                  focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30
                "
              >
                {US_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>

              <p className="text-sm text-gray-500">
                Used to estimate state R&D tax credits. Skip if unsure — it won't affect core ROI numbers.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
