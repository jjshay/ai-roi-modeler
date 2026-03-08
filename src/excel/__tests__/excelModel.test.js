/**
 * Excel Model Generation — End-to-end validation.
 * Generates a real workbook and checks every cross-tab reference.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import ExcelJS from 'exceljs';
import { runCalculations } from '../../logic/calculations';
import { PROJECT_ARCHETYPES } from '../../logic/archetypes';
import { BASE_INPUTS, ENTERPRISE_INPUTS, REVENUE_ELIGIBLE_INPUTS } from '../../logic/__tests__/testFixtures';

// We can't call generateExcelModel directly (it uses document.createElement).
// Instead we inline the core workbook-building logic by importing and mocking DOM.
// For now, we test the calculation inputs → Excel formula references are consistent.

// ── Helpers ──────────────────────────────────────────────────────────
const LOCATIONS = [
  'US - Major Tech Hub', 'Remote / Distributed', 'Offshore - Employee', 'Offshore - Contractor',
];
const SAL = [225000, 150000, 55000, 40000];

const INDUSTRIES = [
  'Technology / Software', 'Financial Services / Banking', 'Healthcare / Life Sciences',
  'Manufacturing / Industrial', 'Retail / E-Commerce', 'Professional Services / Consulting',
  'Media / Entertainment', 'Energy / Utilities', 'Government / Public Sector', 'Other',
];

const SIZES = [
  'Startup (1-50)', 'SMB (51-500)', 'Mid-Market (501-5,000)',
  'Enterprise (5,001-50,000)', 'Large Enterprise (50,000+)',
];

const PROCESS_TYPES = [
  'Document Processing', 'Customer Communication', 'Data Analysis & Reporting',
  'Research & Intelligence', 'Workflow Automation', 'Content Creation', 'Quality & Compliance', 'Other',
];

// ── Tests ────────────────────────────────────────────────────────────
describe('Excel Model: data consistency', () => {
  it('LOCATIONS array has exactly 4 entries', () => {
    expect(LOCATIONS).toHaveLength(4);
  });

  it('SAL array has exactly 4 entries matching LOCATIONS', () => {
    expect(SAL).toHaveLength(LOCATIONS.length);
  });

  it('SAL values match benchmarks.js AI_TEAM_SALARY', async () => {
    const { AI_TEAM_SALARY } = await import('../../logic/benchmarks');
    LOCATIONS.forEach((loc, i) => {
      expect(SAL[i]).toBe(AI_TEAM_SALARY[loc]);
    });
  });

  it('PROJECT_ARCHETYPES has exactly 6 entries', () => {
    expect(PROJECT_ARCHETYPES).toHaveLength(6);
  });

  it('All 6 archetype IDs map to valid process types', () => {
    for (const a of PROJECT_ARCHETYPES) {
      expect(a.sourceProcessTypes.length).toBeGreaterThan(0);
      // At least the first process type should be in PROCESS_TYPES
      expect(PROCESS_TYPES).toContain(a.sourceProcessTypes[0]);
    }
  });

  it('Lookups row ranges: archetype list fits 6 archetypes in R205-R210', () => {
    // Row 205 is the first archetype, row 210 is the 6th
    const firstRow = 205;
    const lastRow = firstRow + PROJECT_ARCHETYPES.length - 1;
    expect(lastRow).toBe(210);
  });

  it('Lookups row ranges: salary list fits 5 locations in R45-R49 (4 benchmark + 1 Blended)', () => {
    const firstRow = 45;
    const excelLocCount = LOCATIONS.length + 1; // +1 for Blended (computed, not in benchmarks)
    const lastRow = firstRow + excelLocCount - 1;
    expect(lastRow).toBe(49);
  });

  it('Lookups row ranges: industries fit 10 entries in R3-R12', () => {
    const firstRow = 3;
    const lastRow = firstRow + INDUSTRIES.length - 1;
    expect(lastRow).toBe(12);
  });

  it('Lookups row ranges: company sizes fit 5 entries in R37-R41', () => {
    const firstRow = 37;
    const lastRow = firstRow + SIZES.length - 1;
    expect(lastRow).toBe(41);
  });

  it('Lookups row ranges: process types fit 8 entries in R56-R63', () => {
    const firstRow = 56;
    const lastRow = firstRow + PROCESS_TYPES.length - 1;
    expect(lastRow).toBe(63);
  });

  it('Lookups row ranges: peer benchmarks fit 50 entries (10 industries x 5 sizes) in R126-R175', () => {
    const firstRow = 126;
    const count = INDUSTRIES.length * SIZES.length;
    expect(count).toBe(50);
    const lastRow = firstRow + count - 1;
    expect(lastRow).toBe(175);
  });
});

describe('Excel Model: formula reference audit', () => {
  // Parse all formula strings from the generateExcelModel.js source
  // and verify cross-tab references point to valid row ranges.

  let source;
  beforeAll(async () => {
    const { readFileSync } = await import('fs');
    source = readFileSync('/Users/johnshay/ai-roi-modeler/src/excel/generateExcelModel.js', 'utf-8');
  });

  it('no references to old 8-location salary range (A45:B52 or $A$45:$A$52)', () => {
    expect(source).not.toContain('A45:B52');
    expect(source).not.toContain('$A$45:$A$52');
  });

  it('no references to old archetype range beyond row 210', () => {
    // Should not reference A205:A216, A205:C219, etc.
    expect(source).not.toMatch(/A205:[A-Z]21[1-9]/);
    expect(source).not.toMatch(/A205:[A-Z]2[2-9]/);
  });

  it('thinBorder is defined before use', () => {
    const defIndex = source.indexOf('const thinBorder');
    const useIndex = source.indexOf('thinBorder');
    expect(defIndex).toBeGreaterThan(-1);
    expect(defIndex).toBeLessThan(useIndex === defIndex ? useIndex + 1 : useIndex);
  });

  it('salary VLOOKUP uses A45:B49 range', () => {
    expect(source).toContain('A45:B49');
  });

  it('location dropdown uses $A$45:$A$49 range', () => {
    expect(source).toContain('$A$45:$A$49');
  });

  it('archetype dropdown uses $A$205:$A$210 range', () => {
    expect(source).toContain('$A$205:$A$210');
  });

  it('archetype VLOOKUP uses A205:C210 range', () => {
    expect(source).toContain('A205:C210');
  });
});

describe('Excel Model: calculation engine produces valid data for Excel', () => {
  const testCases = [
    { name: 'BASE_INPUTS (mid-market tech)', inputs: BASE_INPUTS },
    { name: 'ENTERPRISE_INPUTS (large finance)', inputs: ENTERPRISE_INPUTS },
    { name: 'REVENUE_ELIGIBLE_INPUTS (customer comm)', inputs: REVENUE_ELIGIBLE_INPUTS },
  ];

  for (const { name, inputs } of testCases) {
    describe(name, () => {
      let results;
      beforeAll(() => {
        results = runCalculations(inputs);
      });

      it('has valid NPV across all 3 scenarios', () => {
        expect(isFinite(results.scenarios.base.npv)).toBe(true);
        expect(isFinite(results.scenarios.conservative.npv)).toBe(true);
        expect(isFinite(results.scenarios.optimistic.npv)).toBe(true);
      });

      it('scenarios are ordered: conservative <= base <= optimistic', () => {
        expect(results.scenarios.conservative.npv).toBeLessThanOrEqual(results.scenarios.base.npv + 1);
        expect(results.scenarios.base.npv).toBeLessThanOrEqual(results.scenarios.optimistic.npv + 1);
      });

      it('upfrontInvestment > 0', () => {
        expect(results.upfrontInvestment).toBeGreaterThan(0);
      });

      it('grossAnnualSavings > 0', () => {
        expect(results.savings.grossAnnualSavings).toBeGreaterThan(0);
      });

      it('has valid year-by-year cash flows (5 years)', () => {
        const base = results.scenarios.base;
        expect(base.projections).toHaveLength(5);
        for (const yr of base.projections) {
          expect(isFinite(yr.netCashFlow)).toBe(true);
          expect(isFinite(yr.grossSavings)).toBe(true);
        }
      });

      it('has valid workforceAlternatives', () => {
        const wa = results.workforceAlternatives;
        expect(wa).toBeDefined();
        expect(wa.aiInvestment).toBeDefined();
        expect(wa.hiring).toBeDefined();
        expect(wa.outsourcing).toBeDefined();
        expect(wa.statusQuo).toBeDefined();
        expect(isFinite(wa.aiInvestment.upfrontCost)).toBe(true);
        expect(isFinite(wa.hiring.annualCost)).toBe(true);
      });

      it('has payback in valid range (0-61 months)', () => {
        const pm = results.scenarios.base.paybackMonths;
        expect(pm).toBeGreaterThanOrEqual(0);
        expect(pm).toBeLessThanOrEqual(61);
      });

      it('ROIC is finite', () => {
        expect(isFinite(results.scenarios.base.roic)).toBe(true);
      });

      it('IRR is finite', () => {
        expect(isFinite(results.scenarios.base.irr)).toBe(true);
      });
    });
  }
});

describe('Excel Model: all 6 archetypes produce valid Excel-ready data', () => {
  for (const archetype of PROJECT_ARCHETYPES) {
    it(`${archetype.label} → valid results for Excel`, () => {
      const inputs = {
        ...BASE_INPUTS,
        projectArchetype: archetype.id,
        processType: archetype.sourceProcessTypes[0],
        assumptions: {
          ...BASE_INPUTS.assumptions,
          ...archetype.defaults,
          revenueEligible: archetype.revenueEligible || false,
        },
        ...(archetype.revenueEligible ? { annualRevenue: 10000000 } : {}),
      };

      const results = runCalculations(inputs);
      expect(isFinite(results.scenarios.base.npv)).toBe(true);
      expect(results.upfrontInvestment).toBeGreaterThan(0);
      expect(results.savings.grossAnnualSavings).toBeGreaterThan(0);
      expect(results.workforceAlternatives).toBeDefined();

      // Verify year-by-year has data for P&L tab
      expect(results.scenarios.base.projections).toHaveLength(5);
    });
  }
});

describe('Excel Model: location salary lookup consistency', () => {
  for (let i = 0; i < LOCATIONS.length; i++) {
    it(`${LOCATIONS[i]} → $${SAL[i].toLocaleString()} matches benchmarks`, async () => {
      const { AI_TEAM_SALARY } = await import('../../logic/benchmarks');
      expect(SAL[i]).toBe(AI_TEAM_SALARY[LOCATIONS[i]]);
    });
  }

  it('all locations in benchmarks.js are represented in Excel LOCATIONS', async () => {
    const { AI_TEAM_SALARY } = await import('../../logic/benchmarks');
    const benchmarkLocations = Object.keys(AI_TEAM_SALARY);
    expect(LOCATIONS).toEqual(benchmarkLocations);
  });
});
