import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SegmentedSelect from '../inputs/SegmentedSelect';
import CurrencyInput from '../inputs/CurrencyInput';
import SliderInput from '../inputs/SliderInput';
import ToggleQuestion from '../inputs/ToggleQuestion';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import {
  getRealisticTimeline,
  AI_TEAM_SALARY,
  MAX_IMPL_TEAM,
  DATA_TIMELINE_MULTIPLIER,
  DATA_COST_MULTIPLIER,
  SIZE_MULTIPLIER,
  PLATFORM_LICENSE_COST,
  LEGAL_COMPLIANCE_COST,
  SECURITY_AUDIT_COST,
  CONTINGENCY_RATE,
  ANNUAL_COMPLIANCE_COST,
  API_COST_PER_1K_REQUESTS,
  REQUESTS_PER_PERSON_HOUR,
  CASH_REALIZATION_DEFAULTS,
  CYCLE_TIME_REDUCTION,
} from '../../logic/benchmarks';

// Auto-calculate suggested values based on company context
function computeSuggestedValues(formData) {
  const teamSize = formData.teamSize || 10;
  const companySize = formData.companySize || 'Mid-Market (501-5,000)';
  const teamLocation = formData.teamLocation || 'US - Major Tech Hub';
  const dataReadiness = formData.dataReadiness || 3;
  const industry = formData.industry || 'Other';
  const processType = formData.processType || 'Other';
  const assumptions = formData.assumptions || {};

  // Suggest timeline based on industry and company size
  const suggestedTimeline = getRealisticTimeline(industry, companySize);

  // Compute implementation cost based on team size and context
  const aiSalary = AI_TEAM_SALARY[teamLocation] || 135000;
  const maxTeam = MAX_IMPL_TEAM[companySize] || 10;
  const sizeMult = SIZE_MULTIPLIER[companySize] || 1.0;
  const dataCostMult = DATA_COST_MULTIPLIER[dataReadiness] || 1.10;
  const dataTimeMult = DATA_TIMELINE_MULTIPLIER[dataReadiness] || 1.10;

  const adjustedTimeline = Math.ceil(suggestedTimeline * dataTimeMult);
  const implTimelineYears = adjustedTimeline / 12;

  // Engineering headcount based on team size
  const scopeMinEngineers = Math.max(1, Math.ceil(teamSize / 12));
  const timelinePressure = suggestedTimeline <= 3 ? 1.5 : suggestedTimeline <= 6 ? 1.2 : 1.0;
  const dataHeadcountMult = dataReadiness <= 2 ? 1.3 : dataReadiness === 3 ? 1.1 : 1.0;
  const rawEngineers = Math.ceil(scopeMinEngineers * timelinePressure * dataHeadcountMult);
  const engineers = Math.min(rawEngineers, maxTeam);
  const pms = Math.max(0.5, Math.ceil(engineers / 5));

  // Implementation costs
  const engineeringCost = engineers * aiSalary * implTimelineYears;
  const pmCost = pms * (aiSalary * 0.85) * implTimelineYears;
  const infraCost = (engineeringCost + pmCost) * 0.12;
  const trainingCost = (engineeringCost + pmCost) * 0.08;
  const computedImplCost = Math.round((engineeringCost + pmCost + infraCost + trainingCost) / 5000) * 5000;

  // Suggested budget (rounded to nice numbers)
  const suggestedBudget = Math.max(25000, computedImplCost);

  // Ongoing costs based on company size and process type
  const licenseCost = PLATFORM_LICENSE_COST[companySize] || 48000;
  const complianceCost = ANNUAL_COMPLIANCE_COST[companySize] || 30000;
  const apiCostPerK = assumptions.apiCostPer1kRequests ?? API_COST_PER_1K_REQUESTS[processType] ?? 10;
  const requestsPerHour = assumptions.requestsPerPersonHour ?? REQUESTS_PER_PERSON_HOUR[processType] ?? 12;
  const monthlyApiVolume = teamSize * (formData.hoursPerWeek || 20) * 4.33 * requestsPerHour;
  const annualApiCost = (monthlyApiVolume / 1000) * apiCostPerK * 12;
  const ongoingAiHeadcount = Math.max(0.5, Math.round(engineers * 0.25 * 2) / 2);
  const ongoingLaborCost = ongoingAiHeadcount * aiSalary;

  const suggestedOngoing = Math.round((licenseCost + complianceCost + annualApiCost + ongoingLaborCost * 0.3) / 5000) * 5000;

  return {
    suggestedBudget,
    suggestedTimeline,
    suggestedOngoing: Math.max(10000, suggestedOngoing),
    adjustedTimeline,
    engineers,
    pms,
  };
}

const BUDGET_OPTIONS = [
  { label: '$25K - $50K', sublabel: 'Pilot / POC', value: 37500 },
  { label: '$50K - $150K', sublabel: 'Department rollout', value: 100000 },
  { label: '$150K - $500K', sublabel: 'Enterprise implementation', value: 325000 },
  { label: '$500K - $1M', sublabel: 'Full transformation', value: 750000 },
  { label: '$1M+', sublabel: 'Multi-year program', value: 1500000 },
];

const TIMELINE_OPTIONS = [
  { months: '1-3 months', label: 'Aggressive', value: 2 },
  { months: '3-6 months', label: 'Typical', value: 4.5 },
  { months: '6-12 months', label: 'Conservative', value: 9 },
  { months: '12-18 months', label: 'Complex enterprise', value: 15 },
];

const slideVariants = {
  enter: { x: 80, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -80, opacity: 0 },
};

function computeScopePreview(formData) {
  const teamSize = formData.teamSize || 10;
  const companySize = formData.companySize || 'Mid-Market (501-5,000)';
  const teamLocation = formData.teamLocation || 'US - Major Tech Hub';
  const dataReadiness = formData.dataReadiness || 3;
  const expectedTimeline = formData.expectedTimeline || 6;
  const budget = formData.implementationBudget || 100000;

  const aiSalary = AI_TEAM_SALARY[teamLocation] || 135000;
  const maxTeam = MAX_IMPL_TEAM[companySize] || 10;
  const sizeMult = SIZE_MULTIPLIER[companySize] || 1.0;
  const dataCostMult = DATA_COST_MULTIPLIER[dataReadiness] || 1.10;
  const dataTimeMult = DATA_TIMELINE_MULTIPLIER[dataReadiness] || 1.10;

  const adjustedTimeline = Math.ceil(expectedTimeline * dataTimeMult * sizeMult);
  const implTimelineYears = adjustedTimeline / 12;

  // Engineering headcount
  const scopeMinEngineers = Math.max(1, Math.ceil(teamSize / 12));
  const timelinePressure = expectedTimeline <= 3 ? 1.5 : expectedTimeline <= 6 ? 1.2 : 1.0;
  const dataHeadcountMult = dataReadiness <= 2 ? 1.3 : dataReadiness === 3 ? 1.1 : 1.0;
  const rawEngineers = Math.ceil(scopeMinEngineers * timelinePressure * dataHeadcountMult);
  const engineers = Math.min(rawEngineers, maxTeam);
  const pms = Math.max(0.5, Math.ceil(engineers / 5));

  // Costs
  const engineeringCost = engineers * aiSalary * implTimelineYears;
  const pmCost = pms * (aiSalary * 0.85) * implTimelineYears;
  const infraCost = (engineeringCost + pmCost) * 0.12;
  const trainingCost = (engineeringCost + pmCost) * 0.08;
  const computedImplCost = engineeringCost + pmCost + infraCost + trainingCost;

  const legalCost = LEGAL_COMPLIANCE_COST[companySize] || 50000;
  const securityCost = SECURITY_AUDIT_COST[companySize] || 40000;
  const contingency = computedImplCost * CONTINGENCY_RATE;
  const licenseCost = PLATFORM_LICENSE_COST[companySize] || 48000;

  const adjustedBudget = budget * dataCostMult;
  const realisticCost = Math.max(adjustedBudget, computedImplCost);
  const gap = computedImplCost - adjustedBudget;

  return {
    aiSalary,
    engineers,
    pms,
    engineeringCost,
    pmCost,
    infraCost,
    trainingCost,
    computedImplCost,
    legalCost,
    securityCost,
    contingency,
    licenseCost,
    realisticCost,
    gap,
    adjustedTimeline,
    teamLocation,
    companySize,
  };
}

export default function Step5_AIInvestment({ formData, updateField }) {
  const [subStep, setSubStep] = useState(0);
  const advanceTimer = useRef(null);
  const [hasAutoFilled, setHasAutoFilled] = useState(false);

  // Compute suggested values based on all context
  const suggested = useMemo(() => computeSuggestedValues(formData), [
    formData.teamSize, formData.companySize, formData.teamLocation,
    formData.dataReadiness, formData.industry, formData.projectArchetype,
    formData.hoursPerWeek
  ]);

  // Auto-fill suggested values if not already set
  useEffect(() => {
    if (!hasAutoFilled) {
      if (formData.implementationBudget === null || formData.implementationBudget === undefined) {
        updateField('implementationBudget', suggested.suggestedBudget);
      }
      if (formData.expectedTimeline === null || formData.expectedTimeline === undefined) {
        updateField('expectedTimeline', suggested.suggestedTimeline);
      }
      if (formData.ongoingAnnualCost === null || formData.ongoingAnnualCost === undefined) {
        updateField('ongoingAnnualCost', suggested.suggestedOngoing);
      }
      setHasAutoFilled(true);
    }
  }, [hasAutoFilled, suggested, formData, updateField]);

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

  const handleBudget = (val) => {
    updateField('implementationBudget', val);
    autoAdvance(1);
  };

  const handleTimeline = (val) => {
    updateField('expectedTimeline', val);
    autoAdvance(2);
  };

  const handleOngoingCost = (val) => {
    updateField('ongoingAnnualCost', val);
  };

  // V3: cycle time benchmark for the industry
  const cycleTimeBenchmark = CYCLE_TIME_REDUCTION[formData.industry] || CYCLE_TIME_REDUCTION['Other'];

  const industry = formData.industry || 'Other';
  const companySize = formData.companySize || 'Mid-Market (501-5,000)';
  const realisticMonths = getRealisticTimeline(industry, companySize);
  const selectedTimeline = formData.expectedTimeline;
  const adjustedTimeline = selectedTimeline
    ? Math.ceil((selectedTimeline + realisticMonths) / 2)
    : null;

  const scope = useMemo(
    () => formData.implementationBudget ? computeScopePreview(formData) : null,
    [formData.implementationBudget, formData.teamSize, formData.companySize,
     formData.teamLocation, formData.dataReadiness, formData.expectedTimeline],
  );

  return (
    <div className="mx-auto w-full max-w-xl">
      <h2 className="mb-2 text-2xl font-bold text-navy sm:text-3xl">
        Let's model the AI investment
      </h2>
      <div className="mb-4 h-1 w-16 rounded bg-gold" />
      <p className="mb-8 text-sm leading-relaxed text-gray-600">
        Based on your team size, readiness, and industry, we've pre-filled realistic
        estimates below. Adjust if you have specific budget constraints.
      </p>

      <AnimatePresence mode="wait">
        {subStep === 0 && (
          <motion.div
            key="budget"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="space-y-4">
              <SegmentedSelect
                label="What's your estimated AI implementation budget?"
                options={BUDGET_OPTIONS}
                value={formData.implementationBudget}
                onChange={handleBudget}
              />

              {scope && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-xl border border-navy/10 bg-navy/5 p-4 space-y-3"
                >
                  <p className="text-sm font-semibold text-navy">
                    What This Gets You
                  </p>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-baseline">
                      <span className="text-navy/80">AI team</span>
                      <span className="font-medium text-navy">{scope.engineers} engineer{scope.engineers > 1 ? 's' : ''} + {scope.pms} PM for {scope.adjustedTimeline} months</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-navy/80">Engineer rate</span>
                      <span className="font-medium text-navy">{formatCurrency(scope.aiSalary)}/yr ({scope.teamLocation})</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-navy/80">Includes</span>
                      <span className="text-navy/70 text-right text-xs max-w-[60%]">Infrastructure setup, team training, platform licensing</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-baseline border-t border-navy/10 pt-2">
                    <span className="text-navy font-medium text-sm">Computed cost</span>
                    <span className="font-mono font-bold text-navy">{formatCurrency(scope.computedImplCost)}</span>
                  </div>

                  {scope.gap > 0 ? (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                      <p className="text-sm font-medium text-amber-700">
                        Your budget is {formatCurrency(scope.gap)} short of the computed cost
                      </p>
                      <p className="text-xs text-amber-600 mt-0.5">
                        The model uses the higher figure. Consider phased rollout or adjusting scope.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                      <p className="text-sm font-medium text-emerald-700">
                        Budget covers the computed implementation cost
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {subStep === 1 && (
          <motion.div
            key="timeline"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="space-y-4">
              <label className="block text-base font-semibold text-navy sm:text-lg">
                How quickly do you expect to see results?
              </label>

              <div className="grid grid-cols-2 gap-2 sm:flex">
                {TIMELINE_OPTIONS.map((opt) => {
                  const isSelected = formData.expectedTimeline === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleTimeline(opt.value)}
                      className={`
                        sm:flex-1 flex flex-col items-center gap-1 rounded-lg border-2
                        min-h-[44px] px-3 py-3 text-center transition-all duration-150
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2
                        ${
                          isSelected
                            ? 'border-gold bg-gold/10 text-navy'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      <span className="text-xs font-bold leading-tight sm:text-sm">
                        {opt.months}
                      </span>
                      <span
                        className={`text-[11px] sm:text-xs ${
                          isSelected ? 'text-navy/60' : 'text-gray-400'
                        }`}
                      >
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedTimeline != null && (
                <div className="rounded-xl border border-navy/10 bg-navy/5 p-4 space-y-2">
                  <p className="text-sm font-semibold text-navy">
                    Reality Check
                  </p>
                  <div className="space-y-1 text-sm text-navy/80">
                    <p>
                      Based on <span className="font-medium">{industry}</span> companies
                      of your size, the typical timeline is{' '}
                      <span className="font-bold text-navy">{realisticMonths} months</span>.
                    </p>
                    <p>
                      Your selected timeline:{' '}
                      <span className="font-medium">{selectedTimeline} months</span>.
                    </p>
                    <p className="pt-1 font-semibold text-navy">
                      Adjusted estimate: {adjustedTimeline} months
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {subStep === 2 && (
          <motion.div
            key="ongoingCost"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="space-y-4">
              <CurrencyInput
                label="Estimated annual cost to maintain the AI solution?"
                value={formData.ongoingAnnualCost ?? 25000}
                onChange={handleOngoingCost}
                presets={[10000, 25000, 50000, 100000]}
                helperText="Include API costs, licenses, support, and dedicated staff time"
              />

              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Rule of thumb: ongoing costs are typically 20-35% of initial implementation
                budget per year
              </p>

              <button
                type="button"
                onClick={() => setSubStep(3)}
                className="
                  mt-2 min-h-[44px] rounded-lg border-2 border-dashed border-navy/20 px-6 py-2.5
                  text-sm font-medium text-navy/60 transition-all duration-150
                  hover:border-navy/40 hover:text-navy hover:bg-navy/5
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2
                "
              >
                Advanced Value Modeling (optional)
              </button>
            </div>
          </motion.div>
        )}

        {subStep === 3 && (
          <motion.div
            key="v3Options"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="space-y-6">
              <div>
                <p className="text-base font-semibold text-navy sm:text-lg mb-1">
                  Advanced Value Modeling
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Optional inputs for a richer analysis. Leave defaults if unsure.
                </p>
              </div>

              {/* Cash Realization % */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-navy">
                  Cash Realization %
                </label>
                <div className="flex gap-2">
                  {[
                    { label: '25%', value: 0.25, sublabel: 'Conservative' },
                    { label: '40%', value: 0.40, sublabel: 'Typical' },
                    { label: '60%', value: 0.60, sublabel: 'Optimistic' },
                  ].map(opt => {
                    const current = formData.cashRealizationPct ?? CASH_REALIZATION_DEFAULTS.base;
                    const isSelected = current === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateField('cashRealizationPct', opt.value)}
                        className={`
                          flex-1 flex flex-col items-center gap-0.5 rounded-lg border-2
                          px-3 py-2 text-center transition-all duration-150
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2
                          ${isSelected
                            ? 'border-gold bg-gold/10 text-navy'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        <span className="text-sm font-bold">{opt.label}</span>
                        <span className={`text-[11px] ${isSelected ? 'text-navy/60' : 'text-gray-400'}`}>
                          {opt.sublabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500">
                  What % of efficiency gains convert to actual cash savings vs. redeployed capacity.
                </p>
              </div>

              {/* Annual Revenue */}
              <CurrencyInput
                label="Annual company revenue (optional)"
                value={formData.annualRevenue || 0}
                onChange={(val) => updateField('annualRevenue', val)}
                presets={[1000000, 10000000, 50000000, 100000000]}
                helperText="Used to estimate revenue acceleration from reduced cycle times"
              />

              {/* Contribution Margin */}
              {formData.annualRevenue > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.2 }}
                >
                  <SliderInput
                    label="Contribution margin"
                    value={Math.round((formData.contributionMargin ?? 0.30) * 100)}
                    onChange={(val) => updateField('contributionMargin', val / 100)}
                    min={10}
                    max={80}
                    step={5}
                    suffix="%"
                    helperText={`AI cycle time reduction: ~${cycleTimeBenchmark.months} months (${formData.industry || 'your industry'} benchmark)`}
                  />
                </motion.div>
              )}

              {/* Value Pathway Toggles */}
              <div className="rounded-xl border border-navy/10 bg-navy/5 p-4 space-y-3">
                <p className="text-sm font-semibold text-navy">Include in NPV calculation?</p>
                <p className="text-xs text-gray-500 -mt-1">
                  By default, only cost savings are included. Toggle these to add broader value.
                </p>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.includeCapacityValue ?? false}
                    onChange={(e) => updateField('includeCapacityValue', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-gold focus:ring-gold"
                  />
                  <span className="text-sm text-navy">
                    Capacity creation <span className="text-gray-500">(freed hours + revenue acceleration)</span>
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.includeRiskReduction ?? false}
                    onChange={(e) => updateField('includeRiskReduction', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-gold focus:ring-gold"
                  />
                  <span className="text-sm text-navy">
                    Risk reduction <span className="text-gray-500">(regulatory/compliance value)</span>
                  </span>
                </label>

                {formData.annualRevenue > 0 && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.includeRevenueAcceleration ?? false}
                      onChange={(e) => updateField('includeRevenueAcceleration', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-gold focus:ring-gold"
                    />
                    <span className="text-sm text-navy">
                      Revenue acceleration <span className="text-gray-500">(cycle time reduction)</span>
                    </span>
                  </label>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
