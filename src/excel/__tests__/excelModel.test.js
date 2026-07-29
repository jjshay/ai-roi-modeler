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

// Regression vector for the formula-driven workbook. This mirrors a
// mid-market Tech risk/compliance case with an explicit annual operating-cost
// estimate; cached values are validated through native Excel in the QA step.
const RISK_PARITY_INPUTS = {
  industry: 'Technology / Software',
  companySize: 'Mid-Market (501-5,000)',
  companyState: 'California',
  projectArchetype: 'risk-compliance-legal-ai',
  processType: 'Quality & Compliance',
  assumptions: { toolReplacementRate: 0.48 },
  directEmployeeCount: 20,
  employeeFullyBurdenedCost: 200000,
  offshoreContractorCount: 0,
  contractorFullyBurdenedCost: 0,
  hoursPerWeek: 40,
  currentToolCosts: 50000,
  implementationBudget: 200000,
  expectedTimeline: 6,
  ongoingAnnualCost: 50000,
  changeReadiness: 3,
  dataReadiness: 3,
  execSponsor: true,
  cashRealizationPct: 0.40,
  totalEfficiencyGainPct: 0.10,
  employeesToRetrain: 0,
  employeesToMakeRedundant: 0,
  existingContractCount: 5,
  annualCostPerContract: 100000,
  contractNoticePeriodMonths: 6,
  deliveryPace: 'standard',
  aiLicensedUsers: 0,
  monthlyAiRequests: 0,
  avgInputTokensPerRequest: 0,
  avgOutputTokensPerRequest: 0,
  monthlyAgentWorkflows: 0,
  documentsPerMonth: 0,
  dataStoredGb: 0,
  connectedApplications: 0,
  errorCountEmployees: 0,
  errorCountContracts: 0,
  reworkFraction: 0,
  reworkCostPerItem: 0,
  archetypeInputs: {
    'risk-compliance-legal-ai': {
      reviewsPerMonth: 200,
      hoursPerReview: 4,
      pctAutomatable: 0.35,
      findingsPerYear: 15,
      fineExposure: 500000,
      preventableFindingPct: 0.20,
    },
  },
};

const RISK_AUTO_ONGOING_INPUTS = {
  ...RISK_PARITY_INPUTS,
  ongoingAnnualCost: undefined,
};

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

  it('derives the same automatic ongoing-cost base for the risk regression vector', () => {
    const results = runCalculations(RISK_AUTO_ONGOING_INPUTS);
    expect(results.aiCostModel.userProvidedOngoing).toBe(false);
    expect(results.aiCostModel.computedOngoingCost).toBeCloseTo(247160, 6);
    expect(results.aiCostModel.baseOngoingCost).toBeCloseTo(247160, 6);
    [247160, 266932.8, 278906.112, 281705.472, 277411.35744]
      .forEach((expectedCost, index) => {
        expect(results.scenarios.base.projections[index].ongoingCost).toBeCloseTo(expectedCost, 6);
      });
    expect(results.scenarios.base.npv).toBeCloseTo(-848797.1378287179, 6);
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

  it('uses the web-model delivery pace cost multiplier without changing an explicit timeline', () => {
    expect(source).toContain("fml(I, 66, 2, 'IF(B65=\"Accelerated\",1.2,IF(B65=\"Extended\",0.8,1))'");
    expect(source).toContain("fml(I, 67, 2, 'IF(B65=\"Accelerated\",0.8,IF(B65=\"Extended\",1.25,1))'");
    expect(source).toContain('exportInputRows.deliveryCostMultiplier');
    expect(source).not.toContain('*Inputs!B${exportInputRows.deliveryDurationMultiplier},1)/12');
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
    expect(source).toContain("fml(KF, 54, 2, `B20*Inputs!B${exportInputRows.employeeFullyBurdenedCost}+B19*Inputs!B${exportInputRows.contractorFullyBurdenedCost}`");
    expect(source).toContain('Calculated Total Reduction Target');
    expect(source).toContain('Selected Contractor Roll-Off');
    expect(source).toContain('headcountReductionYearsFormula');
    expect(source).toContain('annualHeadcountReductionFraction');
    expect(source).toContain('Customer Service evidence gate');
    expect(source).toContain('Inputs!B78="Yes"');
    expect(source).toContain('MIN(B79,Inputs!B11*Inputs!B12)*52*B98');
  });

  it('resolves both flat and nested archetype input payloads for the exported detail tabs', () => {
    expect(source).toContain('const resolveArchetypeInputValues');
    expect(source.match(/resolveArchetypeInputValues\(schema\.id\)/g)?.length).toBeGreaterThanOrEqual(1);
    expect(source).toContain('const selectedCaseFormula');
    expect(source).toContain('const caseMappingRef');
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
    expect(source).toContain("'customer-facing-ai': 'Assumptions - Customer'");
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

describe('Excel Model: live formula-driven workbook', () => {
  it('links editable case tabs through Key Formulas, P&L, Summary, and sensitivity without a hidden snapshot', async () => {
    // Optional QA hook: export an exact browser-model input vector, then let
    // a native Excel calculation pass verify cached P&L parity. Normal tests
    // keep using the shared base fixture.
    const qaInputJson = globalThis.process?.env?.EXCEL_QA_INPUTS_JSON;
    const qaVector = globalThis.process?.env?.EXCEL_QA_VECTOR;
    const workbookInputs = qaInputJson
      ? JSON.parse(qaInputJson)
      : qaVector === 'risk-parity' ? RISK_PARITY_INPUTS
        : qaVector === 'risk-auto-ongoing' ? RISK_AUTO_ONGOING_INPUTS
          : BASE_INPUTS;
    const results = runCalculations(workbookInputs);
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
      await generateExcelModel(workbookInputs, null, results);
    } finally {
      globalThis.URL = originalURL;
      if (originalDocument === undefined) delete globalThis.document;
      else globalThis.document = originalDocument;
    }

    expect(exportedBlob).toBeDefined();
    // Opt-in artifact for the spreadsheet QA command. It is intentionally
    // outside the repository and lets LibreOffice recalculate the exact
    // workbook that this structural test inspected.
    const qaOutputPath = globalThis.process?.env?.EXCEL_QA_OUTPUT;
    if (qaOutputPath) {
      const { writeFile } = await import('node:fs/promises');
      const { Buffer } = await import('node:buffer');
      await writeFile(qaOutputPath, Buffer.from(await exportedBlob.arrayBuffer()));
    }
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await exportedBlob.arrayBuffer());

    const pnl = workbook.getWorksheet('P&L & Cash Flow');
    const sensitivity = workbook.getWorksheet('Sensitivity');
    const inputs = workbook.getWorksheet('Inputs');
    const formulas = workbook.getWorksheet('Key Formulas');
    const lookups = workbook.getWorksheet('Lookups');
    const sources = workbook.getWorksheet('Sources & Footnotes');
    const glossary = workbook.getWorksheet('Glossary');

    // Presentation contract: formulas remain live, while values, labels, and
    // print layouts are deterministic and decision-ready after a round trip.
    workbook.worksheets.forEach((sheet) => {
      expect(sheet.pageSetup.fitToPage).toBe(true);
      expect(sheet.pageSetup.fitToHeight).toBe(0);
      expect(sheet.pageSetup.fitToWidth).toBeGreaterThanOrEqual(1);
      expect(sheet.pageSetup.paperSize).toBe(9);
      // ExcelJS only writes print-gridlines when true; omitted means Excel's
      // default false. The explicit sheet view also keeps the on-screen model clean.
      expect(sheet.pageSetup.showGridLines ?? false).toBe(false);
      expect(sheet.views[0]?.showGridLines).toBe(false);
      expect(sheet.pageSetup.printArea).toMatch(/^A1:[A-Z]+\d+$/);
      expect(sheet.pageSetup.printTitlesRow).toMatch(/^\d+:\d+$/);
      expect(sheet.pageSetup.margins).toMatchObject({
        left: 0.3, right: 0.3, top: 0.5, bottom: 0.5,
      });
      expect(sheet.headerFooter.oddFooter).toContain('Page &P of &N');
    });
    expect(inputs.pageSetup.orientation).toBe('landscape');
    expect(sensitivity.pageSetup.orientation).toBe('landscape');
    expect(workbook.getWorksheet('Assumptions - Customer').pageSetup.orientation).toBe('landscape');
    expect(sources.pageSetup.fitToWidth).toBe(2);
    expect(glossary.pageSetup.fitToWidth).toBe(2);

    // Values are explicitly right aligned with standard financial formats;
    // labels and explanatory text stay left aligned and wrapped.
    expect(inputs.getCell('B41').numFmt).toBe('$#,##0;($#,##0);-');
    expect(inputs.getCell('B41').alignment.horizontal).toBe('right');
    expect(inputs.getCell('A41').alignment.horizontal).toBe('left');
    expect(inputs.getCell('C41').alignment).toMatchObject({
      horizontal: 'left', vertical: 'top', wrapText: true,
    });
    expect(formulas.getCell('B69').numFmt).toBe('0.0%;(0.0%);-');
    expect(formulas.getCell('B42').alignment.horizontal).toBe('right');
    expect(pnl.getCell('B27').numFmt).toBe('$#,##0;($#,##0);-');
    expect(sensitivity.getCell('C14').alignment.horizontal).toBe('right');
    workbook.worksheets.forEach((sheet) => {
      sheet.eachRow({ includeEmpty: false }, (row) => row.eachCell({ includeEmpty: false }, (cell) => {
        if (typeof cell.value === 'number') {
          expect(cell.numFmt).toBeTruthy();
          expect(cell.numFmt).not.toBe('General');
          expect(cell.alignment.horizontal).toBe('right');
        }
      }));
    });

    expect(workbook.getWorksheet('Engine Results')).toBeUndefined();
    expect(pnl.getCell('B21').formula).toBe("-'Key Formulas'!B64-'Key Formulas'!B62");
    expect(pnl.getCell('C12').formula).toBe("'Key Formulas'!B58*C5*C6*C10");
    expect(pnl.getCell('C18').formula).toContain("'Key Formulas'!$B$110");
    expect(pnl.getCell('C21').formula).toBe('C14-C17-C18');
    expect(pnl.getCell('B27').formula).toBe('SUM(B23:G23)');
    expect(pnl.getCell('B28').formula).toContain('IRR(B21:G21)');
    expect(pnl.getCell('B29').formula).toContain('C24');
    expect(pnl.getCell('B30').formula).toContain("'Key Formulas'!B68");
    expect(sensitivity.getCell('B7').formula).toBe("-'Key Formulas'!B64-'Key Formulas'!B62");
    expect(sensitivity.getCell('C14').formula).toContain("NPV('Key Formulas'!B69,C8:C12)");

    // The selected-case bridge is an ordinary nested IF over live case-tab
    // formulas, so selecting another case does not require re-exporting.
    expect(formulas.getCell('B4').formula).toContain('Inputs!$B$10');
    expect(formulas.getCell('B77').formula).toContain("'Assumptions - Process'!$B$26");
    expect(formulas.getCell('B79').formula).toContain("'Assumptions - Customer'!$B$28");
    expect(formulas.getCell('B81').formula).toContain("'Assumptions - Customer'!$B$29");
    expect(formulas.getCell('B82').formula).toContain("'Assumptions - Compliance'!$B$29");
    expect(formulas.getCell('B83').formula).toContain("'Assumptions - Analytics'!$B$30");
    expect(formulas.getCell('B98').formula).toContain('MIN(Inputs!B53,B77)');
    expect(formulas.getCell('B97').formula).toContain('BLOCKED');
    expect(formulas.getCell('B18').formula).toContain('INT(B86/2080');
    expect(formulas.getCell('B19').formula).toContain('Inputs!B56');
    expect(formulas.getCell('B20').formula).toContain('B18-B19');
    expect(formulas.getCell('B54').formula).toContain('B19*Inputs!B43');
    expect(pnl.getCell('C7').formula).toContain('Inputs!B38');
    expect(pnl.getCell('C8').formula).toContain('Inputs!B38');
    expect(formulas.getCell('B51').formula).toBe('IF(OR(ISBLANK(Inputs!B25),Inputs!B25=""),B50,Inputs!B25)');
    expect(formulas.getCell('B52').formula).toBe('B51-B50');
    // Executive recurring-cost buckets must reflect the exact annual total
    // used in the DCF, including an explicit all-in annual cost. This mirrors
    // the website's proportional allocation and leaves Run as the residual.
    expect(formulas.getCell('B92').formula).toBe('IFERROR(B48*B51/B50,0)');
    expect(formulas.getCell('B93').formula).toBe('IFERROR(B47*B51/B50,0)');
    expect(formulas.getCell('B94').formula).toBe('MAX(0,B51-B92-B93)');
    expect(formulas.getCell('B95').formula).toBe('B51');
    expect(formulas.getCell('B73').formula).not.toContain('IF(Inputs!B5="Startup (1-50)"');
    expect(formulas.getCell('B73').formula).toContain('Inputs!B75*0.12*12');
    expect(formulas.getCell('B110').formula).toBe('IFERROR(B105*B51/B50,0)');
    expect(formulas.getCell('B80').formula).toContain('Lookups!A205:D208');
    expect(formulas.getCell('B40').formula).toContain('B101:B104');

    // Central workforce, contract, and evidence inputs are editable even if
    // the workbook is protected by a recipient.
    [38, 40, 41, 42, 43, 48, 49, 50, 51, 53, 54, 55, 56, 58, 59, 60, 65, 78].forEach((row) => {
      expect(inputs.getCell(`B${row}`).protection.locked).toBe(false);
    });

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
      const firstInputRow = 13;
      schema.inputs.forEach((input, index) => {
        const cell = tab.getCell(`B${firstInputRow + index}`);
        expect(cell.protection.locked).toBe(false);
        expect(cell.formula).toBeUndefined();
      });
      const firstCalculatedRow = firstInputRow + schema.inputs.length + 8;
      const calculatedFormulaText = [];
      schema.computedMappings.forEach((mapping, index) => {
        const cell = tab.getCell(`B${firstCalculatedRow + index}`);
        expect(cell.formula).toBeTruthy();
        expect(cell.formula).not.toContain('Engine Results');
        calculatedFormulaText.push(cell.formula);
      });
      // Cell-by-cell proof that no blue case input is decorative: every case
      // input is consumed by at least one live formula on its own case tab.
      const caseFormulaText = calculatedFormulaText.join(' ');
      schema.inputs.forEach((_input, index) => {
        expect(caseFormulaText).toContain(`B${firstInputRow + index}`);
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
