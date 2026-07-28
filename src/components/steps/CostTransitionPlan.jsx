import { useCallback, useMemo, useState } from 'react';
import CardSelector from '../inputs/CardSelector';
import SliderInput from '../inputs/SliderInput';
import CurrencyInput from '../inputs/CurrencyInput';
import NumberInput from '../inputs/NumberInput';
import { ARCHETYPE_INPUT_MAP } from '../../logic/archetypeInputs';
import { TOKEN_PROFILES } from '../../logic/benchmarks';
import { getAnnualAiCostSuggestion } from '../../logic/aiCostSuggestions';
import { runCalculations } from '../../logic/calculations';
import {
  calculateContractExitCost,
  calculateDeploymentPlan,
  calculateReworkCost,
  calculateWorkforceMix,
  calculateWorkforceTransitionPlan,
} from '../../logic/workforceMix';
import { formatCurrency } from '../../utils/formatters';
import {
  ANNUAL_AI_COST_MODES,
  getAnnualAiCostMode,
  getAnnualAiCostModeValue,
} from './annualAiCostSelection';
import {
  formatPeople,
  getHeadcountReductionPlan,
  getWorkforceActionCaps,
} from './headcountReductionPlan';

const DELIVERY_PACE_OPTIONS = [
  {
    icon: '⚡',
    title: 'Accelerated',
    description: 'About 20% faster, using 20% more deployment staffing and cost.',
    value: 'accelerated',
  },
  {
    icon: '◼',
    title: 'Standard',
    description: 'Balanced delivery plan using the model’s standard deployment team.',
    value: 'standard',
  },
  {
    icon: '◷',
    title: 'More time',
    description: 'About 25% longer, with 20% fewer deployment heads and cost.',
    value: 'extended',
  },
];

function SummaryMetric({ label, value, detail }) {
  return (
    <div className="rounded-lg bg-white/70 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700/70">{label}</p>
      <p className="mt-1 font-mono text-lg font-bold text-emerald-900">{value}</p>
      {detail && <p className="mt-1 text-[11px] leading-relaxed text-emerald-800/70">{detail}</p>}
    </div>
  );
}

function defaultMonthlyVolume(archetypeId, inputValues) {
  const schema = ARCHETYPE_INPUT_MAP[archetypeId];
  if (!schema) return 0;
  const volumeInput = schema.inputs.find((input) => (
    /volume|tickets|reports|queries|documents|cases/i.test(input.key)
  ));
  if (!volumeInput) return 0;
  const rawVolume = inputValues?.[volumeInput.key] ?? volumeInput.default ?? 0;
  // The UI label is monthly requests. Knowledge-management defaults are
  // expressed as search queries/day, so convert them before displaying a
  // monthly fallback and preserve the calculation engine's convention.
  if (/perday/i.test(volumeInput.key)) return rawVolume * 30;
  return rawVolume;
}

function readableMessage(message) {
  if (!message) return null;
  return typeof message === 'string' ? message : message.message;
}

function percentPoints(value, fallback = null) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric <= 1 ? numeric * 100 : numeric;
}

function uniqueMessages(messages) {
  return [...new Set(messages.map(readableMessage).filter(Boolean))];
}

/**
 * The final screen deliberately reads all dollars from model helpers or the
 * calculation engine. It owns presentation and input collection only.
 */
export default function CostTransitionPlan({ formData, updateField, onComplete }) {
  const workforce = useMemo(() => calculateWorkforceMix(formData), [formData]);
  const contractExit = useMemo(() => calculateContractExitCost(formData), [formData]);
  const rework = useMemo(() => calculateReworkCost(formData), [formData]);
  const modelResult = useMemo(() => {
    try {
      // This final review needs the full model output (including the four
      // cost buckets); the fast preview intentionally omits that detail.
      return runCalculations(formData);
    } catch {
      return null;
    }
  }, [formData]);
  const transitionPlan = useMemo(
    () => modelResult?.workforceTransition
      ?? calculateWorkforceTransitionPlan(formData, workforce),
    [formData, modelResult, workforce],
  );
  const headcountReductionPlan = useMemo(
    () => getHeadcountReductionPlan({
      workforce,
      transitionPlan,
      years: formData.headcountReductionYears,
    }),
    [formData.headcountReductionYears, transitionPlan, workforce],
  );
  // The calculation engine is the source of truth for an action after the
  // shared reduction target has been applied. Rendering raw form values here
  // could show an impossible direct/contractor combination for one frame.
  const effectiveEmployeesToMakeRedundant = transitionPlan.employeesToMakeRedundant
    ?? formData.employeesToMakeRedundant
    ?? 0;
  const effectiveContractorsToRollOff = transitionPlan.contractorsToRollOff
    ?? formData.contractorsToRollOff
    ?? 0;
  const effectiveEmployeesToRetrain = transitionPlan.employeesToRetrain
    ?? formData.employeesToRetrain
    ?? 0;
  const workforceActionCaps = useMemo(
    () => getWorkforceActionCaps(headcountReductionPlan, {
      employeesToMakeRedundant: effectiveEmployeesToMakeRedundant,
      contractorsToRollOff: effectiveContractorsToRollOff,
    }),
    [effectiveContractorsToRollOff, effectiveEmployeesToMakeRedundant, headcountReductionPlan],
  );
  const annualEmployeeRedundancySavings = transitionPlan.annualEmployeeRedundancySavings
    ?? transitionPlan.annualHeadcountSavings
    ?? 0;
  const annualContractorRollOffSavings = transitionPlan.annualContractorRollOffSavings ?? 0;
  const annualHeadcountSavings = transitionPlan.annualHeadcountSavings
    ?? annualEmployeeRedundancySavings + annualContractorRollOffSavings;
  const annualSeverancePhase = (transitionPlan.oneTimeRedundancyCost ?? 0) / headcountReductionPlan.years;
  const caseEconomics = modelResult?.caseEconomics;
  const requestedEfficiencyPct = Math.max(0, Math.min(
    100,
    percentPoints(formData.totalEfficiencyGainPct, 10),
  ));
  const rawEfficiencyCeiling = caseEconomics?.efficiencyCeilingPct
    ?? caseEconomics?.maxEfficiencyGainPct
    ?? caseEconomics?.maximumEfficiencyGainPct;
  const suppliedEfficiencyCeiling = percentPoints(rawEfficiencyCeiling);
  const hasEfficiencyCeiling = Number.isFinite(suppliedEfficiencyCeiling);
  const efficiencyCeilingPct = hasEfficiencyCeiling
    ? Math.max(0, Math.min(100, suppliedEfficiencyCeiling))
    : 60;
  const efficiencySliderMax = Math.max(1, Math.floor(efficiencyCeilingPct));
  const displayedEfficiencyPct = Math.min(requestedEfficiencyPct, efficiencySliderMax);
  const isEfficiencyBlocked = Boolean(
    caseEconomics?.workloadBlocked
    || caseEconomics?.blocksSavings
    || caseEconomics?.workloadStatus === 'blocked'
    || (hasEfficiencyCeiling && efficiencyCeilingPct <= 0)
  );
  const guardrailMessages = useMemo(() => {
    const messages = [
      ...(caseEconomics?.bumperMessages || []),
      ...(caseEconomics?.warnings || []),
      ...(modelResult?.inputWarnings || []),
    ];
    if (!isEfficiencyBlocked && hasEfficiencyCeiling && requestedEfficiencyPct > efficiencyCeilingPct) {
      messages.push(
        `Requested efficiency of ${requestedEfficiencyPct.toFixed(0)}% is above this case's ${efficiencyCeilingPct.toFixed(0)}% evidence-based ceiling. The model applies the ceiling until the operating inputs are changed or evidence is added.`
      );
    }
    if (isEfficiencyBlocked && !messages.length) {
      messages.push('The workload does not reconcile to the stated workforce capacity. Correct the operating workload or workforce allocation before using efficiency savings.');
    }
    return uniqueMessages(messages);
  }, [caseEconomics, efficiencyCeilingPct, hasEfficiencyCeiling, isEfficiencyBlocked, modelResult, requestedEfficiencyPct]);
  const deploymentPlan = useMemo(
    () => calculateDeploymentPlan(formData, {
      workforceMix: workforce,
      baselineTimelineMonths: formData.expectedTimeline
        ?? modelResult?.riskAdjustments?.adjustedTimeline
        ?? 6,
    }),
    [formData, modelResult, workforce],
  );

  const aiCostModel = modelResult?.aiCostModel;
  const costBuckets = aiCostModel?.costBuckets || {};
  const buildIntegrationCost = costBuckets.buildIntegrationOneTime
    ?? aiCostModel?.realisticImplCost
    ?? deploymentPlan.estimatedDeploymentLaborCost;
  const accessCost = costBuckets.accessAnnual ?? aiCostModel?.annualLicenseCost ?? 0;
  const consumptionCost = costBuckets.consumptionAnnual ?? aiCostModel?.annualApiCost ?? 0;
  const runCost = costBuckets.runAnnual ?? aiCostModel?.computedOngoingCost ?? 0;
  const processVolumeDefault = defaultMonthlyVolume(formData.projectArchetype, formData.archetypeInputs);
  const tokenProfile = TOKEN_PROFILES[formData.processType] || TOKEN_PROFILES.Other;
  const annualAiCostSuggestion = modelResult?.aiCostModel?.annualCostSuggestion
    ?? getAnnualAiCostSuggestion({
      companySize: formData.companySize,
      industry: formData.industry,
      licensedUsers: formData.aiLicensedUsers ?? workforce.totalHeadcount,
      monthlyRequests: formData.monthlyAiRequests ?? processVolumeDefault,
      modeledBuckets: costBuckets,
      buildIntegrationOneTime: buildIntegrationCost,
    });
  const [annualAiCostMode, setAnnualAiCostMode] = useState(() => (
    getAnnualAiCostMode(formData.ongoingAnnualCost, annualAiCostSuggestion.annual)
  ));
  const selectedAnnualAiCostMode = annualAiCostMode === ANNUAL_AI_COST_MODES.custom
    ? ANNUAL_AI_COST_MODES.custom
    : getAnnualAiCostMode(formData.ongoingAnnualCost, annualAiCostSuggestion.annual);

  const updatePlanField = useCallback((key, value) => {
    updateField(key, value);
    updateField('costTransitionComplete', false);
  }, [updateField]);

  const updateReworkField = useCallback((key, value) => {
    updateField(key, value);
    updateField('costTransitionComplete', false);
  }, [updateField]);

  const handleAnnualAiCostModeChange = useCallback((event) => {
    const mode = event.target.value;
    setAnnualAiCostMode(mode);
    const nextValue = getAnnualAiCostModeValue(mode, annualAiCostSuggestion.annual);
    if (nextValue !== undefined) updatePlanField('ongoingAnnualCost', nextValue);
  }, [annualAiCostSuggestion.annual, updatePlanField]);

  const handleComplete = () => {
    if (isEfficiencyBlocked) {
      updateField('costTransitionComplete', false);
      return;
    }
    updateField('costTransitionComplete', true);
    onComplete?.();
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-navy/45">Final model inputs</p>
        <h2 className="mb-2 text-2xl font-bold text-navy sm:text-3xl">Cost &amp; transition plan</h2>
        <div className="mb-5 h-1 w-16 rounded bg-gold" />
        <p className="text-sm leading-relaxed text-gray-600">
          Your {formData.industry} and {formData.companySize} planning envelopes are now applied to the deployment and operating-cost estimates below.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          White fields are user-entered. Green cards are model-calculated. User/model planning assumptions and external contextual benchmarks are labeled; source notes are in the exported Sources &amp; Footnotes tab.
        </p>
      </div>

      {isEfficiencyBlocked ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-950">Efficiency savings are paused until this workload is reconciled.</p>
          <p className="mt-1 text-xs leading-relaxed text-red-900">
            The case workload exceeds the workforce capacity entered for this process. Update the case operating drivers or the workforce allocation; the model will not turn an unreconciled workload into ROI or redundancies.
          </p>
        </div>
      ) : (
        <SliderInput
          label="Expected total efficiency gain"
          value={displayedEfficiencyPct}
          onChange={(value) => updatePlanField('totalEfficiencyGainPct', value)}
          min={0}
          max={efficiencySliderMax}
          step={1}
          suffix="%"
          helperText={hasEfficiencyCeiling
            ? `Your operating drivers set a ${efficiencyCeilingPct.toFixed(0)}% defensible ceiling. Adjust the drivers or add pilot evidence before claiming more.`
            : 'User-entered. Planning starting point [E1]: 10%; validate it with a pilot or process measurement when available.'}
        />
      )}
      {guardrailMessages.length > 0 && (
        <div className={`rounded-xl border p-4 ${isEfficiencyBlocked ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'}`}>
          <p className={`text-sm font-semibold ${isEfficiencyBlocked ? 'text-red-950' : 'text-amber-950'}`}>
            {isEfficiencyBlocked ? 'Resolve before reviewing ROI' : 'Model guardrail'}
          </p>
          <ul className={`mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed ${isEfficiencyBlocked ? 'text-red-900' : 'text-amber-900'}`}>
            {guardrailMessages.map((message) => <li key={message}>{message}</li>)}
          </ul>
        </div>
      )}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-900">Model-calculated freed capacity</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <SummaryMetric label="Freed-up time" value={`${Math.round(transitionPlan.freedUpAnnualHours).toLocaleString()} hours`} detail="Per year" />
          <SummaryMetric label="Equivalent capacity" value={`${transitionPlan.freedCapacityFTEs.toFixed(1)} FTEs`} detail="Capacity, not automatic layoffs" />
        </div>
        {hasEfficiencyCeiling && !isEfficiencyBlocked && requestedEfficiencyPct > efficiencyCeilingPct && (
          <p className="mt-3 text-xs leading-relaxed text-emerald-800/75">
            Capacity above uses the model-applied ceiling of {efficiencyCeilingPct.toFixed(0)}%, not the higher requested value.
          </p>
        )}
      </div>

      <CardSelector
        label="How quickly do you want to deliver?"
        options={DELIVERY_PACE_OPTIONS}
        value={formData.deliveryPace || 'standard'}
        onChange={(value) => updatePlanField('deliveryPace', value)}
        helperText="Editable user/model scenario [D1]: Accelerated adds 20% to deployment staffing and cost; More time uses 20% fewer deployment heads. Source notes are in the exported Sources & Footnotes tab."
      />
      <div className="rounded-xl border border-navy/10 bg-navy/[0.03] p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryMetric label="Estimated duration" value={`${deploymentPlan.estimatedDurationMonths} months`} detail={`Standard plan: ${deploymentPlan.baselineTimelineMonths} months`} />
          <SummaryMetric label="Deployment staffing" value={`${deploymentPlan.implementationHeadcount.toFixed(1)} people`} detail="Model planning estimate" />
          <SummaryMetric label="Cost to deploy" value={formatCurrency(buildIntegrationCost)} detail="Largest anticipated one-time bucket" />
        </div>
      </div>

      <div className="rounded-xl border border-navy/10 bg-white p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-navy">Workforce transition</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              Start with the calculated target from the workforce entered earlier, then choose the pace. Direct redundancies remain an explicit decision; contractor roll-off is modeled separately.
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">Model-calculated target</span>
        </div>

        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-emerald-950">Calculated total headcount reduction target</p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-900/75">
                Based on the {formatPeople(headcountReductionPlan.totalWorkforce)} currently doing this process: {formatPeople(headcountReductionPlan.directEmployeeCount)} direct employees and {formatPeople(headcountReductionPlan.contractorCount)} offshore contractors.
              </p>
            </div>
            <span className="font-mono text-2xl font-bold text-emerald-950">{formatPeople(headcountReductionPlan.totalHeadcountReductionTarget)}</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <SummaryMetric
              label="Direct employee cap"
              value={`Up to ${formatPeople(headcountReductionPlan.directEmployeeReductionCap)}`}
              detail="Alternative way to realize the shared target; severance only applies if selected"
            />
            <SummaryMetric
              label="Contractor roll-off cap"
              value={`Up to ${formatPeople(headcountReductionPlan.contractorRollOffCap)}`}
              detail="Alternative way to realize the shared target; no employee severance"
            />
            <SummaryMetric
              label="Even annual phase"
              value={formatPeople(headcountReductionPlan.annualTarget, { approximate: !Number.isInteger(headcountReductionPlan.annualTarget) })}
              detail={`Across ${headcountReductionPlan.years} ${headcountReductionPlan.years === 1 ? 'year' : 'years'}`}
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-emerald-900/75">
            Direct employee and contractor caps are alternatives within the same {formatPeople(headcountReductionPlan.totalHeadcountReductionTarget)} target—they are not added together.
          </p>
        </div>

        <div className="mt-4 grid gap-4 rounded-xl border border-navy/10 bg-navy/[0.025] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <NumberInput
            label="Years to achieve the reduction target"
            value={headcountReductionPlan.years}
            onChange={(value) => updatePlanField('headcountReductionYears', value)}
            min={1}
            max={5}
            suffix="years"
            helperText="User-entered planning timeline."
          />
          <div className="rounded-lg bg-white/75 px-3 py-3 text-xs leading-relaxed text-navy/75">
            <p className="font-semibold text-navy">The model phases reductions evenly.</p>
            <p className="mt-1">
              {formatPeople(headcountReductionPlan.totalHeadcountReductionTarget)} is split evenly across {headcountReductionPlan.years} {headcountReductionPlan.years === 1 ? 'year' : 'years'}—{formatPeople(headcountReductionPlan.annualTarget, { approximate: !Number.isInteger(headcountReductionPlan.annualTarget) })} per year. Whole-person actions are allocated as evenly as practical.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-navy/10 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy/60">Direct employees</p>
            <p className="mt-1 text-sm font-semibold text-navy">Explicit people decisions</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">Retraining retains capacity. Direct redundancies create cash savings and the one-time severance cost below.</p>
          </div>
          <div className="rounded-xl border border-sky/25 bg-sky/[0.05] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy/60">Offshore contractors</p>
            <p className="mt-1 text-sm font-semibold text-navy">Explicit contract roll-off</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">Contractor roll-off is a separate cost reduction you choose below. It does not apply employee severance.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NumberInput
            label="Direct employees to retrain"
            value={effectiveEmployeesToRetrain}
            onChange={(value) => updatePlanField('employeesToRetrain', value)}
            min={0}
            max={workforceActionCaps.employeeRetrainMax}
            suffix="employees"
            helperText="User-entered. Retained employees are treated as capacity reallocation, not cash savings."
          />
          <div className="space-y-2">
            <NumberInput
              label="Direct employees to make redundant"
              value={effectiveEmployeesToMakeRedundant}
              onChange={(value) => updatePlanField('employeesToMakeRedundant', value)}
              min={0}
              max={workforceActionCaps.directEmployeeMax}
              suffix="employees"
              helperText={`User-entered explicit action. Up to ${formatPeople(workforceActionCaps.directEmployeeMax)} can be selected after the contractor roll-off below.`}
            />
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
              Planning assumption: {formatCurrency(transitionPlan.oneTimeRedundancyCost)} of severance is phased evenly over {headcountReductionPlan.years} {headcountReductionPlan.years === 1 ? 'year' : 'years'}—{formatCurrency(annualSeverancePhase)} per year. Model/user schedule [W2]; source notes are in the exported Sources &amp; Footnotes tab.
            </p>
          </div>
          <NumberInput
            label="Contractors to roll off"
            value={effectiveContractorsToRollOff}
            onChange={(value) => updatePlanField('contractorsToRollOff', value)}
            min={0}
            max={workforceActionCaps.contractorMax}
            suffix="contractors"
            helperText={`User-entered explicit action. Up to ${formatPeople(workforceActionCaps.contractorMax)} can be selected after direct redundancies; no employee severance applies.`}
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryMetric label="Annual direct-employee savings" value={formatCurrency(annualEmployeeRedundancySavings)} detail="Declared direct redundancies" />
          <SummaryMetric label="Annual contractor savings" value={formatCurrency(annualContractorRollOffSavings)} detail="Declared contractor roll-off" />
          <SummaryMetric label="Total annual workforce savings" value={formatCurrency(annualHeadcountSavings)} detail="Direct employees + contractors" />
          <SummaryMetric label="One-time direct-employee redundancy cost" value={formatCurrency(transitionPlan.oneTimeRedundancyCost)} detail="Planning assumption [W1]: 1.5× fully burdened employee cost" />
        </div>
        {transitionPlan.warnings.length > 0 && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
            {transitionPlan.warnings.map((warning) => <p key={warning}>{warning}</p>)}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-navy/10 bg-navy/[0.025] p-4">
        <p className="mb-1 text-sm font-semibold text-navy">Measured rework baseline</p>
        <p className="mb-4 text-xs leading-relaxed text-gray-500">User-entered annual observed error counts. This replaces a blanket rework percentage assumption.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberInput
            label="Annual errors from employees"
            value={formData.errorCountEmployees ?? 0}
            onChange={(value) => updateReworkField('errorCountEmployees', value)}
            min={0}
            max={10000000}
            suffix="errors"
            helperText="Number of errors in a typical year from employee-performed work. Entries above 10M need a separately evidenced model."
          />
          <NumberInput
            label="Annual errors from contracts"
            value={formData.errorCountContracts ?? 0}
            onChange={(value) => updateReworkField('errorCountContracts', value)}
            min={0}
            max={10000000}
            suffix="errors"
            helperText="Number of errors in a typical year from contractor-performed work. Entries above 10M need a separately evidenced model."
          />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SliderInput
            label="Share of errors requiring rework"
            value={Math.round((rework.reworkFraction ?? 0) * 100)}
            onChange={(value) => updateReworkField('fractionNeedingRework', value / 100)}
            min={0}
            max={100}
            step={5}
            suffix="%"
          />
          <CurrencyInput
            label="Estimated rework cost per item"
            value={formData.estimatedReworkCostPerItem ?? 0}
            onChange={(value) => updateReworkField('estimatedReworkCostPerItem', value)}
            presets={[0, 50, 100, 250, 500, 1000]}
            defaultValue={0}
            max={100000}
            helperText="Labor, service credits, corrections, or other direct cost to fix one item. Entries above $100K are blocked; use a separately evidenced loss model for exceptional cases."
          />
        </div>
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-emerald-900">Calculated annual rework baseline</span>
            <span className="font-mono text-lg font-bold text-emerald-900">{formatCurrency(rework.annualReworkCost)}</span>
          </div>
          <p className="mt-1 text-xs text-emerald-800/70">{rework.annualErrorCount.toLocaleString()} annual errors × {Math.round(rework.reworkFraction * 100)}% requiring rework × {formatCurrency(rework.reworkCostPerItem)}.</p>
        </div>
      </div>

      <div className="rounded-xl border border-sky/25 bg-sky/[0.05] p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-navy">AI cost model</p>
            <p className="text-xs leading-relaxed text-navy/60">User-provided planning framework / model-derived [C1]: company size, industry, project type, delivery pace, and usage meters determine the estimate.</p>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-navy/55">Model-derived</span>
        </div>
        <div className="mt-4 rounded-xl border border-sky/25 bg-white/80 p-4">
          <label htmlFor="annual-ai-cost-mode" className="block text-base font-semibold text-navy">
            {annualAiCostSuggestion.question}
          </label>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            Choose a planning point based on your company size and industry, or enter a Finance-approved annual total. Model-derived keeps the live Access, Consumption, and Operations &amp; governance build-up as the source of truth.
          </p>
          <select
            id="annual-ai-cost-mode"
            value={selectedAnnualAiCostMode}
            onChange={handleAnnualAiCostModeChange}
            className="mt-3 w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-3 text-sm font-medium text-navy transition-colors focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
          >
            <option value={ANNUAL_AI_COST_MODES.modelDerived}>
              Model-derived — {formatCurrency(annualAiCostSuggestion.annual.modeledAnnualTotal)}/year
            </option>
            <option value={ANNUAL_AI_COST_MODES.lowerPlanning}>
              Lower planning — {formatCurrency(annualAiCostSuggestion.annual.lowerPlanning)}/year
            </option>
            <option value={ANNUAL_AI_COST_MODES.typical}>
              Typical planning — {formatCurrency(annualAiCostSuggestion.annual.typical)}/year
            </option>
            <option value={ANNUAL_AI_COST_MODES.higherPlanning}>
              Higher planning — {formatCurrency(annualAiCostSuggestion.annual.higherPlanning)}/year
            </option>
            <option value={ANNUAL_AI_COST_MODES.custom}>Custom annual amount</option>
          </select>
          <p className="mt-2 text-[11px] leading-relaxed text-navy/65">
            Annual total includes <strong>Access &amp; licensing</strong>, <strong>Consumption</strong>, and <strong>Operations &amp; governance</strong>. <strong>Build &amp; integration</strong> is a separate one-time cost.
          </p>
          {selectedAnnualAiCostMode === ANNUAL_AI_COST_MODES.custom && (
            <div className="mt-4">
              <NumberInput
                label="Custom annual AI cost"
                value={formData.ongoingAnnualCost}
                onChange={(value) => updatePlanField('ongoingAnnualCost', value)}
                min={0}
                max={100000000}
                step={1000}
                prefix="$"
                suffix="/year"
                allowEmpty
                placeholder={Math.round(annualAiCostSuggestion.annual.typical).toLocaleString()}
                helperText="A custom amount overrides the model’s annual total. The results page will show the adjustment and allocate it transparently across Access, Consumption, and Operations & governance."
              />
            </div>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-gray-500">
            {annualAiCostSuggestion.annual.note}
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <SummaryMetric label="Build & integration" value={formatCurrency(buildIntegrationCost)} detail="One-time engineering, integration, and training" />
          <SummaryMetric label="Access & licensing" value={formatCurrency(accessCost)} detail="Annual platform contract, seats, and add-ons" />
          <SummaryMetric label="Consumption" value={formatCurrency(consumptionCost)} detail="Annual model calls, tokens, compute, and agent runs" />
          <SummaryMetric label="Operations & governance" value={formatCurrency(runCost)} detail="Annual support, monitoring, retraining, security, and governance" />
        </div>

        <details className="mt-4 rounded-lg border border-sky/20 bg-white/70 px-3 py-2.5">
          <summary className="cursor-pointer text-sm font-semibold text-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-gold">
            Usage meters (optional)
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-gray-600">
            Usage-meter note [C2]: defaults use the selected archetype’s workload volume. Add only what you know—consumption is not estimated from headcount alone.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <NumberInput
              label="Licensed users / seats"
              value={formData.aiLicensedUsers ?? workforce.totalHeadcount}
              onChange={(value) => updatePlanField('aiLicensedUsers', value)}
              min={0}
              max={10000000}
              suffix="users"
              helperText="People who need a paid or governed AI seat."
            />
            <NumberInput
              label="Monthly AI requests"
              value={formData.monthlyAiRequests ?? processVolumeDefault}
              onChange={(value) => updatePlanField('monthlyAiRequests', value)}
              min={0}
              max={1000000000}
              suffix="requests"
              helperText="Tasks, prompts, or API requests—not people."
            />
            <NumberInput
              label="Average input tokens / request"
              value={formData.avgInputTokensPerRequest}
              onChange={(value) => updatePlanField('avgInputTokensPerRequest', value)}
              min={0}
              max={10000000}
              suffix="tokens"
              allowEmpty
              placeholder={`e.g. ${tokenProfile.avgInput.toLocaleString()}`}
              helperText="Optional. Leave blank to retain the request-based estimate. Enter a positive measured token count to use token pricing; entering 0 keeps the request-based estimate."
            />
            <NumberInput
              label="Average output tokens / request"
              value={formData.avgOutputTokensPerRequest}
              onChange={(value) => updatePlanField('avgOutputTokensPerRequest', value)}
              min={0}
              max={10000000}
              suffix="tokens"
              allowEmpty
              placeholder={`e.g. ${tokenProfile.avgOutput.toLocaleString()}`}
              helperText="Optional. Leave blank to retain the request-based estimate. Enter a positive measured token count to use token pricing; entering 0 keeps the request-based estimate."
            />
            <NumberInput
              label="Agent workflows / month"
              value={formData.monthlyAgentWorkflows ?? 0}
              onChange={(value) => updatePlanField('monthlyAgentWorkflows', value)}
              min={0}
              max={1000000000}
              suffix="runs"
              helperText="Multi-step autonomous or agentic workflow runs."
            />
            <NumberInput
              label="Documents processed / month"
              value={formData.documentsPerMonth ?? 0}
              onChange={(value) => updatePlanField('documentsPerMonth', value)}
              min={0}
              max={1000000000}
              suffix="documents"
            />
            <NumberInput
              label="Data stored for AI"
              value={formData.dataStoredGb ?? 0}
              onChange={(value) => updatePlanField('dataStoredGb', value)}
              min={0}
              max={1000000000}
              suffix="GB"
            />
            <NumberInput
              label="Connected applications"
              value={formData.connectedApplications ?? 0}
              onChange={(value) => updatePlanField('connectedApplications', value)}
              min={0}
              max={10000}
              suffix="apps"
              helperText="Systems that require an integration, connector, or ongoing governance."
            />
          </div>
          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg bg-white px-3 py-2.5">
            <input
              type="checkbox"
              checked={formData.isAgenticWorkflow || false}
              onChange={(event) => updatePlanField('isAgenticWorkflow', event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-gold focus:ring-gold"
            />
            <span className="text-sm font-medium text-navy">This includes agentic / multi-step workflows</span>
          </label>
        </details>
      </div>

      <div className="rounded-xl border border-gold/40 bg-gold/10 p-4">
        <p className="text-sm font-semibold text-navy">Largest anticipated one-time costs</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <SummaryMetric label="1. Cost to deploy" value={formatCurrency(buildIntegrationCost)} detail="Build & integration estimate" />
          <SummaryMetric label="2. Contract cancellation" value={formatCurrency(contractExit.contractExitCost)} detail="Notice-period estimate" />
          <SummaryMetric label="3. Severance" value={formatCurrency(transitionPlan.oneTimeRedundancyCost)} detail="Model schedule applies" />
        </div>
      </div>

      <button
        type="button"
        onClick={handleComplete}
        disabled={isEfficiencyBlocked}
        className={`rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-navy shadow-sm transition-all duration-150 hover:bg-sky focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 ${isEfficiencyBlocked ? 'cursor-not-allowed opacity-40 hover:bg-gold' : ''}`}
      >
        {isEfficiencyBlocked ? 'Resolve workload check to continue' : 'Calculate ROI'}
      </button>
    </div>
  );
}
