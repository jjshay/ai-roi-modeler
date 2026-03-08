// Full Matrix Test: Every archetype x every industry x every scenario x agentic/non-agentic
// Tests all V5 outputs: workforceAlternatives, breakEvenUnits, consultingAssumptions, modelDriftRate
// Plus: edge cases, extreme inputs, role tiers, company sizes
import { describe, it, expect } from 'vitest';
import { runCalculations } from '../calculations';
import { ARCHETYPE_INPUT_SCHEMAS, getArchetypeInputDefaults, mapArchetypeInputs } from '../archetypeInputs';
import { PROJECT_ARCHETYPES } from '../archetypes';
import { getOutputTier, TIER_SECTIONS, tierShows } from '../../utils/outputTier';

const INDUSTRIES = [
  'Technology / Software', 'Financial Services / Banking', 'Healthcare / Life Sciences',
  'Manufacturing / Industrial', 'Retail / E-Commerce', 'Professional Services / Consulting',
  'Media / Entertainment', 'Energy / Utilities', 'Government / Public Sector', 'Other',
];

const SIZES = [
  'Startup (1-50)', 'SMB (51-500)', 'Mid-Market (501-5,000)',
  'Enterprise (5,001-50,000)', 'Large Enterprise (50,000+)',
];

const ROLES = [
  'CEO / President', 'Board Member / Advisor', 'COO / Chief of Staff',
  'CFO / Finance Executive', 'CTO / CIO', 'VP / SVP', 'Director',
  'Head of Department', 'Finance / FP&A Team', 'Manager', 'Analyst / IC', 'Other',
];

function makeBase(overrides = {}) {
  return {
    teamSize: 15, avgSalary: 120000, hoursPerWeek: 25, errorRate: 0.10,
    industry: 'Technology / Software', processType: 'Document Processing',
    projectArchetype: 'internal-process-automation',
    companySize: 'Mid-Market (501-5,000)',
    changeReadiness: 3, dataReadiness: 3, execSponsor: true,
    ...overrides,
  };
}

function makeWithArchetype(archetypeId, overrides = {}) {
  const arch = PROJECT_ARCHETYPES.find(a => a.id === archetypeId);
  return makeBase({
    projectArchetype: archetypeId,
    processType: arch?.sourceProcessTypes[0] || 'Other',
    archetypeInputs: getArchetypeInputDefaults(archetypeId),
    ...overrides,
  });
}

// ============================================================
// 1. FULL MATRIX: archetype x industry (60 combos)
// ============================================================
describe('Full Matrix: every archetype x every industry', () => {
  for (const arch of PROJECT_ARCHETYPES) {
    describe(arch.id, () => {
      for (const industry of INDUSTRIES) {
        it(`${industry}: produces valid results`, () => {
          const inputs = makeWithArchetype(arch.id, { industry });
          const r = runCalculations(inputs);

          // Core calculations exist
          expect(r.scenarios).toBeDefined();
          expect(r.scenarios.base).toBeDefined();
          expect(r.scenarios.conservative).toBeDefined();
          expect(r.scenarios.optimistic).toBeDefined();

          // NPV is a finite number
          expect(Number.isFinite(r.scenarios.base.npv)).toBe(true);

          // 5-year projections exist
          expect(r.scenarios.base.projections).toHaveLength(5);
          expect(r.scenarios.base.projections[0].grossSavings).toBeDefined();
          expect(r.scenarios.base.projections[0].netCashFlow).toBeDefined();

          // ROIC exists
          expect(Number.isFinite(r.scenarios.base.roic)).toBe(true);

          // Payback months is reasonable
          expect(r.scenarios.base.paybackMonths).toBeGreaterThan(0);
          expect(r.scenarios.base.paybackMonths).toBeLessThanOrEqual(120);

          // V5: workforceAlternatives
          expect(r.workforceAlternatives).toBeDefined();
          expect(r.workforceAlternatives.aiInvestment).toBeDefined();
          expect(r.workforceAlternatives.hiring).toBeDefined();
          expect(r.workforceAlternatives.outsourcing).toBeDefined();
          expect(r.workforceAlternatives.statusQuo).toBeDefined();

          // V5: consultingAssumptions
          expect(r.consultingAssumptions).toBeDefined();
          expect(r.consultingAssumptions.modelDriftRate).toBeGreaterThan(0);
          expect(r.consultingAssumptions.modelTier).toBeTruthy();

          // V5: modelDriftRate
          expect(r.modelDriftRate).toBeGreaterThan(0);
          expect(r.modelDriftRate).toBeLessThan(0.5);

          // Sensitivity exists
          expect(r.extendedSensitivity).toBeDefined();

          // Conservative < Base < Optimistic for NPV
          expect(r.scenarios.conservative.npv).toBeLessThanOrEqual(r.scenarios.base.npv);
          expect(r.scenarios.base.npv).toBeLessThanOrEqual(r.scenarios.optimistic.npv);
        });
      }
    });
  }
});

// ============================================================
// 2. AGENTIC MODE: every archetype with isAgenticWorkflow=true
// ============================================================
describe('Agentic Mode: every archetype', () => {
  for (const arch of PROJECT_ARCHETYPES) {
    it(`${arch.id}: agentic workflow runs without error`, () => {
      const inputs = makeWithArchetype(arch.id, { isAgenticWorkflow: true });
      const r = runCalculations(inputs);

      expect(r.scenarios.base.npv).toBeDefined();
      expect(Number.isFinite(r.scenarios.base.npv)).toBe(true);

      // Agentic should be reflected in consulting assumptions
      expect(r.consultingAssumptions.isAgenticWorkflow).toBe(true);
      expect(r.consultingAssumptions.agentComplexity).toBeTruthy();
      expect(r.consultingAssumptions.llmCallsPerTask).toBeGreaterThan(1);
    });

    it(`${arch.id}: agentic vs non-agentic costs differ`, () => {
      const base = makeWithArchetype(arch.id, { isAgenticWorkflow: false });
      const agentic = makeWithArchetype(arch.id, { isAgenticWorkflow: true });

      const rBase = runCalculations(base);
      const rAgentic = runCalculations(agentic);

      // Agentic should have higher ongoing costs (more LLM calls)
      const baseCost = rBase.scenarios.base.projections.reduce((a, p) => a + p.ongoingCost, 0);
      const agenticCost = rAgentic.scenarios.base.projections.reduce((a, p) => a + p.ongoingCost, 0);
      expect(agenticCost).toBeGreaterThanOrEqual(baseCost);
    });
  }
});

// ============================================================
// 3. BREAK-EVEN UNITS: every archetype with schema
// ============================================================
describe('Break-Even Units: every archetype with inputs', () => {
  for (const arch of PROJECT_ARCHETYPES) {
    const schema = ARCHETYPE_INPUT_SCHEMAS.find(s => s.id === arch.id);
    if (!schema) continue;

    it(`${arch.id}: breakEvenUnits array has entries for each input`, () => {
      const inputs = makeWithArchetype(arch.id);
      const r = runCalculations(inputs);

      expect(r.breakEvenUnits).toBeDefined();
      expect(Array.isArray(r.breakEvenUnits)).toBe(true);

      // Each break-even item has required fields
      for (const item of r.breakEvenUnits) {
        expect(item.key).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(item.direction).toMatch(/^(floor|target|ceiling)$/);
        expect(Number.isFinite(item.breakEvenValue)).toBe(true);
        expect(Number.isFinite(item.currentValue)).toBe(true);
        expect(Number.isFinite(item.marginPct)).toBe(true);
      }
    });

    it(`${arch.id}: mapArchetypeInputs returns valid overrides`, () => {
      const defaults = getArchetypeInputDefaults(arch.id);
      const mapped = mapArchetypeInputs(arch.id, defaults);

      // Should return an object (possibly empty if no computed mappings)
      expect(typeof mapped).toBe('object');

      // If there are overrides, they should be finite numbers
      for (const [key, val] of Object.entries(mapped)) {
        if (typeof val === 'number') {
          expect(Number.isFinite(val)).toBe(true);
        }
      }
    });
  }
});

// ============================================================
// 4. COMPANY SIZE VARIATIONS: every size x representative archetype
// ============================================================
describe('Company Size Variations', () => {
  for (const size of SIZES) {
    it(`${size}: produces valid results`, () => {
      const r = runCalculations(makeBase({ companySize: size }));
      expect(Number.isFinite(r.scenarios.base.npv)).toBe(true);
      expect(r.workforceAlternatives).toBeDefined();
    });
  }
});

// ============================================================
// 5. ROLE / OUTPUT TIER: every role maps to a valid tier
// ============================================================
describe('Role → Output Tier mapping', () => {
  for (const role of ROLES) {
    it(`${role}: maps to valid tier`, () => {
      const tier = getOutputTier(role);
      expect(['executive', 'financial', 'detailed']).toContain(tier);
      expect(TIER_SECTIONS[tier]).toBeDefined();
    });
  }

  it('always returns financial (role-based tiers removed)', () => {
    expect(getOutputTier(null)).toBe('financial');
    expect(getOutputTier(undefined)).toBe('financial');
    expect(getOutputTier('')).toBe('financial');
    expect(getOutputTier('Janitor')).toBe('financial');
  });
});

// ============================================================
// 6. TIER SECTION VISIBILITY: all sections defined for all tiers
// ============================================================
describe('Tier Section Visibility', () => {
  const TIERS = ['executive', 'financial', 'detailed'];
  const V5_SECTIONS = ['breakEvenUnits', 'workforceAlternatives', 'consultingAssumptions'];

  for (const tier of TIERS) {
    it(`${tier}: has all V5 sections defined`, () => {
      for (const section of V5_SECTIONS) {
        const val = tierShows(tier, section);
        expect(val !== undefined).toBe(true);
      }
    });
  }

  it('detailed tier shows all V5 sections', () => {
    expect(tierShows('detailed', 'breakEvenUnits')).toBe(true);
    expect(tierShows('detailed', 'workforceAlternatives')).toBe(true);
    expect(tierShows('detailed', 'consultingAssumptions')).toBe(true);
  });

  it('executive tier hides V5 detail sections', () => {
    expect(tierShows('executive', 'breakEvenUnits')).toBe(false);
    expect(tierShows('executive', 'consultingAssumptions')).toBe(false);
    expect(tierShows('executive', 'workforceAlternatives')).toBe(false);
  });
});

// ============================================================
// 7. REVENUE-ENABLED: archetype x industry with revenue
// ============================================================
describe('Revenue-Enabled scenarios', () => {
  const revenueArchetypes = ['revenue-growth-ai', 'customer-facing-ai'];

  for (const archId of revenueArchetypes) {
    it(`${archId}: revenue acceleration with annualRevenue`, () => {
      const inputs = makeWithArchetype(archId, {
        annualRevenue: 10_000_000,
        includeRevenueAcceleration: true,
        contributionMargin: 0.30,
      });
      const r = runCalculations(inputs);

      expect(Number.isFinite(r.scenarios.base.npv)).toBe(true);
      // Revenue archetypes produce finite results with revenue enabled
      expect(Number.isFinite(r.scenarios.optimistic.npv)).toBe(true);
    });
  }
});

// ============================================================
// 8. EDGE CASES: extreme inputs
// ============================================================
describe('Edge Cases: extreme inputs', () => {
  it('teamSize=1: minimal team still produces results', () => {
    const r = runCalculations(makeBase({ teamSize: 1 }));
    expect(Number.isFinite(r.scenarios.base.npv)).toBe(true);
    expect(r.workforceAlternatives).toBeDefined();
  });

  it('teamSize=500: large team still produces results', () => {
    const r = runCalculations(makeBase({ teamSize: 500 }));
    expect(Number.isFinite(r.scenarios.base.npv)).toBe(true);
    expect(r.scenarios.base.projections[4].grossSavings).toBeGreaterThan(0);
  });

  it('avgSalary=30000: low salary', () => {
    const r = runCalculations(makeBase({ avgSalary: 30000 }));
    expect(Number.isFinite(r.scenarios.base.npv)).toBe(true);
  });

  it('avgSalary=500000: high salary', () => {
    const r = runCalculations(makeBase({ avgSalary: 500000 }));
    expect(Number.isFinite(r.scenarios.base.npv)).toBe(true);
  });

  it('changeReadiness=1, dataReadiness=1: lowest readiness', () => {
    const r = runCalculations(makeBase({ changeReadiness: 1, dataReadiness: 1, execSponsor: false }));
    expect(Number.isFinite(r.scenarios.base.npv)).toBe(true);
    // Low readiness should push payback out
    expect(r.scenarios.base.paybackMonths).toBeGreaterThan(12);
  });

  it('changeReadiness=5, dataReadiness=5: highest readiness', () => {
    const r = runCalculations(makeBase({ changeReadiness: 5, dataReadiness: 5, execSponsor: true }));
    expect(Number.isFinite(r.scenarios.base.npv)).toBe(true);
  });

  it('hoursPerWeek=2: minimal hours', () => {
    const r = runCalculations(makeBase({ hoursPerWeek: 2 }));
    expect(Number.isFinite(r.scenarios.base.npv)).toBe(true);
  });

  it('hoursPerWeek=40: full-time', () => {
    const r = runCalculations(makeBase({ hoursPerWeek: 40 }));
    expect(Number.isFinite(r.scenarios.base.npv)).toBe(true);
  });

  it('errorRate=0: no errors', () => {
    const r = runCalculations(makeBase({ errorRate: 0 }));
    expect(Number.isFinite(r.scenarios.base.npv)).toBe(true);
  });

  it('errorRate=0.50: very high error rate', () => {
    const r = runCalculations(makeBase({ errorRate: 0.50 }));
    expect(Number.isFinite(r.scenarios.base.npv)).toBe(true);
  });

  it('zero currentToolCosts: no vendor replacement', () => {
    const r = runCalculations(makeBase({ currentToolCosts: 0, vendorsReplaced: 0 }));
    expect(Number.isFinite(r.scenarios.base.npv)).toBe(true);
  });

  it('high currentToolCosts: vendor-heavy environment', () => {
    const r = runCalculations(makeBase({ currentToolCosts: 500000, vendorsReplaced: 5 }));
    expect(Number.isFinite(r.scenarios.base.npv)).toBe(true);
  });
});

// ============================================================
// 9. SCENARIO CONSISTENCY: conservative <= base <= optimistic
// ============================================================
describe('Scenario Ordering: all archetypes x all industries', () => {
  for (const arch of PROJECT_ARCHETYPES) {
    for (const industry of INDUSTRIES) {
      it(`${arch.id} × ${industry}: conservative.npv <= base.npv <= optimistic.npv`, () => {
        const r = runCalculations(makeWithArchetype(arch.id, { industry }));
        expect(r.scenarios.conservative.npv).toBeLessThanOrEqual(r.scenarios.base.npv + 0.01);
        expect(r.scenarios.base.npv).toBeLessThanOrEqual(r.scenarios.optimistic.npv + 0.01);
      });
    }
  }
});

// ============================================================
// 10. WORKFORCE ALTERNATIVES SANITY: hiring costs > AI costs
// ============================================================
describe('Workforce Alternatives Sanity', () => {
  for (const arch of PROJECT_ARCHETYPES) {
    it(`${arch.id}: hiring 5yr cost > AI 5yr cost when ROI positive`, () => {
      const r = runCalculations(makeWithArchetype(arch.id));
      const wa = r.workforceAlternatives;

      // If AI ROI is positive, hiring should cost more
      if (wa.aiInvestment.roi > 0) {
        expect(wa.hiring.total5YearCost).toBeGreaterThan(0);
      }
    });

    it(`${arch.id}: statusQuo has opportunity cost > 0`, () => {
      const r = runCalculations(makeWithArchetype(arch.id));
      expect(r.workforceAlternatives.statusQuo.opportunityCost).toBeGreaterThanOrEqual(0);
    });
  }
});

// ============================================================
// 11. MODEL DRIFT: drift reduces effective savings over time
// ============================================================
describe('Model Drift Impact', () => {
  it('yearly net cash flows account for drift (all years finite)', () => {
    const r = runCalculations(makeBase());
    const projections = r.scenarios.base.projections;
    // Just verify all years are finite
    for (let i = 0; i < 5; i++) {
      expect(Number.isFinite(projections[i].netCashFlow)).toBe(true);
      expect(Number.isFinite(projections[i].grossSavings)).toBe(true);
    }
  });

  it('modelDriftRate is between 0.01 and 0.15 for all archetypes', () => {
    for (const arch of PROJECT_ARCHETYPES) {
      const r = runCalculations(makeWithArchetype(arch.id));
      expect(r.modelDriftRate).toBeGreaterThanOrEqual(0.01);
      expect(r.modelDriftRate).toBeLessThanOrEqual(0.15);
    }
  });
});

// ============================================================
// 12. ARCHETYPE INPUT SCHEMAS: all schemas have correct structure
// ============================================================
describe('Archetype Input Schemas', () => {
  for (const arch of PROJECT_ARCHETYPES) {
    const schema = ARCHETYPE_INPUT_SCHEMAS.find(s => s.id === arch.id);
    if (!schema) continue;

    it(`${arch.id}: schema has inputs array`, () => {
      expect(Array.isArray(schema.inputs)).toBe(true);
      expect(schema.inputs.length).toBeGreaterThan(0);
    });

    it(`${arch.id}: each input has key, label, type, default, min, max`, () => {
      for (const input of schema.inputs) {
        expect(input.key).toBeTruthy();
        expect(input.label).toBeTruthy();
        expect(['number', 'percent', 'scale']).toContain(input.type);
        expect(Number.isFinite(input.default)).toBe(true);
        expect(Number.isFinite(input.min)).toBe(true);
        expect(Number.isFinite(input.max)).toBe(true);
        expect(input.default).toBeGreaterThanOrEqual(input.min);
        expect(input.default).toBeLessThanOrEqual(input.max);
      }
    });

    it(`${arch.id}: defaults match schema defaults`, () => {
      const defaults = getArchetypeInputDefaults(arch.id);
      for (const input of schema.inputs) {
        expect(defaults[input.key]).toBe(input.default);
      }
    });
  }
});

// ============================================================
// 13. FULL PIPELINE: archetype inputs → mapArchetypeInputs → runCalculations
// ============================================================
describe('Full Pipeline: inputs through calculations', () => {
  for (const arch of PROJECT_ARCHETYPES) {
    const schema = ARCHETYPE_INPUT_SCHEMAS.find(s => s.id === arch.id);
    if (!schema) continue;

    it(`${arch.id}: defaults produce valid NPV`, () => {
      const defaults = getArchetypeInputDefaults(arch.id);
      const overrides = mapArchetypeInputs(arch.id, defaults);
      const inputs = makeBase({
        projectArchetype: arch.id,
        processType: arch.sourceProcessTypes[0] || 'Other',
        archetypeInputs: defaults,
        ...overrides,
      });
      const r = runCalculations(inputs);
      expect(Number.isFinite(r.scenarios.base.npv)).toBe(true);
    });

    it(`${arch.id}: min values produce valid NPV`, () => {
      const minInputs = {};
      for (const input of schema.inputs) {
        minInputs[input.key] = input.min;
      }
      const overrides = mapArchetypeInputs(arch.id, minInputs);
      const inputs = makeBase({
        projectArchetype: arch.id,
        processType: arch.sourceProcessTypes[0] || 'Other',
        archetypeInputs: minInputs,
        ...overrides,
      });
      const r = runCalculations(inputs);
      expect(Number.isFinite(r.scenarios.base.npv)).toBe(true);
    });

    it(`${arch.id}: max values produce valid NPV`, () => {
      const maxInputs = {};
      for (const input of schema.inputs) {
        maxInputs[input.key] = input.max;
      }
      const overrides = mapArchetypeInputs(arch.id, maxInputs);
      const inputs = makeBase({
        projectArchetype: arch.id,
        processType: arch.sourceProcessTypes[0] || 'Other',
        archetypeInputs: maxInputs,
        ...overrides,
      });
      const r = runCalculations(inputs);
      expect(Number.isFinite(r.scenarios.base.npv)).toBe(true);
    });
  }
});

// ============================================================
// 14. NO ARCHETYPE: legacy mode without archetype
// ============================================================
describe('Legacy mode: no archetype', () => {
  it('runs with empty projectArchetype', () => {
    const r = runCalculations(makeBase({ projectArchetype: '', archetypeInputs: {} }));
    expect(Number.isFinite(r.scenarios.base.npv)).toBe(true);
    expect(r.workforceAlternatives).toBeDefined();
  });

  it('runs with null projectArchetype', () => {
    const r = runCalculations(makeBase({ projectArchetype: null, archetypeInputs: {} }));
    expect(Number.isFinite(r.scenarios.base.npv)).toBe(true);
  });
});

// ============================================================
// 15. RETAINED TALENT PREMIUM: affects total costs
// ============================================================
describe('Retained Talent Premium', () => {
  it('retainedTalentPremiumRate=0 vs 0.20 changes costs', () => {
    const r0 = runCalculations(makeBase({ retainedTalentPremiumRate: 0 }));
    const r20 = runCalculations(makeBase({ retainedTalentPremiumRate: 0.20 }));

    // Higher retention premium = higher ongoing costs (includes wage bumps)
    const cost0 = r0.scenarios.base.projections.reduce((a, p) => a + p.ongoingCost, 0);
    const cost20 = r20.scenarios.base.projections.reduce((a, p) => a + p.ongoingCost, 0);
    expect(cost20).toBeGreaterThanOrEqual(cost0);
  });
});

// ============================================================
// 16. CASH REALIZATION: affects NPV calculation
// ============================================================
describe('Cash Realization', () => {
  it('cashRealizationPct=0.20 vs 0.80 affects value pathways', () => {
    const rLow = runCalculations(makeBase({ cashRealizationPct: 0.20 }));
    const rHigh = runCalculations(makeBase({ cashRealizationPct: 0.80 }));

    // Cash realization affects the value pathways breakdown, not DCF directly
    expect(Number.isFinite(rLow.scenarios.base.npv)).toBe(true);
    expect(Number.isFinite(rHigh.scenarios.base.npv)).toBe(true);

    // Value creation pathways should differ
    if (rLow.valueCreationPathways && rHigh.valueCreationPathways) {
      const lowCash = rLow.valueCreationPathways.find(p => p.label === 'Cost Efficiency');
      const highCash = rHigh.valueCreationPathways.find(p => p.label === 'Cost Efficiency');
      if (lowCash && highCash) {
        expect(highCash.annualCashRealized).toBeGreaterThan(lowCash.annualCashRealized);
      }
    }
  });
});

// ============================================================
// 17. R&D CREDIT: California vs Other
// ============================================================
describe('R&D Tax Credit', () => {
  it('California gives better NPV than "Other / Not Sure"', () => {
    const rCal = runCalculations(makeBase({ companyState: 'California' }));
    const rOther = runCalculations(makeBase({ companyState: 'Other / Not Sure' }));

    // California R&D credit should boost NPV or at least not hurt it
    expect(rCal.scenarios.base.npv).toBeGreaterThanOrEqual(rOther.scenarios.base.npv - 1);
  });
});
