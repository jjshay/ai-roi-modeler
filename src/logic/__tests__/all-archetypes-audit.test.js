import { describe, it, expect } from 'vitest';
import { runCalculations } from '../calculations';
import { PROJECT_ARCHETYPES, getArchetypeDefaults } from '../archetypes';
import { getArchetypeInputDefaults, mapArchetypeInputs } from '../archetypeInputs';

/**
 * Full end-to-end audit: run all 6 archetypes through the DCF engine
 * with realistic mid-market inputs and verify every output is valid.
 */

// Realistic mid-market base inputs
const BASE = {
  industry: 'Technology / Software',
  companySize: 'Mid-Market (501-5,000)',
  role: 'Director',
  teamLocation: 'US - Major Tech Hub',
  changeReadiness: 3,
  dataReadiness: 3,
  execSponsor: true,
  teamSize: 25,
  avgSalary: 120000,
  hoursPerWeek: 30,
  errorRate: 0.12,
  currentToolCosts: 75000,
  vendorsReplaced: 1,
  vendorTerminationCost: 15000,
  implementationBudget: 250000,
  expectedTimeline: 6,
  ongoingAnnualCost: 60000,
  companyState: 'California',
  cashRealizationPct: 0.40,
  annualRevenue: 50000000,
  contributionMargin: 0.35,
  includeCapacityValue: false,
  includeRiskReduction: false,
  includeRevenueAcceleration: false,
  retainedTalentPremiumRate: 0.10,
  isAgenticWorkflow: false,
};

function makeInputs(archetypeId, industry = 'Technology / Software') {
  const archDefaults = getArchetypeDefaults(archetypeId, industry);
  const archetypeInputs = getArchetypeInputDefaults(archetypeId);
  const mapped = mapArchetypeInputs(archetypeId, archetypeInputs);

  // For revenue-eligible archetypes, enable revenue flags
  const isRevenue = archDefaults?.revenueEligible;

  return {
    ...BASE,
    industry,
    projectArchetype: archetypeId,
    processType: PROJECT_ARCHETYPES.find(a => a.id === archetypeId)?.sourceProcessTypes[0] || 'Other',
    assumptions: archDefaults || {},
    archetypeInputs,
    // Override from archetype-computed values
    hoursPerWeek: mapped.hoursPerWeek ?? BASE.hoursPerWeek,
    errorRate: mapped.errorRate ?? BASE.errorRate,
    // Revenue flags
    includeRevenueAcceleration: isRevenue,
  };
}

// All 6 archetype IDs
const ALL_ARCHETYPES = PROJECT_ARCHETYPES.map(a => a.id);

// 3 representative industries to cross-test
const TEST_INDUSTRIES = [
  'Technology / Software',
  'Financial Services / Banking',
  'Healthcare / Life Sciences',
];

describe('All 6 Archetypes: end-to-end model validation', () => {
  for (const archetypeId of ALL_ARCHETYPES) {
    const archetype = PROJECT_ARCHETYPES.find(a => a.id === archetypeId);

    describe(`${archetype.icon} ${archetype.label} (${archetypeId})`, () => {
      it('produces valid base scenario results', () => {
        const inputs = makeInputs(archetypeId);
        const r = runCalculations(inputs);

        // 1. Core structure exists
        expect(r.scenarios).toBeDefined();
        expect(r.scenarios.base).toBeDefined();
        expect(r.scenarios.conservative).toBeDefined();
        expect(r.scenarios.optimistic).toBeDefined();

        // 2. Base scenario metrics are finite numbers
        const base = r.scenarios.base;
        expect(typeof base.npv).toBe('number');
        expect(isFinite(base.npv)).toBe(true);
        expect(typeof base.irr).toBe('number');
        expect(typeof base.roic).toBe('number');
        expect(isFinite(base.roic)).toBe(true);
        expect(typeof base.paybackMonths).toBe('number');
        expect(base.paybackMonths).toBeGreaterThan(0);
        expect(base.paybackMonths).toBeLessThanOrEqual(61); // max sentinel

        // 3. Year-by-year projections exist and are complete
        expect(base.projections).toHaveLength(5);
        for (const yr of base.projections) {
          expect(yr.year).toBeGreaterThanOrEqual(1);
          expect(typeof yr.grossSavings).toBe('number');
          expect(typeof yr.ongoingCost).toBe('number');
          expect(typeof yr.netCashFlow).toBe('number');
          expect(typeof yr.netCumulative).toBe('number');
        }
      });

      it('conservative NPV <= base NPV <= optimistic NPV', () => {
        const inputs = makeInputs(archetypeId);
        const r = runCalculations(inputs);
        expect(r.scenarios.conservative.npv).toBeLessThanOrEqual(r.scenarios.base.npv);
        expect(r.scenarios.base.npv).toBeLessThanOrEqual(r.scenarios.optimistic.npv);
      });

      it('conservative payback >= base payback >= optimistic payback', () => {
        const inputs = makeInputs(archetypeId);
        const r = runCalculations(inputs);
        expect(r.scenarios.optimistic.paybackMonths).toBeLessThanOrEqual(r.scenarios.base.paybackMonths);
        expect(r.scenarios.base.paybackMonths).toBeLessThanOrEqual(r.scenarios.conservative.paybackMonths);
      });

      it('upfront investment is positive', () => {
        const inputs = makeInputs(archetypeId);
        const r = runCalculations(inputs);
        expect(r.upfrontInvestment).toBeGreaterThan(0);
      });

      it('current state calculations are reasonable', () => {
        const inputs = makeInputs(archetypeId);
        const r = runCalculations(inputs);
        expect(r.currentState.annualLaborCost).toBeGreaterThan(0);
        expect(r.currentState.weeklyHours).toBeGreaterThan(0);
        expect(r.currentState.totalCurrentCost).toBeGreaterThanOrEqual(r.currentState.annualLaborCost);
      });

      it('AI cost model is populated', () => {
        const inputs = makeInputs(archetypeId);
        const r = runCalculations(inputs);
        expect(r.aiCostModel).toBeDefined();
        expect(r.aiCostModel.implEngineers).toBeGreaterThanOrEqual(1);
        expect(r.aiCostModel.baseOngoingCost).toBeGreaterThan(0);
      });

      it('risk adjustments are applied', () => {
        const inputs = makeInputs(archetypeId);
        const r = runCalculations(inputs);
        expect(r.riskAdjustments).toBeDefined();
        expect(r.riskAdjustments.adjustedTimeline).toBeGreaterThan(0);
        expect(r.riskAdjustments.adoptionRate).toBeGreaterThan(0);
        expect(r.riskAdjustments.adoptionRate).toBeLessThanOrEqual(1);
        expect(r.riskAdjustments.riskMultiplier).toBeGreaterThan(0);
        expect(r.riskAdjustments.riskMultiplier).toBeLessThanOrEqual(1);
      });

      it('savings are computed', () => {
        const inputs = makeInputs(archetypeId);
        const r = runCalculations(inputs);
        expect(r.savings).toBeDefined();
        expect(typeof r.savings.grossAnnualSavings).toBe('number');
        expect(r.savings.grossAnnualSavings).toBeGreaterThan(0);
        expect(typeof r.savings.netAnnualSavings).toBe('number');
      });

      it('value pathways are populated', () => {
        const inputs = makeInputs(archetypeId);
        const r = runCalculations(inputs);
        expect(r.valuePathways).toBeDefined();
        expect(r.valuePathways.costEfficiency).toBeDefined();
        expect(typeof r.valuePathways.costEfficiency.annualRiskAdjusted).toBe('number');
        expect(r.valuePathways.capacityCreation).toBeDefined();
        expect(r.valuePathways.riskReduction).toBeDefined();
      });

      it('capital efficiency metrics are computed', () => {
        const inputs = makeInputs(archetypeId);
        const r = runCalculations(inputs);
        expect(r.capitalEfficiency).toBeDefined();
        expect(typeof r.capitalEfficiency.roic).toBe('number');
        expect(typeof r.capitalEfficiency.eva).toBe('number');
        expect(typeof r.capitalEfficiency.cashOnCash).toBe('number');
      });

      it('executive summary is populated', () => {
        const inputs = makeInputs(archetypeId);
        const r = runCalculations(inputs);
        expect(r.executiveSummary).toBeDefined();
        expect(r.executiveSummary.keyAssumptions).toBeDefined();
        expect(r.executiveSummary.topLevers).toBeDefined();
        expect(r.executiveSummary.topLevers.length).toBeGreaterThan(0);
      });

      it('sensitivity analysis has entries', () => {
        const inputs = makeInputs(archetypeId);
        const r = runCalculations(inputs);
        expect(r.extendedSensitivity).toBeDefined();
        expect(r.extendedSensitivity.length).toBeGreaterThan(0);
        expect(r.sensitivity).toBeDefined();
        expect(typeof r.sensitivity.lowerAdoption).toBe('number');
      });

      it('discount rate is between 5% and 20%', () => {
        const inputs = makeInputs(archetypeId);
        const r = runCalculations(inputs);
        expect(r.discountRate).toBeGreaterThanOrEqual(0.05);
        expect(r.discountRate).toBeLessThanOrEqual(0.20);
      });

      it('hidden costs are non-negative', () => {
        const inputs = makeInputs(archetypeId);
        const r = runCalculations(inputs);
        expect(r.hiddenCosts).toBeDefined();
        expect(r.hiddenCosts.changeManagement).toBeGreaterThanOrEqual(0);
        expect(r.hiddenCosts.dataCleanup).toBeGreaterThanOrEqual(0);
        expect(r.hiddenCosts.integrationTesting).toBeGreaterThanOrEqual(0);
        expect(r.hiddenCosts.productivityDip).toBeGreaterThanOrEqual(0);
      });

      // Cross-industry consistency
      for (const industry of TEST_INDUSTRIES) {
        it(`works with ${industry}`, () => {
          const inputs = makeInputs(archetypeId, industry);
          const r = runCalculations(inputs);
          expect(r.scenarios.base.npv).toBeDefined();
          expect(isFinite(r.scenarios.base.npv)).toBe(true);
          expect(r.scenarios.base.projections).toHaveLength(5);
        });
      }
    });
  }
});

// Summary table test — runs all and prints a formatted table
describe('Archetype Summary Table', () => {
  it('all 6 archetypes produce valid results (summary)', () => {
    const rows = [];

    for (const archetypeId of ALL_ARCHETYPES) {
      const archetype = PROJECT_ARCHETYPES.find(a => a.id === archetypeId);
      const inputs = makeInputs(archetypeId);
      const r = runCalculations(inputs);
      const base = r.scenarios.base;
      const cons = r.scenarios.conservative;
      const opt = r.scenarios.optimistic;

      rows.push({
        archetype: archetype.label,
        baseNPV: base.npv,
        consNPV: cons.npv,
        optNPV: opt.npv,
        baseIRR: base.irr,
        baseROIC: base.roic,
        payback: base.paybackMonths,
        upfront: r.upfrontInvestment,
        grossSavings: r.savings.grossAnnualSavings,
        netSavings: r.savings.netAnnualSavings,
      });

      // Validate key constraints
      expect(isFinite(base.npv)).toBe(true);
      expect(cons.npv).toBeLessThanOrEqual(base.npv);
      expect(base.npv).toBeLessThanOrEqual(opt.npv);
      expect(r.upfrontInvestment).toBeGreaterThan(0);
      expect(r.savings.grossAnnualSavings).toBeGreaterThan(0);
    }

    // Print summary table
    console.log('\n=== ALL 6 ARCHETYPES: MODEL OUTPUT SUMMARY ===');
    console.log('─'.repeat(140));
    console.log(
      'Archetype'.padEnd(38) +
      'Base NPV'.padStart(14) +
      'Cons NPV'.padStart(14) +
      'Opt NPV'.padStart(14) +
      'IRR'.padStart(8) +
      'ROIC'.padStart(8) +
      'Payback'.padStart(9) +
      'Upfront'.padStart(14) +
      'Gross Sav'.padStart(14) +
      'Net Sav'.padStart(14)
    );
    console.log('─'.repeat(140));

    for (const row of rows) {
      const fmt = (v) => {
        if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
        if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
        return `$${v.toFixed(0)}`;
      };
      console.log(
        row.archetype.padEnd(38) +
        fmt(row.baseNPV).padStart(14) +
        fmt(row.consNPV).padStart(14) +
        fmt(row.optNPV).padStart(14) +
        `${(row.baseIRR * 100).toFixed(0)}%`.padStart(8) +
        `${(row.baseROIC * 100).toFixed(0)}%`.padStart(8) +
        `${row.payback}mo`.padStart(9) +
        fmt(row.upfront).padStart(14) +
        fmt(row.grossSavings).padStart(14) +
        fmt(row.netSavings).padStart(14)
      );
    }
    console.log('─'.repeat(140));
    console.log(`✓ All ${rows.length} archetypes validated\n`);
  });
});
