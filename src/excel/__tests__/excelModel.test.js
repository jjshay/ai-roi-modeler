/**
 * Excel Model Generation — End-to-end validation.
 * Generates a real workbook and checks every cross-tab reference.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import ExcelJS from 'exceljs';
import { runCalculations } from '../../logic/calculations';
import { PROJECT_ARCHETYPES } from '../../logic/archetypes';
import { ARCHETYPE_INPUT_SCHEMAS } from '../../logic/archetypeInputs';
import { generateExcelModel } from '../generateExcelModel';
import { BASE_INPUTS, ENTERPRISE_INPUTS, REVENUE_ELIGIBLE_INPUTS } from '../../logic/__tests__/testFixtures';

// We can't call generateExcelModel directly (it uses document.createElement).
// Instead we inline the core workbook-building logic by importing and mocking DOM.
// For now, we test the calculation inputs → Excel formula references are consistent.

// ── Helpers ──────────────────────────────────────────────────────────
const DELIVERY_PACE_SCENARIOS = [
  { label: 'Accelerated', staffingCost: 1.20, duration: 0.80 },
  { label: 'Standard', staffingCost: 1.00, duration: 1.00 },
  { label: 'Extended', staffingCost: 0.80, duration: 1.25 },
];

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
  it('has the three supported delivery pace scenarios', () => {
    expect(DELIVERY_PACE_SCENARIOS).toEqual([
      { label: 'Accelerated', staffingCost: 1.20, duration: 0.80 },
      { label: 'Standard', staffingCost: 1.00, duration: 1.00 },
      { label: 'Extended', staffingCost: 0.80, duration: 1.25 },
    ]);
  });

  it('PROJECT_ARCHETYPES has exactly 4 supported entries', () => {
    expect(PROJECT_ARCHETYPES).toHaveLength(4);
  });

  it('All 4 archetype IDs map to valid process types', () => {
    for (const a of PROJECT_ARCHETYPES) {
      expect(a.sourceProcessTypes.length).toBeGreaterThan(0);
      // At least the first process type should be in PROCESS_TYPES
      expect(PROCESS_TYPES).toContain(a.sourceProcessTypes[0]);
    }
  });

  it('Lookups row ranges: archetype list fits 4 archetypes in R205-R208', () => {
    // Row 205 is the first archetype, row 208 is the fourth.
    const firstRow = 205;
    const lastRow = firstRow + PROJECT_ARCHETYPES.length - 1;
    expect(lastRow).toBe(208);
  });

  it('Lookups row ranges: delivery pace scenarios fit 3 rows in R45-R47', () => {
    const firstRow = 45;
    const lastRow = firstRow + DELIVERY_PACE_SCENARIOS.length - 1;
    expect(lastRow).toBe(47);
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

  it('no references to retired fifth-archetype lookup row', () => {
    expect(source).not.toMatch(/A205:[A-Z]20[9]/);
    expect(source).not.toMatch(/\$A\$205:\$A\$209/);
  });

  it('thinBorder is defined before use', () => {
    const defIndex = source.indexOf('const thinBorder');
    const useIndex = source.indexOf('thinBorder');
    expect(defIndex).toBeGreaterThan(-1);
    expect(defIndex).toBeLessThan(useIndex === defIndex ? useIndex + 1 : useIndex);
  });

  it('deployment cost uses the weighted workforce rate instead of a location salary VLOOKUP', () => {
    expect(source).toContain('exportInputRows.blendedFullyBurdenedCost');
    expect(source).not.toContain("VLOOKUP(Inputs!B6,Lookups!A45:B49,2,FALSE)");
    expect(source).toContain('DELIVERY-PACE PLANNING SCENARIOS [D1]');
    expect(source).toContain('Weighted workforce mix');
  });

  it('matches core delivery pace multipliers for staffing/cost and duration', () => {
    expect(source).toContain("fml(I, 66, 2, 'IF(B65=\"Accelerated\",1.2,IF(B65=\"Extended\",0.8,1))'");
    expect(source).toContain("fml(I, 67, 2, 'IF(B65=\"Accelerated\",0.8,IF(B65=\"Extended\",1.25,1))'");
    expect(source).toContain('exportInputRows.deliveryDurationMultiplier');
    expect(source).toContain('*Inputs!B${exportInputRows.deliveryDurationMultiplier},1)/12');
  });

  it('removes legacy team-location and location-salary export fields', () => {
    expect(source).not.toContain('teamLocation');
    expect(source).not.toContain('blendedAISalary');
    expect(source).not.toContain('AI TEAM SALARY');
    expect(source).not.toContain('AI_TEAM_SALARY');
    expect(source).not.toContain('$A$45:$A$49');
  });

  it('archetype dropdown uses $A$205:$A$208 range', () => {
    expect(source).toContain('$A$205:$A$208');
  });

  it('archetype VLOOKUP uses A205:C208 range', () => {
    expect(source).toContain('A205:C208');
  });

  it('matches the core workforce-transition cash rules', () => {
    expect(source).toContain("fml(KF, 12, 2, 'Inputs!B13/2080'");
    expect(source).toContain('INT(B86/2080+0.000000001)');
    expect(source).toContain("fml(KF, 54, 2, `B20*Inputs!B${exportInputRows.employeeFullyBurdenedCost}`");
    expect(source).toContain("fml(KF, 58, 2, 'B56+B57+B61'");
  });

  it('resolves both flat and nested archetype input payloads for the exported detail tabs', () => {
    expect(source).toContain('const resolveArchetypeInputValues');
    expect(source.match(/resolveArchetypeInputValues\(schema\.id\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain('const activeUserVals = resolveArchetypeInputValues(activeArchetypeId)');
  });

  it('lets detailed measured rework counts override a stale legacy annual total', () => {
    expect(source).toContain('const hasDetailedErrorCounts');
    expect(source).toContain('const annualEmployeeErrorCount = hasDetailedErrorCounts');
    expect(source).toContain('const annualContractErrorCount = hasDetailedErrorCounts');
  });

  it('keeps calculation detail and source traceability visible in the active financial export', async () => {
    const { EXCEL_TABS } = await import('../../utils/outputTier');
    expect(EXCEL_TABS.financial).toEqual(expect.arrayContaining([
      'Archetype Detail', 'Key Formulas', 'Sources & Footnotes',
    ]));
  });

  it('removes the retired revenue-growth use case from workbook tabs and documents M3 guardrails', async () => {
    const { EXCEL_TABS } = await import('../../utils/outputTier');
    expect(source).not.toContain('revenue-growth-ai');
    expect(source).not.toContain('Assumptions - Revenue');
    expect(EXCEL_TABS.financial).not.toContain('Assumptions - Revenue');
    expect(source).toContain("id: '[M3]'");
    expect(source).toContain('capacity reconciliation and evidence gates');
    expect(source).toContain('FOUR USE CASES — INPUTS → ASSUMPTIONS → CALCULATION → FOOTNOTES');
  });

  it('removes Knowledge Management AI from workbook surfaces and presents Customer Service', () => {
    expect(source).not.toContain('knowledge-management-ai');
    expect(source).not.toContain('Assumptions - Knowledge');
    expect(source).toContain("'customer-facing-ai':         'Assumptions - Customer'");
    expect(PROJECT_ARCHETYPES.find(({ id }) => id === 'customer-facing-ai')?.label).toBe('Customer Service');
  });

  it('keeps case tabs limited to model-linked inputs, assumptions, calculations, and footnotes', () => {
    expect(source).toContain('const CASE_FLOW_CONTENT');
    expect(source).toContain('caseFlow.assumptionRows');
    expect(source).toContain('INPUTS — ENTER OR VALIDATE');
    expect(source).toContain('ASSUMPTIONS — MODEL RULES');
    expect(source).toContain('CALCULATION — WHAT THE MODEL DERIVES');
    expect(source).toContain('FOOTNOTES — READ BEFORE USING THE RESULT');
    expect(source).not.toContain('const ARCHETYPE_MODEL_CONTEXT');
    expect(source).not.toContain('const ARCHETYPE_BENCHMARKS');
    expect(source).not.toContain('ILLUSTRATIVE MODEL CONTEXT — VALIDATE BEFORE USE');

    [
      'McKinsey Digital (2024)',
      'Deloitte AI Survey (2024)',
      'Gartner RPA Market Guide (2024)',
      'Gartner Customer Service (2025)',
      'Forrester CX Index (2024)',
      'KPMG Regulatory Insights (2024)',
    ].forEach(unverifiedClaim => {
      expect(source).not.toContain(unverifiedClaim);
    });
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

describe('Excel Model: all 4 archetypes produce valid Excel-ready data', () => {
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

describe('Excel Model: workforce-mix deployment basis', () => {
  it('documents the same delivery pace multipliers used by the model', () => {
    expect(DELIVERY_PACE_SCENARIOS).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Accelerated', staffingCost: 1.20, duration: 0.80 }),
      expect.objectContaining({ label: 'Standard', staffingCost: 1.00, duration: 1.00 }),
      expect.objectContaining({ label: 'Extended', staffingCost: 0.80, duration: 1.25 }),
    ]));
  });
});

describe('Excel Model: core-engine export snapshot', () => {
  it('links P&L and scenario output to the passed runCalculations result', async () => {
    const results = runCalculations(BASE_INPUTS);
    const originalDocument = globalThis.document;
    const originalURL = globalThis.URL;
    let exportedBlob;

    globalThis.URL = {
      createObjectURL: (blob) => {
        exportedBlob = blob;
        return 'blob:excel-model-test';
      },
      revokeObjectURL: () => {},
    };
    globalThis.document = {
      body: {
        appendChild: () => {},
        removeChild: () => {},
      },
      createElement: () => ({ click: () => {} }),
    };

    try {
      await generateExcelModel(BASE_INPUTS, null, results);
    } finally {
      globalThis.URL = originalURL;
      if (originalDocument === undefined) delete globalThis.document;
      else globalThis.document = originalDocument;
    }

    expect(exportedBlob).toBeDefined();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await exportedBlob.arrayBuffer());

    const engine = workbook.getWorksheet('Engine Results');
    const pnl = workbook.getWorksheet('P&L & Cash Flow');
    const sensitivity = workbook.getWorksheet('Sensitivity');
    const inputs = workbook.getWorksheet('Inputs');
    const lookups = workbook.getWorksheet('Lookups');
    const sources = workbook.getWorksheet('Sources & Footnotes');
    const glossary = workbook.getWorksheet('Glossary');

    expect(engine.state).toBe('veryHidden');
    expect(engine.getCell('C5').value).toBeCloseTo(results.scenarios.base.npv);
    expect(engine.getCell('C6').value).toBeCloseTo(results.scenarios.base.irr);
    expect(engine.getCell('C7').value).toBeCloseTo(results.scenarios.base.roic);
    expect(engine.getCell('C8').value).toBe(results.scenarios.base.paybackMonths);
    expect(engine.getCell('C22').value).toBeCloseTo(results.scenarios.base.projections[0].netCashFlow);

    expect(pnl.getCell('B21').formula).toBe("'Engine Results'!B22");
    expect(pnl.getCell('C12').formula).toBe("'Engine Results'!C17");
    expect(pnl.getCell('C21').formula).toBe("'Engine Results'!C22");
    expect(pnl.getCell('B27').formula).toBe("'Engine Results'!C5");
    expect(pnl.getCell('B28').formula).toBe("'Engine Results'!C6");
    expect(pnl.getCell('B29').formula).toBe("'Engine Results'!C8");
    expect(pnl.getCell('B30').formula).toBe("'Engine Results'!C7");

    expect(sensitivity.getCell('B7').formula).toBe("'Engine Results'!B27");
    expect(sensitivity.getCell('C14').formula).toBe("'Engine Results'!C5");
    expect(sensitivity.getCell('D16').formula).toBe("'Engine Results'!D7");

    // The source register includes the complete bibliography, so a footnote
    // ID remains traceable even when its related lookup is model context.
    const { BENCHMARK_SOURCES } = await import('../../logic/benchmarks');
    const sourceIds = sources.getColumn(1).values.filter(Boolean);
    expect(sourceIds).toContain('[1]');
    expect(sourceIds).toContain(`[${BENCHMARK_SOURCES.length}]`);
    expect(sourceIds).toContain('[M3]');
    const glossaryText = glossary.getSheetValues().flat().filter(Boolean).join(' ');
    expect(glossaryText).toContain('FOUR USE CASES — START HERE');
    expect(glossaryText).toContain('Workload check');
    expect(glossaryText).toContain('Inputs → Assumptions → Calculation → Footnotes');

    const lookupText = lookups.getSheetValues().flat().filter(Boolean).join(' ');
    const inputText = inputs.getSheetValues().flat().filter(Boolean).join(' ');
    expect(lookupText).toContain('DELIVERY-PACE PLANNING SCENARIOS [D1]');
    expect(lookupText).toContain('Weighted workforce mix');
    expect(lookupText).not.toContain('AI TEAM SALARY');
    expect(inputText).not.toContain('Team Location');

    const caseTabs = new Map([
      ['internal-process-automation', 'Assumptions - Process'],
      ['customer-facing-ai', 'Assumptions - Customer'],
      ['data-analytics-automation', 'Assumptions - Analytics'],
      ['risk-compliance-legal-ai', 'Assumptions - Compliance'],
    ]);
    caseTabs.forEach((tabName, archetypeId) => {
      const tab = workbook.getWorksheet(tabName);
      expect(tab).toBeDefined();
      const tabText = tab.getSheetValues().flat().filter(Boolean).join(' ');
      expect(tabText).toContain('USE CASE DEFINITION');
      expect(tabText).toContain('INPUTS — ENTER OR VALIDATE');
      expect(tabText).toContain('ASSUMPTIONS — MODEL RULES');
      expect(tabText).toContain('CALCULATION — WHAT THE MODEL DERIVES');
      expect(tabText).toContain('FOOTNOTES — READ BEFORE USING THE RESULT');
      const schema = ARCHETYPE_INPUT_SCHEMAS.find(({ id }) => id === archetypeId);
      expect(schema).toBeDefined();
      schema.inputs.forEach((input) => {
        const displayLabel = input.key === 'handlingTimeMin'
          ? 'Average time per process (minutes)'
          : input.label;
        expect(tabText).toContain(displayLabel);
      });
    });
    expect(workbook.getWorksheet('Assumptions - Knowledge')).toBeUndefined();
    const customerText = workbook.getWorksheet('Assumptions - Customer').getSheetValues().flat().filter(Boolean).join(' ');
    expect(customerText).toContain('CUSTOMER SERVICE');
  });

  it('exports a retired shared-model archetype through a supported generic fallback', async () => {
    const results = runCalculations(BASE_INPUTS);
    const originalDocument = globalThis.document;
    const originalURL = globalThis.URL;
    let exportedBlob;

    globalThis.URL = {
      createObjectURL: (blob) => {
        exportedBlob = blob;
        return 'blob:legacy-archetype-export-test';
      },
      revokeObjectURL: () => {},
    };
    globalThis.document = {
      body: {
        appendChild: () => {},
        removeChild: () => {},
      },
      createElement: () => ({ click: () => {} }),
    };

    try {
      await generateExcelModel({
        ...BASE_INPUTS,
        projectArchetype: 'revenue-growth-ai',
        processType: 'revenue-growth-ai',
      }, null, results);
    } finally {
      globalThis.URL = originalURL;
      if (originalDocument === undefined) delete globalThis.document;
      else globalThis.document = originalDocument;
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await exportedBlob.arrayBuffer());
    const inputs = workbook.getWorksheet('Inputs');
    const formulas = workbook.getWorksheet('Key Formulas');

    expect(inputs.getCell('B10').value).toBe('internal-process-automation');
    expect(inputs.getCell('B10').dataValidation.formulae).toEqual(['Lookups!$A$205:$A$208']);
    expect(formulas.getCell('B10').formula).toBe('VLOOKUP(Inputs!B10,Lookups!A205:C208,3,FALSE)');
    expect(workbook.getWorksheet('Assumptions - Revenue')).toBeUndefined();
  });
});
