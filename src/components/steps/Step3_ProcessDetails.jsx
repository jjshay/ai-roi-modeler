import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import CardSelector from '../inputs/CardSelector';
import SliderInput from '../inputs/SliderInput';
import CurrencyInput from '../inputs/CurrencyInput';
import NumberInput from '../inputs/NumberInput';
import {
  PROJECT_ARCHETYPES,
  getArchetypeDefaults,
  getRetiredArchetypeLabel,
  isRetiredArchetype,
} from '../../logic/archetypes';
import { ARCHETYPE_INPUT_MAP, getArchetypeInputDefaults, mapArchetypeInputs } from '../../logic/archetypeInputs';
import { runCalculations } from '../../logic/calculations';
import {
  calculateContractExitCost,
  calculateProcessCost,
  calculateWorkforceMix,
} from '../../logic/workforceMix';
import { formatCurrency } from '../../utils/formatters';

const ARCHETYPE_OPTIONS = PROJECT_ARCHETYPES.map((archetype) => ({
  icon: archetype.icon,
  title: archetype.label,
  description: archetype.description,
  example: archetype.example,
  value: archetype.id,
  tags: archetype.tags,
}));

const slideVariants = {
  enter: { x: 80, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -80, opacity: 0 },
};

const EMPTY_INPUTS = Object.freeze({});

// eslint-disable-next-line react-refresh/only-export-components
export function getStepForNumber(input) {
  // Precision is a model property, not a UI heuristic. Keeping it in the
  // shared schema lets the web experience and exported workbook accept the
  // exact same valid values.
  const step = Number(input?.step);
  return Number.isFinite(step) && step > 0 ? step : 1;
}

function formatWorkloadHours(hours) {
  if (!Number.isFinite(hours) || hours <= 0) return '0 hrs/week';
  if (hours < 1) return `${hours.toFixed(hours < 0.1 ? 2 : 1)} hr/week`;
  if (hours < 10 && !Number.isInteger(hours)) return `${hours.toFixed(1)} hrs/week`;
  return `${Math.round(hours).toLocaleString()} hrs/week`;
}

function initialSubStep(formData) {
  if (isRetiredArchetype(formData.projectArchetype)) return 0;
  if (formData.projectInputsComplete && formData.projectArchetype) return 3;
  if (formData.projectArchetype) return 1;
  return 0;
}

function actionButtonClass(disabled = false) {
  return `mt-5 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-navy shadow-sm transition-all duration-150 hover:bg-sky focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 ${disabled ? 'cursor-not-allowed opacity-40 hover:bg-gold' : ''}`;
}

const secondaryButtonClass = 'mt-5 rounded-lg border border-navy/20 px-5 py-2.5 text-sm font-semibold text-navy/70 transition-colors hover:border-navy/40 hover:bg-navy/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2';

function StageIntro({ eyebrow, title, description }) {
  return (
    <>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-navy/45">{eyebrow}</p>
      <h2 className="mb-2 text-2xl font-bold text-navy sm:text-3xl">{title}</h2>
      <div className="mb-5 h-1 w-16 rounded bg-gold" />
      {description && <p className="mb-6 text-sm leading-relaxed text-gray-600">{description}</p>}
    </>
  );
}

function SummaryMetric({ label, value, detail }) {
  return (
    <div className="rounded-lg bg-white/70 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700/70">{label}</p>
      <p className="mt-1 font-mono text-lg font-bold text-emerald-900">{value}</p>
      {detail && <p className="mt-1 text-[11px] leading-relaxed text-emerald-800/70">{detail}</p>}
    </div>
  );
}

function readableMessage(message) {
  if (!message) return null;
  return typeof message === 'string' ? message : message.message;
}

export default function Step3_ProcessDetails({ formData, updateField, onFlowStateChange, onAdvance }) {
  const [subStep, setSubStep] = useState(() => initialSubStep(formData));
  const workforce = useMemo(() => calculateWorkforceMix(formData), [formData]);
  const contractExit = useMemo(() => calculateContractExitCost(formData), [formData]);
  const isRetiredSelection = isRetiredArchetype(formData.projectArchetype);
  const retiredArchetypeLabel = getRetiredArchetypeLabel(formData.projectArchetype);
  const archetypeSchema = formData.projectArchetype
    ? ARCHETYPE_INPUT_MAP[formData.projectArchetype]
    : null;
  const caseGuide = archetypeSchema?.caseGuide;
  const archetypeInputValues = formData.archetypeInputs || EMPTY_INPUTS;
  const computed = useMemo(
    () => mapArchetypeInputs(formData.projectArchetype, archetypeInputValues),
    [formData.projectArchetype, archetypeInputValues],
  );
  const processCost = useMemo(
    () => calculateProcessCost({ ...formData, ...archetypeInputValues }),
    [formData, archetypeInputValues],
  );
  const modelResult = useMemo(() => {
    if (!formData.projectArchetype || isRetiredSelection) return null;
    try {
      return runCalculations(formData);
    } catch {
      return null;
    }
  }, [formData, isRetiredSelection]);
  const caseEconomics = modelResult?.caseEconomics;
  const modelWarnings = useMemo(() => {
    const messages = [
      ...(caseEconomics?.bumperMessages || []),
      ...(caseEconomics?.warnings || []),
      ...(modelResult?.inputWarnings || []),
    ]
      .map(readableMessage)
      .filter(Boolean);
    return [...new Set(messages)];
  }, [caseEconomics, modelResult]);

  const computedWorkloadHours = caseEconomics?.caseWorkloadHoursPerWeek
    ?? computed.caseWorkloadHoursPerWeek;
  const availableCapacityHours = caseEconomics?.availableProcessHoursPerWeek
    ?? workforce.totalHeadcount * workforce.hoursPerWeek;
  const workloadRatio = caseEconomics?.workloadRatio
    ?? (computedWorkloadHours > 0 && availableCapacityHours > 0
      ? computedWorkloadHours / availableCapacityHours
      : null);
  const workloadBlocked = Boolean(
    caseEconomics?.workloadBlocked
    || caseEconomics?.blocksSavings
    || caseEconomics?.workloadStatus === 'blocked'
    || (Number.isFinite(workloadRatio) && workloadRatio > 1.25)
  );
  const requestedEfficiencyPct = Number.isFinite(caseEconomics?.requestedEfficiencyGainPct)
    ? caseEconomics.requestedEfficiencyGainPct * 100
    : null;
  const efficiencyCeilingPct = Number.isFinite(caseEconomics?.efficiencyCeilingPct)
    ? caseEconomics.efficiencyCeilingPct * 100
    : null;
  const efficiencyCeilingIsBinding = Number.isFinite(requestedEfficiencyPct)
    && Number.isFinite(efficiencyCeilingPct)
    && requestedEfficiencyPct > efficiencyCeilingPct;

  const workforceReady = workforce.totalHeadcount > 0
    && (workforce.directEmployeeCount === 0 || workforce.employeeFullyBurdenedCost > 0)
    && (workforce.offshoreContractorCount === 0 || workforce.contractorFullyBurdenedCost > 0)
    && workforce.hoursPerWeek > 0;
  const isComplete = subStep === 3
    && !isRetiredSelection
    && Boolean(formData.projectInputsComplete)
    && workforceReady;

  useEffect(() => {
    onFlowStateChange?.(isComplete);
  }, [isComplete, onFlowStateChange]);

  const handleArchetype = useCallback((id) => {
    if (isRetiredArchetype(formData.projectArchetype)) {
      // Keep legacy fields available for audit/export, but do not map them to
      // a different use case. The user must explicitly select a supported one.
      updateField('legacyRetiredProjectArchetype', formData.projectArchetype);
      updateField('legacyRetiredArchetypeInputs', formData.archetypeInputs || EMPTY_INPUTS);
      updateField('legacyRetiredAssumptions', formData.assumptions || EMPTY_INPUTS);
    }
    updateField('projectArchetype', id);
    const defaults = getArchetypeDefaults(id, formData.industry || 'Other');
    if (defaults) updateField('assumptions', defaults);
    const archetype = PROJECT_ARCHETYPES.find((item) => item.id === id);
    if (archetype?.sourceProcessTypes?.length) updateField('processType', archetype.sourceProcessTypes[0]);
    updateField('archetypeInputs', {
      ...getArchetypeInputDefaults(id),
      ...(id === 'customer-facing-ai'
        ? { supportCostValidated: false, supportCostCashRealizable: false }
        : {}),
    });
    updateField('projectInputsComplete', false);
    updateField('costTransitionComplete', false);
    setSubStep(1);
  }, [formData.archetypeInputs, formData.assumptions, formData.industry, formData.projectArchetype, updateField]);

  const updateWorkforceField = useCallback((key, value) => {
    const nextData = { ...formData, [key]: value };
    const nextMix = calculateWorkforceMix(nextData);
    updateField(key, value);
    // Legacy aggregate values stay aligned for saved models and old exports.
    updateField('teamSize', nextMix.totalHeadcount);
    updateField('avgSalary', Math.round(nextMix.blendedFullyBurdenedCost));
    updateField('projectInputsComplete', false);
    updateField('costTransitionComplete', false);
  }, [formData, updateField]);

  const updateContractField = useCallback((key, value) => {
    updateField(key, value);
    updateField('projectInputsComplete', false);
    updateField('costTransitionComplete', false);
  }, [updateField]);

  const handleArchetypeInput = useCallback((key, value) => {
    updateField('archetypeInputs', { ...archetypeInputValues, [key]: value });
    updateField('projectInputsComplete', false);
    updateField('costTransitionComplete', false);
  }, [archetypeInputValues, updateField]);

  const isInternalProcess = formData.projectArchetype === 'internal-process-automation';
  const isCustomerService = formData.projectArchetype === 'customer-facing-ai';
  const isRiskCase = formData.projectArchetype === 'risk-compliance-legal-ai';
  const keyDriverInputs = archetypeSchema?.keyDrivers?.length
    ? archetypeSchema.inputs.filter((input) => archetypeSchema.keyDrivers.includes(input.key))
    : (archetypeSchema?.inputs || []);

  return (
    <div className="mx-auto w-full max-w-xl">
      <AnimatePresence mode="wait">
        {subStep === 0 && (
          <Motion.div key="archetype" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: 'easeInOut' }}>
            <StageIntro
              eyebrow="Project baseline"
              title="What type of AI project is this?"
              description="Start with the work being changed. The model then uses your current workforce and process economics—not a generic team-size estimate."
            />
            {isRetiredSelection && (
              <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
                <p className="font-semibold">{retiredArchetypeLabel} is no longer supported.</p>
                <p className="mt-1">
                  Its previous inputs are preserved as historical context, but they are not comparable to a supported operating case. Choose one of the four use cases below to continue; no legacy values will be silently remapped.
                </p>
              </div>
            )}
            <CardSelector
              label="Select the archetype that best describes the project"
              options={ARCHETYPE_OPTIONS}
              value={formData.projectArchetype}
              onChange={handleArchetype}
            />
          </Motion.div>
        )}

        {subStep === 2 && (
          <Motion.div key="workforceMix" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: 'easeInOut' }}>
            <StageIntro
              eyebrow="Current workforce"
              title="Who does this work today?"
              description="Enter the fully burdened annual cost for the people currently performing this process. The model calculates the blended mix and total ongoing headcount cost."
            />
            <div className="space-y-5">
              <div className="rounded-xl border border-navy/10 bg-navy/[0.025] p-4">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-navy/60">Direct employees</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberInput
                    label="Number of direct employees"
                    value={formData.directEmployeeCount ?? 0}
                    onChange={(value) => updateWorkforceField('directEmployeeCount', value)}
                    min={0}
                    max={100000}
                    suffix="people"
                  />
                  <CurrencyInput
                    label="Average fully burdened annual cost"
                    value={formData.employeeFullyBurdenedCost ?? 125000}
                    onChange={(value) => updateWorkforceField('employeeFullyBurdenedCost', value)}
                    presets={[75000, 100000, 125000, 150000, 200000, 250000]}
                    defaultValue={125000}
                    max={2000000}
                    helperText="User-entered. Planning starting point [L1]: $125K fully burdened; replace it with HR or finance data. Entries above $2M/year are blocked—model unusually costly roles separately."
                  />
                </div>
              </div>

              <div className="rounded-xl border border-sky/20 bg-sky/[0.04] p-4">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-navy/60">Offshore contractors</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberInput
                    label="Number of offshore contractors"
                    value={formData.offshoreContractorCount ?? 0}
                    onChange={(value) => updateWorkforceField('offshoreContractorCount', value)}
                    min={0}
                    max={100000}
                    suffix="people"
                  />
                  <CurrencyInput
                    label="Average fully burdened annual cost"
                    value={formData.contractorFullyBurdenedCost ?? 65000}
                    onChange={(value) => updateWorkforceField('contractorFullyBurdenedCost', value)}
                    presets={[35000, 50000, 65000, 80000, 100000, 125000]}
                    defaultValue={65000}
                    max={2000000}
                    helperText="User-entered. Planning starting point [L2]: $65K fully burdened; replace it with vendor data. Entries above $2M/year are blocked—model unusually costly roles separately."
                  />
                </div>
              </div>

              <NumberInput
                label="Hours per person, per week on this process"
                value={formData.hoursPerWeek ?? 40}
                onChange={(value) => updateWorkforceField('hoursPerWeek', value)}
                min={1}
                max={80}
                suffix="hours"
                helperText="User-entered. Default [H1]: 40 hours is a full-time planning convention, not an external benchmark; adjust for actual allocation."
              />

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="mb-3 text-sm font-semibold text-emerald-900">Calculated workforce baseline</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <SummaryMetric label="Total workforce" value={`${workforce.totalHeadcount} people`} />
                  <SummaryMetric label="Blended annual cost" value={formatCurrency(workforce.blendedFullyBurdenedCost)} detail="Per person" />
                  <SummaryMetric label="Ongoing headcount cost" value={formatCurrency(workforce.totalAnnualHeadcountCost)} detail="Per year" />
                </div>
                <p className="mt-3 text-xs text-emerald-800/70">Weighted hourly cost: {formatCurrency(workforce.weightedHourlyCost)} per hour.</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => setSubStep(1)} className={secondaryButtonClass}>Back to operating drivers</button>
                <button type="button" onClick={() => setSubStep(3)} disabled={!workforceReady} className={actionButtonClass(!workforceReady)}>
                  Continue to contracts
                </button>
              </div>
            </div>
          </Motion.div>
        )}

        {subStep === 3 && (
          <Motion.div key="contracts" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: 'easeInOut' }}>
            <StageIntro
              eyebrow="Existing contracts"
              title="What contracts could end?"
              description="The model separates recurring contract spend from the one-time cost of honoring the remaining notice period."
            />
            <div className="space-y-5">
              <NumberInput
                label="How many existing contracts could be canceled?"
                value={formData.existingContractCount ?? 0}
                onChange={(value) => updateContractField('existingContractCount', value)}
                min={0}
                max={10000}
                suffix="contracts"
                helperText="Count vendor, software, and service agreements expected to end because of this project."
              />
              <CurrencyInput
                label="Annual cost per contract"
                value={formData.annualCostPerContract ?? 0}
                onChange={(value) => updateContractField('annualCostPerContract', value)}
                presets={[0, 10000, 25000, 50000, 100000, 250000]}
                defaultValue={0}
                max={50000000}
                helperText="This is recurring spend that ends after cancellation. Entries above $50M/year are blocked; split a portfolio of contracts into separately defensible assumptions."
              />
              <NumberInput
                label="Breakage / notice period"
                value={formData.contractNoticePeriodMonths ?? 3}
                onChange={(value) => updateContractField('contractNoticePeriodMonths', value)}
                min={0}
                max={24}
                suffix="months"
                helperText="User/model planning assumption [B1]: 3-month notice period. Adjust this to actual contract terms; source notes are in the exported Sources & Footnotes tab."
              />
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-900">Contract economics</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <SummaryMetric label="Annual contract spend" value={formatCurrency(contractExit.annualExistingContractCost)} detail="Recurring spend that can end" />
                  <SummaryMetric label="Estimated one-time exit cost" value={formatCurrency(contractExit.contractExitCost)} detail="Notice-period estimate" />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-emerald-800/70">
                  Formula: {contractExit.existingContractCount} contracts × {formatCurrency(contractExit.annualCostPerContract)} annual cost × {contractExit.contractNoticePeriodMonths} / 12 months.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => setSubStep(2)} className={secondaryButtonClass}>Back to workforce</button>
                <button
                  type="button"
                  onClick={() => {
                    updateField('projectInputsComplete', true);
                    onAdvance?.();
                  }}
                  className={actionButtonClass()}
                >
                  Continue to company context
                </button>
              </div>
            </div>
          </Motion.div>
        )}

        {subStep === 1 && archetypeSchema && (
          <Motion.div key="processDetails" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: 'easeInOut' }}>
            <StageIntro
              eyebrow="Process economics"
              title="What drives this work?"
              description="Start with the operating facts for this use case. These drivers establish the measured workload and the model’s defensible efficiency ceiling before workforce actions are considered."
            />
            <div className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-navy/45">
                Key operating drivers · {keyDriverInputs.length}
              </p>
              {keyDriverInputs.map((input) => {
                  const rawValue = archetypeInputValues[input.key] ?? input.default;
                  const label = input.key === 'handlingTimeMin'
                    ? 'Average time per process (minutes)'
                    : input.label;
                  const helperText = input.key === 'handlingTimeMin'
                    ? 'Total hands-on time to complete one process today.'
                    : input.note;

                  if (input.type === 'percent') {
                    return (
                      <SliderInput
                        key={input.key}
                        label={label}
                        value={Math.round(rawValue * 100)}
                        onChange={(value) => handleArchetypeInput(input.key, value / 100)}
                        min={Math.round(input.min * 100)}
                        max={Math.round(input.max * 100)}
                        step={1}
                        suffix="%"
                        helperText={helperText}
                      />
                    );
                  }

                  if (input.type === 'scale') {
                    return (
                      <SliderInput
                        key={input.key}
                        label={label}
                        value={rawValue}
                        onChange={(value) => handleArchetypeInput(input.key, value)}
                        min={1}
                        max={5}
                        step={1}
                        helperText={helperText}
                      />
                    );
                  }

                  return (
                    <SliderInput
                      key={input.key}
                      label={label}
                      value={rawValue}
                      onChange={(value) => handleArchetypeInput(input.key, value)}
                      min={input.min}
                      max={input.max}
                      step={getStepForNumber(input)}
                      helperText={helperText}
                    />
                  );
              })}

              {caseGuide && (
                <div className="rounded-xl border border-navy/10 bg-navy/[0.025] p-4">
                  <p className="text-sm font-semibold text-navy">How this case works</p>
                  <div className="mt-3 space-y-3 text-xs leading-relaxed text-navy/75">
                    <div>
                      <p className="font-semibold uppercase tracking-wide text-navy/50">Calculation</p>
                      <p className="mt-1">{caseGuide.calculation}</p>
                    </div>
                    <div>
                      <p className="font-semibold uppercase tracking-wide text-navy/50">Model assumption</p>
                      <p className="mt-1">{caseGuide.assumption}</p>
                    </div>
                    <div className="rounded-lg bg-white/70 px-3 py-2 text-navy/60">
                      {caseGuide.footnote}
                    </div>
                  </div>
                </div>
              )}

              {isCustomerService && (
                <div className="rounded-xl border border-sky/25 bg-sky/[0.05] p-4">
                  <div className="space-y-3">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={Boolean(archetypeInputValues.supportCostValidated)}
                        onChange={(event) => handleArchetypeInput('supportCostValidated', event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gold focus:ring-gold"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-navy">
                          Operations has validated the fully loaded cost per resolved contact with actual support data.
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-navy/65">
                          Check this only when the cost-per-contact input is backed by Operations or Finance.
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={Boolean(archetypeInputValues.supportCostCashRealizable)}
                        onChange={(event) => handleArchetypeInput('supportCostCashRealizable', event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gold focus:ring-gold"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-navy">
                          The avoided contacts will reduce external or support spend—not only free internal time.
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-navy/65">
                          Confirm only when an approved staffing, BPO, or vendor-spend action makes the contact-cost reduction cash-realizable.
                        </span>
                      </span>
                    </label>
                  </div>
                  {(!archetypeInputValues.supportCostValidated || !archetypeInputValues.supportCostCashRealizable) && (
                    <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                      Evidence gate active: both confirmations are required before contact-cost avoidance appears in the core DCF. Until then, it remains planning context and capacity only.
                    </p>
                  )}
                </div>
              )}

              {isRiskCase && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
                  <p className="font-semibold">Risk avoidance is planning context, not core ROI.</p>
                  <p className="mt-1 text-xs">
                    Historical remediation or loss figures help scope controls and validation. They are excluded from NPV, IRR, and payback until Finance validates the loss history and evidence for preventability.
                  </p>
                </div>
              )}

              {computed.automationPotential != null && (
                <div className={`rounded-xl border p-3 ${efficiencyCeilingIsBinding ? 'border-amber-300 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xs font-medium ${efficiencyCeilingIsBinding ? 'text-amber-800' : 'text-emerald-700'}`}>Estimated automation potential</p>
                      <p className={`text-[11px] ${efficiencyCeilingIsBinding ? 'text-amber-700/70' : 'text-emerald-600/70'}`}>Computed from your process inputs</p>
                    </div>
                    <span className={`font-mono text-xl font-bold ${efficiencyCeilingIsBinding ? 'text-amber-800' : 'text-emerald-700'}`}>{Math.round(computed.automationPotential * 100)}%</span>
                  </div>
                  {Number.isFinite(requestedEfficiencyPct) && Number.isFinite(efficiencyCeilingPct) && (
                    <p className={`mt-2 text-[11px] leading-relaxed ${efficiencyCeilingIsBinding ? 'text-amber-900' : 'text-emerald-800/75'}`}>
                      {efficiencyCeilingIsBinding
                        ? `Your requested ${Math.round(requestedEfficiencyPct)}% efficiency gain is capped at ${Math.round(efficiencyCeilingPct)}% by these operating inputs.`
                        : `Your requested ${Math.round(requestedEfficiencyPct)}% efficiency gain is below this ${Math.round(efficiencyCeilingPct)}% ceiling. These inputs validate the claim and become a financial cap only if the ceiling falls below your requested gain.`}
                    </p>
                  )}
                </div>
              )}

              {Number.isFinite(computedWorkloadHours) && computedWorkloadHours > 0 && (
                <div className={`rounded-xl border p-4 ${workloadBlocked ? 'border-red-300 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <p className={`text-sm font-semibold ${workloadBlocked ? 'text-red-950' : 'text-emerald-900'}`}>
                        Workload-to-capacity check
                      </p>
                      <p className={`mt-1 text-xs leading-relaxed ${workloadBlocked ? 'text-red-800' : 'text-emerald-800/70'}`}>
                        The model compares the use-case workload to the hours you will enter for the workforce next. Savings cannot be defended if they imply more work than the stated team can perform.
                      </p>
                    </div>
                    {Number.isFinite(workloadRatio) && (
                      <span className={`font-mono text-lg font-bold ${workloadBlocked ? 'text-red-800' : 'text-emerald-800'}`}>
                        {(workloadRatio * 100).toFixed(0)}% coverage
                      </span>
                    )}
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <SummaryMetric label="Case workload" value={formatWorkloadHours(computedWorkloadHours)} detail="From the operating drivers above" />
                    <SummaryMetric label="Stated team capacity" value={`${Math.round(availableCapacityHours).toLocaleString()} hrs/week`} detail="Current workforce × weekly process hours" />
                  </div>
                  {workloadBlocked && (
                    <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-xs leading-relaxed text-red-900">
                      Bumper active: correct the workload or workforce allocation before the model will allow an efficiency-driven ROI claim.
                    </p>
                  )}
                </div>
              )}

              {modelWarnings.length > 0 && (
                <div className={`rounded-xl border p-4 ${workloadBlocked ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'}`}>
                  <p className={`text-sm font-semibold ${workloadBlocked ? 'text-red-950' : 'text-amber-950'}`}>
                    {workloadBlocked ? 'Fix before using savings' : 'Model guidance'}
                  </p>
                  <ul className={`mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed ${workloadBlocked ? 'text-red-900' : 'text-amber-900'}`}>
                    {modelWarnings.map((warning) => <li key={warning}>{warning}</li>)}
                  </ul>
                </div>
              )}

              {isInternalProcess && (
                <div className="rounded-xl border border-gold/40 bg-gold/10 p-4">
                  <p className="text-sm font-semibold text-navy">Current process cost</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <SummaryMetric label="Cost per process" value={formatCurrency(processCost.costPerProcess)} detail={`${formatCurrency(processCost.hourlyCost)}/hour blended labor`} />
                    <SummaryMetric label="Current monthly cost" value={formatCurrency(processCost.monthlyProcessCost)} detail="Volume × cost per process" />
                    <SummaryMetric label="Current annual cost" value={formatCurrency(processCost.annualProcessCost)} detail="Before AI" />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    updateField('projectInputsComplete', false);
                    setSubStep(0);
                  }}
                  className={secondaryButtonClass}
                >
                  Back to project type
                </button>
                <button
                  type="button"
                  onClick={() => setSubStep(2)}
                  className={actionButtonClass()}
                >
                  Continue to workforce
                </button>
              </div>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
