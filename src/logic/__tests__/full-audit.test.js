// Programmatic audit across every archetype × company size × provider combo.
// Surfaces anomalies the existing tests might miss — waterfall consistency,
// scenario ordering, headcount reconciliation, bounds checks.
import { describe, it, expect } from 'vitest';
import { runCalculations } from '../calculations';
import { PROJECT_ARCHETYPES } from '../archetypes';
import { getArchetypeInputDefaults } from '../archetypeInputs';
import { ENTERPRISE_VOLUME_DISCOUNT, PROVIDER_PRICING } from '../benchmarks';

const COMPANY_SIZES = [
  'Startup (1-50)', 'SMB (51-500)', 'Mid-Market (501-5,000)',
  'Enterprise (5,001-50,000)', 'Large Enterprise (50,000+)',
];
const PROVIDERS = [null, 'Anthropic Claude', 'OpenAI', 'Google Gemini', 'xAI Grok'];

function makeInputs(archetypeId, companySize, provider) {
  return {
    industry: 'Technology / Software',
    companySize,
    role: 'CFO / Finance Executive',
    teamLocation: 'US - Major Tech Hub',
    teamSize: 15, avgSalary: 120000, hoursPerWeek: 25, errorRate: 0.10,
    changeReadiness: 3, dataReadiness: 3, execSponsor: true,
    projectArchetype: archetypeId,
    processType: 'Document Processing',
    archetypeInputs: getArchetypeInputDefaults(archetypeId) || {},
    aiProvider: provider,
    implementationBudget: 500000, expectedTimeline: 6, ongoingAnnualCost: 50000,
  };
}

describe('Full audit: all archetypes × company sizes × providers', () => {
  const errors = [];
  let totalRuns = 0;

  for (const arch of PROJECT_ARCHETYPES) {
    for (const size of COMPANY_SIZES) {
      for (const provider of PROVIDERS) {
        totalRuns++;
        const ctx = `${arch.label} / ${size} / ${provider || 'blended'}`;
        let r;
        try {
          r = runCalculations(makeInputs(arch.id, size, provider));
        } catch (e) {
          errors.push({ label: 'runCalculations threw', ctx, detail: e.message });
          continue;
        }

        const tcm = r.aiCostModel?.tokenCostModel || {};
        const base = r.scenarios?.base || {};
        const cons = r.scenarios?.conservative || {};
        const opt = r.scenarios?.optimistic || {};

        // Waterfall consistency (only when provider selected)
        if (provider && tcm.msrpInputPer1M) {
          const expectedEntDisc = ENTERPRISE_VOLUME_DISCOUNT[size] ?? 0;
          if (Math.abs(tcm.enterpriseDiscount - expectedEntDisc) >= 0.001)
            errors.push({ label: 'Enterprise discount mismatch', ctx, detail: `got ${tcm.enterpriseDiscount}, expected ${expectedEntDisc}` });

          const expectedAfterEnt = tcm.msrpInputPer1M * (1 - tcm.enterpriseDiscount);
          if (Math.abs(tcm.afterEnterpriseInput - expectedAfterEnt) >= 0.0001)
            errors.push({ label: 'Step 1 (MSRP × 1-entDisc) mismatch', ctx });

          const expectedBase = tcm.afterEnterpriseInput * tcm.contractDiscount;
          if (Math.abs(tcm.inputCostPer1M - expectedBase) >= 0.0001)
            errors.push({ label: 'Step 2 (× contractDisc) mismatch', ctx });

          if (tcm.effectiveInputCostPer1M > tcm.inputCostPer1M + 0.0001)
            errors.push({ label: 'Effective rate exceeds base', ctx });

          if (tcm.effectiveInputCostPer1M <= 0)
            errors.push({ label: 'Effective rate non-positive', ctx });
        }

        // Scenario ordering
        if (cons.npv > base.npv + 1) errors.push({ label: 'Cons NPV > Base NPV', ctx, detail: `cons=${cons.npv.toFixed(0)}, base=${base.npv.toFixed(0)}` });
        if (base.npv > opt.npv + 1) errors.push({ label: 'Base NPV > Opt NPV', ctx, detail: `base=${base.npv.toFixed(0)}, opt=${opt.npv.toFixed(0)}` });

        // Finite metrics
        if (!isFinite(base.npv)) errors.push({ label: 'Base NPV not finite', ctx });
        if (!isFinite(base.roic)) errors.push({ label: 'Base ROIC not finite', ctx });

        // Upfront + ops
        if (!(r.upfrontInvestment > 0)) errors.push({ label: 'Upfront <= 0', ctx, detail: `${r.upfrontInvestment}` });
        if (!(r.aiCostModel?.computedOngoingCost > 0)) errors.push({ label: 'Ongoing cost <= 0', ctx });

        // Headcount reconciliation
        const displaced = r.oneTimeCosts?.displacedFTEs ?? 0;
        const retained = r.oneTimeCosts?.retainedFTEs ?? 0;
        if (Math.abs((displaced + retained) - 15) >= 1)
          errors.push({ label: 'Displaced + Retained != Team', ctx, detail: `d=${displaced}, r=${retained}` });

        // Bounds
        const riskMult = r.riskAdjustments?.riskMultiplier;
        if (!(riskMult >= 0 && riskMult <= 1.01))
          errors.push({ label: 'Risk multiplier out of [0,1]', ctx, detail: `${riskMult}` });
        if (!(r.discountRate >= 0.05 && r.discountRate <= 0.20))
          errors.push({ label: 'Discount rate out of [5%, 20%]', ctx, detail: `${r.discountRate}` });

        // Cash flow totals
        const projs = base.projections || [];
        if (projs.length >= 5) {
          const grossSum = projs.reduce((s, y) => s + y.grossSavings, 0);
          const netSum = projs.reduce((s, y) => s + y.netCashFlow, 0);
          if (grossSum < netSum - 1)
            errors.push({ label: '5yr Gross < 5yr Net', ctx, detail: `gross=${grossSum.toFixed(0)}, net=${netSum.toFixed(0)}` });
        }
      }
    }
  }

  it('audit summary', () => {
    // Group errors by label
    const byLabel = {};
    for (const e of errors) {
      byLabel[e.label] = byLabel[e.label] || [];
      byLabel[e.label].push(e);
    }

    console.log(`\nTotal scenarios audited: ${totalRuns}`);
    console.log(`Unique error types: ${Object.keys(byLabel).length}`);
    console.log(`Total error occurrences: ${errors.length}\n`);
    for (const [label, occurrences] of Object.entries(byLabel)) {
      console.log(`[${label}] ${occurrences.length} occurrence(s)`);
      occurrences.slice(0, 5).forEach(e => {
        console.log(`  - ${e.ctx}${e.detail ? ': ' + e.detail : ''}`);
      });
      if (occurrences.length > 5) console.log(`  ... and ${occurrences.length - 5} more`);
    }

    expect(errors).toEqual([]);
  });
});
