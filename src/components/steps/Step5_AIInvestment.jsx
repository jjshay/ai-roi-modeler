import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CurrencyInput from '../inputs/CurrencyInput';
import SliderInput from '../inputs/SliderInput';
import { formatCurrency } from '../../utils/formatters';
import { getArchetypeById } from '../../logic/archetypes';
import { calculateWorkforceMix } from '../../logic/workforceMix';
import {
  getRealisticTimeline,
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
} from '../../logic/benchmarks';

function getDeploymentRate(formData) {
  const workforceMix = calculateWorkforceMix(formData);
  const annualFullyBurdenedRate = workforceMix.hasWorkforceMix
    ? workforceMix.blendedFullyBurdenedCost
    : Math.max(10000, Number(formData.avgSalary) || 100000);

  return {
    annualFullyBurdenedRate,
    source: workforceMix.hasWorkforceMix
      ? 'Your direct employee / contractor mix'
      : 'Your entered workforce cost',
  };
}

// Auto-calculate suggested values based on company context
function computeSuggestedValues(formData) {
  const teamSize = formData.teamSize || 10;
  const companySize = formData.companySize || 'Mid-Market (501-5,000)';
  const dataReadiness = formData.dataReadiness || 3;
  const industry = formData.industry || 'Other';
  const processType = formData.processType || 'Other';
  const assumptions = formData.assumptions || {};

  // Suggest timeline based on industry and company size
  const suggestedTimeline = getRealisticTimeline(industry, companySize);

  // Compute implementation cost from the workforce mix entered for the
  // affected process. No hidden location-based implementation salary applies.
  const { annualFullyBurdenedRate } = getDeploymentRate(formData);
  const maxTeam = MAX_IMPL_TEAM[companySize] || 10;
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
  const engineeringCost = engineers * annualFullyBurdenedRate * implTimelineYears;
  const pmCost = pms * annualFullyBurdenedRate * implTimelineYears;
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
  const ongoingLaborCost = ongoingAiHeadcount * annualFullyBurdenedRate;

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

const TIMELINE_PRESETS = [
  { label: '6 mo', value: 6 },
  { label: '8 mo', value: 8 },
  { label: '12 mo', value: 12 },
  { label: '18 mo', value: 18 },
];

const slideVariants = {
  enter: { x: 80, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -80, opacity: 0 },
};

function computeScopePreview(formData) {
  const teamSize = formData.teamSize || 10;
  const companySize = formData.companySize || 'Mid-Market (501-5,000)';
  const dataReadiness = formData.dataReadiness || 3;
  const expectedTimeline = formData.expectedTimeline || 6;

  const { annualFullyBurdenedRate, source: deploymentRateSource } = getDeploymentRate(formData);
  const maxTeam = MAX_IMPL_TEAM[companySize] || 10;
  const sizeMult = SIZE_MULTIPLIER[companySize] || 1.0;
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
  const engineeringCost = engineers * annualFullyBurdenedRate * implTimelineYears;
  const pmCost = pms * annualFullyBurdenedRate * implTimelineYears;
  const infraCost = (engineeringCost + pmCost) * 0.12;
  const trainingCost = (engineeringCost + pmCost) * 0.08;
  const computedImplCost = engineeringCost + pmCost + infraCost + trainingCost;

  const legalCost = LEGAL_COMPLIANCE_COST[companySize] || 50000;
  const securityCost = SECURITY_AUDIT_COST[companySize] || 40000;
  const contingency = computedImplCost * CONTINGENCY_RATE;
  const licenseCost = PLATFORM_LICENSE_COST[companySize] || 48000;

  return {
    annualFullyBurdenedRate,
    deploymentRateSource,
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
    adjustedTimeline,
    companySize,
  };
}

export default function Step5_AIInvestment({ formData, updateField }) {
  const [subStep, setSubStep] = useState(0);
  const advanceTimer = useRef(null);
  const hasAutoFilledRef = useRef(false);

  // Compute suggested values based on all context
  const suggested = useMemo(() => computeSuggestedValues(formData), [formData]);

  // Auto-fill values from computed benchmarks — budget is always model-driven
  useEffect(() => {
    if (!hasAutoFilledRef.current) {
      // Budget is always computed from staffing model, not user-entered
      updateField('implementationBudget', suggested.suggestedBudget);
      if (formData.expectedTimeline === null || formData.expectedTimeline === undefined) {
        updateField('expectedTimeline', suggested.suggestedTimeline);
      }
      if (formData.ongoingAnnualCost === null || formData.ongoingAnnualCost === undefined) {
        updateField('ongoingAnnualCost', suggested.suggestedOngoing);
      }
      hasAutoFilledRef.current = true;
    }
  }, [suggested, formData, updateField]);

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

  const handleTimeline = (val) => {
    updateField('expectedTimeline', val);
    autoAdvance(2);
  };

  const handleOngoingCost = (val) => {
    updateField('ongoingAnnualCost', val);
  };

  // V3: cycle time benchmark for the industry
  const industry = formData.industry || 'Other';
  const companySize = formData.companySize || 'Mid-Market (501-5,000)';
  const realisticMonths = getRealisticTimeline(industry, companySize);
  const selectedTimeline = formData.expectedTimeline;
  const adjustedTimeline = selectedTimeline
    ? Math.ceil((selectedTimeline + realisticMonths) / 2)
    : null;

  const scope = useMemo(() => computeScopePreview(formData), [formData]);

  return (
    <div className="mx-auto w-full max-w-xl">
      <h2 className="mb-2 text-2xl font-bold text-navy sm:text-3xl">
        Let's model the AI investment
      </h2>
      <div className="mb-4 h-1 w-16 rounded bg-gold" />
      <AnimatePresence mode="wait">
        {subStep === 0 && (
          <motion.div
            key="computedCost"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="space-y-4">
              <p className="text-base font-semibold text-navy sm:text-lg">
                Here's what the AI implementation will cost
              </p>
              <p className="text-sm text-gray-500">
                Computed from your process workforce mix, readiness scores, and industry planning envelope.
              </p>

              {scope && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-baseline">
                      <span className="text-emerald-800/80">AI team</span>
                      <span className="font-medium text-emerald-800">{scope.engineers} engineer{scope.engineers > 1 ? 's' : ''} + {scope.pms} PM for {scope.adjustedTimeline} months</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-emerald-800/80">Deployment rate</span>
                      <span className="font-medium text-emerald-800">{formatCurrency(scope.annualFullyBurdenedRate)}/yr ({scope.deploymentRateSource})</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-emerald-800/80">Includes</span>
                      <span className="text-emerald-700/70 text-right text-xs max-w-[60%]">Infrastructure setup, team training, platform licensing</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-baseline border-t border-emerald-200 pt-2">
                    <span className="text-emerald-800 font-medium text-base">Estimated Implementation Cost</span>
                    <span className="font-mono font-bold text-emerald-800 text-xl">{formatCurrency(scope.computedImplCost)}</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => autoAdvance(1)}
                className="mt-2 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-navy shadow-sm transition-all duration-150 hover:bg-sky focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
              >
                Continue
              </button>
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
                How long is the setup / implementation phase?
              </label>
              <p className="text-sm text-gray-500">
                After this phase, costs drop to tokens + maintenance only.
              </p>

              {/* Quick-pick presets */}
              <div className="flex gap-2">
                {TIMELINE_PRESETS.map((opt) => {
                  const isSelected = formData.expectedTimeline === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleTimeline(opt.value)}
                      className={`
                        flex-1 rounded-lg border-2 min-h-[44px] px-3 py-2.5 text-center
                        transition-all duration-150 focus:outline-none focus-visible:ring-2
                        focus-visible:ring-gold focus-visible:ring-offset-2
                        ${isSelected
                          ? 'border-gold bg-gold/10 text-navy font-bold'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'}
                      `}
                    >
                      <span className="text-sm font-semibold">{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Fine-tune slider */}
              <SliderInput
                label="Or set exact months"
                value={formData.expectedTimeline || 6}
                onChange={(val) => updateField('expectedTimeline', val)}
                min={3}
                max={24}
                step={1}
                suffix=" months"
              />

              {selectedTimeline != null && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                  <p className="text-sm font-semibold text-emerald-800">Cost Structure</p>
                  <div className="space-y-2 text-sm text-emerald-800/80">
                    <div className="flex justify-between">
                      <span>Setup phase</span>
                      <span className="font-bold text-emerald-800">{selectedTimeline} months</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Upfront investment</span>
                      <span className="font-mono font-bold text-emerald-800">{formatCurrency(scope.computedImplCost)}</span>
                    </div>
                    <div className="border-t border-emerald-200 pt-2 flex justify-between">
                      <span>After setup: maintenance + tokens</span>
                      <span className="font-mono font-medium text-emerald-800">{formatCurrency(formData.ongoingAnnualCost || suggested.suggestedOngoing)}/yr</span>
                    </div>
                  </div>
                  <p className="text-xs text-emerald-600/60 pt-1">
                    Industry benchmark for {industry}: {realisticMonths} months.
                    Adjusted estimate: {adjustedTimeline} months.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => autoAdvance(2)}
                className="mt-2 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-navy shadow-sm transition-all duration-150 hover:bg-sky focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
              >
                Continue
              </button>
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
                max={100000000}
                helperText="Include API costs, licenses, support, and dedicated staff time. Entries above $100M/year should be modeled as a documented enterprise operating case."
              />

              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Planning note: keep platform access, consumption, and run costs separate so a high-volume deployment can be reviewed without inflating implementation cost.
              </p>

              {/* Input Summary Card */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
                <p className="text-sm font-semibold text-emerald-800">Your inputs at a glance</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-emerald-700/60">Industry</span>
                  <span className="font-medium text-emerald-800 text-right">{formData.industry || '--'}</span>
                  <span className="text-emerald-700/60">Company size</span>
                  <span className="font-medium text-emerald-800 text-right">{formData.companySize || '--'}</span>
                  <span className="text-emerald-700/60">Project type</span>
                  <span className="font-medium text-emerald-800 text-right">{getArchetypeById(formData.projectArchetype)?.label || '--'}</span>
                  <span className="text-emerald-700/60">Team size</span>
                  <span className="font-medium text-emerald-800 text-right">{formData.teamSize || '--'} people</span>
                  <span className="text-emerald-700/60">Avg salary</span>
                  <span className="font-medium text-emerald-800 text-right">{formData.avgSalary ? formatCurrency(formData.avgSalary) : '--'}</span>
                  <span className="text-emerald-700/60">Readiness</span>
                  <span className="font-medium text-emerald-800 text-right">Change: {formData.changeReadiness}/5, Data: {formData.dataReadiness}/5</span>
                </div>
              </div>

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

              {/* Value Pathway Toggles */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                <p className="text-sm font-semibold text-emerald-800">Advanced planning context</p>
                <p className="text-xs text-gray-500 -mt-1">
                  Core NPV, IRR, and payback use validated operating savings. These items remain clearly separated as planning context.
                </p>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.includeCapacityValue ?? false}
                    onChange={(e) => updateField('includeCapacityValue', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-gold focus:ring-gold"
                  />
                  <span className="text-sm text-navy">
                    Capacity creation <span className="text-gray-500">(verified freed hours)</span>
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.riskValueEvidenceValidated ?? false}
                    onChange={(e) => updateField('riskValueEvidenceValidated', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-gold focus:ring-gold"
                  />
                  <span className="text-sm text-navy">
                    Finance has validated historical loss evidence
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.includeRiskReduction ?? false}
                    onChange={(e) => updateField('includeRiskReduction', e.target.checked)}
                    disabled={!formData.riskValueEvidenceValidated}
                    className="h-4 w-4 rounded border-gray-300 text-gold focus:ring-gold"
                  />
                  <span className="text-sm text-navy">
                    Risk reduction <span className="text-gray-500">(requires the Finance evidence confirmation above)</span>
                  </span>
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
