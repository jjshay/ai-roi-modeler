import { useCallback } from 'react';
import SliderInput from '../inputs/SliderInput';
import CurrencyInput from '../inputs/CurrencyInput';
import { getArchetypeDefaults, getArchetypeById } from '../../logic/archetypes';

export default function Step4_ReviewAssumptions({ formData, updateField }) {
  const archetype = getArchetypeById(formData.projectArchetype);
  const industry = formData.industry || 'Other';
  const assumptions = formData.assumptions || {};

  const defaults = getArchetypeDefaults(formData.projectArchetype, industry) || {};

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

      <p className="mb-8 text-sm leading-relaxed text-gray-600">
        These defaults are based on industry benchmarks for your project type.
        Adjust any value that doesn't match your situation.
      </p>

      <div className="space-y-6">
        {/* Automation Potential */}
        <div>
          <SliderInput
            label="Automation Potential"
            value={Math.round((assumptions.automationPotential ?? 0.50) * 100)}
            onChange={(v) => updateAssumption('automationPotential', v / 100)}
            min={10}
            max={90}
            step={5}
            suffix="%"
            helperText={`% of current task hours AI can automate. Benchmark: ${Math.round((defaults.automationPotential ?? 0.50) * 100)}%`}
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

        {/* API Cost per 1K Requests */}
        <div>
          <CurrencyInput
            label="API Cost per 1,000 Requests"
            value={assumptions.apiCostPer1kRequests ?? 10}
            onChange={(v) => updateAssumption('apiCostPer1kRequests', v)}
            presets={[5, 10, 15, 25]}
            helperText={`LLM inference cost. Benchmark: $${defaults.apiCostPer1kRequests ?? 10}`}
          />
        </div>

        {/* Requests per Person-Hour */}
        <div>
          <SliderInput
            label="Requests per Person-Hour"
            value={assumptions.requestsPerPersonHour ?? 12}
            onChange={(v) => updateAssumption('requestsPerPersonHour', v)}
            min={1}
            max={60}
            step={1}
            suffix=" req/hr"
            helperText={`API call volume per person. Benchmark: ${defaults.requestsPerPersonHour ?? 12}`}
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

        {/* Revenue Eligible toggle — only for customer-facing / revenue archetypes */}
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
          className="
            rounded-lg border-2 border-dashed border-navy/20 px-4 py-2
            text-sm font-medium text-navy/60 transition-all duration-150
            hover:border-navy/40 hover:text-navy hover:bg-navy/5
            focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2
          "
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
