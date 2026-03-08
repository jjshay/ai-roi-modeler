// V5 Feature Tests: Workforce Alternatives, Break-Even Units, Token Economics,
// Model Drift, Consulting Assumptions — every archetype × scenario
import { describe, it, expect } from 'vitest';
import { runCalculations } from '../calculations';
import { ARCHETYPE_INPUT_SCHEMAS, getArchetypeInputDefaults, mapArchetypeInputs } from '../archetypeInputs';
import { PROJECT_ARCHETYPES } from '../archetypes';
import {
  MODEL_DRIFT_RATE,
  CAPITAL_ALLOCATION,
  TOKEN_PROFILES,
  MODEL_TIERS,
  AGENT_COST_PROFILES,
} from '../benchmarks';

const INDUSTRIES = [
  'Technology / Software', 'Financial Services / Banking', 'Healthcare / Life Sciences',
  'Manufacturing / Industrial', 'Retail / E-Commerce', 'Professional Services / Consulting',
  'Media / Entertainment', 'Energy / Utilities', 'Government / Public Sector', 'Other',
];

const SIZES = [
  'Startup (1-50)', 'SMB (51-500)', 'Mid-Market (501-5,000)',
  'Enterprise (5,001-50,000)', 'Large Enterprise (50,000+)',
];

function makeInputs(overrides = {}) {
  return {
    teamSize: 15, avgSalary: 120000, hoursPerWeek: 25, errorRate: 0.10,
    industry: 'Technology / Software', processType: 'Document Processing',
    projectArchetype: 'internal-process-automation',
    companySize: 'Mid-Market (501-5,000)',
    changeReadiness: 3, dataReadiness: 3, execSponsor: true,
    ...overrides,
  };
}

function makeInputsWithArchetypeDefaults(archetypeId, overrides = {}) {
  const arch = PROJECT_ARCHETYPES.find(a => a.id === archetypeId);
  return makeInputs({
    projectArchetype: archetypeId,
    processType: arch?.sourceProcessTypes[0] || 'Other',
    archetypeInputs: getArchetypeInputDefaults(archetypeId),
    ...overrides,
  });
}

// ============================================================
// 1. Workforce Alternatives: every archetype
// ============================================================
describe('Workforce Alternatives: every archetype', () => {
  for (const arch of PROJECT_ARCHETYPES) {
    it(`${arch.id}: produces valid workforce alternatives`, () => {
      const result = runCalculations(makeInputs({
        projectArchetype: arch.id,
        processType: arch.sourceProcessTypes[0],
      }));

      const wa = result.workforceAlternatives;
      expect(wa).toBeDefined();

      // AI Investment option
      expect(wa.aiInvestment).toBeDefined();
      expect(wa.aiInvestment.label).toBe('AI Automation');
      expect(wa.aiInvestment.upfrontCost).toSatisfy(v => typeof v === 'number' && isFinite(v) && v >= 0);
      expect(wa.aiInvestment.annual5YearNet).toSatisfy(v => typeof v === 'number' && isFinite(v));
      expect(wa.aiInvestment.roi).toSatisfy(v => typeof v === 'number' && isFinite(v));
      expect(wa.aiInvestment.paybackMonths).toSatisfy(v => typeof v === 'number' && isFinite(v));
      expect(wa.aiInvestment.riskLevel).toBe('Medium');

      // Hiring option
      expect(wa.hiring).toBeDefined();
      expect(wa.hiring.ftesNeeded).toBeGreaterThanOrEqual(1);
      expect(wa.hiring.annualCost).toBeGreaterThan(0);
      expect(wa.hiring.total5YearCost).toBeGreaterThan(0);
      expect(wa.hiring.rampMonths).toBe(CAPITAL_ALLOCATION.HIRING_RAMP_MONTHS);

      // Outsourcing option
      expect(wa.outsourcing).toBeDefined();
      expect(wa.outsourcing.annualCost).toSatisfy(v => typeof v === 'number' && isFinite(v));
      expect(wa.outsourcing.annualSavings).toSatisfy(v => typeof v === 'number' && isFinite(v));
      expect(wa.outsourcing.transitionMonths).toBe(CAPITAL_ALLOCATION.BPO_TRANSITION_MONTHS);

      // Status Quo option
      expect(wa.statusQuo).toBeDefined();
      expect(wa.statusQuo.annualCost).toBeGreaterThan(0);
      expect(wa.statusQuo.total5YearCost).toBeGreaterThan(0);
      expect(wa.statusQuo.opportunityCost).toSatisfy(v => typeof v === 'number' && isFinite(v));
      expect(wa.statusQuo.competitiveErosionRate).toBe(CAPITAL_ALLOCATION.STATUS_QUO_COMPETITIVE_EROSION);
    });
  }
});

// ============================================================
// 2. Workforce Alternatives: hiring scales with team cost
// ============================================================
describe('Workforce Alternatives: hiring scales correctly', () => {
  it('hiring cost increases with salary', () => {
    const r1 = runCalculations(makeInputs({ avgSalary: 80000 }));
    const r2 = runCalculations(makeInputs({ avgSalary: 160000 }));
    expect(r2.workforceAlternatives.hiring.annualCost)
      .toBeGreaterThan(r1.workforceAlternatives.hiring.annualCost);
  });

  it('status quo 5-year cost exceeds 5× annual due to wage inflation + erosion', () => {
    const r = runCalculations(makeInputs());
    const wa = r.workforceAlternatives.statusQuo;
    expect(wa.total5YearCost).toBeGreaterThan(wa.annualCost * 5);
  });
});

// ============================================================
// 3. Break-Even Units: every archetype with archetype inputs
// ============================================================
describe('Break-Even Units: every archetype with defaults', () => {
  for (const schema of ARCHETYPE_INPUT_SCHEMAS) {
    it(`${schema.id}: produces valid break-even units`, () => {
      const result = runCalculations(makeInputsWithArchetypeDefaults(schema.id));
      const be = result.breakEvenUnits;

      // breakEvenUnits can be null if no inputs have meaningful break-even
      if (be === null) return;

      expect(Array.isArray(be)).toBe(true);
      expect(be.length).toBeGreaterThan(0);

      for (const item of be) {
        expect(item.key).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(item.type).toMatch(/^(number|percent|scale)$/);
        expect(item.currentValue).toSatisfy(v => typeof v === 'number' && isFinite(v));
        expect(item.breakEvenValue).toSatisfy(v => typeof v === 'number' && isFinite(v));
        expect(item.marginPct).toSatisfy(v => typeof v === 'number' && isFinite(v));
        expect(item.direction).toMatch(/^(floor|target)$/);
      }
    });
  }
});

// ============================================================
// 4. Break-Even Units: direction is consistent with NPV sign
// ============================================================
describe('Break-Even Units: direction matches NPV sign', () => {
  for (const schema of ARCHETYPE_INPUT_SCHEMAS.slice(0, 5)) {
    it(`${schema.id}: floor when NPV > 0, target when NPV < 0`, () => {
      const result = runCalculations(makeInputsWithArchetypeDefaults(schema.id));
      const be = result.breakEvenUnits;
      if (!be) return;

      const baseNPV = result.scenarios.base.npv;
      const expectedDirection = baseNPV >= 0 ? 'floor' : 'target';
      for (const item of be) {
        expect(item.direction).toBe(expectedDirection);
      }
    });
  }
});

// ============================================================
// 5. Break-Even Units: null without archetype inputs
// ============================================================
describe('Break-Even Units: null without archetype inputs', () => {
  it('returns null when no archetypeInputs provided', () => {
    const result = runCalculations(makeInputs());
    expect(result.breakEvenUnits).toBeNull();
  });

  it('returns null when no projectArchetype', () => {
    const result = runCalculations(makeInputs({
      projectArchetype: undefined,
      archetypeInputs: { docVolumePerDay: 500 },
    }));
    expect(result.breakEvenUnits).toBeNull();
  });
});

// ============================================================
// 6. Consulting Assumptions: every archetype
// ============================================================
describe('Consulting Assumptions: present for every archetype', () => {
  for (const arch of PROJECT_ARCHETYPES) {
    it(`${arch.id}: consultingAssumptions structure is complete`, () => {
      const result = runCalculations(makeInputs({
        projectArchetype: arch.id,
        processType: arch.sourceProcessTypes[0],
      }));

      const ca = result.consultingAssumptions;
      expect(ca).toBeDefined();
      expect(ca.modelDriftRate).toBe(MODEL_DRIFT_RATE);
      expect(ca.modelTier).toMatch(/^(economy|standard|premium)$/);
      expect(typeof ca.useTokenModel).toBe('boolean');
      expect(typeof ca.isAgenticWorkflow).toBe('boolean');
      expect(ca.llmCallsPerTask).toSatisfy(v => typeof v === 'number' && v > 0);
      expect(ca.promptCachingRate).toSatisfy(v => typeof v === 'number' && v >= 0 && v <= 1);
    });
  }
});

// ============================================================
// 7. Model Drift Rate: returned and correct
// ============================================================
describe('Model Drift: global rate and application', () => {
  it('default drift rate matches benchmark', () => {
    const result = runCalculations(makeInputs());
    expect(result.modelDriftRate).toBe(MODEL_DRIFT_RATE);
  });

  it('drift reduces year-5 gross savings compared to no-drift scenario', () => {
    const withDrift = runCalculations(makeInputs());
    const withoutDrift = runCalculations(makeInputs({
      assumptions: { modelDriftRate: 0 },
    }));
    // Year 5 gross savings with drift should be less
    const y5Drift = withDrift.scenarios.base.projections[4].grossSavings;
    const y5NoDrift = withoutDrift.scenarios.base.projections[4].grossSavings;
    expect(y5Drift).toBeLessThanOrEqual(y5NoDrift + 1); // +1 for rounding
  });

  it('drift has no effect on year 1 (drift^0 = 1)', () => {
    const withDrift = runCalculations(makeInputs());
    const withoutDrift = runCalculations(makeInputs({
      assumptions: { modelDriftRate: 0 },
    }));
    const y1Drift = withDrift.scenarios.base.projections[0].grossSavings;
    const y1NoDrift = withoutDrift.scenarios.base.projections[0].grossSavings;
    expect(y1Drift).toBeCloseTo(y1NoDrift, 0);
  });

  it('higher drift rate produces lower 5-year NPV', () => {
    const lowDrift = runCalculations(makeInputs({ assumptions: { modelDriftRate: 0.01 } }));
    const highDrift = runCalculations(makeInputs({ assumptions: { modelDriftRate: 0.10 } }));
    expect(highDrift.scenarios.base.npv).toBeLessThan(lowDrift.scenarios.base.npv);
  });
});

// ============================================================
// 8. Agentic workflow: agent complexity affects costs
// ============================================================
describe('Agentic Workflow: flag changes cost model', () => {
  it('agentic adds to ongoing costs', () => {
    const standard = runCalculations(makeInputs({ isAgenticWorkflow: false }));
    const agentic = runCalculations(makeInputs({ isAgenticWorkflow: true }));
    // Agentic should have higher ongoing costs in year 1
    expect(agentic.scenarios.base.projections[0].ongoingCost)
      .toBeGreaterThanOrEqual(standard.scenarios.base.projections[0].ongoingCost);
  });

  it('consulting assumptions reflect agentic flag', () => {
    const result = runCalculations(makeInputs({ isAgenticWorkflow: true }));
    expect(result.consultingAssumptions.isAgenticWorkflow).toBe(true);
    expect(result.consultingAssumptions.agentComplexity).toBeTruthy();
  });

  it('non-agentic has null agent complexity', () => {
    const result = runCalculations(makeInputs({ isAgenticWorkflow: false }));
    expect(result.consultingAssumptions.isAgenticWorkflow).toBe(false);
    expect(result.consultingAssumptions.agentComplexity).toBeNull();
  });
});

// ============================================================
// 9. Full V5 pipeline: every archetype × every industry × with archetype inputs
// ============================================================
describe('Full V5 pipeline: archetype inputs → V5 outputs', () => {
  for (const schema of ARCHETYPE_INPUT_SCHEMAS) {
    for (const ind of INDUSTRIES.slice(0, 3)) {
      it(`${schema.id} × ${ind}: all V5 outputs present`, () => {
        const result = runCalculations(makeInputsWithArchetypeDefaults(schema.id, { industry: ind }));

        // Workforce alternatives always present
        expect(result.workforceAlternatives).toBeDefined();
        expect(result.workforceAlternatives.aiInvestment).toBeDefined();
        expect(result.workforceAlternatives.hiring).toBeDefined();
        expect(result.workforceAlternatives.outsourcing).toBeDefined();
        expect(result.workforceAlternatives.statusQuo).toBeDefined();

        // Consulting assumptions always present
        expect(result.consultingAssumptions).toBeDefined();
        expect(result.modelDriftRate).toBeDefined();

        // Break-even units may or may not be present
        if (result.breakEvenUnits) {
          expect(Array.isArray(result.breakEvenUnits)).toBe(true);
          for (const item of result.breakEvenUnits) {
            expect(typeof item.marginPct).toBe('number');
          }
        }
      });
    }
  }
});

// ============================================================
// 10. V5 with revenue-eligible archetypes
// ============================================================
describe('Revenue-eligible archetypes: V5 outputs with revenue', () => {
  const revenueArchetypes = PROJECT_ARCHETYPES.filter(a =>
    ['customer-facing-ai', 'revenue-growth-ai'].includes(a.id)
  );

  for (const arch of revenueArchetypes) {
    it(`${arch.id}: V5 outputs with $50M revenue`, () => {
      const result = runCalculations(makeInputsWithArchetypeDefaults(arch.id, {
        annualRevenue: 50000000,
        contributionMargin: 0.30,
        includeRevenueAcceleration: true,
      }));

      expect(result.workforceAlternatives).toBeDefined();
      expect(result.consultingAssumptions).toBeDefined();
      // Revenue eligible archetypes should still produce valid workforce alternatives
      expect(result.workforceAlternatives.aiInvestment.annual5YearNet).toSatisfy(
        v => typeof v === 'number' && isFinite(v)
      );
    });
  }
});

// ============================================================
// 11. Every archetype × every company size with V5
// ============================================================
describe('V5 outputs: every archetype × company size', () => {
  for (const schema of ARCHETYPE_INPUT_SCHEMAS) {
    for (const size of SIZES) {
      it(`${schema.id} × ${size}`, () => {
        const result = runCalculations(makeInputsWithArchetypeDefaults(schema.id, {
          companySize: size,
        }));

        // All V5 outputs should be present and valid
        expect(result.workforceAlternatives).toBeDefined();
        expect(result.consultingAssumptions).toBeDefined();
        expect(result.modelDriftRate).toBe(MODEL_DRIFT_RATE);

        // Scenarios should still be valid
        for (const scenario of ['conservative', 'base', 'optimistic']) {
          const s = result.scenarios[scenario];
          expect(s.npv).toSatisfy(v => typeof v === 'number' && isFinite(v));
          expect(s.projections).toHaveLength(5);
        }
      });
    }
  }
});

// ============================================================
// 12. Edge cases with V5 outputs
// ============================================================
describe('V5 edge cases', () => {
  const edgeCases = [
    { name: '1-person team', inputs: { teamSize: 1, avgSalary: 50000 } },
    { name: '500-person team', inputs: { teamSize: 500, avgSalary: 200000 } },
    { name: 'Zero error rate', inputs: { errorRate: 0 } },
    { name: 'Max error rate', inputs: { errorRate: 1.0 } },
    { name: 'Lowest readiness', inputs: { changeReadiness: 1, dataReadiness: 1, execSponsor: false } },
    { name: 'Highest readiness', inputs: { changeReadiness: 5, dataReadiness: 5, execSponsor: true } },
    { name: 'Agentic + high drift', inputs: { isAgenticWorkflow: true, assumptions: { modelDriftRate: 0.15 } } },
    { name: 'Zero drift', inputs: { assumptions: { modelDriftRate: 0 } } },
  ];

  for (const ec of edgeCases) {
    for (const archId of ['internal-process-automation', 'customer-facing-ai', 'data-analytics-automation']) {
      it(`${ec.name} × ${archId}`, () => {
        const result = runCalculations(makeInputsWithArchetypeDefaults(archId, ec.inputs));

        expect(result.workforceAlternatives).toBeDefined();
        expect(result.consultingAssumptions).toBeDefined();

        // No NaN or Infinity in workforce alternatives
        const wa = result.workforceAlternatives;
        expect(wa.aiInvestment.upfrontCost).toSatisfy(v => typeof v === 'number' && isFinite(v));
        expect(wa.hiring.annualCost).toSatisfy(v => typeof v === 'number' && isFinite(v));
        expect(wa.outsourcing.annualCost).toSatisfy(v => typeof v === 'number' && isFinite(v));
        expect(wa.statusQuo.total5YearCost).toSatisfy(v => typeof v === 'number' && isFinite(v));
      });
    }
  }
});

// ============================================================
// 13. Token model tiers exist in benchmarks
// ============================================================
describe('Token economics benchmarks', () => {
  it('TOKEN_PROFILES has entries for all process types', () => {
    expect(TOKEN_PROFILES['Document Processing']).toBeDefined();
    expect(TOKEN_PROFILES['Customer Communication']).toBeDefined();
    expect(TOKEN_PROFILES['Other']).toBeDefined();
  });

  it('each profile has avgInput and avgOutput', () => {
    for (const [key, profile] of Object.entries(TOKEN_PROFILES)) {
      expect(profile.avgInput, `${key}.avgInput`).toBeGreaterThan(0);
      expect(profile.avgOutput, `${key}.avgOutput`).toBeGreaterThan(0);
    }
  });

  it('MODEL_TIERS has economy, standard, premium', () => {
    expect(MODEL_TIERS.economy).toBeDefined();
    expect(MODEL_TIERS.standard).toBeDefined();
    expect(MODEL_TIERS.premium).toBeDefined();
  });

  it('premium costs more than standard, standard more than economy', () => {
    expect(MODEL_TIERS.premium.inputPer1M).toBeGreaterThan(MODEL_TIERS.standard.inputPer1M);
    expect(MODEL_TIERS.standard.inputPer1M).toBeGreaterThan(MODEL_TIERS.economy.inputPer1M);
  });
});

// ============================================================
// 14. Agent cost profiles exist
// ============================================================
describe('Agent cost benchmarks', () => {
  it('AGENT_COST_PROFILES has simple, moderate, complex, autonomous', () => {
    expect(AGENT_COST_PROFILES.simple).toBeDefined();
    expect(AGENT_COST_PROFILES.moderate).toBeDefined();
    expect(AGENT_COST_PROFILES.complex).toBeDefined();
    expect(AGENT_COST_PROFILES.autonomous).toBeDefined();
  });

  it('each profile has llmCallsPerTask and toolCallsPerTask', () => {
    for (const tier of ['simple', 'moderate', 'complex', 'autonomous']) {
      expect(AGENT_COST_PROFILES[tier].llmCallsPerTask).toBeGreaterThan(0);
      expect(AGENT_COST_PROFILES[tier].toolCallsPerTask).toSatisfy(v => typeof v === 'number' && v >= 0);
    }
  });

  it('complex agents require more LLM calls than simple', () => {
    expect(AGENT_COST_PROFILES.complex.llmCallsPerTask)
      .toBeGreaterThan(AGENT_COST_PROFILES.simple.llmCallsPerTask);
  });
});

// ============================================================
// 15. Capital allocation benchmarks
// ============================================================
describe('Capital allocation benchmarks', () => {
  it('CAPITAL_ALLOCATION has all required keys', () => {
    expect(CAPITAL_ALLOCATION.HIRING_FULLY_LOADED_MULTIPLIER).toBeGreaterThan(1);
    expect(CAPITAL_ALLOCATION.HIRING_ANNUAL_TURNOVER).toBeGreaterThan(0);
    expect(CAPITAL_ALLOCATION.HIRING_REPLACEMENT_COST_RATE).toBeGreaterThan(0);
    expect(CAPITAL_ALLOCATION.HIRING_RAMP_MONTHS).toBeGreaterThan(0);
    expect(CAPITAL_ALLOCATION.BPO_COST_RATIO).toBeGreaterThan(0);
    expect(CAPITAL_ALLOCATION.BPO_COST_RATIO).toBeLessThan(1);
    expect(CAPITAL_ALLOCATION.BPO_MANAGEMENT_OVERHEAD).toBeGreaterThan(0);
    expect(CAPITAL_ALLOCATION.BPO_QUALITY_DISCOUNT).toBeGreaterThan(0);
    expect(CAPITAL_ALLOCATION.BPO_QUALITY_DISCOUNT).toBeLessThan(1);
    expect(CAPITAL_ALLOCATION.BPO_TRANSITION_MONTHS).toBeGreaterThan(0);
    expect(CAPITAL_ALLOCATION.STATUS_QUO_COMPETITIVE_EROSION).toBeGreaterThan(0);
  });
});

// ============================================================
// 16. mapArchetypeInputs: every archetype produces valid overrides
// ============================================================
describe('mapArchetypeInputs: complete override validation', () => {
  for (const schema of ARCHETYPE_INPUT_SCHEMAS) {
    it(`${schema.id}: default inputs produce valid DCF overrides`, () => {
      const defaults = getArchetypeInputDefaults(schema.id);
      const overrides = mapArchetypeInputs(schema.id, defaults);

      expect(overrides).toBeDefined();
      expect(typeof overrides).toBe('object');

      // All override values should be finite numbers
      for (const [key, value] of Object.entries(overrides)) {
        expect(value, `${schema.id}.${key}`).toSatisfy(v => typeof v === 'number' && isFinite(v));
      }

      // Should always produce automationPotential and hoursPerWeek
      expect(overrides.automationPotential).toBeGreaterThan(0);
      expect(overrides.automationPotential).toBeLessThanOrEqual(1);
      expect(overrides.hoursPerWeek).toBeGreaterThan(0);
    });
  }
});
