import { useCallback, useMemo } from 'react';
import SliderInput from '../inputs/SliderInput';
import { getArchetypeDefaults, getArchetypeById } from '../../logic/archetypes';
import { mapArchetypeInputs } from '../../logic/archetypeInputs';
import { getAutomationPotential, getErrorRate } from '../../logic/benchmarks';
import { formatCurrency } from '../../utils/formatters';

export default function Step4_ReviewAssumptions({ formData, updateField }) {
  const archetype = getArchetypeById(formData.projectArchetype);
  const industry = formData.industry || 'Other';
  const assumptions = formData.assumptions || {};

  const defaults = getArchetypeDefaults(formData.projectArchetype, industry) || {};

  // Compute derived values from archetype-specific inputs
  const computed = useMemo(() => {
    const archetypeInputs = formData.archetypeInputs || {};
    return mapArchetypeInputs(formData.projectArchetype, archetypeInputs);
  }, [formData.projectArchetype, formData.archetypeInputs]);

  const updateAssumption = useCallback(
    (key, value) => {
      updateField('assumptions', { ...formData.assumptions, [key]: value });
    },
    [formData.assumptions, updateField],
  );

  const handleReset = useCallback(() => {
    const fresh = getArchetypeDefaults(formData.projectArchetype, industry);
    if (fresh) {
      updateField('assumptions', fresh);
    }
  }, [formData.projectArchetype, industry, updateField]);

  const showRevenue = assumptions.revenueEligible !== undefined;

  return (
    <div className="mx-auto w-full max-w-xl">
      <h2 className="mb-2 text-2xl font-bold text-navy sm:text-3xl">
        Review Key Assumptions
      </h2>
      <div className="mb-4 h-1 w-16 rounded bg-gold" />

      {archetype && (
        <div className="mb-6 flex items-center gap-2">
          <span className="text-2xl">{archetype.icon}</span>
          <span className="font-semibold text-navy">{archetype.label}</span>
          <span className="text-sm text-gray-400">
            &mdash; {industry}
          </span>
        </div>
      )}

      {/* ── Revenue Impact (display-only when present) ── */}
      {computed.revenueImpact != null && computed.revenueImpact > 0 && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
              Estimated Revenue Impact
            </p>
            <p className="text-2xl font-bold text-navy">
              {formatCurrency(computed.revenueImpact)}
            </p>
          </div>
        </div>
      )}

      {/* ── Editable Controls ── */}
      <p className="mb-6 text-sm leading-relaxed text-gray-600">
        Adjust these assumptions to match your situation. Defaults are based on industry data and your archetype inputs.
      </p>

      <div className="space-y-6">
        {/* Automation Potential */}
        <div>
          <SliderInput
            label="Automation Potential"
            value={Math.round((assumptions.automationPotential ?? computed.automationPotential ?? getAutomationPotential(industry, formData.processType || 'Other')) * 100)}
            onChange={(v) => updateAssumption('automationPotential', v / 100)}
            min={5}
            max={85}
            step={1}
            suffix="%"
            helperText={`% of process work AI can automate. Industry avg: ${Math.round(getAutomationPotential(industry, formData.processType || 'Other') * 100)}%`}
          />
        </div>

        {/* Hours per Week */}
        <div>
          <SliderInput
            label="Process Hours / Week"
            value={assumptions.hoursPerWeek ?? computed.hoursPerWeek ?? 20}
            onChange={(v) => updateAssumption('hoursPerWeek', v)}
            min={1}
            max={10000}
            step={1}
            suffix=" hrs"
            helperText={`Total team hours spent on this process per week.${computed.hoursPerWeek != null ? ` Computed: ${computed.hoursPerWeek.toLocaleString()} hrs` : ''}`}
          />
        </div>

        {/* Error Rate */}
        <div>
          <SliderInput
            label="Current Error / Rework Rate"
            value={Math.round((assumptions.errorRate ?? computed.errorRate ?? 0.10) * 100 * 10) / 10}
            onChange={(v) => updateAssumption('errorRate', v / 100)}
            min={0}
            max={50}
            step={0.5}
            suffix="%"
            helperText={`% of work requiring rework or correction. Industry avg: ${Math.round(getErrorRate(industry, formData.processType || 'Other') * 100)}%${computed.errorRate != null ? ` | Computed: ${(computed.errorRate * 100).toFixed(1)}%` : ''}`}
          />
        </div>

        {/* Adoption Rate */}
        <div>
          <SliderInput
            label="Expected Adoption Rate"
            value={Math.round((assumptions.adoptionRate ?? 0.70) * 100)}
            onChange={(v) => updateAssumption('adoptionRate', v / 100)}
            min={20}
            max={95}
            step={5}
            suffix="%"
            helperText={`Expected team adoption after ramp-up. Benchmark: ${Math.round((defaults.adoptionRate ?? 0.70) * 100)}%`}
          />
        </div>

        {/* Tool Replacement Rate */}
        <div>
          <SliderInput
            label="Tool Replacement Rate"
            value={Math.round((assumptions.toolReplacementRate ?? 0.40) * 100)}
            onChange={(v) => updateAssumption('toolReplacementRate', v / 100)}
            min={10}
            max={80}
            step={5}
            suffix="%"
            helperText={`% of current tool spend AI replaces. Benchmark: ${Math.round((defaults.toolReplacementRate ?? 0.40) * 100)}%`}
          />
        </div>

        {/* Retained Talent Premium */}
        <div>
          <SliderInput
            label="Talent Retention Premium"
            value={Math.round((formData.retainedTalentPremiumRate ?? 0.10) * 100)}
            onChange={(v) => updateField('retainedTalentPremiumRate', v / 100)}
            min={0}
            max={20}
            step={1}
            suffix="%"
            helperText="Wage increase to retain top performers during AI transition. Default: 10%"
          />
        </div>

        {/* Agentic AI Workflow Toggle */}
        <div className="flex items-center gap-3 rounded-xl border border-navy/10 bg-navy/5 px-4 py-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isAgenticWorkflow || false}
              onChange={(e) => updateField('isAgenticWorkflow', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-gold focus:ring-gold"
            />
            <div>
              <span className="text-sm font-medium text-navy">Agentic AI Workflow?</span>
              <p className="text-xs text-gray-500">
                Multi-step reasoning chains use 2-5x more API calls per task
              </p>
            </div>
          </label>
        </div>

        {/* Revenue Eligible toggle — only for revenue archetypes */}
        {showRevenue && (
          <div className="flex items-center gap-3 rounded-xl border border-navy/10 bg-navy/5 px-4 py-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={assumptions.revenueEligible ?? false}
                onChange={(e) => updateAssumption('revenueEligible', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-gold focus:ring-gold"
              />
              <div>
                <span className="text-sm font-medium text-navy">Revenue Eligible</span>
                <p className="text-xs text-gray-500">
                  Enable revenue uplift calculations for this project
                </p>
              </div>
            </label>
          </div>
        )}
      </div>

      {/* Reset to Defaults */}
      <div className="mt-8">
        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border-2 border-dashed border-navy/20 px-4 py-2 text-sm font-medium text-navy/60 transition-all duration-150 hover:border-navy/40 hover:text-navy hover:bg-navy/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
