import { useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CardSelector from '../inputs/CardSelector';
import SliderInput from '../inputs/SliderInput';
import CurrencyInput from '../inputs/CurrencyInput';
import { PROJECT_ARCHETYPES, getArchetypeDefaults } from '../../logic/archetypes';
import { ARCHETYPE_INPUT_MAP, getArchetypeInputDefaults, mapArchetypeInputs } from '../../logic/archetypeInputs';
import { getAutomationPotential, getErrorRate } from '../../logic/benchmarks';
import { formatCurrency } from '../../utils/formatters';

const ARCHETYPE_OPTIONS = PROJECT_ARCHETYPES.map(a => ({
  icon: a.icon,
  title: a.label,
  description: a.description,
  example: a.example,
  value: a.id,
  tags: a.tags,
}));

const slideVariants = {
  enter: { x: 80, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -80, opacity: 0 },
};

function getStepForNumber(min, max) {
  const range = max - min;
  if (range > 10000) return 100;
  if (range > 1000) return 10;
  return 1;
}

export default function Step3_ProcessDetails({ formData, updateField }) {
  const [subStep, setSubStep] = useState(0);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const advanceTimer = useRef(null);

  const autoAdvance = useCallback(
    (nextSubStep) => {
      clearTimeout(advanceTimer.current);
      if (nextSubStep <= 6) {
        advanceTimer.current = setTimeout(() => {
          setSubStep(nextSubStep);
        }, 300);
      }
    },
    [],
  );

  const isQuick = formData.wizardMode === 'quick';

  const handleArchetype = (id) => {
    updateField('projectArchetype', id);
    const defaults = getArchetypeDefaults(id, formData.industry || 'Other');
    if (defaults) {
      updateField('assumptions', defaults);
    }
    const archetype = PROJECT_ARCHETYPES.find(a => a.id === id);
    if (archetype && archetype.sourceProcessTypes.length > 0) {
      updateField('processType', archetype.sourceProcessTypes[0]);
    }
    updateField('archetypeInputs', getArchetypeInputDefaults(id));
    autoAdvance(1);
  };

  const handleTeamSize = (val) => {
    updateField('teamSize', val);
  };

  // Quick mode: 0→archetype, 1→team size, 2→archetype inputs, 3→salary, 4→tool costs (skip 5,6)
  // Detailed mode: 0→archetype, 1→team size, 2→archetype inputs, 3→salary, 4→tool costs, 5→vendors, 6→termination
  const nextAfterTeamSize = 2;
  const nextAfterToolCosts = isQuick ? null : 5; // null = end of step in quick mode

  const handleArchetypeInput = (key, val) => {
    const current = formData.archetypeInputs || {};
    updateField('archetypeInputs', { ...current, [key]: val });
  };

  // Assumptions helpers
  const assumptions = formData.assumptions || {};
  const industry = formData.industry || 'Other';

  const updateAssumption = useCallback(
    (key, value) => {
      updateField('assumptions', { ...formData.assumptions, [key]: value });
    },
    [formData.assumptions, updateField],
  );

  const handleResetAssumptions = useCallback(() => {
    const fresh = getArchetypeDefaults(formData.projectArchetype, industry);
    if (fresh) {
      updateField('assumptions', fresh);
    }
  }, [formData.projectArchetype, industry, updateField]);

  const defaults = getArchetypeDefaults(formData.projectArchetype, industry) || {};
  const showRevenue = assumptions.revenueEligible !== undefined;

  const computed = useMemo(() => {
    const archetypeInputs = formData.archetypeInputs || {};
    return mapArchetypeInputs(formData.projectArchetype, archetypeInputs);
  }, [formData.projectArchetype, formData.archetypeInputs]);

  const archetypeSchema = formData.projectArchetype
    ? ARCHETYPE_INPUT_MAP[formData.projectArchetype]
    : null;
  const archetypeInfo = formData.projectArchetype
    ? PROJECT_ARCHETYPES.find(a => a.id === formData.projectArchetype)
    : null;
  const archetypeInputValues = formData.archetypeInputs || {};

  // Current cost helpers
  const teamSize = formData.teamSize || 10;
  const avgSalary = formData.avgSalary ?? 100000;
  const errorRate = formData.errorRate ?? 0.10;
  const annualLaborCost = teamSize * avgSalary;
  const reworkCost = annualLaborCost * errorRate;
  const totalCost = annualLaborCost + reworkCost;

  // Determine section title
  const isCostSection = subStep >= 3;

  return (
    <div className="mx-auto w-full max-w-xl">
      <h2 className="mb-2 text-2xl font-bold text-navy sm:text-3xl">
        {isCostSection ? "Now let's talk dollars" : 'What type of AI project is this?'}
      </h2>
      <div className="mb-8 h-1 w-16 rounded bg-gold" />

      <AnimatePresence mode="wait">
        {/* SubStep 0: Archetype selection */}
        {subStep === 0 && (
          <motion.div key="archetype" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: 'easeInOut' }}>
            <CardSelector
              label="Select the archetype that best describes your project"
              options={ARCHETYPE_OPTIONS}
              value={formData.projectArchetype}
              onChange={handleArchetype}
            />
          </motion.div>
        )}

        {/* SubStep 1: Team size */}
        {subStep === 1 && (
          <motion.div key="teamSize" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: 'easeInOut' }}>
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 mb-2">
                <p className="text-sm text-emerald-800">
                  <span className="font-bold italic text-emerald-700">Team size</span> is the #1 driver of AI ROI — larger teams see bigger absolute savings.
                </p>
              </div>
              <SliderInput
                label="How many people currently work on this process?"
                value={formData.teamSize ?? 10}
                onChange={handleTeamSize}
                min={1}
                max={500}
                step={1}
                suffix=" people"
              />

              {/* Show automation potential from archetype defaults */}
              {computed.automationPotential != null && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-emerald-700">Estimated Automation Potential</p>
                      <p className="text-[11px] text-emerald-600/70">Based on your archetype selection</p>
                    </div>
                    <span className="text-xl font-bold font-mono text-emerald-700">
                      {Math.round(computed.automationPotential * 100)}%
                    </span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSubStep(nextAfterTeamSize)}
                className="mt-4 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-navy shadow-sm transition-all duration-150 hover:bg-sky focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {/* SubStep 2: Archetype inputs + assumptions */}
        {subStep === 2 && archetypeSchema && (
          <motion.div key="archetypeInputs" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: 'easeInOut' }}>
            <div className="space-y-6">
              {/* Archetype header */}
              <div className="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                <span className="text-2xl" role="img" aria-label={archetypeInfo?.label}>
                  {archetypeInfo?.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">{archetypeInfo?.label}</p>
                  <p className="text-xs text-gray-500">Customize the inputs below to match your process</p>
                </div>
              </div>

              {/* Editable Summary Card */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="mb-2 text-[10px] font-medium text-emerald-600">Computed from your inputs — click any value to override</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white/70 px-3 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-600">Automation Potential</p>
                    <div className="mt-1 flex items-baseline gap-1">
                      <input
                        type="number"
                        min={1} max={85} step={1}
                        value={assumptions.automationPotential != null ? Math.round(assumptions.automationPotential * 100) : (computed.automationPotential != null ? Math.round(computed.automationPotential * 100) : '')}
                        onChange={(e) => updateAssumption('automationPotential', Math.min(85, Math.max(1, Number(e.target.value))) / 100)}
                        className="w-16 bg-transparent text-lg font-bold text-navy border-b border-dashed border-navy/30 focus:border-gold focus:outline-none text-right"
                      />
                      <span className="text-sm font-bold text-navy/60">%</span>
                    </div>
                    <p className="mt-1 text-[9px] text-emerald-600/60">Ind. avg: {Math.round(getAutomationPotential(industry, formData.processType || 'Other') * 100)}%</p>
                  </div>
                  <div className="rounded-lg bg-white/70 px-3 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-600">Hours/Week</p>
                    <div className="mt-1 flex items-baseline gap-1">
                      <input
                        type="number"
                        min={1} max={99999} step={1}
                        value={assumptions.hoursPerWeek ?? computed.hoursPerWeek ?? ''}
                        onChange={(e) => updateAssumption('hoursPerWeek', Math.max(1, Number(e.target.value)))}
                        className="w-20 bg-transparent text-lg font-bold text-navy border-b border-dashed border-navy/30 focus:border-gold focus:outline-none text-right"
                      />
                      <span className="text-sm font-bold text-navy/60">hrs</span>
                    </div>
                    <p className="mt-1 text-[9px] text-emerald-600/60">Total team hrs on this process</p>
                  </div>
                  <div className="rounded-lg bg-white/70 px-3 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-600">Error Rate</p>
                    <div className="mt-1 flex items-baseline gap-1">
                      <input
                        type="number"
                        min={0} max={50} step={0.5}
                        value={assumptions.errorRate != null ? Math.round(assumptions.errorRate * 1000) / 10 : (computed.errorRate != null ? Math.round(computed.errorRate * 1000) / 10 : '')}
                        onChange={(e) => updateAssumption('errorRate', Math.min(50, Math.max(0, Number(e.target.value))) / 100)}
                        className="w-16 bg-transparent text-lg font-bold text-navy border-b border-dashed border-navy/30 focus:border-gold focus:outline-none text-right"
                      />
                      <span className="text-sm font-bold text-navy/60">%</span>
                    </div>
                    <p className="mt-1 text-[9px] text-emerald-600/60">Ind. avg: {Math.round(getErrorRate(industry, formData.processType || 'Other') * 100)}%</p>
                  </div>
                  {computed.revenueImpact != null && computed.revenueImpact > 0 && (
                    <div className="rounded-lg bg-white/70 px-3 py-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-600">Revenue Impact</p>
                      <p className="mt-1 text-lg font-bold text-navy">{formatCurrency(computed.revenueImpact)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Scrollable compact input list */}
              <div className="max-h-[40vh] space-y-5 overflow-y-auto pr-1">
                {archetypeSchema.inputs.map((input) => {
                  const rawValue = archetypeInputValues[input.key] ?? input.default;

                  if (input.type === 'percent') {
                    const displayValue = Math.round(rawValue * 100);
                    const displayMin = Math.round(input.min * 100);
                    const displayMax = Math.round(input.max * 100);
                    return (
                      <div key={input.key} className="space-y-1">
                        <SliderInput
                          label={input.label}
                          value={displayValue}
                          onChange={(v) => handleArchetypeInput(input.key, v / 100)}
                          min={displayMin}
                          max={displayMax}
                          step={1}
                          suffix="%"
                          helperText={input.note}
                        />
                      </div>
                    );
                  }

                  if (input.type === 'scale') {
                    return (
                      <div key={input.key} className="space-y-1">
                        <SliderInput
                          label={input.label}
                          value={rawValue}
                          onChange={(v) => handleArchetypeInput(input.key, v)}
                          min={1}
                          max={5}
                          step={1}
                          suffix=""
                          helperText={input.note}
                        />
                      </div>
                    );
                  }

                  const step = getStepForNumber(input.min, input.max);
                  return (
                    <div key={input.key} className="space-y-1">
                      <SliderInput
                        label={input.label}
                        value={rawValue}
                        onChange={(v) => handleArchetypeInput(input.key, v)}
                        min={input.min}
                        max={input.max}
                        step={step}
                        suffix=""
                        helperText={input.note}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Collapsible Fine-tune Assumptions */}
              <button
                type="button"
                onClick={() => setShowAssumptions(!showAssumptions)}
                className="flex w-full items-center gap-2 rounded-lg border-2 border-dashed border-navy/20 px-4 py-2.5 text-sm font-medium text-navy/60 transition-all duration-150 hover:border-navy/40 hover:text-navy hover:bg-navy/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 transition-transform duration-200 ${showAssumptions ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                Fine-tune assumptions (optional)
              </button>

              <AnimatePresence>
                {showAssumptions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-xs text-gray-500">
                        These values are pre-set from industry benchmarks. Adjust to match your situation.
                      </p>

                      <SliderInput
                        label="Expected Adoption Rate"
                        value={Math.round((assumptions.adoptionRate ?? 0.70) * 100)}
                        onChange={(v) => updateAssumption('adoptionRate', v / 100)}
                        min={20}
                        max={95}
                        step={5}
                        suffix="%"
                        helperText={`Benchmark: ${Math.round((defaults.adoptionRate ?? 0.70) * 100)}%`}
                      />

                      <SliderInput
                        label="Tool Replacement Rate"
                        value={Math.round((assumptions.toolReplacementRate ?? 0.40) * 100)}
                        onChange={(v) => updateAssumption('toolReplacementRate', v / 100)}
                        min={10}
                        max={80}
                        step={5}
                        suffix="%"
                        helperText={`Benchmark: ${Math.round((defaults.toolReplacementRate ?? 0.40) * 100)}%`}
                      />

                      <SliderInput
                        label="Talent Retention Premium"
                        value={Math.round((formData.retainedTalentPremiumRate ?? 0.10) * 100)}
                        onChange={(v) => updateField('retainedTalentPremiumRate', v / 100)}
                        min={0}
                        max={20}
                        step={1}
                        suffix="%"
                        helperText="Wage increase to retain top performers. Default: 10%"
                      />

                      <label className="flex items-center gap-3 cursor-pointer rounded-lg bg-white/70 px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={formData.isAgenticWorkflow || false}
                          onChange={(e) => updateField('isAgenticWorkflow', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-gold focus:ring-gold"
                        />
                        <div>
                          <span className="text-sm font-medium text-navy">Agentic AI Workflow?</span>
                          <p className="text-xs text-gray-500">Multi-step reasoning chains use 2-5x more API calls</p>
                        </div>
                      </label>

                      {showRevenue && (
                        <label className="flex items-center gap-3 cursor-pointer rounded-lg bg-white/70 px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={assumptions.revenueEligible ?? false}
                            onChange={(e) => updateAssumption('revenueEligible', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-gold focus:ring-gold"
                          />
                          <div>
                            <span className="text-sm font-medium text-navy">Revenue Eligible</span>
                            <p className="text-xs text-gray-500">Enable revenue uplift calculations</p>
                          </div>
                        </label>
                      )}

                      <button
                        type="button"
                        onClick={handleResetAssumptions}
                        className="rounded-lg border border-dashed border-navy/20 px-3 py-1.5 text-xs font-medium text-navy/50 transition-all duration-150 hover:border-navy/40 hover:text-navy hover:bg-white/50"
                      >
                        Reset to Defaults
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* SubStep 3: Average salary */}
        {subStep === 3 && (
          <motion.div
            key="avgSalary"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="space-y-4">
              <CurrencyInput
                label="What's the average fully-loaded annual cost per person?"
                value={formData.avgSalary ?? 100000}
                onChange={(val) => updateField('avgSalary', val)}
                presets={[100000, 125000, 150000, 200000, 250000, 300000]}
                defaultValue={100000}
                helperText="Salary + benefits + overhead (1.3-1.5x base). Higher cost = bigger savings from AI automation."
              />

              {formData.avgSalary != null && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
                  <p className="text-sm font-semibold text-emerald-800">Current Annual Process Cost</p>
                  <div className="space-y-1 text-sm text-emerald-800/80">
                    <p>
                      Labor: {formatCurrency(annualLaborCost)}{' '}
                      <span className="text-emerald-700/50">({teamSize} people x {formatCurrency(avgSalary)})</span>
                    </p>
                    <p>+ Rework Cost: {formatCurrency(reworkCost)}</p>
                    <div className="mt-2 border-t border-emerald-200 pt-2">
                      <p className="text-base font-bold text-emerald-800">Total: {formatCurrency(totalCost)}</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSubStep(4)}
                className="mt-4 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-navy shadow-sm transition-all duration-150 hover:bg-sky focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {/* SubStep 4: Tool costs */}
        {subStep === 4 && (
          <motion.div
            key="toolCosts"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="space-y-4">
              <CurrencyInput
                label="Annual spend on current tools/software for this process?"
                value={formData.currentToolCosts ?? 0}
                onChange={(val) => updateField('currentToolCosts', val)}
                presets={[0, 10000, 25000, 50000, 100000]}
                defaultValue={0}
                helperText="Include licenses, subscriptions, and maintenance costs"
              />
              {nextAfterToolCosts != null && (
                <button
                  type="button"
                  onClick={() => setSubStep(nextAfterToolCosts)}
                  className="mt-4 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-navy shadow-sm transition-all duration-150 hover:bg-sky focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                >
                  Continue
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* SubStep 5: Vendors replaced */}
        {subStep === 5 && (
          <motion.div
            key="vendorsReplaced"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="space-y-4">
              <SliderInput
                label="How many existing vendors/tools will AI replace?"
                value={formData.vendorsReplaced ?? 0}
                onChange={(val) => updateField('vendorsReplaced', val)}
                min={0}
                max={3}
                step={1}
                helperText="Count major software vendors or service contracts that will be terminated"
              />
              {(formData.vendorsReplaced ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={() => setSubStep(6)}
                  className="mt-4 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-navy shadow-sm transition-all duration-150 hover:bg-sky focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                >
                  Continue
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* SubStep 6: Vendor termination cost */}
        {subStep === 6 && (
          <motion.div
            key="vendorTerminationCost"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="space-y-4">
              <CurrencyInput
                label={`Estimated cost to terminate ${formData.vendorsReplaced} vendor contract${formData.vendorsReplaced > 1 ? 's' : ''}?`}
                value={formData.vendorTerminationCost ?? 0}
                onChange={(val) => updateField('vendorTerminationCost', val)}
                presets={[0, 25000, 50000, 100000, 250000]}
                defaultValue={0}
                helperText="Include early termination fees, remaining contract obligations, migration costs"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
