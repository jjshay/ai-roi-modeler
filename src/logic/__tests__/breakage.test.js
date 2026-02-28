// Exhaustive breakage test: every archetype × industry × edge case
import { describe, it, expect } from 'vitest';
import { runCalculations } from '../calculations';
import { ARCHETYPE_INPUT_SCHEMAS, getArchetypeInputDefaults, mapArchetypeInputs, classifyArchetype } from '../archetypeInputs';
import { PROJECT_ARCHETYPES } from '../archetypes';

const INDUSTRIES = [
  'Technology / Software', 'Financial Services / Banking', 'Healthcare / Life Sciences',
  'Manufacturing / Industrial', 'Retail / E-Commerce', 'Professional Services / Consulting',
  'Media / Entertainment', 'Energy / Utilities', 'Government / Public Sector', 'Other',
];

const SIZES = [
  'Startup (1-50)', 'SMB (51-500)', 'Mid-Market (501-5,000)',
  'Enterprise (5,001-50,000)', 'Large Enterprise (50,000+)',
];

function checkScenario(result, label) {
  expect(result.scenarios).toBeDefined();
  for (const scenario of ['conservative', 'base', 'optimistic']) {
    const s = result.scenarios[scenario];
    expect(s, `${label}: ${scenario} missing`).toBeDefined();
    expect(s.npv, `${label}: ${scenario}.npv`).toSatisfy(v => typeof v === 'number' && isFinite(v));
    expect(s.roic, `${label}: ${scenario}.roic`).toSatisfy(v => typeof v === 'number' && isFinite(v));
    expect(s.irr, `${label}: ${scenario}.irr`).toSatisfy(v => typeof v === 'number'); // NaN valid when IRR doesn't converge
    expect(s.paybackMonths, `${label}: ${scenario}.paybackMonths`).toSatisfy(v => typeof v === 'number' && isFinite(v));
    expect(s.projections).toHaveLength(5);
    for (let yr = 0; yr < 5; yr++) {
      const p = s.projections[yr];
      expect(p.grossSavings, `${label}: ${scenario}.yr${yr+1}.grossSavings`).toSatisfy(v => typeof v === 'number' && isFinite(v));
      expect(p.netCashFlow, `${label}: ${scenario}.yr${yr+1}.netCashFlow`).toSatisfy(v => typeof v === 'number' && isFinite(v));
      expect(p.ongoingCost, `${label}: ${scenario}.yr${yr+1}.ongoingCost`).toSatisfy(v => typeof v === 'number' && isFinite(v));
    }
  }
  // Conservative NPV <= Base NPV <= Optimistic NPV
  expect(result.scenarios.conservative.npv).toBeLessThanOrEqual(result.scenarios.base.npv + 1);
  expect(result.scenarios.base.npv).toBeLessThanOrEqual(result.scenarios.optimistic.npv + 1);
}

// ============================================================
// 1. Every archetype × industry (base calculations)
// ============================================================
describe('Base calculations: every archetype × industry', () => {
  for (const arch of PROJECT_ARCHETYPES) {
    for (const ind of INDUSTRIES) {
      it(`${arch.id} × ${ind}`, () => {
        const result = runCalculations({
          teamSize: 15, avgSalary: 120000, hoursPerWeek: 25, errorRate: 0.10,
          industry: ind, processType: arch.sourceProcessTypes[0],
          projectArchetype: arch.id, companySize: 'Mid-Market (501-5,000)',
          changeReadiness: 3, dataReadiness: 3, execSponsor: true,
        });
        checkScenario(result, `${arch.id}×${ind}`);
        expect(result.upfrontInvestment).toBeGreaterThanOrEqual(0);
        expect(result.totalInvestment).toBeGreaterThanOrEqual(0);
      });
    }
  }
});

// ============================================================
// 2. Archetype inputs fed into calculations
// ============================================================
describe('Archetype inputs: every archetype × industry', () => {
  for (const schema of ARCHETYPE_INPUT_SCHEMAS) {
    for (const ind of INDUSTRIES.slice(0, 3)) {
      it(`${schema.id} × ${ind} with detail inputs`, () => {
        const defaults = getArchetypeInputDefaults(schema.id);
        const result = runCalculations({
          teamSize: 15, avgSalary: 120000, hoursPerWeek: 25, errorRate: 0.10,
          industry: ind, processType: 'Other',
          projectArchetype: schema.id, archetypeInputs: defaults,
          companySize: 'Mid-Market (501-5,000)',
          changeReadiness: 3, dataReadiness: 3, execSponsor: true,
        });
        checkScenario(result, `archInputs:${schema.id}×${ind}`);
      });
    }
  }
});

// ============================================================
// 3. Edge cases: extreme values
// ============================================================
describe('Edge cases: extreme input values', () => {
  const edgeCases = [
    { name: 'Min team (1 person)', inputs: { teamSize: 1, avgSalary: 10000, hoursPerWeek: 1 } },
    { name: 'Huge team (100K)', inputs: { teamSize: 100000, avgSalary: 500000, hoursPerWeek: 60 } },
    { name: 'Zero error rate', inputs: { teamSize: 10, errorRate: 0 } },
    { name: 'Max error rate (100%)', inputs: { teamSize: 10, errorRate: 1.0 } },
    { name: 'Zero tool costs', inputs: { teamSize: 10, currentToolCosts: 0 } },
    { name: 'Huge tool costs ($5M)', inputs: { teamSize: 10, currentToolCosts: 5000000 } },
    { name: 'Lowest readiness (1,1)', inputs: { teamSize: 10, changeReadiness: 1, dataReadiness: 1 } },
    { name: 'Highest readiness (5,5)', inputs: { teamSize: 10, changeReadiness: 5, dataReadiness: 5 } },
    { name: 'No exec sponsor', inputs: { teamSize: 10, execSponsor: false } },
    { name: 'Revenue $50M', inputs: { teamSize: 10, annualRevenue: 50000000, contributionMargin: 0.30 } },
    { name: 'Zero revenue', inputs: { teamSize: 10, annualRevenue: 0 } },
    { name: 'Agentic workflow', inputs: { teamSize: 10, isAgenticWorkflow: true } },
    { name: 'All value toggles ON', inputs: { teamSize: 10, includeCapacityValue: true, includeRiskReduction: true, includeRevenueAcceleration: true, annualRevenue: 10000000 } },
    { name: 'All value toggles OFF', inputs: { teamSize: 10, includeCapacityValue: false, includeRiskReduction: false, includeRevenueAcceleration: false } },
    { name: 'Very short timeline (1mo)', inputs: { teamSize: 10, expectedTimeline: 1 } },
    { name: 'Very long timeline (36mo)', inputs: { teamSize: 10, expectedTimeline: 36 } },
    { name: 'Startup size', inputs: { teamSize: 5, companySize: 'Startup (1-50)' } },
    { name: 'Large Enterprise', inputs: { teamSize: 500, companySize: 'Large Enterprise (50,000+)' } },
  ];

  for (const ec of edgeCases) {
    for (const arch of ['internal-process-automation', 'customer-facing-ai', 'revenue-growth-ai', 'it-operations-aiops']) {
      it(`${ec.name} × ${arch}`, () => {
        const result = runCalculations({
          avgSalary: 100000, hoursPerWeek: 20, errorRate: 0.10,
          industry: 'Technology / Software', processType: 'Document Processing',
          projectArchetype: arch, companySize: 'Mid-Market (501-5,000)',
          changeReadiness: 3, dataReadiness: 3, execSponsor: true,
          ...ec.inputs,
        });
        checkScenario(result, `edge:${ec.name}×${arch}`);
      });
    }
  }
});

// ============================================================
// 4. Archetype inputs with extreme values
// ============================================================
describe('Archetype mapping: extreme input values', () => {
  for (const schema of ARCHETYPE_INPUT_SCHEMAS) {
    it(`${schema.id}: all minimums`, () => {
      const minVals = {};
      for (const input of schema.inputs) minVals[input.key] = input.min;
      const overrides = mapArchetypeInputs(schema.id, minVals);
      for (const [key, val] of Object.entries(overrides)) {
        expect(val, `${schema.id}.min.${key}`).toSatisfy(v => typeof v === 'number' && isFinite(v));
      }
    });

    it(`${schema.id}: all maximums`, () => {
      const maxVals = {};
      for (const input of schema.inputs) maxVals[input.key] = input.max;
      const overrides = mapArchetypeInputs(schema.id, maxVals);
      for (const [key, val] of Object.entries(overrides)) {
        expect(val, `${schema.id}.max.${key}`).toSatisfy(v => typeof v === 'number' && isFinite(v));
      }
    });

    it(`${schema.id}: all zeros (where allowed)`, () => {
      const zeroVals = {};
      for (const input of schema.inputs) zeroVals[input.key] = input.min === 0 ? 0 : input.min;
      const overrides = mapArchetypeInputs(schema.id, zeroVals);
      for (const [key, val] of Object.entries(overrides)) {
        expect(val, `${schema.id}.zero.${key}`).toSatisfy(v => typeof v === 'number' && isFinite(v));
      }
    });
  }
});

// ============================================================
// 5. Full pipeline: archetype inputs → every company size
// ============================================================
describe('Full pipeline: archetype × company size', () => {
  for (const schema of ARCHETYPE_INPUT_SCHEMAS) {
    for (const size of SIZES) {
      it(`${schema.id} × ${size}`, () => {
        const defaults = getArchetypeInputDefaults(schema.id);
        const result = runCalculations({
          teamSize: 20, avgSalary: 120000, hoursPerWeek: 30, errorRate: 0.10,
          industry: 'Technology / Software', processType: 'Other',
          projectArchetype: schema.id, archetypeInputs: defaults,
          companySize: size, changeReadiness: 3, dataReadiness: 3, execSponsor: true,
        });
        checkScenario(result, `pipeline:${schema.id}×${size}`);
        expect(result.executiveSummary).toBeDefined();
        expect(result.executiveSummary.simpleROI).toSatisfy(v => typeof v === 'number' && isFinite(v));
      });
    }
  }
});

// ============================================================
// 6. Revenue for every archetype (displacement bug regression)
// ============================================================
describe('Revenue: every archetype with $50M revenue', () => {
  for (const arch of PROJECT_ARCHETYPES) {
    it(`${arch.id}: net revenue not excessively negative`, () => {
      const result = runCalculations({
        teamSize: 20, avgSalary: 150000, hoursPerWeek: 30, errorRate: 0.10,
        industry: 'Technology / Software', processType: arch.sourceProcessTypes[0],
        projectArchetype: arch.id, companySize: 'Mid-Market (501-5,000)',
        annualRevenue: 50000000, contributionMargin: 0.30,
        includeRevenueAcceleration: true,
        changeReadiness: 3, dataReadiness: 3, execSponsor: true,
      });
      expect(result.revenueEnablement).toBeDefined();
      if (result.revenueEnablement.eligible) {
        expect(result.revenueEnablement.totalAnnualRevenue).toSatisfy(v => typeof v === 'number' && isFinite(v));
        const gross = result.revenueEnablement.timeToMarket + result.revenueEnablement.customerExperience + result.revenueEnablement.newCapability;
        // totalAnnualRevenue = gross - displacement; should not be deeply negative
        expect(result.revenueEnablement.totalAnnualRevenue).toBeGreaterThanOrEqual(-gross * 2);
      }
    });
  }
});

// ============================================================
// 7. Revenue for every industry (displacement bug regression)
// ============================================================
describe('Revenue: every industry with revenue enabled', () => {
  for (const ind of INDUSTRIES) {
    it(`${ind}: net revenue not excessively negative`, () => {
      const result = runCalculations({
        teamSize: 20, avgSalary: 150000, hoursPerWeek: 30, errorRate: 0.10,
        industry: ind, processType: 'Customer Communication',
        projectArchetype: 'customer-facing-ai', companySize: 'Mid-Market (501-5,000)',
        annualRevenue: 50000000, contributionMargin: 0.30,
        includeRevenueAcceleration: true,
        changeReadiness: 3, dataReadiness: 3, execSponsor: true,
      });
      if (result.revenueEnablement.eligible) {
        expect(result.revenueEnablement.totalAnnualRevenue).toSatisfy(v => typeof v === 'number' && isFinite(v));
        const gross = result.revenueEnablement.timeToMarket + result.revenueEnablement.customerExperience + result.revenueEnablement.newCapability;
        expect(result.revenueEnablement.totalAnnualRevenue).toBeGreaterThanOrEqual(-gross * 2);
      }
    });
  }
});

// ============================================================
// 8. ROI consistency: ROIC matches definition
// ============================================================
describe('ROI consistency: ROIC matches formula', () => {
  for (const arch of PROJECT_ARCHETYPES.slice(0, 4)) {
    for (const ind of INDUSTRIES.slice(0, 3)) {
      it(`${arch.id} × ${ind}`, () => {
        const result = runCalculations({
          teamSize: 15, avgSalary: 120000, hoursPerWeek: 25, errorRate: 0.10,
          industry: ind, processType: arch.sourceProcessTypes[0],
          projectArchetype: arch.id, companySize: 'Mid-Market (501-5,000)',
          changeReadiness: 3, dataReadiness: 3, execSponsor: true,
        });
        const base = result.scenarios.base;
        const totalNet = base.projections.reduce((s, p) => s + p.netCashFlow, 0);
        const expectedROIC = result.totalInvestment > 0
          ? (totalNet - result.upfrontInvestment) / result.totalInvestment : 0;
        // Capped at [-1, 1]
        const capped = Math.max(Math.min(expectedROIC, 1.0), -1.0);
        expect(Math.abs(base.roic - capped)).toBeLessThan(0.02);
      });
    }
  }
});

// ============================================================
// 9. Classification scoring
// ============================================================
describe('Classification: each archetype profile matches itself', () => {
  const profiles = {
    'internal-process-automation': { primaryGoal: 1, customerFacing: 1, dataComplexity: 2, processVolume: 5, regulatoryBurden: 2, technicalTeam: 2 },
    'customer-facing-ai': { primaryGoal: 3, customerFacing: 5, dataComplexity: 3, processVolume: 4, regulatoryBurden: 2, technicalTeam: 3 },
    'risk-compliance-ai': { primaryGoal: 4, customerFacing: 1, dataComplexity: 3, processVolume: 4, regulatoryBurden: 5, technicalTeam: 3 },
    'software-engineering-ai': { primaryGoal: 5, customerFacing: 1, dataComplexity: 4, processVolume: 3, regulatoryBurden: 1, technicalTeam: 5 },
    'it-operations-aiops': { primaryGoal: 5, customerFacing: 1, dataComplexity: 4, processVolume: 5, regulatoryBurden: 2, technicalTeam: 5 },
  };

  for (const [id, answers] of Object.entries(profiles)) {
    it(`${id} scores highest for its own profile`, () => {
      const ranked = classifyArchetype(answers);
      expect(ranked[0].id).toBe(id);
      expect(ranked[0].score).toBe(30); // perfect match
    });
  }
});
