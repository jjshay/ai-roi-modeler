/**
 * AI ROI Calculator — Presentation-Ready Excel Model
 * Core tabs: Inputs, Archetype Detail, Key Formulas, Summary, P&L & Cash Flow,
 * Sensitivity, V5 Analysis, Lookups, Model Audit, Glossary, Sources & Footnotes.
 * The workbook is a live, formula-driven model: editable blue cells flow
 * through the selected-case engine into the visible DCF and executive output.
 * Color coded: Blue=Inputs, Green=Formulas, Black=Results
 * All calculated cells use real Excel formulas.
 */
import ExcelJS from 'exceljs';
import { getOutputTier, EXCEL_TABS } from '../utils/outputTier';
import { ARCHETYPE_INPUT_SCHEMAS, ARCHETYPE_INPUT_MAP, CLASSIFICATION_PROFILES, CLASSIFICATION_QUESTIONS, getArchetypeInputDefaults } from '../logic/archetypeInputs';
import { PROJECT_ARCHETYPES, getArchetypeDefaults, isRetiredArchetype } from '../logic/archetypes';
import { BENCHMARK_SOURCES } from '../logic/benchmarks';

// --- Styles ---
const NAVY = '1B2A4A';
const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${NAVY}` } };
const subFont = { bold: true, color: { argb: `FF${NAVY}` }, size: 10, name: 'Calibri' };
const subFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
const inputFill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F0' } };
const calcFill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
const resultFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${NAVY}` } };
const warnFill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } };
const goldFill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC9A227' } };
const goldFont   = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1B2A4A' } };
const thinBorder = {
  top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
  bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
  left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
  right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
};
const font10 = { name: 'Calibri', size: 10 };
const font9i = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF666666' } };
const fontBold = { name: 'Calibri', size: 10, bold: true };
const outputFont = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
const outputFont10 = { name: 'Calibri', size: 10, color: { argb: 'FFFFFFFF' } };
const inputFont = { name: 'Calibri', size: 10, color: { argb: 'FF0000FF' } };
const greenFont = { name: 'Calibri', size: 10, color: { argb: 'FF2E7D32' } };
const greenFontBold = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF2E7D32' } };
// Use financial-model formats consistently: negatives in parentheses and
// zeros as dashes.  This makes the printed statements easy to scan without
// changing any underlying values or formulas.
const PCT = '0.0%;(0.0%);-';
const DOL = '$#,##0;($#,##0);-';
const DOL2 = '$#,##0.00;($#,##0.00);-';
const NUM = '#,##0;(#,##0);-';
const DEC = '0.000;(0.000);-';
const ONE_DEC = '0.0;(0.0);-';

const LEGACY_NUMBER_FORMATS = Object.freeze({
  '$#,##0': DOL,
  '$#,##0.00': DOL2,
  '0.0%': PCT,
  '#,##0': NUM,
  '0': NUM,
  '0.0': ONE_DEC,
  '0.000': DEC,
});

// --- Helpers ---
function cols(ws, w) { w.forEach((v, i) => { ws.getColumn(i + 1).width = v; }); }

function setAlignment(cell, horizontal, defaultVertical = 'middle') {
  const existing = cell.alignment || {};
  cell.alignment = {
    ...existing,
    horizontal,
    vertical: existing.vertical || defaultVertical,
  };
}

function isFormulaCell(cell) {
  return Boolean(cell.value && typeof cell.value === 'object' && cell.value.formula);
}

function isNumericCell(cell) {
  return typeof cell.value === 'number'
    || (isFormulaCell(cell) && Boolean(cell.numFmt && cell.numFmt !== 'General'));
}

function normalizeNumberFormat(cell) {
  if (LEGACY_NUMBER_FORMATS[cell.numFmt]) {
    cell.numFmt = LEGACY_NUMBER_FORMATS[cell.numFmt];
  }
  if (typeof cell.value === 'number' && (!cell.numFmt || cell.numFmt === 'General')) {
    cell.numFmt = NUM;
  }
}

function hdr(ws, r, text, n) {
  const row = ws.getRow(r);
  for (let c = 1; c <= n; c++) {
    row.getCell(c).fill = headerFill;
    row.getCell(c).font = headerFont;
    setAlignment(row.getCell(c), 'left');
  }
  row.getCell(1).value = text;
  ws.mergeCells(r, 1, r, n);
  row.height = 22;
}

function sub(ws, r, text, n) {
  const row = ws.getRow(r);
  for (let c = 1; c <= n; c++) {
    row.getCell(c).fill = subFill;
    row.getCell(c).font = subFont;
    setAlignment(row.getCell(c), 'left');
  }
  row.getCell(1).value = text;
  ws.mergeCells(r, 1, r, n);
}

function val(ws, r, c, v, fmt, fill) {
  const cell = ws.getRow(r).getCell(c);
  cell.value = v;
  cell.font = fill === inputFill ? inputFont : font10;
  if (fmt) cell.numFmt = fmt;
  if (fill) cell.fill = fill;
  setAlignment(cell, (fmt || typeof v === 'number') ? 'right' : 'left');
}

function fml(ws, r, c, formula, fmt, fill) {
  const cell = ws.getRow(r).getCell(c);
  cell.value = { formula };
  cell.font = fill === resultFill ? outputFont10 : greenFont;
  if (fmt) cell.numFmt = fmt;
  cell.fill = fill || calcFill;
  setAlignment(cell, fmt ? 'right' : 'left');
}

function fmlBold(ws, r, c, formula, fmt, fill) {
  const cell = ws.getRow(r).getCell(c);
  cell.value = { formula };
  cell.font = (fill || resultFill) === resultFill ? outputFont : greenFontBold;
  if (fmt) cell.numFmt = fmt;
  cell.fill = fill || resultFill;
  setAlignment(cell, fmt ? 'right' : 'left');
}

function note(ws, r, c, text) {
  const cell = ws.getRow(r).getCell(c);
  cell.value = text;
  cell.font = font9i;
  cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
}

function tableHeaders(ws, r, headers) {
  const row = ws.getRow(r);
  headers.forEach((h, i) => {
    row.getCell(i + 1).value = h;
    row.getCell(i + 1).font = { bold: true, size: 9, name: 'Calibri' };
    row.getCell(i + 1).fill = subFill;
    row.getCell(i + 1).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  });
}

function colorLegend(ws, r) {
  const row = ws.getRow(r);
  row.height = 16;
  row.getCell(1).value = '\u25A0 Input (editable)';
  row.getCell(1).fill = inputFill;
  row.getCell(1).font = { name: 'Calibri', size: 9, bold: true, color: { argb: `FF${NAVY}` } };
  row.getCell(2).value = '\u25A0 Formula (calculated)';
  row.getCell(2).fill = calcFill;
  row.getCell(2).font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF2E7D32' } };
  row.getCell(3).value = '\u25A0 Output (key results)';
  row.getCell(3).fill = resultFill;
  row.getCell(3).font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
}

function dataRow(ws, r, values, fmts) {
  values.forEach((v, i) => {
    const cell = ws.getRow(r).getCell(i + 1);
    cell.value = v;
    cell.font = { size: 9, name: 'Calibri' };
    if (fmts && fmts[i]) cell.numFmt = fmts[i];
    setAlignment(cell, (typeof v === 'number' || (fmts && fmts[i])) ? 'right' : 'left');
  });
}

function columnLetter(column) {
  let value = column;
  let result = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result || 'A';
}

function printLayoutFor(ws) {
  const landscape = new Set([
    'Inputs', 'Archetype Detail', 'Key Formulas', 'P&L & Cash Flow',
    'Sensitivity', 'V5 Analysis', 'Lookups', 'Glossary', 'Sources & Footnotes',
  ]);
  const useLandscape = landscape.has(ws.name) || ws.name.startsWith('Assumptions -');
  // Do not shrink wide, narrative-heavy pages into unreadably small type.
  // These three sheets deliberately use two horizontal printed pages while
  // retaining repeated title rows on each page.
  const twoPagesWide = new Set(['Glossary', 'Sources & Footnotes']);
  const repeatRows = {
    Inputs: '1:3',
    'Archetype Detail': '1:3',
    'Key Formulas': '1:3',
    Summary: '1:3',
    'P&L & Cash Flow': '1:4',
    Sensitivity: '1:4',
    'V5 Analysis': '1:4',
    Lookups: '1:2',
    'Model Audit': '1:2',
    Glossary: '1:4',
    'Sources & Footnotes': '1:4',
  };
  return {
    orientation: useLandscape ? 'landscape' : 'portrait',
    fitToWidth: twoPagesWide.has(ws.name) ? 2 : 1,
    printTitlesRow: repeatRows[ws.name] || '1:3',
  };
}

function printSetup(ws) {
  // actualRowCount is a count, not the final populated row number. A sparse
  // sheet (such as Inputs, which deliberately preserves legacy row addresses)
  // can therefore have real content below that count. Use worksheet
  // dimensions so the print area never clips the selected-case bridge.
  const dimension = ws.dimensions?.model || {};
  const lastRow = Math.max(1, dimension.bottom || 0, ws.actualRowCount || 0);
  const lastColumn = Math.max(1, dimension.right || 0, ws.actualColumnCount || 0, ws.columnCount || 0);
  const layout = printLayoutFor(ws);
  ws.properties.pageSetup = { ...(ws.properties.pageSetup || {}), fitToPage: true };
  ws.pageSetup = {
    ...(ws.pageSetup || {}),
    ...layout,
    fitToPage: true,
    fitToWidth: layout.fitToWidth,
    fitToHeight: 0,
    paperSize: 9, // A4
    horizontalCentered: false,
    verticalCentered: false,
    showGridLines: false,
    margins: { left: 0.30, right: 0.30, top: 0.50, bottom: 0.50, header: 0.20, footer: 0.25 },
    printArea: `A1:${columnLetter(lastColumn)}${lastRow}`,
  };
  ws.headerFooter.oddFooter = `&LAI ROI Model&C${ws.name}&RPage &P of &N`;
}

function normalizeWorksheetPresentation(ws) {
  ws.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      normalizeNumberFormat(cell);
      // Retain explicit centered status/check cells, but align numeric values
      // right and explanatory text left throughout the workbook.
      if (cell.alignment?.horizontal === 'center') return;
      setAlignment(cell, isNumericCell(cell) ? 'right' : 'left', cell.alignment?.wrapText ? 'top' : 'middle');
    });
  });
  // ExcelJS only serializes print-gridlines when they are true; its absence
  // means the Excel default of not printing them. Set the sheet-view flag as
  // well so the on-screen model is as clean as its printed counterpart.
  const views = ws.views?.length ? ws.views : [{}];
  ws.views = views.map((view) => ({ ...view, showGridLines: false }));
  printSetup(ws);
}

function mappingNumberFormat(mapsTo) {
  const target = String(mapsTo || '').toLowerCase();
  if (target.includes('hour')) return NUM;
  if (target.includes('saving') || target.includes('avoidance') || target.includes('cost') || target.includes('revenue') || target.includes('risk')) return DOL;
  if (target.includes('multiplier')) return DEC;
  return PCT;
}

// --- Data ---
const INDUSTRIES = [
  'Technology / Software', 'Financial Services / Banking', 'Healthcare / Life Sciences',
  'Manufacturing / Industrial', 'Retail / E-Commerce', 'Professional Services / Consulting',
  'Media / Entertainment', 'Energy / Utilities', 'Government / Public Sector', 'Other',
];
const PROCESS_TYPES = [
  'Document Processing', 'Customer Communication', 'Data Analysis & Reporting',
  'Research & Intelligence', 'Workflow Automation', 'Content Creation', 'Quality & Compliance', 'Other',
];
const SIZES = [
  'Startup (1-50)', 'SMB (51-500)', 'Mid-Market (501-5,000)',
  'Enterprise (5,001-50,000)', 'Large Enterprise (50,000+)',
];

// These sheet names are a part of the workbook's calculation contract.  The
// selected-case engine below links the selected row on Inputs directly to the
// editable blue cells on these tabs; no export-time result snapshot sits in
// between the user and the financial statements.
const ARCHETYPE_TAB_NAMES = {
  'internal-process-automation': 'Assumptions - Process',
  'customer-facing-ai': 'Assumptions - Customer',
  'data-analytics-automation': 'Assumptions - Analytics',
  'risk-compliance-legal-ai': 'Assumptions - Compliance',
};

// =====================================================================
export async function generateExcelModel(formData, mcResults, results) {
  // Keep the export compatible with saved models while giving the workbook
  // one transparent source of truth for the new workforce-mix inputs.  The
  // browser can send either the new field names or legacy equivalents.
  const firstPresent = (...values) => values.find(value => value !== undefined && value !== null && value !== '');
  const nonNegative = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
  };
  const optionalNonNegative = (value) => (
    value === undefined || value === null || value === '' ? null : nonNegative(value)
  );
  const fraction = (value, fallback = 0) => {
    const normalized = nonNegative(value, fallback);
    return Math.min(1, normalized > 1 ? normalized / 100 : normalized);
  };

  const legacyTeamSize = Math.max(1, nonNegative(formData.teamSize, 10));
  const legacyAvgSalary = Math.max(1, nonNegative(formData.avgSalary, 200000));
  const directEmployeeCountRaw = firstPresent(
    formData.directEmployeeCount, formData.employeeCount, formData.numberOfEmployees,
    formData.numEmployees, formData.eeCount,
  );
  const offshoreContractorCountRaw = firstPresent(
    formData.offshoreContractorCount, formData.contractorCount, formData.numberOfContractors,
    formData.numContractors,
  );
  const hasWorkforceMix = directEmployeeCountRaw !== undefined || offshoreContractorCountRaw !== undefined;
  let directEmployeeCount = nonNegative(directEmployeeCountRaw, hasWorkforceMix ? 0 : legacyTeamSize);
  let offshoreContractorCount = nonNegative(offshoreContractorCountRaw, 0);
  if (directEmployeeCount + offshoreContractorCount === 0) {
    // A legacy saved model may not have the new counts yet. Preserve its
    // original total instead of exporting a broken zero-headcount workbook.
    directEmployeeCount = legacyTeamSize;
    offshoreContractorCount = 0;
  }
  const employeeFullyBurdenedCost = Math.max(1, nonNegative(firstPresent(
    formData.employeeFullyBurdenedCost, formData.directEmployeeFullyBurdenedCost,
    formData.avgEmployeeFullyBurdenedCost, formData.costOfEE,
  ), legacyAvgSalary));
  const contractorFullyBurdenedCost = Math.max(0, nonNegative(firstPresent(
    formData.contractorFullyBurdenedCost, formData.offshoreContractorFullyBurdenedCost,
    formData.avgContractorFullyBurdenedCost, formData.costOfContractor,
  ), offshoreContractorCount > 0 ? legacyAvgSalary : 0));
  const totalHeadcount = directEmployeeCount + offshoreContractorCount;
  const totalAnnualHeadcountCost = directEmployeeCount * employeeFullyBurdenedCost
    + offshoreContractorCount * contractorFullyBurdenedCost;
  const blendedFullyBurdenedCost = totalHeadcount > 0
    ? totalAnnualHeadcountCost / totalHeadcount
    : legacyAvgSalary;

  // Detailed measured error counts take precedence over a legacy annual total,
  // including an intentional zero. App state retains annualErrorCount for old
  // shared models, so treating its default zero as authoritative would erase
  // newly entered employee/contract error counts in the exported workbook.
  const hasDetailedErrorCounts = [
    formData.errorCountEmployees, formData.employeeErrorCount, formData.annualEmployeeErrorCount,
    formData.errorCountContracts, formData.contractErrorCount, formData.annualContractErrorCount,
  ].some(value => value !== undefined && value !== null && value !== '');
  const detailedEmployeeErrorCount = nonNegative(firstPresent(
    formData.errorCountEmployees, formData.employeeErrorCount, formData.annualEmployeeErrorCount,
  ));
  const detailedContractErrorCount = nonNegative(firstPresent(
    formData.errorCountContracts, formData.contractErrorCount, formData.annualContractErrorCount,
  ));
  const legacyAnnualErrorCount = nonNegative(firstPresent(formData.annualErrorCount, formData.totalAnnualErrorCount));
  const annualEmployeeErrorCount = hasDetailedErrorCounts
    ? detailedEmployeeErrorCount
    : legacyAnnualErrorCount;
  const annualContractErrorCount = hasDetailedErrorCounts
    ? detailedContractErrorCount
    : 0;
  const fractionNeedingRework = fraction(firstPresent(
    formData.fractionNeedingRework, formData.reworkFraction, formData.percentNeedingRework,
  ));
  const estimatedReworkCostPerItem = nonNegative(firstPresent(
    formData.estimatedReworkCostPerItem, formData.reworkCostPerItem, formData.costPerReworkItem,
  ));
  const totalEfficiencyGainPct = fraction(firstPresent(
    formData.totalEfficiencyGainPct, formData.efficiencyGainPct, formData.totalEfficiencyGain,
  ), 0.10);
  const employeesToRetrain = nonNegative(firstPresent(
    formData.employeesToRetrain, formData.employeeCountToRetrain,
  ));
  const employeesToMakeRedundant = nonNegative(firstPresent(
    formData.employeesToMakeRedundant, formData.employeeCountToMakeRedundant,
    formData.redundantEmployeeCount,
  ));
  const contractorsToRollOff = nonNegative(firstPresent(
    formData.contractorsToRollOff, formData.contractorRollOffCount,
  ));
  const requestedHeadcountReductionYears = firstPresent(
    formData.headcountReductionYears,
    formData.yearsToAchieveHeadcountReduction,
    formData.yearsToAchieve,
  );
  const parsedHeadcountReductionYears = Number(requestedHeadcountReductionYears);
  const headcountReductionYears = Math.max(1, Math.min(5, Math.round(
    Number.isFinite(parsedHeadcountReductionYears) ? parsedHeadcountReductionYears : 3,
  )));

  const existingContractCount = nonNegative(firstPresent(
    formData.existingContractCount, formData.existingContracts, formData.contractCount,
    formData.numberOfContracts, formData.vendorsReplaced,
  ));
  const annualCostPerContract = nonNegative(firstPresent(
    formData.annualCostPerContract, formData.costPerContractPerYear,
    formData.contractCostPerYear, formData.annualContractCost,
  ));
  const contractNoticePeriodMonths = nonNegative(firstPresent(
    formData.contractNoticePeriodMonths, formData.breakageNoticePeriodMonths,
    formData.breakageNoticePeriod, formData.noticePeriodMonths,
  ), 3);
  const legacyVendorTerminationCost = nonNegative(formData.vendorTerminationCost);
  const deliveryPaceValue = String(firstPresent(formData.deliveryPace, formData.projectDeliveryPace, 'standard')).toLowerCase();
  const deliveryPace = deliveryPaceValue === 'accelerated' ? 'Accelerated'
    : deliveryPaceValue === 'extended' ? 'Extended'
      : 'Standard';
  const displayArchetypeInputLabel = (input) => (
    input.key === 'handlingTimeMin' ? 'Average time per process (minutes)' : input.label
  );
  // The wizard stores active use-case inputs flat, while some saved models
  // store them under the archetype ID. Resolve both shapes once so every
  // workbook surface (Inputs, Archetype Detail, and bridge formulas) shows
  // the selected use case's actual values rather than silently reverting to
  // defaults.
  const requestedArchetypeId = formData.projectArchetype || formData.processType || 'internal-process-automation';
  const defaultArchetypeId = PROJECT_ARCHETYPES[0]?.id || 'internal-process-automation';
  const supportedArchetypeIds = new Set(PROJECT_ARCHETYPES.map(({ id }) => id));
  // Exports can still be requested from an old shared model after a use case
  // has been retired. Never leave the workbook with an unsupported ID: its
  // lookup formulas would otherwise return #N/A. The web app asks the user to
  // re-select a supported case; this is a conservative export fallback only.
  const hasUnsupportedArchetypeId = !supportedArchetypeIds.has(requestedArchetypeId);
  const selectedArchetypeId = hasUnsupportedArchetypeId
    ? defaultArchetypeId
    : requestedArchetypeId;
  const archetypeFallbackMessage = hasUnsupportedArchetypeId
    ? `${isRetiredArchetype(requestedArchetypeId) ? 'This retired use case' : 'This unsupported use case'} was exported as ${PROJECT_ARCHETYPES.find(({ id }) => id === defaultArchetypeId)?.label || 'Internal Process Automation'} so lookup formulas remain valid. Re-open the web model and select one of the four supported use cases before relying on this export.`
    : null;
  const supportedArchetypeSchemas = ARCHETYPE_INPUT_SCHEMAS
    .filter(({ id }) => supportedArchetypeIds.has(id));

  // The four case tabs use a deliberately stable layout.  Keeping the row
  // map here allows the selected-case engine to use ordinary Excel formulas
  // (rather than a hidden export snapshot or JavaScript-calculated values).
  const CASE_INPUT_START_ROW = 13;
  const CASE_ASSUMPTION_ROW_COUNT = 2;
  const caseInputRef = (schema, key) => {
    const inputIndex = schema.inputs.findIndex((input) => input.key === key);
    if (inputIndex < 0) return null;
    return `'${ARCHETYPE_TAB_NAMES[schema.id]}'!$B$${CASE_INPUT_START_ROW + inputIndex}`;
  };
  const caseMappingRef = (schema, mapsTo) => {
    const mappingIndex = schema.computedMappings.findIndex((mapping) => mapping.mapsTo === mapsTo);
    if (mappingIndex < 0) return null;
    // Header / definition / input rows plus the two plain-English assumption
    // rows precede calculated outputs on every case tab.
    const calculationStartRow = CASE_INPUT_START_ROW + schema.inputs.length
      + 1 + 1 + 1 + CASE_ASSUMPTION_ROW_COUNT + 1 + 1 + 1;
    return `'${ARCHETYPE_TAB_NAMES[schema.id]}'!$B$${calculationStartRow + mappingIndex}`;
  };
  const selectedCaseFormula = (mapsTo, fallback = '0') => {
    let formula = fallback;
    [...supportedArchetypeSchemas].reverse().forEach((schema) => {
      const reference = caseMappingRef(schema, mapsTo);
      if (reference) formula = `IF(Inputs!$B$10="${schema.id}",${reference},${formula})`;
    });
    return formula;
  };
  const selectedCasePrimaryVolumeFormula = (fallback = '0') => {
    let formula = fallback;
    [...supportedArchetypeSchemas].reverse().forEach((schema) => {
      const reference = caseInputRef(schema, schema.inputs[0]?.key);
      if (reference) formula = `IF(Inputs!$B$10="${schema.id}",${reference},${formula})`;
    });
    return formula;
  };
  const rawArchetypeInputs = formData.archetypeInputs && typeof formData.archetypeInputs === 'object'
    ? formData.archetypeInputs
    : {};
  const hasNestedArchetypeInputValues = Object.values(rawArchetypeInputs)
    .some(value => value && typeof value === 'object' && !Array.isArray(value));
  const resolveArchetypeInputValues = (archetypeId) => {
    const nested = rawArchetypeInputs[archetypeId];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) return nested;
    return !hasNestedArchetypeInputValues && archetypeId === selectedArchetypeId
      ? rawArchetypeInputs
      : {};
  };
  const benchmarkSourceById = new Map(BENCHMARK_SOURCES.map(source => [source.id, source]));
  const sourceCitation = (id) => {
    const source = benchmarkSourceById.get(id);
    return source ? `[${id}] ${source.full}` : `[${id}] Source registry entry unavailable`;
  };

  const wb = new ExcelJS.Workbook();
  wb.creator = 'AI ROI Calculator';
  wb.created = new Date();

  // Determine which tabs to show based on role tier
  const tier = getOutputTier(formData.role);
  const includedTabs = EXCEL_TABS[tier] || EXCEL_TABS.detailed;

  // Create all worksheets in tab order (all needed for formula cross-refs)
  const I = wb.addWorksheet('Inputs', { tabColor: { argb: 'FF2196F3' } });
  const AD = wb.addWorksheet('Archetype Detail', { tabColor: { argb: 'FF7C4DFF' } });
  const KF = wb.addWorksheet('Key Formulas', { tabColor: { argb: 'FF4CAF50' } });
  const SU = wb.addWorksheet('Summary', { tabColor: { argb: `FF${NAVY}` } });
  const PL = wb.addWorksheet('P&L & Cash Flow', { tabColor: { argb: `FF${NAVY}` } });
  const SE = wb.addWorksheet('Sensitivity', { tabColor: { argb: 'FFFF9800' } });
  const V5 = wb.addWorksheet('V5 Analysis', { tabColor: { argb: 'FF00897B' } });
  const L = wb.addWorksheet('Lookups', { tabColor: { argb: 'FF9E9E9E' } });
  const AU = wb.addWorksheet('Model Audit', { tabColor: { argb: 'FFE53935' } });
  const GL = wb.addWorksheet('Glossary', { tabColor: { argb: 'FF6A1B9A' } });
  const SF = wb.addWorksheet('Sources & Footnotes', { tabColor: { argb: 'FF6A1B9A' } });
  // The workbook intentionally does not copy runCalculations results into a
  // hidden sheet.  The blue cells and formula chain in this file are the
  // source of the exported result, so an analyst can edit a cell and trace
  // the impact through Key Formulas, P&L, Summary, and sensitivity tables.

  // ===================================================================
  // TAB 6: LOOKUPS — All reference tables (EXACT same cell positions)
  // ===================================================================
  cols(L, [35, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12]);

  // Automation Potential Matrix (R1-R12)
  hdr(L, 1, 'AUTOMATION POTENTIAL — MODEL CONTEXT [M1]', 9);
  tableHeaders(L, 2, ['Industry', ...PROCESS_TYPES]);
  const AP = [
    [0.60,0.50,0.55,0.45,0.65,0.40,0.50,0.40],
    [0.55,0.45,0.50,0.40,0.55,0.35,0.60,0.35],
    [0.45,0.35,0.40,0.45,0.40,0.25,0.50,0.30],
    [0.50,0.40,0.45,0.35,0.60,0.30,0.55,0.35],
    [0.55,0.60,0.50,0.40,0.60,0.45,0.45,0.40],
    [0.50,0.40,0.45,0.50,0.45,0.40,0.40,0.35],
    [0.45,0.50,0.40,0.45,0.45,0.50,0.35,0.35],
    [0.45,0.40,0.45,0.35,0.50,0.25,0.55,0.30],
    [0.40,0.30,0.35,0.30,0.35,0.20,0.45,0.25],
    [0.45,0.40,0.40,0.35,0.45,0.30,0.40,0.30],
  ];
  INDUSTRIES.forEach((ind, i) => {
    dataRow(L, 3 + i, [ind, ...AP[i]], [null, ...Array(8).fill(PCT)]);
  });

  // Industry planning envelope (R14-R25)
  hdr(L, 14, 'INDUSTRY PLANNING ENVELOPE [M1]', 9);
  tableHeaders(L, 15, ['Industry', 'Success Rate', 'Comp Penalty', 'Compl Risk', 'Rev:TTM', 'Rev:CX', 'Rev:NewCap', 'Wage Growth', 'AI Cost Mult']);
  const IB = [
    [0.72,0.05,0.02,0.08,0.05,0.04,0.045,1.00], [0.65,0.04,0.05,0.05,0.06,0.03,0.040,1.30],
    [0.58,0.02,0.06,0.04,0.03,0.05,0.050,1.35], [0.62,0.03,0.03,0.06,0.03,0.03,0.035,1.15],
    [0.68,0.05,0.02,0.07,0.08,0.04,0.035,1.00], [0.64,0.04,0.03,0.05,0.04,0.04,0.040,1.10],
    [0.60,0.04,0.02,0.08,0.06,0.05,0.035,1.00], [0.55,0.02,0.04,0.03,0.03,0.02,0.030,1.20],
    [0.45,0.01,0.04,0.02,0.02,0.01,0.030,1.40], [0.55,0.03,0.02,0.04,0.04,0.03,0.040,1.05],
  ];
  INDUSTRIES.forEach((ind, i) => {
    dataRow(L, 16 + i, [ind, ...IB[i]], [null, PCT, PCT, PCT, PCT, PCT, PCT, PCT, DEC]);
  });

  // Readiness Multipliers (R27-R33)
  hdr(L, 27, 'READINESS PLANNING MULTIPLIERS [M1]', 4);
  tableHeaders(L, 28, ['Level', 'Adoption Rate', 'Timeline Mult', 'Cost Mult']);
  [[1,0.40,1.40,1.30],[2,0.55,1.25,1.20],[3,0.70,1.10,1.10],[4,0.85,1.00,1.00],[5,0.95,0.90,1.00]].forEach((d, i) => {
    dataRow(L, 29 + i, d, ['0', PCT, DEC, DEC]);
  });

  // Company Size Master (R35-R41)
  hdr(L, 35, 'COMPANY-SIZE PLANNING ENVELOPE [M1]', 14);
  tableHeaders(L, 36, ['Size','Size Mult','Disc Rate','Max Team','Sep Mult','License','Legal','Security','Compliance','Cyber Ins','Vendor Switch','Dip Months','Dip Rate','Agent Infra / Mo']);
  const SM = [
    ['Startup (1-50)',0.70,0.18,3,0.70,12000,10000,8000,8000,2000,0.30,1.0,0.10,200],
    ['SMB (51-500)',0.85,0.14,5,1.00,24000,20000,15000,15000,5000,0.35,1.5,0.12,700],
    ['Mid-Market (501-5,000)',1.00,0.10,10,1.15,48000,40000,30000,30000,12000,0.40,2.0,0.15,1850],
    ['Enterprise (5,001-50,000)',1.30,0.09,15,1.30,96000,75000,60000,60000,25000,0.50,2.5,0.18,4500],
    ['Large Enterprise (50,000+)',1.60,0.08,25,1.50,180000,120000,100000,100000,50000,0.60,3.0,0.20,11500],
  ];
  SM.forEach((d, i) => {
    dataRow(L, 37 + i, d, [null, DEC, PCT, '0', DEC, DOL, DOL, DOL, DOL, DOL, PCT, DEC, PCT, DOL]);
  });

  // Delivery pace (R43-R47). These are transparent model scenarios tied to
  // the weighted direct-employee / contractor workforce rate, not locations.
  hdr(L, 43, 'DELIVERY-PACE PLANNING SCENARIOS [D1]', 4);
  tableHeaders(L, 44, ['Delivery Pace', 'Staffing / Cost', 'Duration', 'Rate Basis']);
  [
    ['Accelerated', 1.20, 0.80, 'Weighted workforce mix'],
    ['Standard', 1.00, 1.00, 'Weighted workforce mix'],
    ['Extended', 0.80, 1.25, 'Weighted workforce mix'],
  ].forEach((row, i) => { dataRow(L, 45 + i, row, [null, PCT, PCT, null]); });

  // Process Type Master (R54-R63)
  hdr(L, 54, 'PROCESS-TYPE COST / VOLUME CONTEXT [M1]', 4);
  tableHeaders(L, 55, ['Process Type', 'API $/1K', 'Req/Hour', 'Tool Replace %']);
  const PT = [[20,12,0.55],[8,25,0.45],[15,8,0.50],[25,6,0.40],[5,30,0.65],[20,10,0.45],[12,15,0.50],[10,12,0.40]];
  PROCESS_TYPES.forEach((p, i) => { dataRow(L, 56 + i, [p, ...PT[i]], [null, DOL, '0', PCT]); });

  // State R&D Credit (R65-R79)
  hdr(L, 65, 'STATE R&D CREDIT PLANNING PLACEHOLDERS [M1]', 2);
  tableHeaders(L, 66, ['State', 'Rate']);
  const STATES = [
    ['California',0.24],['New York',0.06],['Texas',0.05],['Massachusetts',0.10],
    ['Washington',0.015],['Illinois',0.065],['Pennsylvania',0.10],['Georgia',0.10],
    ['New Jersey',0.10],['Colorado',0.03],['Virginia',0.0],['Florida',0.0],['Other / Not Sure',0.0],
  ];
  STATES.forEach((s, i) => { dataRow(L, 67 + i, s, [null, PCT]); });

  // Constants (R81-R100)
  hdr(L, 81, 'MODEL CONSTANTS', 2);
  const CONSTS = [
    ['DCF Years',5,'0'],['Max Headcount Reduction',0.75,PCT],['Contingency Rate',0.10,PCT],
    ['Cultural Resistance Rate',0.04,PCT],['Wage Inflation Rate',0.04,PCT],
    ['Legacy Maintenance Creep',0.07,PCT],['Model Retraining Rate',0.05,PCT],
    ['Retained Retraining Rate',0.03,PCT],['Tech Debt Rate',0.03,PCT],
    ['Adjacent Product Rate',0.25,PCT],['Revenue Risk Discount',0.50,PCT],
    ['R&D Qualification Rate',0.65,PCT],['Federal R&D Rate',0.065,PCT],
    ['Max ROIC Cap',1.00,PCT],['Max IRR Cap',2.00,PCT],
    ['Change Mgmt Rate',0.08,PCT],['Infra Cost Rate',0.12,PCT],
    ['Training Cost Rate',0.08,PCT],['PM Salary Factor',0.85,DEC],
  ];
  CONSTS.forEach((c, i) => { val(L, 82 + i, 1, c[0]); val(L, 82 + i, 2, c[1], c[2], inputFill); });

  // Schedules (R102-R108). Workforce timing is now live from the user’s
  // Inputs!B38 selection, so these legacy columns remain neutral and cannot
  // be mistaken for a second 50/30/20 severance schedule.
  hdr(L, 102, 'YEAR-BY-YEAR ADOPTION & COST SCHEDULES', 6);
  tableHeaders(L, 103, ['Year', 'Legacy workforce phase (not used)', 'Legacy cumulative phase (not used)', 'Adoption Ramp', 'Cost Escalation', 'Cum Escalation']);
  const SCHED = [
    [1,0,0,0.75,0,1.000000],[2,0,0,0.90,0.08,1.080000],
    [3,0,0,1.00,0.04,1.123200],[4,0,0,1.00,0,1.123200],[5,0,0,1.00,-0.03,1.089504],
  ];
  SCHED.forEach((s, i) => {
    dataRow(L, 104 + i, s, ['0', PCT, PCT, PCT, PCT, DEC]);
    // Color schedule values as input cells for auditability
    for (let c = 2; c <= 6; c++) L.getRow(104 + i).getCell(c).fill = inputFill;
  });

  // Separation Breakdown (R116-R122)
  hdr(L, 116, 'SEPARATION COST MODEL COMPONENTS [W1]', 2);
  tableHeaders(L, 117, ['Component', 'Rate']);
  [['Severance Pay',0.55],['Benefits Continuation',0.15],['Outplacement Services',0.12],
   ['Administrative / HR',0.10],['Legal Review',0.08]].forEach((s, i) => {
    dataRow(L, 118 + i, s, [null, PCT]);
  });

  // Illustrative peer planning ranges (R124-R175)
  hdr(L, 124, 'ILLUSTRATIVE PEER PLANNING RANGES [M1]', 4);
  tableHeaders(L, 125, ['Industry|Size', 'Median ROIC', 'P25', 'P75']);
  const PEERS = {
    'Technology / Software': [[0.45,0.20,0.80],[0.50,0.25,0.85],[0.55,0.30,0.90],[0.48,0.22,0.78],[0.42,0.18,0.72]],
    'Financial Services / Banking': [[0.35,0.15,0.65],[0.40,0.18,0.70],[0.45,0.22,0.75],[0.42,0.20,0.72],[0.38,0.15,0.65]],
    'Healthcare / Life Sciences': [[0.25,0.10,0.50],[0.30,0.12,0.55],[0.35,0.15,0.60],[0.32,0.14,0.58],[0.28,0.10,0.52]],
    'Manufacturing / Industrial': [[0.30,0.12,0.55],[0.35,0.15,0.60],[0.40,0.18,0.68],[0.38,0.16,0.65],[0.35,0.14,0.60]],
    'Retail / E-Commerce': [[0.38,0.16,0.68],[0.42,0.20,0.72],[0.48,0.24,0.80],[0.44,0.20,0.75],[0.40,0.18,0.70]],
    'Professional Services / Consulting': [[0.32,0.14,0.58],[0.38,0.18,0.65],[0.42,0.20,0.70],[0.40,0.18,0.68],[0.36,0.15,0.62]],
    'Media / Entertainment': [[0.35,0.14,0.62],[0.40,0.18,0.68],[0.45,0.22,0.75],[0.42,0.20,0.72],[0.38,0.16,0.65]],
    'Energy / Utilities': [[0.22,0.08,0.42],[0.28,0.10,0.48],[0.32,0.14,0.55],[0.30,0.12,0.52],[0.26,0.10,0.48]],
    'Government / Public Sector': [[0.15,0.05,0.30],[0.18,0.06,0.35],[0.22,0.08,0.40],[0.20,0.07,0.38],[0.18,0.06,0.35]],
    'Other': [[0.28,0.10,0.50],[0.32,0.14,0.55],[0.38,0.18,0.62],[0.35,0.15,0.58],[0.30,0.12,0.52]],
  };
  let pr = 126;
  INDUSTRIES.forEach(ind => {
    SIZES.forEach((sz, si) => {
      dataRow(L, pr, [`${ind}|${sz}`, ...PEERS[ind][si]], [null, PCT, PCT, PCT]);
      pr++;
    });
  });

  // Regulatory event planning envelope by industry (R177-R188)
  hdr(L, 177, 'REGULATORY EVENT PLANNING ENVELOPE [M1]', 4);
  tableHeaders(L, 178, ['Industry', 'Event Probability', 'Avg Impact', 'AI Reduction %']);
  const REG_EVENTS = [
    [0.03,5000000,0.30],[0.08,25000000,0.25],[0.05,20000000,0.35],
    [0.04,10000000,0.30],[0.03,3000000,0.25],[0.03,5000000,0.20],
    [0.02,2000000,0.20],[0.06,15000000,0.30],[0.04,8000000,0.25],[0.03,5000000,0.25],
  ];
  INDUSTRIES.forEach((ind, i) => {
    dataRow(L, 179 + i, [ind, ...REG_EVENTS[i]], [null, PCT, DOL, PCT]);
  });

  // Cycle Time Reduction by Industry (R190-R201)
  hdr(L, 190, 'CYCLE-TIME PLANNING ENVELOPE [M1]', 3);
  tableHeaders(L, 191, ['Industry', 'Months Reduced', 'Revenue Multiplier']);
  const CYCLE_TIMES = [
    [2,0.08],[3,0.05],[4,0.04],[2,0.06],[1.5,0.07],
    [2,0.05],[1,0.08],[3,0.03],[4,0.02],[2,0.04],
  ];
  INDUSTRIES.forEach((ind, i) => {
    dataRow(L, 192 + i, [ind, ...CYCLE_TIMES[i]], [null, DEC, PCT]);
  });

  // Archetype List (R203-R208) — for dropdown on Inputs tab + Archetype Detail
  // Column C = primary process type — used to translate archetype ID → process type for MATCH
  hdr(L, 203, 'ARCHETYPE LIST', 4);
  tableHeaders(L, 204, ['Archetype ID', 'Label', 'Primary Process Type', 'Tool Replacement Rate']);
  PROJECT_ARCHETYPES.forEach((a, i) => {
    const defaults = getArchetypeDefaults(a.id, formData.industry || 'Technology / Software');
    const exportedOverride = a.id === selectedArchetypeId
      ? Number(formData.assumptions?.toolReplacementRate)
      : NaN;
    dataRow(L, 205 + i, [
      a.id,
      a.label,
      a.sourceProcessTypes[0] || 'Other',
      Number.isFinite(exportedOverride) ? exportedOverride : (defaults?.toolReplacementRate ?? 0.40),
    ], [null, null, null, PCT]);
  });

  // Classification Scoring Matrix (R218-R231)
  hdr(L, 218, 'CLASSIFICATION SCORING MATRIX', 7);
  tableHeaders(L, 219, ['Archetype ID', ...CLASSIFICATION_QUESTIONS.map(q => q.label)]);
  PROJECT_ARCHETYPES.forEach((a, i) => {
    const profile = CLASSIFICATION_PROFILES[a.id] || [3,3,3,3,3,3];
    dataRow(L, 220 + i, [a.id, ...profile], [null, '0', '0', '0', '0', '0', '0']);
  });

  // Hide the Lookups tab
  L.state = 'hidden';

  // Protect formula/output sheets to prevent accidental overwrites
  // Inputs and Archetype Detail remain editable
  KF.protect('', { selectLockedCells: true, selectUnlockedCells: true });
  SU.protect('', { selectLockedCells: true, selectUnlockedCells: true });
  PL.protect('', { selectLockedCells: true, selectUnlockedCells: true });
  SE.protect('', { selectLockedCells: true, selectUnlockedCells: true });
  V5.protect('', { selectLockedCells: true, selectUnlockedCells: true });
  L.protect('', { selectLockedCells: true, selectUnlockedCells: true });
  AU.protect('', { selectLockedCells: true, selectUnlockedCells: true });

  // ===================================================================
  // TAB 1: INPUTS — Consolidated, numbered, key-driver-highlighted
  // Column A = ID + Label, Column B = Value (SAME positions as before),
  // Column C = Plain-English description, Column D = Impact level.
  // All Inputs!B__ references from other tabs remain valid.
  // ===================================================================

  // Styles for key drivers vs standard inputs
  const keyFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB8D4E8' } }; // deeper blue for key drivers
  const stdFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF4F9' } }; // very light blue for standard
  const keyFont = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0000FF' } };  // bold blue
  const stdInputFont = { name: 'Calibri', size: 10, color: { argb: 'FF0000FF' } };          // blue
  const inputLabelFont = { name: 'Calibri', size: 10, bold: true, color: { argb: `FF${NAVY}` } };
  const keyLabelFont = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0D47A1' } };
  const descFont = { name: 'Calibri', size: 9, color: { argb: 'FF757575' } };
  const impactKeyFont = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF0000FF' } };
  const impactStdFont = { name: 'Calibri', size: 9, color: { argb: 'FF90A4AE' } };
  const inputDivider = { bottom: { style: 'hair', color: { argb: 'FFD9E2F3' } } };

  // The previous presentation exposed audit IDs ("1a", "6b") without the
  // actual input names. Keep those IDs in code and the formula map, but give
  // the operator a plain-English label in the visible sheet.
  const INPUT_LABELS = {
    '1a': 'Industry',
    '1b': 'Company size',
    '1c': 'State for R&D credit',
    '2a': 'AI use case',
    '2b': 'Current process workforce',
    '2c': 'Hours per person / week',
    '2d': 'Blended fully burdened cost',
    '2e': 'Legacy error rate (not used)',
    '2f': 'Current tool spend',
    '3a': 'Change readiness',
    '3b': 'Data readiness',
    '3c': 'Executive sponsor',
    '4a': 'Implementation budget',
    '4b': 'Expected timeline (months)',
    '4c': 'Annual AI run-cost override',
    '4d': 'Existing contracts (linked)',
    '4e': 'Annual cost per contract (linked)',
    '5a': 'Cash-realization context',
    '5b': 'Legacy annual revenue (not used)',
    '5c': 'Legacy contribution margin (not used)',
    '5d': 'Freed capacity context (not used)',
    '5e': 'Include risk avoidance (context)',
    '5f': 'Legacy revenue acceleration (not used)',
    '5g': 'Retained-talent premium',
    '5h': 'Multi-step agent workflow',
    '5i': 'Years to achieve workforce reduction',
    '6a': 'Direct employees',
    '6b': 'Direct employee fully burdened cost',
    '6c': 'Offshore contractors',
    '6d': 'Contractor fully burdened cost',
    '6e': 'Total annual headcount cost',
    '6f': 'Blended annual cost per person',
    '7a': 'Employee errors / year',
    '7b': 'Contractor errors / year',
    '7c': 'Errors requiring rework',
    '7d': 'Rework cost / item',
    '7e': 'Annual measured rework cost',
    '7f': 'Total efficiency gain',
    '7g': 'Employees to retrain',
    '7h': 'Employees to make redundant',
    '7i': 'Contractors to roll off',
    '8a': 'Existing contracts to cancel',
    '8b': 'Annual cost per contract',
    '8c': 'Notice period (months)',
    '8d': 'Annual contract spend',
    '8e': 'Estimated contract cancellation cost',
    legacy: 'Legacy fixed exit cost (fallback only)',
    '9a': 'Delivery pace',
    '9b': 'Deployment cost adjustment',
    '9c': 'Deployment duration adjustment',
    '10a': 'Licensed AI users / seats',
    '10b': 'Monthly AI requests',
    '10c': 'Average input tokens / request',
    '10d': 'Average output tokens / request',
    '10e': 'Monthly agent workflows',
    '10f': 'Documents processed / month',
    '10g': 'Data stored (GB)',
    '10h': 'Connected applications',
    '10i': 'Modeled monthly usage volume',
    '10j': 'Customer Service cash-savings evidence',
  };

  function inputRowHeight(label, description) {
    // Excel does not auto-fit wrapped content on generated worksheets. Size
    // rows deliberately so a printed copy never crops the plain-English note.
    const labelLines = Math.ceil((label || '').length / 34);
    const noteLines = Math.ceil((description || '').length / 78);
    return Math.min(60, Math.max(24, 12 + Math.max(labelLines, noteLines) * 11));
  }

  // Helper: write an input row with a readable label, value, guidance, and
  // model role. Column B addresses never change because the formula engine
  // continues to depend on them.
  function inp(ws, r, id, v, fmt, isKey, desc, impact) {
    const fill = isKey ? keyFill : stdFill;
    const vFont = isKey ? keyFont : stdInputFont;
    const row = ws.getRow(r);
    const label = INPUT_LABELS[id] || id;
    // Col A: plain-English input name (audit IDs remain in source/formulas).
    const labelCell = row.getCell(1);
    labelCell.value = label;
    labelCell.font = isKey ? keyLabelFont : inputLabelFont;
    labelCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    labelCell.border = inputDivider;
    // Col B: Value
    const cell = row.getCell(2);
    cell.value = v;
    cell.font = vFont;
    cell.fill = fill;
    cell.border = thinBorder;
    // These are the only cells a user is meant to type into on the Inputs
    // tab.  They must remain editable even when worksheet protection is
    // enabled by a downstream user or template process.
    cell.protection = { locked: false };
    if (fmt) cell.numFmt = fmt;
    setAlignment(cell, (fmt || typeof v === 'number') ? 'right' : 'left');
    // Col C: Description
    const descriptionCell = row.getCell(3);
    descriptionCell.value = desc || '';
    descriptionCell.font = descFont;
    descriptionCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    descriptionCell.border = inputDivider;
    // Col D: Impact
    const impactCell = row.getCell(4);
    impactCell.border = inputDivider;
    if (impact) {
      impactCell.value = impact;
      impactCell.font = isKey ? impactKeyFont : impactStdFont;
      impactCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    }
    row.height = inputRowHeight(label, desc);
  }

  // One compact four-column table: input name, editable/calculated value,
  // plain-English guidance, and role. This prints on one landscape page wide
  // instead of splitting a disconnected "start here" panel onto page two.
  cols(I, [34, 24, 58, 18]);
  hdr(I, 1, 'INPUTS — DECISION-GRADE ROI MODEL', 4);
  tableHeaders(I, 2, [
    'INPUT',
    'VALUE\nBlue = editable | Green = calculated',
    'WHAT TO ENTER OR VALIDATE',
    'MODEL ROLE',
  ]);
  I.getRow(2).height = 30;

  // ---------------------------------------------------------------
  // 1. THE BIG THREE — Key Drivers (highlighted)
  // ---------------------------------------------------------------
  sub(I, 3, 'TIER 2 — COMPANY & READINESS CONTEXT', 4);

  inp(I, 4, '1a', formData.industry || 'Technology / Software', null, false,
    'Your industry — selects model planning context for automation and risk; validate company-specific values before using them in a decision.', '');

  inp(I, 5, '1b', formData.companySize || 'Mid-Market (501-5,000)', null, false,
    'Company size — affects discount rate, compliance costs, and team capacity', '');

  inp(I, 7, '1c', formData.companyState || 'Other / Not Sure', null, false,
    'US state for R&D tax credit (optional)', '');

  // Row 8: blank
  // ---------------------------------------------------------------
  // 2. PROJECT SCOPE — What are you automating?
  // ---------------------------------------------------------------
  sub(I, 9, 'TIER 2 — PROJECT & COST FRAMEWORK', 4);

  inp(I, 10, '2a', selectedArchetypeId, null, true,
    archetypeFallbackMessage || 'Type of AI project — determines the case-specific operating drivers and model guardrails.', 'KEY DRIVER');

  inp(I, 11, '2b', totalHeadcount, NUM, true,
    'Calculated total of direct employees and offshore contractors doing this work', 'KEY DRIVER #1');
  fml(I, 11, 2, 'B40+B42', NUM, calcFill);

  inp(I, 12, '2c', formData.hoursPerWeek || 40, NUM, false,
    '[H1] 40 hours/week is a full-time work-calendar planning convention (2,080 hours/year), not a benchmark. Enter the actual hours each person spends on this process.', '');

  inp(I, 13, '2d', blendedFullyBurdenedCost, DOL, true,
    'Calculated weighted annual fully burdened cost across the employee and contractor mix', 'KEY DRIVER #2');
  fml(I, 13, 2, 'IF(B11>0,B44/B11,0)', DOL, calcFill);

  // Preserve this legacy address for older workbooks/formulas, but remove the
  // blanket error-rate assumption from the user-facing model. Measurable
  // rework inputs are surfaced in section 7 below.
  inp(I, 14, '2e', 0, PCT, false, 'Legacy error-rate compatibility field (not used)', '');
  I.getRow(14).hidden = true;

  inp(I, 15, '2f', formData.currentToolCosts || 0, DOL, false,
    'Annual spend on current software/tools for this process (licenses, SaaS, maintenance)', '');

  // Row 16: blank
  // ---------------------------------------------------------------
  // 3. ORGANIZATION READINESS — How prepared are you?
  // ---------------------------------------------------------------
  sub(I, 17, 'TIER 2 — ORGANIZATION READINESS', 4);

  inp(I, 18, '3a', formData.changeReadiness || 3, '0', false,
    'How open is your team to new tools? 1=Resistant, 3=Neutral, 5=Champion. Affects adoption speed', 'High Impact');

  inp(I, 19, '3b', formData.dataReadiness || 3, '0', false,
    'How clean and accessible is your data? 1=Messy/siloed, 3=Usable, 5=Governed/API-ready', 'High Impact');

  inp(I, 20, '3c', formData.execSponsor === false ? 'No' : 'Yes', null, false,
    'Do you have a C-level or VP sponsor? This is a model-readiness input; confirm an accountable sponsor, decision rights, and funding support.', 'High Impact');

  // Row 21: blank
  // ---------------------------------------------------------------
  // 4. AI INVESTMENT — What will it cost?
  // ---------------------------------------------------------------
  sub(I, 22, 'TIER 2 — INITIAL AI INVESTMENT', 4);

  inp(I, 23, '4a', formData.implementationBudget || 100000, DOL, false,
    'Total budget for building/deploying the AI solution (engineering, setup, integration)', '');

  inp(I, 24, '4b', formData.expectedTimeline || 4.5, '0.0', false,
    'How many months to go live? Shorter timelines increase engineering cost', '');

  const hasExplicitOngoingAnnualCost = formData.ongoingAnnualCost !== undefined
    && formData.ongoingAnnualCost !== null;
  inp(I, 25, '4c', hasExplicitOngoingAnnualCost ? formData.ongoingAnnualCost : null, DOL, false,
    'Annual cost to run the AI after launch (API fees, hosting, maintenance, monitoring). Leave blank to use the model-derived operating-cost build-up.', '');

  inp(I, 26, '4d', existingContractCount, '0', false,
    'Calculated link to the existing-contract count in section 8', '');
  fml(I, 26, 2, 'B58', NUM, calcFill);

  inp(I, 27, '4e', annualCostPerContract, DOL, false,
    'Calculated link to annual cost per contract in section 8', '');
  fml(I, 27, 2, 'B59', DOL, calcFill);

  // Row 28: blank
  // ---------------------------------------------------------------
  // 5. ADVANCED (Optional) — Fine-tune the model
  // ---------------------------------------------------------------
  sub(I, 29, 'TIER 3 — OPTIONAL CONTEXT & ADVANCED ASSUMPTIONS', 4);

  inp(I, 30, '5a', formData.cashRealizationPct ?? 0.40, PCT, false,
    'Planning context only in this export. The core DCF uses explicit redundancies, measurable rework, tools, and contracts—not a generic efficiency-to-cash conversion.', '');

  inp(I, 31, '5b', formData.annualRevenue || 0, DOL, false,
    'Legacy saved-model compatibility field (not used by the supported use cases)', '');
  I.getRow(31).hidden = true;

  inp(I, 32, '5c', formData.contributionMargin ?? 0.30, PCT, false,
    'Legacy saved-model compatibility field (not used by the supported use cases)', '');
  I.getRow(32).hidden = true;

  inp(I, 33, '5d', formData.includeCapacityValue ? 'Yes' : 'No', null, false,
    'Show freed-up employee time as planning context? It is excluded from this Excel DCF, NPV, ROIC, and payback unless Finance explicitly changes the cash-flow formulas.', '');
  // Retain the legacy value for saved-model compatibility, but do not present
  // it as a DCF switch because it does not alter the exported cash flow.
  I.getRow(33).hidden = true;

  inp(I, 34, '5e', formData.includeRiskReduction ? 'Yes' : 'No', null, false,
    'Count reduced compliance/regulatory risk as value in the ROI calculation?', '');

  inp(I, 35, '5f', formData.includeRevenueAcceleration ? 'Yes' : 'No', null, false,
    'Legacy saved-model compatibility field (not used by the supported use cases)', '');
  I.getRow(35).hidden = true;

  inp(I, 36, '5g', formData.retainedTalentPremiumRate ?? 0.10, PCT, false,
    'Wage increase for employees you keep (to retain top talent during AI transition)', '');

  inp(I, 37, '5h', formData.isAgenticWorkflow ? 'Yes' : 'No', null, false,
    'Is this a multi-step AI agent workflow? [29] Agentic workflows may use materially more model calls; validate against measured usage.', '');

  inp(I, 38, '5i', headcountReductionYears, NUM, false,
    'User-entered realization period for selected workforce actions. The model spreads selected direct redundancies, explicit contractor roll-offs, and direct-employee severance evenly across these years. Capacity is not a layoff forecast.', '');

  // Data validation dropdowns (same cell positions as before)
  I.getRow(4).getCell(2).dataValidation = { type: 'list', formulae: ['Lookups!$A$3:$A$12'] };
  I.getRow(5).getCell(2).dataValidation = { type: 'list', formulae: ['Lookups!$A$37:$A$41'] };
  I.getRow(7).getCell(2).dataValidation = { type: 'list', formulae: ['Lookups!$A$67:$A$79'] };
  I.getRow(10).getCell(2).dataValidation = { type: 'list', formulae: ['Lookups!$A$205:$A$208'] };
  I.getRow(18).getCell(2).dataValidation = { type: 'list', formulae: ['"1,2,3,4,5"'] };
  I.getRow(19).getCell(2).dataValidation = { type: 'list', formulae: ['"1,2,3,4,5"'] };
  I.getRow(20).getCell(2).dataValidation = { type: 'list', formulae: ['"Yes,No"'] };
  I.getRow(33).getCell(2).dataValidation = { type: 'list', formulae: ['"Yes,No"'] };
  I.getRow(34).getCell(2).dataValidation = { type: 'list', formulae: ['"Yes,No"'] };
  I.getRow(35).getCell(2).dataValidation = { type: 'list', formulae: ['"Yes,No"'] };
  I.getRow(37).getCell(2).dataValidation = { type: 'list', formulae: ['"Yes,No"'] };
  I.getRow(38).getCell(2).dataValidation = { type: 'list', formulae: ['"1,2,3,4,5"'] };
  I.getRow(65).getCell(2).dataValidation = { type: 'list', formulae: ['"Accelerated,Standard,Extended"'] };

  // ---------------------------------------------------------------
  // 6. WORKFORCE MIX & PRODUCTIVITY — Core operating assumptions
  // ---------------------------------------------------------------
  const exportInputRows = {
    directEmployeeCount: 40,
    employeeFullyBurdenedCost: 41,
    offshoreContractorCount: 42,
    contractorFullyBurdenedCost: 43,
    totalAnnualHeadcountCost: 44,
    blendedFullyBurdenedCost: 45,
    annualEmployeeErrorCount: 48,
    annualContractErrorCount: 49,
    fractionNeedingRework: 50,
    estimatedReworkCostPerItem: 51,
    annualMeasuredReworkCost: 52,
    totalEfficiencyGainPct: 53,
    employeesToRetrain: 54,
    employeesToMakeRedundant: 55,
    contractorsToRollOff: 56,
    headcountReductionYears: 38,
    existingContractCount: 58,
    annualCostPerContract: 59,
    contractNoticePeriodMonths: 60,
    annualContractSpend: 61,
    estimatedContractExitCost: 62,
    legacyVendorTerminationCost: 63,
    deliveryPace: 65,
    deliveryCostMultiplier: 66,
    deliveryDurationMultiplier: 67,
    aiLicensedUsers: 69,
    monthlyAiRequests: 70,
    avgInputTokensPerRequest: 71,
    avgOutputTokensPerRequest: 72,
    monthlyAgentWorkflows: 73,
    documentsPerMonth: 74,
    dataStoredGb: 75,
    connectedApplications: 76,
    monthlyUsageVolume: 77,
  };

  sub(I, 39, '6. WORKFORCE MIX & PRODUCTIVITY — Who does this work today?', 4);
  inp(I, 40, '6a', directEmployeeCount, NUM, true,
    'Number of direct employees currently doing this work', 'KEY DRIVER #1');
  inp(I, 41, '6b', employeeFullyBurdenedCost, DOL, true,
    '[L1] Editable $125,000 direct-employee starting point in the UI; illustrative model placeholder, not an industry benchmark. Replace with actual annual fully burdened cost (pay, benefits, tax, and overhead).', 'KEY DRIVER #2');
  inp(I, 42, '6c', offshoreContractorCount, NUM, true,
    'Number of offshore contractors currently doing this work', 'KEY DRIVER #1');
  inp(I, 43, '6d', contractorFullyBurdenedCost, DOL, true,
    '[L2] Editable $65,000 offshore-contractor starting point in the UI; illustrative model placeholder, not an industry benchmark. Replace with actual annual fully burdened contractor cost.', 'KEY DRIVER #2');
  inp(I, 44, '6e', totalAnnualHeadcountCost, DOL, false,
    'Calculated: direct employee cost + offshore contractor cost', '');
  fml(I, 44, 2, 'B40*B41+B42*B43', DOL, calcFill);
  inp(I, 45, '6f', blendedFullyBurdenedCost, DOL, false,
    'Calculated weighted annual cost per person across the workforce mix', '');
  fml(I, 45, 2, 'IF(B11>0,B44/B11,0)', DOL, calcFill);

  sub(I, 47, '7. MEASURABLE REWORK & EFFICIENCY — Use evidence, not a blanket rate', 4);
  inp(I, 48, '7a', annualEmployeeErrorCount, NUM, false,
    'Annual errors attributable to employees (enter 0 if not measured)', '');
  inp(I, 49, '7b', annualContractErrorCount, NUM, false,
    'Annual errors attributable to contractors (enter 0 if not measured)', '');
  inp(I, 50, '7c', fractionNeedingRework, PCT, false,
    'Share of measured errors that actually require rework', '');
  inp(I, 51, '7d', estimatedReworkCostPerItem, DOL, false,
    'Estimated all-in cost to correct one rework item', '');
  inp(I, 52, '7e', 0, DOL, false,
    'Calculated: (employee errors + contractor errors) × rework share × cost per item', '');
  fml(I, 52, 2, '(B48+B49)*B50*B51', DOL, calcFill);
  inp(I, 53, '7f', totalEfficiencyGainPct, PCT, true,
    '[E1] 10% model midpoint for planning context, informed by Capgemini [44] reporting 6–14% GenAI cost reduction. Replace with a pilot/process measurement; capacity remains outside core DCF cash flow.', 'KEY DRIVER #3');
  inp(I, 54, '7g', employeesToRetrain, NUM, false,
    'Employees whose time is expected to be redeployed or retrained (capacity, not an automatic cash saving)', '');
  inp(I, 55, '7h', employeesToMakeRedundant, NUM, false,
    '[W1] Direct employees whose roles are explicitly expected to become redundant. This is a cash action only after you select it; it is capped by the calculated workforce-reduction target after any contractor roll-off. The workbook applies 1.5× fully burdened employee cost; validate actual HR costs.', '');
  inp(I, 56, '7i', contractorsToRollOff, NUM, false,
    'Optional explicit contractor action. Contractors to roll off are capped by the same calculated total reduction target and have no employee severance charge. Leave at 0 if capacity will be retrained or redeployed instead.', '');

  sub(I, 57, '8. CONTRACT EXIT ESTIMATE — Contracts AI is expected to replace', 4);
  inp(I, 58, '8a', existingContractCount, NUM, false,
    'How many existing contracts will be canceled or replaced?', '');
  inp(I, 59, '8b', annualCostPerContract, DOL, false,
    'Average annual cost per contract', '');
  inp(I, 60, '8c', contractNoticePeriodMonths, NUM, false,
    '[B1] User-entered breakage / notice period in months. The 3-month default is a model planning placeholder, not a benchmark; replace with the actual contract term.', '');
  inp(I, 61, '8d', 0, DOL, false,
    'Calculated annual contract spend: contracts × annual cost per contract', '');
  fml(I, 61, 2, 'B58*B59', DOL, calcFill);
  inp(I, 62, '8e', 0, DOL, false,
    'Calculated contract cancellation estimate: annual contract spend × notice period ÷ 12', '');
  fml(I, 62, 2, 'IF(B61>0,B61*B60/12,B63)', DOL, calcFill);
  inp(I, 63, 'legacy', legacyVendorTerminationCost, DOL, false,
    'Legacy saved-model fixed exit cost used only when no annual contract spend is available', '');
  I.getRow(63).hidden = true;

  sub(I, 64, '9. DELIVERY PACE — How quickly do you want to deploy?', 4);
  inp(I, 65, '9a', deliveryPace, null, false,
    '[D1] User-directed model scenario. Accelerated adds 20% deployment staffing/cost and targets 20% less duration; Extended reduces staffing/cost by 20% and allows 25% more duration. This is not a PMI benchmark—[10] contextualizes contingency only.', '');
  inp(I, 66, '9b', 1, PCT, false,
    'Calculated deployment staffing/cost adjustment', '');
  fml(I, 66, 2, 'IF(B65="Accelerated",1.2,IF(B65="Extended",0.8,1))', PCT, calcFill);
  inp(I, 67, '9c', 1, PCT, false,
    'Calculated deployment-duration adjustment: Accelerated 80%; Standard 100%; Extended 125%', '');
  fml(I, 67, 2, 'IF(B65="Accelerated",0.8,IF(B65="Extended",1.25,1))', PCT, calcFill);

  // ---------------------------------------------------------------
  // 10. AI USAGE METERING — Optional overrides for the cost model
  // ---------------------------------------------------------------
  sub(I, 68, '10. AI USAGE METERING — Optional usage overrides', 4);
  inp(I, 69, '10a', optionalNonNegative(formData.aiLicensedUsers), NUM, false,
    '[C2] User-entered/measured licensed AI users or seats. The web model applies a one-seat minimum when this is 0; clear the cell only to use a model fallback.', '');
  inp(I, 70, '10b', optionalNonNegative(formData.monthlyAiRequests), NUM, false,
    '[C2] User-entered/measured monthly AI requests. A entered 0 is treated as zero request consumption; clear the cell only to use the selected-case workload proxy.', '');
  inp(I, 71, '10c', optionalNonNegative(formData.avgInputTokensPerRequest), NUM, false,
    '[C2] User-entered/measured average input tokens per request (optional usage-meter override)', '');
  inp(I, 72, '10d', optionalNonNegative(formData.avgOutputTokensPerRequest), NUM, false,
    '[C2] User-entered/measured average output tokens per request (optional usage-meter override)', '');
  inp(I, 73, '10e', optionalNonNegative(formData.monthlyAgentWorkflows), NUM, false,
    '[C2] User-entered/measured monthly multi-step agent workflows. Modeled as additional variable consumption, not a user seat.', '');
  inp(I, 74, '10f', optionalNonNegative(formData.documentsPerMonth), NUM, false,
    'Documents processed per month (optional usage-meter override)', '');
  inp(I, 75, '10g', optionalNonNegative(formData.dataStoredGb), NUM, false,
    'Data stored in GB (planning context for run/governance sizing)', '');
  inp(I, 76, '10h', optionalNonNegative(formData.connectedApplications), NUM, false,
    'Connected applications (planning context for integration and governance sizing)', '');
  inp(I, 77, '10i', 0, NUM, false,
    'Calculated monthly workload volume from the selected archetype; requests/documents override it when supplied', '');

  // ---------------------------------------------------------------
  // 11. SELECTED-CASE ENGINE — live formula links, not duplicate inputs
  // ---------------------------------------------------------------
  sub(I, 79, '11. SELECTED-CASE ENGINE — edit blue cells on the matching case tab', 4);
  const selectedCaseEngineRows = [
    ['Selected use case', 'B10', null, 'Choose one of the four cases above. Its blue case-tab inputs drive the financial model.'],
    ['Automation ceiling', selectedCaseFormula('automationPotential', '0'), PCT, 'Live case calculation; caps the requested efficiency gain.'],
    ['Weekly case workload', selectedCaseFormula('caseWorkloadHoursPerWeek', '0'), NUM, 'Live workload used by the capacity guardrail.'],
    ['Build complexity', selectedCaseFormula('caseBuildComplexityMultiplier', '1'), DEC, 'Live multiplier applied to deployment cost only.'],
    ['Customer direct savings', selectedCaseFormula('caseDirectSavings', '0'), DOL, 'Included in cash flow only after the explicit Customer Service evidence gate.'],
    ['Risk avoidance (context)', selectedCaseFormula('caseRiskAvoidance', '0'), DOL, 'Shown for diligence only; excluded from core NPV, IRR, ROIC, and payback.'],
  ];
  selectedCaseEngineRows.forEach(([label, formula, format, explanation], index) => {
    const row = 80 + index;
    val(I, row, 1, label);
    I.getRow(row).getCell(1).font = inputLabelFont;
    I.getRow(row).getCell(1).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    I.getRow(row).getCell(1).border = inputDivider;
    fml(I, row, 2, formula, format, calcFill);
    I.getRow(row).getCell(2).border = thinBorder;
    I.getRow(row).getCell(3).value = explanation;
    I.getRow(row).getCell(3).font = descFont;
    I.getRow(row).getCell(3).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    I.getRow(row).getCell(3).border = inputDivider;
    I.getRow(row).getCell(4).value = 'CALCULATED';
    I.getRow(row).getCell(4).font = greenFontBold;
    I.getRow(row).getCell(4).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    I.getRow(row).getCell(4).border = inputDivider;
    I.getRow(row).height = inputRowHeight(label, explanation);
  });

  // Formula rows use the same visual language as the editable input rows,
  // but state plainly that their green values are calculated. This prevents a
  // user from mistaking linked totals for another data-entry field.
  [11, 13, 26, 27, 44, 45, 52, 61, 62, 66, 67, 77].forEach((rowNumber) => {
    const row = I.getRow(rowNumber);
    row.getCell(1).font = inputLabelFont;
    row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    row.getCell(4).value = 'CALCULATED';
    row.getCell(4).font = greenFontBold;
    row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    row.getCell(4).border = inputDivider;
  });

  // Preserve the existing row numbers (they are referenced across the model)
  // while making blank separators deliberate and section breaks scannable.
  [3, 9, 17, 22, 29, 39, 47, 57, 64, 68, 79].forEach((rowNumber) => {
    I.getRow(rowNumber).height = 20;
  });
  [6, 8, 16, 21, 28, 46].forEach((rowNumber) => {
    I.getRow(rowNumber).height = 7;
  });
  I.getCell('B2').alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };

  printSetup(I);

  // ===================================================================
  // TAB 2: ARCHETYPE DETAIL — Granular inputs per archetype
  // ===================================================================
  const inactiveInputFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
  const inactiveFont = { name: 'Calibri', size: 10, color: { argb: 'FF999999' } };
  cols(AD, [35, 22, 50]);
  hdr(AD, 1, 'ASSUMPTIONS & MODEL CONTEXT [M2] — SELECTED USE CASE', 3);
  colorLegend(AD, 2);

  // Active archetype display (row 3)
  sub(AD, 3, 'Active Archetype', 3);
  val(AD, 4, 1, 'Selected Archetype');
  fml(AD, 4, 2, 'Inputs!B10', null, calcFill);
  note(AD, 4, 3, 'Change on Inputs tab to switch archetype sections');

  // Determine which archetype is active from formData
  const activeArchetypeId = selectedArchetypeId;

  // Build all supported archetype sections (each includes inputs, computed
  // operating levers, and a compact audit trail).
  let adRow = 6;
  const archetypeSectionRows = {}; // track start/end rows per archetype

  for (const schema of supportedArchetypeSchemas) {
    const isActive = schema.id === activeArchetypeId;
    const sectionStart = adRow;

    // Section subheader
    sub(AD, adRow, `${schema.id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`, 3);
    adRow++;

    // Input rows
    for (const [inputIndex, input] of schema.inputs.entries()) {
      const fill = isActive ? inputFill : inactiveInputFill;
      val(AD, adRow, 1, displayArchetypeInputLabel(input));
      fml(AD, adRow, 2, `'${ARCHETYPE_TAB_NAMES[schema.id]}'!B${CASE_INPUT_START_ROW + inputIndex}`,
        input.format === '$#,##0' ? DOL : input.format === '0.0%' || input.type === 'percent' ? PCT : input.format || NUM, fill);
      note(AD, adRow, 3, input.note);
      if (!isActive) {
        AD.getRow(adRow).getCell(1).font = inactiveFont;
        AD.getRow(adRow).getCell(3).font = { ...font9i, color: { argb: 'FFBBBBBB' } };
      }
      adRow++;
    }

    // Computed output rows (informational only in this tab)
    for (const mapping of schema.computedMappings) {
      val(AD, adRow, 1, `→ ${mapping.mapsTo}`);
      AD.getRow(adRow).getCell(1).font = isActive ? greenFontBold : inactiveFont;
      const mappingIndex = schema.computedMappings.findIndex((candidate) => candidate.mapsTo === mapping.mapsTo);
      fml(AD, adRow, 2, `'${ARCHETYPE_TAB_NAMES[schema.id]}'!B${CASE_INPUT_START_ROW + schema.inputs.length + 8 + mappingIndex}`,
        mappingNumberFormat(mapping.mapsTo), isActive ? calcFill : inactiveInputFill);
      note(AD, adRow, 3, mapping.note || `Refines ${mapping.mapsTo} in DCF`);
      if (!isActive) AD.getRow(adRow).getCell(3).font = { ...font9i, color: { argb: 'FFBBBBBB' } };
      adRow++;
    }

    const sectionEnd = adRow - 1;
    archetypeSectionRows[schema.id] = { start: sectionStart, end: sectionEnd };
    adRow++; // blank separator row
  }

  // --- Mapping Summary (bottom of Archetype Detail tab) ---
  sub(AD, adRow, 'MAPPING SUMMARY — Active Archetype Overrides', 3);
  adRow++;

  // Pre-compute mapping values from the active archetype
  const activeSchema = ARCHETYPE_INPUT_MAP[activeArchetypeId];

  // Keep the bridge readable even though the selected use case has different
  // operating levers. Direct customer-cost savings and avoided-loss estimates
  // are surfaced as context; their inclusion in cash flow is controlled by
  // the core calculation engine's evidence gates, not by this worksheet.
  const summaryMappings = [
    'automationPotential',
    'errorRate',
    'caseWorkloadHoursPerWeek',
    'toolReplacementRate',
    'caseDirectSavings',
    'caseRiskAvoidance',
    'caseBuildComplexityMultiplier',
  ];

  for (const targetVar of summaryMappings) {
    val(AD, adRow, 1, `Adjusted ${targetVar}`);
    const fallback = targetVar === 'toolReplacementRate'
      ? "VLOOKUP('Key Formulas'!B10,Lookups!A56:D63,4,FALSE)"
      : targetVar === 'caseBuildComplexityMultiplier' ? '1' : '0';
    fml(AD, adRow, 2, selectedCaseFormula(targetVar, fallback), mappingNumberFormat(targetVar), calcFill);
    note(AD, adRow, 3, 'Live selected-case link; edit blue cells on the matching case tab.');
    adRow++;
  }

  // The selected-case tab remains the source for its operating inputs.  This
  // helper is only used for the optional process unit-economics display below.
  const activeInputRow = (key) => {
    const inputIndex = activeSchema?.inputs.findIndex(input => input.key === key) ?? -1;
    return inputIndex >= 0 ? archetypeSectionRows[activeArchetypeId].start + 1 + inputIndex : null;
  };
  fml(I, exportInputRows.monthlyUsageVolume, 2,
    `IF(B${exportInputRows.monthlyAiRequests}>0,B${exportInputRows.monthlyAiRequests},IF(B${exportInputRows.documentsPerMonth}>0,B${exportInputRows.documentsPerMonth},${selectedCasePrimaryVolumeFormula('MAX(1,Inputs!B11*Inputs!B12*4.33)')}))`,
    NUM, calcFill);

  // Customer Service direct-cost avoidance is a valid cash-flow input only
  // after both the operating baseline and Finance realization have been
  // confirmed.  Keep the evidence decision editable and explicit in Excel.
  inp(I, 78, '10j', formData.customerServiceSavingsValidated ? 'Yes' : 'No', null, false,
    'Customer Service only: have Operations validated cost/contact and has Finance confirmed the avoided contacts reduce spend (not just free time)?', 'EVIDENCE GATE');
  I.getRow(78).getCell(2).dataValidation = { type: 'list', formulae: ['"Yes,No"'] };

  if (activeArchetypeId === 'internal-process-automation') {
    const processVolumeRow = activeInputRow('processVolume');
    const handlingTimeRow = activeInputRow('handlingTimeMin');
    if (processVolumeRow && handlingTimeRow) {
      sub(AD, adRow, 'INTERNAL PROCESS UNIT ECONOMICS', 3);
      adRow++;
      val(AD, adRow, 1, 'Current cost per process');
      fml(AD, adRow, 2, `'Key Formulas'!B12*B${handlingTimeRow}/60`, DOL2, calcFill);
      note(AD, adRow, 3, 'Weighted hourly workforce cost × average time per process ÷ 60');
      adRow++;
      val(AD, adRow, 1, 'Current monthly process cost');
      fml(AD, adRow, 2, `B${processVolumeRow}*B${adRow - 1}`, DOL, calcFill);
      note(AD, adRow, 3, 'Process volume/month × current cost per process');
      adRow++;
    }
  }

  printSetup(AD);

  // ===================================================================
  // TAB 3: KEY FORMULAS — Essential calculation chain (green font)
  // ===================================================================
  cols(KF, [35, 22, 50]);
  hdr(KF, 1, 'CALCULATION DETAIL — MODEL LOGIC', 3);
  colorLegend(KF, 2);

  // --- Industry & Readiness (rows 3-9) ---
  sub(KF, 3, 'Industry & Readiness', 3);
  val(KF, 4, 1, 'Automation Potential');
  fml(KF, 4, 2, selectedCaseFormula('automationPotential', '0'), PCT);
  note(KF, 4, 3, 'Live selected-case formula. Change a blue operating input on the matching case tab to update the automation ceiling.');
  val(KF, 5, 1, 'Industry Success Rate');
  fml(KF, 5, 2, 'VLOOKUP(Inputs!B4,Lookups!A16:B25,2,FALSE)', PCT);
  val(KF, 6, 1, 'Adoption Rate');
  fml(KF, 6, 2, 'VLOOKUP(Inputs!B18,Lookups!A29:B33,2,FALSE)', PCT);
  val(KF, 7, 1, 'Sponsor Adjustment');
  fml(KF, 7, 2, 'IF(Inputs!B20="Yes",1,0.85)', DEC);
  val(KF, 8, 1, 'Org Readiness');
  fml(KF, 8, 2, 'B6*B7', DEC);
  note(KF, 8, 3, 'Adoption x Sponsor');
  val(KF, 9, 1, 'Risk Multiplier');
  fml(KF, 9, 2, '(B8+B5)/2', PCT);
  note(KF, 9, 3, '(OrgReadiness + IndustrySuccess) / 2');
  val(KF, 10, 1, 'Process Type (derived)');
  fml(KF, 10, 2, 'VLOOKUP(Inputs!B10,Lookups!A205:C208,3,FALSE)', null, calcFill);
  note(KF, 10, 3, 'Maps archetype ID → primary process type');

  // --- Current State (rows 11-15) ---
  sub(KF, 11, 'Current State', 3);
  val(KF, 12, 1, 'Weighted Hourly Workforce Cost');
  fml(KF, 12, 2, 'Inputs!B13/2080', DOL2);
  note(KF, 12, 3, '[H1] Fully burdened annual cost ÷ 2,080 standard work hours. Hours/person/week controls freed capacity, not the hourly cost convention.');
  val(KF, 13, 1, 'Total Ongoing Headcount Cost');
  fml(KF, 13, 2, `Inputs!B${exportInputRows.totalAnnualHeadcountCost}`, DOL);
  // Preserve this old row address for existing formulas/workbooks, while the
  // model uses the measured rework baseline in B85 instead of a blanket rate.
  val(KF, 14, 1, 'Legacy Blanket Rework Cost (not used)');
  fml(KF, 14, 2, '0', DOL);
  KF.getRow(14).hidden = true;
  val(KF, 15, 1, 'Total Current Cost');
  fml(KF, 15, 2, `B13+B85+Inputs!B15+Inputs!B${exportInputRows.annualContractSpend}`, DOL);
  note(KF, 15, 3, 'Headcount + measurable rework + other tools + annual contract spend');

  // --- Workforce Allocation (rows 17-21) ---
  sub(KF, 17, 'Workforce Allocation', 3);
  val(KF, 18, 1, 'Calculated Total Reduction Target');
  fml(KF, 18, 2, 'IF(B97="OK",MIN(Inputs!B11,INT(B86/2080+0.000000001)),0)', '0', calcFill);
  note(KF, 18, 3, 'Automatically calculated whole-FTE capacity from measured freed hours. It is a capacity target—not an assumed layoff or cash saving.');
  val(KF, 19, 1, 'Selected Contractor Roll-Off');
  fml(KF, 19, 2, `MIN(Inputs!B${exportInputRows.contractorsToRollOff},Inputs!B${exportInputRows.offshoreContractorCount},B18)`, '0');
  note(KF, 19, 3, 'Explicit contractor action, capped within the same total target. Contractor roll-off carries no direct-employee severance cost.');
  val(KF, 20, 1, 'Selected Direct Employee Redundancies');
  fml(KF, 20, 2, `MIN(Inputs!B${exportInputRows.employeesToMakeRedundant},Inputs!B${exportInputRows.directEmployeeCount},MAX(0,B18-B19))`, '0');
  note(KF, 20, 3, 'Explicit direct-employee action, capped after any selected contractor roll-off. This is the only action that creates severance.');
  val(KF, 21, 1, 'Remaining Workforce');
  fml(KF, 21, 2, 'Inputs!B11-B19-B20', '0');
  note(KF, 21, 3, 'Total workforce less selected contractor roll-off and selected direct employee redundancies.');
  val(KF, 22, 1, 'Unallocated Reduction Capacity');
  fml(KF, 22, 2, 'MAX(0,B18-B19-B20)', '0', calcFill);
  note(KF, 22, 3, 'Calculated capacity not selected as a cash workforce action; it remains available for retraining or redeployment.');

  // --- Implementation Cost (rows 23-33) ---
  sub(KF, 23, 'Implementation Cost', 3);
  val(KF, 24, 1, 'Blended Fully Burdened Deployment Rate');
  fml(KF, 24, 2, `Inputs!B${exportInputRows.blendedFullyBurdenedCost}`, DOL);
  note(KF, 24, 3, 'Uses the weighted direct-employee and contractor workforce mix ([L1]/[L2]).');
  val(KF, 25, 1, 'Baseline Deployment Engineers');
  fml(KF, 25, 2, 'MAX(1,CEILING(Inputs!B11/12,1))', '0');
  val(KF, 26, 1, 'Timeline Pressure');
  fml(KF, 26, 2, 'IF(Inputs!B24<=3,1.5,IF(Inputs!B24<=6,1.2,1))', DEC);
  val(KF, 27, 1, 'Data Headcount Mult');
  fml(KF, 27, 2, 'IF(Inputs!B19<=2,1.3,IF(Inputs!B19=3,1.1,1))', DEC);
  val(KF, 28, 1, 'Max Team');
  fml(KF, 28, 2, 'VLOOKUP(Inputs!B5,Lookups!A37:D41,4,FALSE)', '0');
  val(KF, 29, 1, 'Deployment Engineers (scope/timeline adjusted)');
  fml(KF, 29, 2, 'MIN(CEILING(B25*B26*B27,1),B28)', DEC);
  val(KF, 30, 1, 'Impl Timeline (yrs)');
  fml(KF, 30, 2, 'CEILING(Inputs!B24*VLOOKUP(Inputs!B19,Lookups!A29:C33,3,FALSE)*VLOOKUP(Inputs!B5,Lookups!A37:B41,2,FALSE)*IF(Inputs!B20="Yes",1,1.25),1)/12', DEC);
  val(KF, 31, 1, 'Paced Delivery Labor (Eng. + PM)');
  fml(KF, 31, 2, `(MIN(CEILING(B25*B27,1),B28)+MAX(0.5,CEILING(MIN(CEILING(B25*B27,1),B28)/5,1)))*B24*CEILING(6*VLOOKUP(Inputs!B19,Lookups!A29:C33,3,FALSE)*VLOOKUP(Inputs!B5,Lookups!A37:B41,2,FALSE),1)/12*Inputs!B${exportInputRows.deliveryCostMultiplier}*VLOOKUP(Inputs!B4,Lookups!A16:I25,9,FALSE)`, DOL);
  note(KF, 31, 3, 'Web-model delivery plan: baseline engineers + PM, weighted workforce rate, baseline data/size timeline, delivery pace, and industry complexity.');
  val(KF, 32, 1, 'Infrastructure + Training');
  fml(KF, 32, 2, 'B31*(Lookups!B98+Lookups!B99)', DOL);
  val(KF, 33, 1, 'Computed Impl Cost');
  fmlBold(KF, 33, 2, '(B31+B32)*B83', DOL, calcFill);
  val(KF, 34, 1, 'Delivery Pace Adjustment');
  fml(KF, 34, 2, `Inputs!B${exportInputRows.deliveryCostMultiplier}`, PCT);
  note(KF, 34, 3, '[D1] Model scenario: Accelerated = 120%; Standard = 100%; Extended = 80%. [10] is contingency context only, not proof of these deltas.');

  // --- One-Time & Hidden Costs (rows 35-42) ---
  sub(KF, 35, 'One-Time & Hidden Costs', 3);
  val(KF, 36, 1, 'Legal & Compliance');
  fml(KF, 36, 2, 'VLOOKUP(Inputs!B5,Lookups!A37:G41,7,FALSE)', DOL);
  val(KF, 37, 1, 'Security Audit');
  fml(KF, 37, 2, 'VLOOKUP(Inputs!B5,Lookups!A37:H41,8,FALSE)', DOL);
  val(KF, 38, 1, 'Contingency');
  fml(KF, 38, 2, 'B42*Lookups!B84', DOL);
  note(KF, 38, 3, '10% of Realistic Impl Cost');
  val(KF, 39, 1, 'Change Management');
  fml(KF, 39, 2, 'B42*Lookups!B97', DOL);
  note(KF, 39, 3, '8% of Realistic Impl Cost');
  val(KF, 40, 1, 'Total Deployment One-Time');
  fmlBold(KF, 40, 2, 'SUM(B36:B39)+SUM(B101:B104)', DOL, calcFill);
  val(KF, 41, 1, 'Data Cost Mult');
  fml(KF, 41, 2, 'VLOOKUP(Inputs!B19,Lookups!A29:D33,4,FALSE)', DEC);
  val(KF, 42, 1, 'Realistic Impl Cost');
  fmlBold(KF, 42, 2, 'MAX(Inputs!B23*B41*B83,B33)', DOL, calcFill);

  // --- Ongoing AI Costs (rows 44-51) ---
  sub(KF, 44, 'Ongoing AI Costs', 3);
  val(KF, 45, 1, 'Ongoing AI Headcount');
  fml(KF, 45, 2, 'MAX(0.5,ROUND(B29*0.15*2,0)/2)', DEC);
  val(KF, 46, 1, 'Ongoing Labor');
  fml(KF, 46, 2, 'B45*B24', DOL);
  // Blank optional meters preserve the web model's fallback behavior, while
  // an entered zero remains a deliberate zero. This distinction matters for
  // consumption and license sizing and prevents Excel from inventing volume.
  const monthlyRequestFormula = `IF(OR(ISBLANK(Inputs!B${exportInputRows.monthlyAiRequests}),Inputs!B${exportInputRows.monthlyAiRequests}=""),Inputs!B${exportInputRows.monthlyUsageVolume},Inputs!B${exportInputRows.monthlyAiRequests})`;
  const monthlyAgentWorkflowFormula = `IF(OR(ISBLANK(Inputs!B${exportInputRows.monthlyAgentWorkflows}),Inputs!B${exportInputRows.monthlyAgentWorkflows}=""),IF(Inputs!B37="Yes",${monthlyRequestFormula},0),Inputs!B${exportInputRows.monthlyAgentWorkflows})`;
  const monthlyDocumentFormula = `IF(OR(ISBLANK(Inputs!B${exportInputRows.documentsPerMonth}),Inputs!B${exportInputRows.documentsPerMonth}=""),IF(Inputs!B10="internal-process-automation",Inputs!B${exportInputRows.monthlyUsageVolume},0),Inputs!B${exportInputRows.documentsPerMonth})`;
  val(KF, 47, 1, 'Consumption (Annual Variable Use)');
  fml(KF, 47, 2, `(IF(OR(Inputs!B${exportInputRows.avgInputTokensPerRequest}>0,Inputs!B${exportInputRows.avgOutputTokensPerRequest}>0),${monthlyRequestFormula}*IF(Inputs!B37="Yes",4,1)*(Inputs!B${exportInputRows.avgInputTokensPerRequest}*0.3+Inputs!B${exportInputRows.avgOutputTokensPerRequest}*15)/1000000,${monthlyRequestFormula}/1000*VLOOKUP(B10,Lookups!A56:B63,2,FALSE))+${monthlyAgentWorkflowFormula}*IF(Inputs!B37="Yes",2,0)*0.01*VLOOKUP(Inputs!B4,Lookups!A16:I25,9,FALSE)+${monthlyDocumentFormula}*0.002)*12`, DOL);
  note(KF, 47, 3, '[C2] Request, token, agent-run, and document volume. Entered tokens activate the standard-tier token estimate (input $0.30/M after prompt-cache effect; output $15/M); a typed zero remains zero.');
  val(KF, 48, 1, 'Access (Annual Licensing)');
  fml(KF, 48, 2, `VLOOKUP(Inputs!B5,Lookups!A37:F41,6,FALSE)*VLOOKUP(Inputs!B4,Lookups!A16:I25,9,FALSE)*(1+Lookups!B91)+MAX(1,IF(OR(ISBLANK(Inputs!B${exportInputRows.aiLicensedUsers}),Inputs!B${exportInputRows.aiLicensedUsers}=""),Inputs!B11,Inputs!B${exportInputRows.aiLicensedUsers}))*360*VLOOKUP(Inputs!B4,Lookups!A16:I25,9,FALSE)`, DOL);
  note(KF, 48, 3, '[M1/C1] Annual license/seat access. The size/license envelope and planning allocation are model/user planning assumptions, not external benchmarks.');
  val(KF, 49, 1, 'Run: Support, Monitoring & Governance');
  fml(KF, 49, 2, `B46+IF(Inputs!B37="Yes",VLOOKUP(Inputs!B5,Lookups!A37:N41,14,FALSE)*12,0)+B42*Lookups!B88+B105+Inputs!B${exportInputRows.employeesToRetrain}*Inputs!B${exportInputRows.employeeFullyBurdenedCost}*Lookups!B89+B42*Lookups!B90+VLOOKUP(Inputs!B5,Lookups!A37:J41,10,FALSE)*VLOOKUP(Inputs!B4,Lookups!A16:I25,9,FALSE)+B73`, DOL);
  note(KF, 49, 3, '[M1/C1] Labor + agent infrastructure + retraining + compliance + retained-worker training + technical debt + cyber + measured data/connector operations. Validate against the operating model.');
  val(KF, 50, 1, 'Computed Ongoing');
  fml(KF, 50, 2, 'B47+B48+B49', DOL);
  val(KF, 51, 1, 'Base Ongoing Cost');
  fmlBold(KF, 51, 2, 'IF(OR(ISBLANK(Inputs!B25),Inputs!B25=""),B50,Inputs!B25)', DOL, calcFill);
  note(KF, 51, 3, 'Explicit annual run-cost input. It overrides the derived planning bucket; clear it only to use the transparent computed operating-cost model.');

  // --- Annual Savings (rows 53-61) ---
  sub(KF, 53, 'Annual Savings', 3);
  val(KF, 54, 1, 'Selected Workforce Savings (Explicit Cash)');
  fml(KF, 54, 2, `B20*Inputs!B${exportInputRows.employeeFullyBurdenedCost}+B19*Inputs!B${exportInputRows.contractorFullyBurdenedCost}`, DOL);
  note(KF, 54, 3, 'Only explicit selected actions: direct-employee redundancies plus contractor roll-off. It is not risk-adjusted and does not include unallocated capacity.');
  val(KF, 55, 1, 'Freed Capacity Value (Context Only)');
  fml(KF, 55, 2, 'MAX(0,(B13*B98)-B54)*B9', DOL);
  note(KF, 55, 3, '[E1] Freed capacity after hard headcount savings. Planning context only; excluded from NPV, ROIC, and payback unless Finance explicitly changes the cash-flow formulas.');
  val(KF, 56, 1, 'Measured Rework Savings (Risk-Adj)');
  fml(KF, 56, 2, 'B85*B98*B9', DOL);
  note(KF, 56, 3, 'Only uses entered error counts, rework share, and cost per item');
  val(KF, 57, 1, 'Tool Replacement (Risk-Adj)');
  fml(KF, 57, 2, 'Inputs!B15*B80*B9', DOL);
  val(KF, 58, 1, 'Enhancement Savings (RA)');
  fml(KF, 58, 2, 'B56+B57+B61+IF(AND(Inputs!B10="customer-facing-ai",Inputs!B78="Yes",B97="OK"),MIN(B81,B79*52*B12)*B9,0)', DOL);
  note(KF, 58, 3, 'Cash savings only: measured rework + tools + contracts + Customer Service savings after the explicit evidence gate. Excludes capacity value and risk avoidance.');
  val(KF, 59, 1, 'Total Risk-Adj Savings');
  fmlBold(KF, 59, 2, 'B54+B58', DOL, calcFill);
  val(KF, 60, 1, 'Net Annual Benefit');
  fmlBold(KF, 60, 2, 'B59-B51', DOL, calcFill);
  val(KF, 61, 1, 'Contract Savings (Risk-Adj)');
  fml(KF, 61, 2, `Inputs!B${exportInputRows.annualContractSpend}*B9`, DOL);
  note(KF, 61, 3, 'Recurring annual contract spend avoided after cancellation');

  val(KF, 62, 1, 'Contract Cancellation Cost');
  fml(KF, 62, 2, `Inputs!B${exportInputRows.estimatedContractExitCost}`, DOL);
  note(KF, 62, 3, '[B1] Contract count × annual cost × user-entered notice period ÷ 12');

  // --- Investment Summary (rows 63-69) ---
  sub(KF, 63, 'Investment Summary', 3);
  val(KF, 64, 1, 'Cost to Deploy');
  fmlBold(KF, 64, 2, 'B42+B40', DOL, calcFill);
  note(KF, 64, 3, 'Deployment build + deployment one-time costs; excludes contracts and severance');
  val(KF, 65, 1, 'Severance Multiplier');
  fml(KF, 65, 2, '1.5', DEC);
  note(KF, 65, 3, '[W1] User-directed model rule: 1.5 × fully burdened employee cost. [15] supports 1.0–1.5× annual salary—not fully burdened cost—so validate with HR.');
  val(KF, 66, 1, 'Severance Cost / Employee');
  fml(KF, 66, 2, `Inputs!B${exportInputRows.employeeFullyBurdenedCost}*B65`, DOL);
  val(KF, 67, 1, 'Total Severance Cost');
  fml(KF, 67, 2, 'B20*B66', DOL);
  note(KF, 67, 3, 'Direct employee redundancies only. Contractor roll-off is intentionally excluded from severance.');
  val(KF, 68, 1, 'Total Investment');
  fmlBold(KF, 68, 2, 'B64+B62+B67', DOL);
  note(KF, 68, 3, 'Cost to Deploy + Contract Cancellation + Severance');
  val(KF, 69, 1, 'Discount Rate');
  fml(KF, 69, 2, 'VLOOKUP(Inputs!B5,Lookups!A37:C41,3,FALSE)', PCT);

  // --- Workforce & data cost detail (rows 71-73) ---
  sub(KF, 71, 'Workforce & Data Cost Detail', 3);
  val(KF, 72, 1, 'Retained Talent Premium');
  fml(KF, 72, 2, 'B21*Inputs!B13*Inputs!B36', DOL);
  note(KF, 72, 3, '[28] Retained FTEs × salary × premium rate. Workforce-planning context only; excluded from ongoing AI cost and the DCF.');
  val(KF, 73, 1, 'Data Transfer & Connected Systems');
  fml(KF, 73, 2, `Inputs!B${exportInputRows.dataStoredGb}*0.12*12+Inputs!B${exportInputRows.connectedApplications}*100*VLOOKUP(Inputs!B4,Lookups!A16:I25,9,FALSE)*12`, DOL);
  note(KF, 73, 3, '[30] Only entered stored-data and connected-system run cost is included. No company-wide egress charge is assumed without a measured data or connector scope.');

  // --- Archetype Detail Refinement Bridge (rows 75-82) ---
  sub(KF, 75, 'Archetype Detail Refinement', 3);
  val(KF, 76, 1, 'Has Archetype Detail?');
  fml(KF, 76, 2, 'IF(B79>0,"Yes","No")', null, calcFill);
  note(KF, 76, 3, 'Selected case is live when its calculated weekly workload is greater than zero.');
  val(KF, 77, 1, 'Adj Automation Potential');
  fml(KF, 77, 2, selectedCaseFormula('automationPotential', 'B4'), PCT, calcFill);
  note(KF, 77, 3, 'Live selected-case automation ceiling.');
  val(KF, 78, 1, 'Legacy Error Rate (not used)');
  fml(KF, 78, 2, '0', PCT, calcFill);
  note(KF, 78, 3, 'Preserved only for older workbook formulas; measurable rework is calculated below.');
  KF.getRow(78).hidden = true;
  val(KF, 79, 1, 'Adj Hours/Week');
  fml(KF, 79, 2, selectedCaseFormula('caseWorkloadHoursPerWeek', '0'), NUM, calcFill);
  note(KF, 79, 3, 'Live weekly workload from the selected case tab. Used to cap any workforce claim to the work actually described.');
  val(KF, 80, 1, 'Adj Tool Replace %');
  fml(KF, 80, 2, 'VLOOKUP(Inputs!B10,Lookups!A205:D208,4,FALSE)', PCT, calcFill);
  val(KF, 81, 1, 'Case Direct Savings (evidence-gated)');
  fml(KF, 81, 2, selectedCaseFormula('caseDirectSavings', '0'), DOL, calcFill);
  note(KF, 81, 3, '[M3] Direct case savings are planning context until the required operating/Finance evidence gate is passed in the core model.');
  val(KF, 82, 1, 'Case Risk Avoidance (context only)');
  fml(KF, 82, 2, selectedCaseFormula('caseRiskAvoidance', '0'), DOL, calcFill);
  note(KF, 82, 3, '[M3] Historical-loss avoidance is shown for diligence context and is excluded from core NPV until Finance validates the evidence.');
  val(KF, 83, 1, 'Case Build Complexity Multiplier');
  fml(KF, 83, 2, selectedCaseFormula('caseBuildComplexityMultiplier', '1'), DEC, calcFill);
  note(KF, 83, 3, 'Live selected-case build-complexity adjustment. It increases deployment cost, not the benefit claim.');

  // --- Measured Baseline & Workforce Outcomes (rows 84-88) ---
  sub(KF, 84, 'Measured Baseline & Workforce Outcomes', 3);
  val(KF, 85, 1, 'Annual Measurable Rework Cost');
  fml(KF, 85, 2, `Inputs!B${exportInputRows.annualMeasuredReworkCost}`, DOL);
  note(KF, 85, 3, 'Measured errors × rework share × cost per item; no blanket default');
  val(KF, 86, 1, 'Annual Freed-Up Hours');
  fml(KF, 86, 2, 'MIN(B79,Inputs!B11*Inputs!B12)*52*B98', NUM);
  note(KF, 86, 3, 'Selected case weekly workload (capped by staffed weekly capacity) × 52 × effective efficiency gain.');
  val(KF, 87, 1, 'Employees to Retrain');
  fml(KF, 87, 2, `Inputs!B${exportInputRows.employeesToRetrain}`, NUM);
  note(KF, 87, 3, 'Redeployed capacity; does not create a second hard headcount saving');
  val(KF, 88, 1, 'Employees to Make Redundant');
  fml(KF, 88, 2, 'B20', NUM);
  note(KF, 88, 3, 'Selected direct employee action after the total-target and contractor-roll-off caps. This is the severance-bearing workforce action.');
  val(KF, 89, 1, 'Contractors to Roll Off');
  fml(KF, 89, 2, 'B19', NUM);
  note(KF, 89, 3, 'Selected contractor action after the same total-target cap. It produces cash savings but no employee severance.');

  // --- Case Guardrails (rows 96-98) ---
  sub(KF, 96, 'Selected-Case Workload Guardrails', 3);
  val(KF, 97, 1, 'Workload Guardrail');
  fml(KF, 97, 2, 'IF(OR(B79<=0,B79>Inputs!B11*Inputs!B12*1.25),"BLOCKED","OK")', null, calcFill);
  note(KF, 97, 3, '[M3] Blocks cash-flow savings if the selected case has no measurable workload or requires more than 125% of staffed process capacity.');
  val(KF, 98, 1, 'Effective Efficiency Gain');
  fml(KF, 98, 2, `IF(B97="OK",MIN(Inputs!B${exportInputRows.totalEfficiencyGainPct},B77),0)`, PCT, calcFill);
  note(KF, 98, 3, 'The lower of the user-entered efficiency gain and the selected case’s automation ceiling; zero when the workload guardrail is blocked.');

  // --- Hidden-cost and DCF parity detail (rows 100-108) ---
  sub(KF, 100, 'Hidden Costs & DCF Schedules (included in the live cash flow)', 3);
  val(KF, 101, 1, 'Cultural Resistance');
  fml(KF, 101, 2, 'B42*Lookups!B85', DOL, calcFill);
  note(KF, 101, 3, '4% of realistic implementation cost — a stated model planning assumption.');
  val(KF, 102, 1, 'Data Cleanup');
  fml(KF, 102, 2, 'B42*IF(Inputs!B19<=2,0.15,IF(Inputs!B19=3,0.05,0))', DOL, calcFill);
  note(KF, 102, 3, '15% for low readiness, 5% for usable data, otherwise 0%; tied to the data-readiness input.');
  val(KF, 103, 1, 'Integration Testing');
  fml(KF, 103, 2, 'B42*0.05', DOL, calcFill);
  note(KF, 103, 3, '5% of realistic implementation cost for integration and validation testing.');
  val(KF, 104, 1, 'Productivity Dip During Change');
  fml(KF, 104, 2, 'Inputs!B44/12*VLOOKUP(Inputs!B5,Lookups!A37:L41,12,FALSE)*VLOOKUP(Inputs!B5,Lookups!A37:M41,13,FALSE)', DOL, calcFill);
  note(KF, 104, 3, 'Affected-workforce cost × company-size change-absorption months × temporary productivity dip rate.');
  val(KF, 105, 1, 'Annual Compliance Component');
  fml(KF, 105, 2, 'VLOOKUP(Inputs!B5,Lookups!A37:I41,9,FALSE)*VLOOKUP(Inputs!B4,Lookups!A16:I25,9,FALSE)', DOL, calcFill);
  note(KF, 105, 3, 'Separately escalated 8% annually inside total operating cost, matching the web model.');
  val(KF, 106, 1, 'Industry Wage Growth');
  fml(KF, 106, 2, 'VLOOKUP(Inputs!B4,Lookups!A16:H25,8,FALSE)', PCT, calcFill);
  note(KF, 106, 3, 'Industry-specific avoided-labor inflation used in the DCF benefit stream.');
  val(KF, 107, 1, 'Model Drift Rate');
  fml(KF, 107, 2, '0.03', PCT, calcFill);
  note(KF, 107, 3, 'Benefits decline 3% per year without further evidence of offsetting improvement.');
  val(KF, 108, 1, 'Compliance Cost Escalation');
  fml(KF, 108, 2, '0.08', PCT, calcFill);
  note(KF, 108, 3, 'Annual compliance refresh escalation used only to split the entered operating-cost total.');
  val(KF, 109, 1, 'Run-Cost Input Check');
  fml(KF, 109, 2, 'IF(B51<B47+B48,"REVIEW — entered annual run cost is below modeled access + consumption. Confirm a contracted all-in price, zero usage, or an input error.","OK")', null, calcFill);
  note(KF, 109, 3, '[M3] Guidance only: the DCF honors a validated explicit annual cost rather than silently replacing it.');
  val(KF, 110, 1, 'Compliance Component Used in DCF');
  fml(KF, 110, 2, 'IFERROR(B105*B51/B50,0)', DOL, calcFill);
  note(KF, 110, 3, 'When a user enters an all-in annual cost, the compliance slice is scaled proportionally before applying the 8% annual compliance escalation. This keeps the DCF and entered total reconciled.');

  // --- Executive AI Cost Buckets (rows 90-95) ---
  sub(KF, 90, 'Executive AI Cost Buckets — Planning View', 3);
  val(KF, 91, 1, 'Build & Integration (One-Time)');
  fml(KF, 91, 2, 'B64', DOL);
  note(KF, 91, 3, '[C1] User planning framework: estimated 30–45% allocation. Not an external benchmark.');
  val(KF, 92, 1, 'Access (Annual Licensing)');
  fml(KF, 92, 2, 'B48', DOL);
  note(KF, 92, 3, '[C1] User planning framework: estimated 20–30% allocation. Seats/licenses are separate from model use.');
  val(KF, 93, 1, 'Consumption (Annual Variable Use)');
  fml(KF, 93, 2, 'B47', DOL);
  note(KF, 93, 3, '[C1/C2] User planning framework: estimated 10–25% allocation. Driven by measured inputs or model workload proxies.');
  val(KF, 94, 1, 'Run (Annual Support, Monitoring & Governance)');
  fml(KF, 94, 2, 'MAX(0,B51-B92-B93)', DOL);
  note(KF, 94, 3, '[C1] User planning framework: estimated 15–25% allocation. Includes support/governance and any entered ongoing-cost override.');
  val(KF, 95, 1, 'Annual AI Operating Cost');
  fmlBold(KF, 95, 2, 'B51', DOL, calcFill);
  note(KF, 95, 3, '[C1] Access + Consumption + Run. Planning allocation ranges are estimates, not facts or external benchmarks.');

  printSetup(KF);

  // ===================================================================
  // TAB 3: SUMMARY — Executive overview
  // ===================================================================
  cols(SU, [35, 22, 22, 22]);
  hdr(SU, 1, 'EXECUTIVE SUMMARY', 4);
  colorLegend(SU, 2);

  // --- Key Metrics (rows 3-8) ---
  sub(SU, 3, 'Key Metrics (Base Case)', 4);
  val(SU, 4, 1, 'Net Present Value (NPV)');
  fmlBold(SU, 4, 2, "'P&L & Cash Flow'!B27", DOL);
  val(SU, 5, 1, 'Internal Rate of Return');
  fml(SU, 5, 2, "'P&L & Cash Flow'!B28", PCT);
  val(SU, 6, 1, 'ROIC (net profit / capital)');
  fml(SU, 6, 2, "'P&L & Cash Flow'!B30", PCT);
  val(SU, 7, 1, 'Payback Period (months)');
  fml(SU, 7, 2, "'P&L & Cash Flow'!B29", '0');
  val(SU, 8, 1, '5-Year Net Savings');
  fml(SU, 8, 2, "'P&L & Cash Flow'!G24", DOL);
  note(SU, 8, 3, 'Cumulative undiscounted');

  // --- Investment Required (rows 10-14) ---
  sub(SU, 10, 'Investment Required', 4);
  val(SU, 11, 1, 'Cost to Deploy');
  fml(SU, 11, 2, "'Key Formulas'!B64", DOL);
  val(SU, 12, 1, 'Contract Cancellation');
  fml(SU, 12, 2, "'Key Formulas'!B62", DOL);
  val(SU, 13, 1, 'Severance (equal selected-reduction phase)');
  fml(SU, 13, 2, "'Key Formulas'!B67", DOL);
  val(SU, 14, 1, 'Total Capital Deployed');
  fmlBold(SU, 14, 2, "'Key Formulas'!B68", DOL);
  val(SU, 15, 1, 'Annual AI Operating Cost');
  fml(SU, 15, 2, "'Key Formulas'!B95", DOL);

  // --- Scenario Comparison (rows 16-22) ---
  sub(SU, 16, 'Scenario Comparison', 4);
  tableHeaders(SU, 17, ['', 'Conservative', 'Base Case', 'Optimistic']);
  val(SU, 18, 1, 'NPV');
  fml(SU, 18, 2, 'Sensitivity!B14', DOL, warnFill);
  fml(SU, 18, 3, 'Sensitivity!C14', DOL, calcFill);
  fml(SU, 18, 4, 'Sensitivity!D14', DOL, resultFill);
  val(SU, 19, 1, 'ROIC');
  fml(SU, 19, 2, 'Sensitivity!B16', PCT, warnFill);
  fml(SU, 19, 3, 'Sensitivity!C16', PCT, calcFill);
  fml(SU, 19, 4, 'Sensitivity!D16', PCT, resultFill);
  val(SU, 20, 1, 'Payback (months)');
  fml(SU, 20, 2, 'Sensitivity!B17', '0', warnFill);
  fml(SU, 20, 3, 'Sensitivity!C17', '0', calcFill);
  fml(SU, 20, 4, 'Sensitivity!D17', '0', resultFill);
  val(SU, 21, 1, '5-Yr Net');
  fml(SU, 21, 2, 'Sensitivity!B18', DOL, warnFill);
  fml(SU, 21, 3, 'Sensitivity!C18', DOL, calcFill);
  fml(SU, 21, 4, 'Sensitivity!D18', DOL, resultFill);
  val(SU, 22, 1, 'Expected NPV (25/50/25)');
  fmlBold(SU, 22, 2, 'Sensitivity!B19', DOL);

  // --- Key Assumptions (rows 24-30) ---
  sub(SU, 24, 'Key Assumptions', 4);
  val(SU, 25, 1, 'Automation Potential');
  fml(SU, 25, 2, "'Key Formulas'!B4", PCT);
  val(SU, 26, 1, 'Risk Multiplier');
  fml(SU, 26, 2, "'Key Formulas'!B9", PCT);
  val(SU, 27, 1, 'Discount Rate');
  fml(SU, 27, 2, "'Key Formulas'!B69", PCT);
  val(SU, 28, 1, 'Hard Headcount Reductions');
  fml(SU, 28, 2, "'Key Formulas'!B20", '0');
  val(SU, 29, 1, 'Employees to Retrain');
  fml(SU, 29, 2, "'Key Formulas'!B87", '0');
  val(SU, 30, 1, 'Annual Freed-Up Hours');
  fml(SU, 30, 2, "'Key Formulas'!B86", NUM);

  // --- Capital Allocation Comparison (rows 32-37) ---
  sub(SU, 32, 'Capital Allocation Comparison — Illustrative Hurdles [M1]', 4);
  val(SU, 33, 1, 'AI Project IRR');
  fml(SU, 33, 2, "'P&L & Cash Flow'!B28", PCT);
  val(SU, 34, 1, 'vs Illustrative Return Hurdle (8%) [M1]');
  fml(SU, 34, 2, "IFERROR('P&L & Cash Flow'!B28-0.08,\"N/A\")", PCT);
  note(SU, 34, 3, 'Editable model comparator, not a market benchmark. Replace with the company’s approved return hurdle.');
  val(SU, 35, 1, 'vs Illustrative M&A Hurdle (15%) [M1]');
  fml(SU, 35, 2, "IFERROR('P&L & Cash Flow'!B28-0.15,\"N/A\")", PCT);
  note(SU, 35, 3, 'Editable model comparator, not a standard M&A threshold. Replace with the company’s approved hurdle.');
  val(SU, 36, 1, 'vs Illustrative Low-Risk Rate (4.5%) [M1]');
  fml(SU, 36, 2, "IFERROR('P&L & Cash Flow'!B28-0.045,\"N/A\")", PCT);
  note(SU, 36, 3, 'Editable model comparator, not a current Treasury quote. Use the current approved reference rate if relevant.');

  // --- Cost of Inaction (rows 38-41) ---
  sub(SU, 38, 'Cost of Inaction (Do-Nothing Scenario)', 4);
  val(SU, 39, 1, '5-Year Do-Nothing Cost');
  fml(SU, 39, 2, "'Key Formulas'!B13*(VLOOKUP(Inputs!B4,Lookups!A16:C25,3,FALSE)+VLOOKUP(Inputs!B4,Lookups!A16:D25,4,FALSE))*((1+'Key Formulas'!B106)^0+(1+'Key Formulas'!B106)^1+(1+'Key Formulas'!B106)^2+(1+'Key Formulas'!B106)^3+(1+'Key Formulas'!B106)^4)", DOL);
  note(SU, 39, 3, 'Competitive penalty + compliance risk over 5 years');
  val(SU, 40, 1, 'Net Advantage of AI Project');
  fml(SU, 40, 2, "B39+'P&L & Cash Flow'!B27", DOL);
  note(SU, 40, 3, 'Do-Nothing cost + AI project NPV');

  // Conditional formatting on NPV
  SU.addConditionalFormatting({
    ref: 'B4', rules: [
      { type: 'cellIs', operator: 'greaterThan', formulae: ['0'], style: { font: { color: { argb: 'FF66BB6A' }, bold: true } } },
      { type: 'cellIs', operator: 'lessThan', formulae: ['0'], style: { font: { color: { argb: 'FFEF5350' }, bold: true } } },
    ]
  });
  printSetup(SU);

  // ===================================================================
  // TAB 4: P&L & CASH FLOW — 5-year DCF with ROIC walkthrough
  // ===================================================================
  cols(PL, [35, 18, 18, 18, 18, 18, 18]);
  hdr(PL, 1, 'P&L & CASH FLOW — 5-Year DCF', 7);
  colorLegend(PL, 2);
  tableHeaders(PL, 3, ['', 'FY 0', 'FY 1', 'FY 2', 'FY 3', 'FY 4', 'FY 5']);

  // The web engine separately escalates the compliance portion of the entered
  // annual run-cost estimate.  Reuse the exact expression in the DCF and the
  // scenario table so a validated `ongoingAnnualCost` is never overridden.
  const modeledOngoingCostFormula = (baseCostReference, year) =>
    `(${baseCostReference}-'Key Formulas'!$B$110)*Lookups!$F$${103 + year}+'Key Formulas'!$B$110*(1+'Key Formulas'!$B$108)^${year - 1}`;
  const headcountReductionYearsFormula = `MAX(1,MIN(5,Inputs!B${exportInputRows.headcountReductionYears}))`;
  const annualHeadcountReductionFraction = (year) =>
    `IF(${year}<=${headcountReductionYearsFormula},1/${headcountReductionYearsFormula},0)`;
  const cumulativeHeadcountReductionFraction = (year) =>
    `MIN(1,${year}/${headcountReductionYearsFormula})`;

  // --- Parameters (rows 4-10) ---
  sub(PL, 4, 'PARAMETERS', 7);
  val(PL, 5, 1, 'Adoption Ramp');
  for (let y = 1; y <= 5; y++) fml(PL, 5, y + 2, `Lookups!D${103 + y}`, PCT);
  val(PL, 6, 1, 'Wage Growth Factor');
  for (let y = 1; y <= 5; y++) fml(PL, 6, y + 2, `(1+'Key Formulas'!$B$106)^${y - 1}`, DEC);
  val(PL, 7, 1, 'Severance Schedule (year)');
  for (let y = 1; y <= 5; y++) fml(PL, 7, y + 2, annualHeadcountReductionFraction(y), PCT);
  val(PL, 8, 1, 'Cumulative Workforce Savings');
  for (let y = 1; y <= 5; y++) fml(PL, 8, y + 2, cumulativeHeadcountReductionFraction(y), PCT);
  val(PL, 9, 1, 'Cost Escalation Factor');
  for (let y = 1; y <= 5; y++) fml(PL, 9, y + 2,
    `IF('Key Formulas'!$B$51<>0,(${modeledOngoingCostFormula("'Key Formulas'!$B$51", y)})/'Key Formulas'!$B$51,0)`, DEC);
  val(PL, 10, 1, 'Model Drift Factor');
  for (let y = 1; y <= 5; y++) fml(PL, 10, y + 2, `(1-'Key Formulas'!$B$107)^${y - 1}`, DEC);

  // --- Cash Inflows (rows 11-14) ---
  sub(PL, 11, 'CASH INFLOWS', 7);
  val(PL, 12, 1, 'Enhancement Savings');
  for (let y = 1; y <= 5; y++) {
    const c = String.fromCharCode(66 + y);
    fml(PL, 12, y + 2, `'Key Formulas'!B58*${c}5*${c}6*${c}10`, DOL);
  }
  val(PL, 13, 1, 'Headcount Savings');
  for (let y = 1; y <= 5; y++) {
    const c = String.fromCharCode(66 + y);
    fml(PL, 13, y + 2, `'Key Formulas'!B54*${c}8*${c}6*${c}10`, DOL);
  }
  val(PL, 14, 1, 'GROSS SAVINGS');
  for (let y = 1; y <= 5; y++) {
    const c = String.fromCharCode(66 + y);
    fmlBold(PL, 14, y + 2, `${c}12+${c}13`, DOL, calcFill);
  }

  // --- Cash Outflows (rows 16-18) ---
  sub(PL, 16, 'CASH OUTFLOWS', 7);
  val(PL, 17, 1, 'Severance Cost (equal selected-reduction phase)');
  for (let y = 1; y <= 5; y++) {
    const c = String.fromCharCode(66 + y);
    fml(PL, 17, y + 2, `'Key Formulas'!B67*${c}7`, DOL, warnFill);
  }
  val(PL, 18, 1, 'Ongoing AI Cost');
  for (let y = 1; y <= 5; y++) {
    fml(PL, 18, y + 2, modeledOngoingCostFormula("'Key Formulas'!$B$51", y), DOL, warnFill);
  }

  // --- Net Cash Flow (row 20) ---
  sub(PL, 20, 'NET CASH FLOWS', 7);
  val(PL, 21, 1, 'NET CASH FLOW'); PL.getRow(21).getCell(1).font = fontBold;
  fmlBold(PL, 21, 2, "-'Key Formulas'!B64-'Key Formulas'!B62", DOL, warnFill);
  for (let y = 1; y <= 5; y++) {
    const c = String.fromCharCode(66 + y);
    fmlBold(PL, 21, y + 2, `${c}14-${c}17-${c}18`, DOL, calcFill);
  }

  // --- DCF (rows 22-25) ---
  val(PL, 22, 1, 'Discount Factor');
  fml(PL, 22, 2, '1', '0.0000');
  for (let y = 1; y <= 5; y++) fml(PL, 22, y + 2, `1/(1+'Key Formulas'!B69)^${y}`, '0.0000');
  val(PL, 23, 1, 'PRESENT VALUE'); PL.getRow(23).getCell(1).font = fontBold;
  for (let y = 0; y <= 5; y++) {
    const c = String.fromCharCode(66 + y);
    const cell = PL.getRow(23).getCell(y + 2);
    cell.value = { formula: `${c}21*${c}22` };
    cell.numFmt = DOL;
    cell.fill = goldFill;
    cell.font = goldFont;
  }
  val(PL, 24, 1, 'CUMULATIVE');
  fml(PL, 24, 2, 'B21', DOL);
  for (let y = 1; y <= 5; y++) {
    const c = String.fromCharCode(66 + y);
    const p = String.fromCharCode(65 + y);
    fml(PL, 24, y + 2, `${p}24+${c}21`, DOL);
  }

  // --- Financial Metrics (rows 27-30) ---
  sub(PL, 26, 'FINANCIAL METRICS', 7);
  val(PL, 27, 1, 'Net Present Value (NPV)'); PL.getRow(27).getCell(1).font = fontBold;
  { const cell = PL.getRow(27).getCell(2); cell.value = { formula: 'SUM(B23:G23)' }; cell.numFmt = DOL; cell.fill = goldFill; cell.font = goldFont; }
  val(PL, 28, 1, 'IRR'); PL.getRow(28).getCell(1).font = fontBold;
  { const cell = PL.getRow(28).getCell(2); cell.value = { formula: 'IFERROR(MIN(MAX(IRR(B21:G21),Lookups!B96*-1),Lookups!B96),"N/A")' }; cell.numFmt = PCT; cell.fill = goldFill; cell.font = goldFont; }
  val(PL, 29, 1, 'Payback (months)'); PL.getRow(29).getCell(1).font = fontBold;
  { const cell = PL.getRow(29).getCell(2); cell.value = { formula: 'IF(B24>=0,0,IF(C24>=0,ROUND(-B24/C21*12,0),IF(D24>=0,ROUND(12+(-C24/D21*12),0),IF(E24>=0,ROUND(24+(-D24/E21*12),0),IF(F24>=0,ROUND(36+(-E24/F21*12),0),IF(G24>=0,ROUND(48+(-F24/G21*12),0),61))))))' }; cell.numFmt = '0'; cell.fill = goldFill; cell.font = goldFont; }
  val(PL, 30, 1, 'ROIC'); PL.getRow(30).getCell(1).font = fontBold;
  { const cell = PL.getRow(30).getCell(2); cell.value = { formula: "(SUM(C21:G21)-'Key Formulas'!B64-'Key Formulas'!B62)/'Key Formulas'!B68" }; cell.numFmt = PCT; cell.fill = goldFill; cell.font = goldFont; }

  // --- ROIC Calculation Walkthrough (rows 32-38) ---
  sub(PL, 32, 'ROIC CALCULATION WALKTHROUGH', 7);
  val(PL, 33, 1, 'A. Total 5-Yr Gross Cash Inflows');
  fml(PL, 33, 2, 'SUM(C14:G14)', DOL);
  note(PL, 33, 3, 'Sum of years 1-5 gross savings');
  val(PL, 34, 1, 'B. Total 5-Yr Cash Outflows');
  fml(PL, 34, 2, 'SUM(C17:G17)+SUM(C18:G18)', DOL);
  note(PL, 34, 3, 'Sum of separation + ongoing costs');
  val(PL, 35, 1, 'C. Net Operating Cash Flow');
  fmlBold(PL, 35, 2, 'B33-B34', DOL, calcFill);
  note(PL, 35, 3, 'A - B');
  val(PL, 36, 1, 'D. Total Capital Deployed');
  fml(PL, 36, 2, "'Key Formulas'!B68", DOL);
  note(PL, 36, 3, 'Cost to Deploy + Contract Cancellation + Severance');
  val(PL, 37, 1, 'E. Net Return');
  fmlBold(PL, 37, 2, "B35-'Key Formulas'!B64-'Key Formulas'!B62", DOL, calcFill);
  note(PL, 37, 3, 'C - Cost to Deploy - Contract Cancellation');
  val(PL, 38, 1, 'F. ROIC = E / D'); PL.getRow(38).getCell(1).font = fontBold;
  { const cell = PL.getRow(38).getCell(2); cell.value = { formula: 'IF(B36>0,B37/B36,0)' }; cell.numFmt = PCT; cell.fill = goldFill; cell.font = goldFont; }
  note(PL, 38, 3, 'Net Return / Total Capital Deployed');

  // ROIC note
  note(PL, 40, 1, 'This is a live Excel DCF. Edit blue inputs on Inputs or the selected case tab; formulas recalculate P&L, NPV, IRR, payback, and ROIC.');
  PL.mergeCells(40, 1, 40, 7);
  printSetup(PL);

  // ===================================================================
  // TAB 5: SENSITIVITY — Scenarios + Tornado + Confidence
  // ===================================================================
  cols(SE, [28, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16]);
  hdr(SE, 1, 'SCENARIO & SENSITIVITY — DECISION RANGE', 8);
  colorLegend(SE, 2);

  // --- Scenario Analysis (rows 3-19) ---
  sub(SE, 3, 'SCENARIO ANALYSIS', 8);
  tableHeaders(SE, 4, ['', 'Conservative', 'Base Case', 'Optimistic', '', '', '', '']);
  val(SE, 4, 1, 'Scenario Multiplier');
  val(SE, 4, 2, 0.75, DEC); val(SE, 4, 3, 1.00, DEC); val(SE, 4, 4, 1.25, DEC);

  sub(SE, 6, 'Year-by-Year Net Cash Flows', 4);
  val(SE, 7, 1, 'FY 0');
  for (let s = 0; s < 3; s++) {
    fml(SE, 7, s + 2, "-'Key Formulas'!B64-'Key Formulas'!B62", DOL);
  }

  for (let y = 1; y <= 5; y++) {
    val(SE, 7 + y, 1, `FY ${y}`);
    for (let s = 0; s < 3; s++) {
      const m = `$${String.fromCharCode(66 + s)}$4`;
      const benefitGrowth = `*(1+'Key Formulas'!$B$106)^${y - 1}*(1-'Key Formulas'!$B$107)^${y - 1}`;
      const f = `('Key Formulas'!$B$58*Lookups!$D$${103 + y}*${m}${benefitGrowth}` +
        `+'Key Formulas'!$B$54*${cumulativeHeadcountReductionFraction(y)}*${m}${benefitGrowth})` +
        `-'Key Formulas'!$B$67*${annualHeadcountReductionFraction(y)}` +
        `-${modeledOngoingCostFormula("'Key Formulas'!$B$51", y)}`;
      fml(SE, 7 + y, s + 2, f, DOL);
    }
  }

  // --- Scenario Metrics (rows 14-19) ---
  sub(SE, 13, 'Scenario Metrics', 4);
  val(SE, 14, 1, 'NPV');
  for (let s = 0; s < 3; s++) {
    const c = String.fromCharCode(66 + s);
    fml(SE, 14, s + 2,
      `${c}7+NPV('Key Formulas'!B69,${c}8:${c}12)`, DOL,
      s === 0 ? warnFill : s === 2 ? resultFill : calcFill);
  }
  val(SE, 15, 1, 'IRR');
  for (let s = 0; s < 3; s++) {
    const c = String.fromCharCode(66 + s);
    fml(SE, 15, s + 2,
      `IFERROR(MIN(MAX(IRR(${c}7:${c}12),Lookups!B96*-1),Lookups!B96),"N/A")`, PCT,
      s === 0 ? warnFill : s === 2 ? resultFill : calcFill);
  }
  val(SE, 16, 1, 'ROIC');
  for (let s = 0; s < 3; s++) {
    const c = String.fromCharCode(66 + s);
    fml(SE, 16, s + 2,
      `MIN(MAX((SUM(${c}8:${c}12)-'Key Formulas'!B64-'Key Formulas'!B62)/'Key Formulas'!B68,Lookups!B95*-1),Lookups!B95)`, PCT,
      s === 0 ? warnFill : s === 2 ? resultFill : calcFill);
  }
  val(SE, 17, 1, 'Payback (months)');
  for (let s = 0; s < 3; s++) {
    const c = String.fromCharCode(66 + s);
    const cu0 = `${c}7`, cu1 = `${c}7+${c}8`, cu2 = `${cu1}+${c}9`, cu3 = `${cu2}+${c}10`, cu4 = `${cu3}+${c}11`, cu5 = `${cu4}+${c}12`;
    fml(SE, 17, s + 2,
      `IF(${cu0}>=0,0,IF(${cu1}>=0,ROUND(-${cu0}/${c}8*12,0),IF(${cu2}>=0,ROUND(12+(-${cu1})/${c}9*12,0),IF(${cu3}>=0,ROUND(24+(-${cu2})/${c}10*12,0),IF(${cu4}>=0,ROUND(36+(-${cu3})/${c}11*12,0),IF(${cu5}>=0,ROUND(48+(-${cu4})/${c}12*12,0),61))))))`,
      '0', s === 0 ? warnFill : s === 2 ? resultFill : calcFill);
  }
  val(SE, 18, 1, '5-Yr Total Net');
  for (let s = 0; s < 3; s++) {
    const c = String.fromCharCode(66 + s);
    fml(SE, 18, s + 2,
      `SUM(${c}8:${c}12)`, DOL, s === 0 ? warnFill : s === 2 ? resultFill : calcFill);
  }
  val(SE, 19, 1, 'Expected NPV (25/50/25)');
  fmlBold(SE, 19, 2, 'B14*0.25+C14*0.5+D14*0.25', DOL);

  // --- Tornado Analysis (rows 21-35) ---
  sub(SE, 21, 'TORNADO ANALYSIS — NPV IMPACT BY VARIABLE', 8);

  // Helper values
  val(SE, 22, 1, 'PV Factor');
  fml(SE, 22, 2, "Lookups!D104/(1+'Key Formulas'!B69)^1+Lookups!D105/(1+'Key Formulas'!B69)^2+Lookups!D106/(1+'Key Formulas'!B69)^3+Lookups!D107/(1+'Key Formulas'!B69)^4+Lookups!D108/(1+'Key Formulas'!B69)^5", DEC);
  val(SE, 23, 1, 'Full DCF Base NPV');
  fml(SE, 23, 2, "'P&L & Cash Flow'!B27", DOL);
  val(SE, 24, 1, 'Upfront Cash Cost');
  fml(SE, 24, 2, "'Key Formulas'!B64+'Key Formulas'!B62", DOL);

  tableHeaders(SE, 25, ['Variable', 'Base Value', 'Low', 'High', 'NPV Low', 'NPV High', 'Delta (-)', 'Delta (+)']);

  // Tornado intermediate formulas (rows 32-37 for intermediates)
  // Summary rows 26-31 in tornado table
  const sensVars = [
    { r: 26, ir: 32, name: 'Team Size', base: '=Inputs!B11', lo: '-20%', hi: '+20%' },
    { r: 27, ir: 33, name: 'Avg Salary', base: '=Inputs!B13', lo: '-20%', hi: '+20%' },
    { r: 28, ir: 34, name: 'Measured Rework Cost', base: "='Key Formulas'!B85", lo: '-50%', hi: '+50%' },
    { r: 29, ir: 35, name: 'Automation Potential', base: "='Key Formulas'!B4", lo: '-15pp', hi: '+15pp' },
    { r: 30, ir: 36, name: 'Implementation Cost', base: "='Key Formulas'!B42", lo: '-20%', hi: '+50%' },
    { r: 31, ir: 37, name: 'Ongoing Cost', base: "='Key Formulas'!B51", lo: '-50%', hi: '+100%' },
  ];

  // Hidden scale rate helper
  val(SE, 22, 4, 'Hidden Scale');
  fml(SE, 22, 5, "Lookups!B97+Lookups!B85+IF(Inputs!B19<=2,0.25,IF(Inputs!B19=3,0.1,0))+0.1", DEC);
  val(SE, 22, 6, 'Simplified Base Net');
  fml(SE, 22, 7, "'Key Formulas'!B60*$B$22", DOL);

  sensVars.forEach(v => {
    val(SE, v.r, 1, v.name);
    fml(SE, v.r, 2, v.base.replace('=', ''), v.name === 'Automation Potential' ? PCT : v.name === 'Team Size' ? '0' : DOL);
    val(SE, v.r, 3, v.lo); val(SE, v.r, 4, v.hi);
    if (v.name === 'Implementation Cost') {
      fml(SE, v.r, 5, `$B$23+(-F${v.ir}+'Key Formulas'!B60*$B$22)-(-$B$24+$B$22*'Key Formulas'!B60)`, DOL, warnFill);
      fml(SE, v.r, 6, `$B$23+(-G${v.ir}+'Key Formulas'!B60*$B$22)-(-$B$24+$B$22*'Key Formulas'!B60)`, DOL, resultFill);
    } else {
      fml(SE, v.r, 5, `$B$23+(D${v.ir}*$B$22-$B$22*'Key Formulas'!B60)`, DOL, warnFill);
      fml(SE, v.r, 6, `$B$23+(E${v.ir}*$B$22-$B$22*'Key Formulas'!B60)`, DOL, resultFill);
    }
    fml(SE, v.r, 7, `E${v.r}-$B$23`, DOL, warnFill);
    fml(SE, v.r, 8, `F${v.r}-$B$23`, DOL, resultFill);
  });

  // Intermediate calculations for tornado
  // Team Size (row 32)
  val(SE, 32, 1, 'Team Size');
  fml(SE, 32, 2, 'ROUND(Inputs!B11*0.8,0)*Inputs!B13+Inputs!B15', DOL);
  fml(SE, 32, 3, 'ROUND(Inputs!B11*1.2,0)*Inputs!B13+Inputs!B15', DOL);
  fml(SE, 32, 4, "B32*'Key Formulas'!B4*'Key Formulas'!B9-'Key Formulas'!B51", DOL);
  fml(SE, 32, 5, "C32*'Key Formulas'!B4*'Key Formulas'!B9-'Key Formulas'!B51", DOL);

  // Avg Salary (row 33)
  val(SE, 33, 1, 'Avg Salary');
  fml(SE, 33, 2, 'Inputs!B11*(Inputs!B13*0.8)+Inputs!B15', DOL);
  fml(SE, 33, 3, 'Inputs!B11*(Inputs!B13*1.2)+Inputs!B15', DOL);
  fml(SE, 33, 4, "B33*'Key Formulas'!B4*'Key Formulas'!B9-'Key Formulas'!B51", DOL);
  fml(SE, 33, 5, "C33*'Key Formulas'!B4*'Key Formulas'!B9-'Key Formulas'!B51", DOL);

  // Measured Rework Cost (row 34)
  val(SE, 34, 1, 'Measured Rework Cost');
  fml(SE, 34, 2, "'Key Formulas'!B85*0.5", DOL);
  fml(SE, 34, 3, "'Key Formulas'!B85*1.5", DOL);
  fml(SE, 34, 4, `B34*Inputs!B${exportInputRows.totalEfficiencyGainPct}*'Key Formulas'!B9-'Key Formulas'!B51`, DOL);
  fml(SE, 34, 5, `C34*Inputs!B${exportInputRows.totalEfficiencyGainPct}*'Key Formulas'!B9-'Key Formulas'!B51`, DOL);

  // Automation Potential (row 35)
  val(SE, 35, 1, 'Automation Potential');
  fml(SE, 35, 4, "'Key Formulas'!B15*MAX(0.1,'Key Formulas'!B4-0.15)*'Key Formulas'!B9-'Key Formulas'!B51", DOL);
  fml(SE, 35, 5, "'Key Formulas'!B15*MIN(0.95,'Key Formulas'!B4+0.15)*'Key Formulas'!B9-'Key Formulas'!B51", DOL);

  // Impl Cost (row 36)
  val(SE, 36, 1, 'Impl Cost');
  fml(SE, 36, 6, "'Key Formulas'!B42*0.8*(1+$E$22)+'Key Formulas'!B40", DOL);
  fml(SE, 36, 7, "'Key Formulas'!B42*1.5*(1+$E$22)+'Key Formulas'!B40", DOL);

  // Ongoing Cost (row 37)
  val(SE, 37, 1, 'Ongoing Cost');
  fml(SE, 37, 4, "'Key Formulas'!B59-'Key Formulas'!B51*0.5", DOL);
  fml(SE, 37, 5, "'Key Formulas'!B59-'Key Formulas'!B51*2", DOL);

  // --- Confidence Intervals (rows 38-42) ---
  sub(SE, 39, 'CONFIDENCE INTERVALS (P25 / P50 / P75)', 8);
  tableHeaders(SE, 40, ['Metric', 'P25 (Cons)', 'P50 (Base)', 'P75 (Opt)', '', '', '', '']);

  val(SE, 41, 1, 'NPV');
  fml(SE, 41, 2, 'B14', DOL, warnFill);
  fml(SE, 41, 3, 'C14', DOL, calcFill);
  fml(SE, 41, 4, 'D14', DOL, resultFill);

  val(SE, 42, 1, 'ROIC');
  fml(SE, 42, 2, 'B16', PCT, warnFill);
  fml(SE, 42, 3, 'C16', PCT, calcFill);
  fml(SE, 42, 4, 'D16', PCT, resultFill);

  val(SE, 43, 1, 'Payback (months)');
  fml(SE, 43, 2, 'B17', '0', warnFill);
  fml(SE, 43, 3, 'C17', '0', calcFill);
  fml(SE, 43, 4, 'D17', '0', resultFill);

  // --- Discount Rate Sensitivity (rows 45-47) ---
  sub(SE, 45, 'DISCOUNT RATE SENSITIVITY', 8);
  tableHeaders(SE, 46, ['Variable', 'Base Value', 'Low', 'High', 'NPV Low', 'NPV High', 'Delta (-)', 'Delta (+)']);
  val(SE, 47, 1, 'Discount Rate');
  fml(SE, 47, 2, "'Key Formulas'!B69", PCT);
  val(SE, 47, 3, '-3pp');
  val(SE, 47, 4, '+5pp');
  fml(SE, 47, 5, "-'Key Formulas'!B64-'Key Formulas'!B62+NPV('Key Formulas'!B69-0.03,'P&L & Cash Flow'!C21:G21)", DOL, warnFill);
  fml(SE, 47, 6, "-'Key Formulas'!B64-'Key Formulas'!B62+NPV('Key Formulas'!B69+0.05,'P&L & Cash Flow'!C21:G21)", DOL, resultFill);
  fml(SE, 47, 7, 'E47-$B$23', DOL, warnFill);
  fml(SE, 47, 8, 'F47-$B$23', DOL, resultFill);

  // --- Monte Carlo Simulation Summary (rows 49-56) ---
  if (mcResults) {
    sub(SE, 49, `MONTE CARLO SIMULATION (N=${mcResults.sampleSize})`, 8);
    tableHeaders(SE, 50, ['Metric', 'P10', 'P25', 'P50 (Median)', 'P75', 'P90', 'Mean', 'Prob. Positive']);

    // Row 51: NPV
    val(SE, 51, 1, 'NPV');
    val(SE, 51, 2, mcResults.npv.p10, DOL, warnFill);
    val(SE, 51, 3, mcResults.npv.p25, DOL);
    val(SE, 51, 4, mcResults.npv.p50, DOL, calcFill);
    val(SE, 51, 5, mcResults.npv.p75, DOL);
    val(SE, 51, 6, mcResults.npv.p90, DOL, resultFill);
    val(SE, 51, 7, mcResults.npv.mean, DOL);
    val(SE, 51, 8, mcResults.probabilityPositiveNPV, PCT, mcResults.probabilityPositiveNPV >= 0.70 ? calcFill : warnFill);

    // Row 52: IRR
    val(SE, 52, 1, 'IRR');
    val(SE, 52, 2, mcResults.irr.p10, PCT, warnFill);
    val(SE, 52, 3, mcResults.irr.p25, PCT);
    val(SE, 52, 4, mcResults.irr.p50, PCT, calcFill);
    val(SE, 52, 5, mcResults.irr.p75, PCT);
    val(SE, 52, 6, mcResults.irr.p90, PCT, resultFill);
    val(SE, 52, 7, mcResults.irr.mean, PCT);

    // Row 53: ROIC
    val(SE, 53, 1, 'ROIC');
    val(SE, 53, 2, mcResults.roic.p10, PCT, warnFill);
    val(SE, 53, 3, mcResults.roic.p25, PCT);
    val(SE, 53, 4, mcResults.roic.p50, PCT, calcFill);
    val(SE, 53, 5, mcResults.roic.p75, PCT);
    val(SE, 53, 6, mcResults.roic.p90, PCT, resultFill);
    val(SE, 53, 7, mcResults.roic.mean, PCT);

    // Row 54: Payback (months)
    val(SE, 54, 1, 'Payback (months)');
    val(SE, 54, 2, Math.round(mcResults.payback.p10), NUM, resultFill);
    val(SE, 54, 3, Math.round(mcResults.payback.p25), NUM);
    val(SE, 54, 4, Math.round(mcResults.payback.p50), NUM, calcFill);
    val(SE, 54, 5, Math.round(mcResults.payback.p75), NUM);
    val(SE, 54, 6, Math.round(mcResults.payback.p90), NUM, warnFill);
    val(SE, 54, 7, Math.round(mcResults.payback.mean), NUM);

    // Row 56: Tail Risk / VaR
    if (mcResults.tailRisk) {
      sub(SE, 56, 'TAIL RISK METRICS', 8);
      val(SE, 57, 1, 'P5 Worst Case (NPV)');
      val(SE, 57, 2, mcResults.tailRisk.p5Npv, DOL, warnFill);
      val(SE, 57, 4, 'P(Capital Loss >50%)');
      val(SE, 57, 5, mcResults.tailRisk.probCapitalLoss50, PCT, warnFill);
      val(SE, 57, 7, 'P(Payback >60mo)');
      val(SE, 57, 8, mcResults.tailRisk.probPaybackOver60, PCT, warnFill);
    }

    // Row 59: Methodology note
    note(SE, 59, 1, `Monte Carlo: ${mcResults.sampleSize} correlated iterations varying automation potential, change readiness, implementation budget, ongoing costs, cash realization, and measurable rework assumptions.`);
  }

  // --- Two-driver 10 x 10 cost-savings grid (rows 62-78) ---
  // P25/P50/P75 are planning cases around the supplied inputs, not a claim
  // that these are statistically measured percentiles.
  const gridStart = 62;
  sub(SE, gridStart, 'TWO-DRIVER PLANNING GRID — Capacity + Cash Context: Workforce Cost × Total Efficiency Gain', 11);
  val(SE, gridStart + 1, 1, 'Annual ongoing headcount cost ↓ / total efficiency gain →');
  const gridMultipliers = [0.50, 0.625, 0.75, 0.875, 1.00, 1.125, 1.25, 1.375, 1.50, 1.625];
  gridMultipliers.forEach((multiplier, index) => {
    fml(SE, gridStart + 1, index + 2,
      `MAX(0,Inputs!B${exportInputRows.totalEfficiencyGainPct}*${multiplier})`, PCT, index === 4 ? calcFill : null);
  });
  gridMultipliers.forEach((multiplier, rowIndex) => {
    const row = gridStart + 2 + rowIndex;
    fml(SE, row, 1, `'Key Formulas'!B13*${multiplier}`, DOL, rowIndex === 4 ? calcFill : null);
    gridMultipliers.forEach((_, columnIndex) => {
      const columnLetter = String.fromCharCode(66 + columnIndex);
      fml(SE, row, columnIndex + 2,
        `MAX(0,($A${row}*${columnLetter}$${gridStart + 1}-'Key Formulas'!B20*Inputs!B${exportInputRows.employeeFullyBurdenedCost})*'Key Formulas'!B9)+'Key Formulas'!B54+'Key Formulas'!B56+'Key Formulas'!B57+'Key Formulas'!B61`,
        DOL, rowIndex === 4 && columnIndex === 4 ? resultFill : null);
    });
  });
  note(SE, gridStart + 13, 1, 'Each cell is a planning-context total: explicit hard headcount cash + non-duplicated workforce capacity + measurable rework + tool and contract savings. Capacity is deliberately excluded from P&L, NPV, ROIC, and payback unless Finance explicitly changes the cash-flow formulas.');
  SE.mergeCells(gridStart + 13, 1, gridStart + 13, 11);

  sub(SE, gridStart + 15, 'P25 / P50 / P75 PLANNING CASES — Exact reference points from the grid drivers', 11);
  tableHeaders(SE, gridStart + 16, ['Case', 'Workforce Cost', 'Efficiency Gain', 'Estimated Annual Value (Context)']);
  [
    ['P25 planning case', 0.75],
    ['P50 / median planning case', 1.00],
    ['P75 planning case', 1.25],
  ].forEach(([label, multiplier], index) => {
    const row = gridStart + 17 + index;
    val(SE, row, 1, label);
    fml(SE, row, 2, `'Key Formulas'!B13*${multiplier}`, DOL, multiplier === 1 ? calcFill : null);
    fml(SE, row, 3, `MAX(0,Inputs!B${exportInputRows.totalEfficiencyGainPct}*${multiplier})`, PCT, multiplier === 1 ? calcFill : null);
    fml(SE, row, 4, `MAX(0,(B${row}*C${row}-'Key Formulas'!B20*Inputs!B${exportInputRows.employeeFullyBurdenedCost})*'Key Formulas'!B9)+'Key Formulas'!B54+'Key Formulas'!B56+'Key Formulas'!B57+'Key Formulas'!B61`, DOL, multiplier === 1 ? resultFill : null);
  });

  printSetup(SE);

  // ===================================================================
  // TAB 7: V5 ANALYSIS — Workforce Alternatives, Break-Even Units, Cost Model
  // ===================================================================
  cols(V5, [32, 22, 22, 22, 22, 22]);
  hdr(V5, 1, 'DETAILED VARIANCE & UNIT ECONOMICS', 6);
  colorLegend(V5, 2);

  // --- Workforce Alternatives (rows 3-22) ---
  sub(V5, 3, 'CAPITAL ALLOCATION: AI vs. ALTERNATIVES', 6);

  if (results?.workforceAlternatives) {
    const wa = results.workforceAlternatives;

    tableHeaders(V5, 4, ['Strategy', 'Key Metric', '5-Year Economics', 'ROI', 'Risk Level', 'Timeframe']);

    const fmt$ = (v) => typeof v === 'number' ? v : 0;
    const fmtPct = (v) => typeof v === 'number' ? v : 0;

    dataRow(V5, 5,
      [wa.aiInvestment.label, fmt$(wa.aiInvestment.upfrontCost), fmt$(wa.aiInvestment.annual5YearNet), fmtPct(wa.aiInvestment.roi), wa.aiInvestment.riskLevel, `${wa.aiInvestment.paybackMonths} mo payback`],
      [null, DOL, DOL, PCT, null, null]);
    V5.getRow(5).getCell(1).fill = calcFill;
    V5.getRow(5).getCell(1).font = greenFontBold;

    dataRow(V5, 6,
      [wa.hiring.label, fmt$(wa.hiring.annualCost), fmt$(wa.hiring.total5YearCost), fmtPct(wa.hiring.roi), wa.hiring.riskLevel, `${wa.hiring.rampMonths} mo ramp`],
      [null, DOL, DOL, PCT, null, null]);

    dataRow(V5, 7,
      [wa.outsourcing.label, fmt$(wa.outsourcing.annualCost), fmt$(wa.outsourcing.total5YearNet), fmtPct(wa.outsourcing.roi), wa.outsourcing.riskLevel, `${wa.outsourcing.transitionMonths} mo transition`],
      [null, DOL, DOL, PCT, null, null]);

    dataRow(V5, 8,
      [wa.statusQuo.label, fmt$(wa.statusQuo.annualCost), fmt$(wa.statusQuo.total5YearCost), fmtPct(wa.statusQuo.competitiveErosionRate), wa.statusQuo.riskLevel, 'N/A'],
      [null, DOL, DOL, PCT, null, null]);
    V5.getRow(8).getCell(1).fill = warnFill;

    // Detailed breakdown headers
    sub(V5, 10, 'DETAILED BREAKDOWN — AI AUTOMATION', 6);
    val(V5, 11, 1, 'Upfront Investment'); val(V5, 11, 2, fmt$(wa.aiInvestment.upfrontCost), DOL, inputFill);
    val(V5, 12, 1, '5-Year Net Return'); val(V5, 12, 2, fmt$(wa.aiInvestment.annual5YearNet), DOL, calcFill);
    val(V5, 13, 1, 'ROI'); val(V5, 13, 2, fmtPct(wa.aiInvestment.roi), PCT, calcFill);
    val(V5, 14, 1, 'NPV'); val(V5, 14, 2, fmt$(wa.aiInvestment.npv), DOL, resultFill);
    V5.getRow(14).getCell(2).font = outputFont10;

    sub(V5, 16, 'DETAILED BREAKDOWN — HIRE MORE STAFF', 6);
    val(V5, 17, 1, 'FTEs Needed'); val(V5, 17, 2, wa.hiring.ftesNeeded, NUM, inputFill);
    val(V5, 18, 1, 'Annual Cost (fully loaded)'); val(V5, 18, 2, fmt$(wa.hiring.annualCost), DOL, inputFill);
    val(V5, 19, 1, 'Turnover Cost'); val(V5, 19, 2, fmt$(wa.hiring.turnoverCost), DOL);
    val(V5, 20, 1, '5-Year Total Cost'); val(V5, 20, 2, fmt$(wa.hiring.total5YearCost), DOL, warnFill);

    sub(V5, 22, 'DETAILED BREAKDOWN — OUTSOURCE / BPO', 6);
    val(V5, 23, 1, 'Annual Cost'); val(V5, 23, 2, fmt$(wa.outsourcing.annualCost), DOL, inputFill);
    val(V5, 24, 1, 'Annual Savings'); val(V5, 24, 2, fmt$(wa.outsourcing.annualSavings), DOL, calcFill);
    val(V5, 25, 1, 'Quality Impact'); val(V5, 25, 2, wa.outsourcing.qualityImpact);
    val(V5, 26, 1, 'Transition Period'); val(V5, 26, 2, `${wa.outsourcing.transitionMonths} months`);

    sub(V5, 28, 'DETAILED BREAKDOWN — STATUS QUO (DO NOTHING)', 6);
    val(V5, 29, 1, 'Annual Cost'); val(V5, 29, 2, fmt$(wa.statusQuo.annualCost), DOL, inputFill);
    val(V5, 30, 1, '5-Year Total Cost'); val(V5, 30, 2, fmt$(wa.statusQuo.total5YearCost), DOL, warnFill);
    val(V5, 31, 1, 'Opportunity Cost'); val(V5, 31, 2, fmt$(wa.statusQuo.opportunityCost), DOL, warnFill);
    val(V5, 32, 1, 'Competitive Erosion Rate'); val(V5, 32, 2, fmtPct(wa.statusQuo.competitiveErosionRate), PCT, warnFill);
  } else {
    note(V5, 4, 1, 'Workforce alternatives data not available for this configuration.');
  }

  // --- Break-Even Unit Economics (rows 34+) ---
  let beRow = 35;
  sub(V5, beRow - 1, 'BREAK-EVEN UNIT ECONOMICS', 6);

  if (results?.breakEvenUnits && results.breakEvenUnits.length > 0) {
    const items = results.breakEvenUnits;
    const isFloor = items[0]?.direction === 'floor';

    note(V5, beRow, 1, isFloor
      ? 'Minimum input values before NPV turns negative (safety margin from current values)'
      : 'Target input values needed for NPV to turn positive');
    beRow += 1;

    tableHeaders(V5, beRow, [
      'Input Variable', 'Current Value', 'Break-Even Value',
      isFloor ? 'Safety Margin' : 'Gap to Target', 'Direction', '',
    ]);
    beRow += 1;

    items.forEach((item) => {
      const fmtVal = (v, type) => {
        if (type === 'percent') return v;
        return v;
      };
      const curFmt = item.type === 'percent' ? PCT : NUM;
      const beFmt = item.type === 'percent' ? PCT : NUM;
      dataRow(V5, beRow, [
        item.label,
        fmtVal(item.currentValue, item.type),
        fmtVal(item.breakEvenValue, item.type),
        item.marginPct / 100,
        isFloor ? 'Floor' : 'Target',
        '',
      ], [null, curFmt, beFmt, PCT, null, null]);

      // Color the margin cell based on health
      const marginCell = V5.getRow(beRow).getCell(4);
      if (isFloor) {
        marginCell.fill = item.marginPct > 30 ? calcFill : item.marginPct > 10 ? inputFill : warnFill;
      } else {
        marginCell.fill = inputFill;
      }
      marginCell.font = fontBold;
      beRow += 1;
    });
  } else {
    note(V5, beRow, 1, 'Break-even unit economics not available. Requires archetype-specific inputs.');
    beRow += 1;
  }

  // --- Consulting Assumptions (Token Economics, Drift, Agent) ---
  beRow += 2;
  sub(V5, beRow, 'AI COST MODEL & TECHNICAL ASSUMPTIONS', 6);
  beRow += 1;

  const ca = results?.consultingAssumptions || {};
  val(V5, beRow, 1, 'Model Tier'); val(V5, beRow, 2, ca.modelTier || 'standard'); beRow++;
  val(V5, beRow, 1, 'Token-Based Costing'); val(V5, beRow, 2, ca.useTokenModel ? 'Enabled' : 'Disabled'); beRow++;
  val(V5, beRow, 1, 'LLM Calls Per Task'); val(V5, beRow, 2, ca.llmCallsPerTask || 3, NUM); beRow++;
  val(V5, beRow, 1, 'Prompt Caching Rate'); val(V5, beRow, 2, ca.promptCachingRate || 0, PCT); beRow++;
  val(V5, beRow, 1, 'Model Drift Rate'); val(V5, beRow, 2, ca.modelDriftRate || 0.03, PCT, warnFill); beRow++;
  val(V5, beRow, 1, 'Agentic Workflow'); val(V5, beRow, 2, ca.isAgenticWorkflow ? 'Yes' : 'No'); beRow++;
  if (ca.isAgenticWorkflow) {
    val(V5, beRow, 1, 'Agent Complexity'); val(V5, beRow, 2, ca.agentComplexity || 'standard'); beRow++;
  }

  // Drift schedule
  beRow += 1;
  sub(V5, beRow, 'MODEL DRIFT SCHEDULE', 6);
  beRow += 1;
  const driftRate = ca.modelDriftRate || 0.03;
  tableHeaders(V5, beRow, ['Year', 'Drift Factor', 'Effective Benefit', 'Cumulative Reduction', '', '']);
  beRow += 1;
  for (let yr = 0; yr < 5; yr++) {
    const factor = Math.pow(1 - driftRate, yr);
    dataRow(V5, beRow, [
      `FY ${yr + 1}`, factor, factor, 1 - factor, '', '',
    ], [null, DEC, PCT, PCT, null, null]);
    beRow++;
  }

  note(V5, beRow + 1, 1, '[35] Model drift is a planning-context assumption. It compounds annually and reduces projected benefits in years 2–5; validate with live model-quality monitoring.');

  printSetup(V5);

  // ===================================================================
  // TAB 8: MODEL AUDIT — All-formula validation tab
  // Every value in col B is a formula referencing other tabs.
  // Every status in col D is an IF formula returning "ok" / "ERROR" / "—".
  // ===================================================================
  const okFill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
  const errFill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } };
  const okFont    = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF2E7D32' } };
  const errFont   = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFC62828' } };

  cols(AU, [42, 28, 28, 12]);
  hdr(AU, 1, 'MODEL AUDIT — Output Validation (All Formulas)', 4);
  tableHeaders(AU, 2, ['Check', 'Value', 'Condition', 'Status']);

  // Helper: write a formula-based audit row
  // valFormula: Excel formula for the value cell (col B)
  // condition: descriptive text (col C)
  // statusFormula: Excel formula that returns "ok", "ERROR", or "—" (col D)
  // valFmt: optional number format for the value cell
  let auRow = 3;

  function auditFml(label, valFormula, valFmt, condition, statusFormula) {
    const r = auRow;
    val(AU, r, 1, label);
    AU.getRow(r).getCell(1).font = font10;

    // Value (formula)
    fml(AU, r, 2, valFormula, valFmt || null, null);
    AU.getRow(r).getCell(2).fill = calcFill;

    // Condition (text)
    val(AU, r, 3, condition);
    AU.getRow(r).getCell(3).font = font9i;

    // Status (formula) — conditional formatting via cell formula
    fml(AU, r, 4, statusFormula, null, null);
    AU.getRow(r).getCell(4).alignment = { horizontal: 'center' };
    // Font/fill will be set via conditional formatting rules at the end

    auRow++;
    return r;
  }

  function auditSection(title) {
    sub(AU, auRow, title, 4);
    auRow++;
  }

  // Track first and last data rows for conditional formatting + summary
  const auDataStart = 3;

  // =========================
  // SECTION: INPUT VALIDATION
  // =========================
  auditSection('INPUT VALIDATION');

  auditFml('Industry', 'Inputs!B4', null,
    'Not empty',
    'IF(LEN(Inputs!B4)>0,"ok","ERROR")');

  auditFml('Company Size', 'Inputs!B5', null,
    'Not empty',
    'IF(LEN(Inputs!B5)>0,"ok","ERROR")');

  auditFml('Team Size', 'Inputs!B11', NUM,
    '> 0',
    'IF(AND(ISNUMBER(Inputs!B11),Inputs!B11>0),"ok","ERROR")');

  auditFml('Avg Salary', 'Inputs!B13', DOL,
    '> 0',
    'IF(AND(ISNUMBER(Inputs!B13),Inputs!B13>0),"ok","ERROR")');

  auditFml('Measured Rework Share', `Inputs!B${exportInputRows.fractionNeedingRework}`, PCT,
    '0% - 100%',
    `IF(AND(ISNUMBER(Inputs!B${exportInputRows.fractionNeedingRework}),Inputs!B${exportInputRows.fractionNeedingRework}>=0,Inputs!B${exportInputRows.fractionNeedingRework}<=1),"ok","ERROR")`);

  auditFml('Total Efficiency Gain', `Inputs!B${exportInputRows.totalEfficiencyGainPct}`, PCT,
    '0% - 100%',
    `IF(AND(ISNUMBER(Inputs!B${exportInputRows.totalEfficiencyGainPct}),Inputs!B${exportInputRows.totalEfficiencyGainPct}>=0,Inputs!B${exportInputRows.totalEfficiencyGainPct}<=1),"ok","ERROR")`);

  auditFml('Years to Achieve Selected Reductions', `Inputs!B${exportInputRows.headcountReductionYears}`, NUM,
    '1 - 5 years',
    `IF(AND(ISNUMBER(Inputs!B${exportInputRows.headcountReductionYears}),Inputs!B${exportInputRows.headcountReductionYears}>=1,Inputs!B${exportInputRows.headcountReductionYears}<=5),"ok","ERROR")`);

  auditFml('Implementation Budget', 'Inputs!B23', DOL,
    '> 0',
    'IF(AND(ISNUMBER(Inputs!B23),Inputs!B23>0),"ok","ERROR")');

  auditFml('Expected Timeline', 'Inputs!B24', '0.0',
    '> 0',
    'IF(AND(ISNUMBER(Inputs!B24),Inputs!B24>0),"ok","ERROR")');

  auditFml('Ongoing Annual Cost', 'Inputs!B25', DOL,
    '> 0',
    'IF(AND(ISNUMBER(Inputs!B25),Inputs!B25>0),"ok","ERROR")');

  auditFml('Change Readiness', 'Inputs!B18', '0',
    '1 - 5',
    'IF(AND(ISNUMBER(Inputs!B18),Inputs!B18>=1,Inputs!B18<=5),"ok","ERROR")');

  auditFml('Data Readiness', 'Inputs!B19', '0',
    '1 - 5',
    'IF(AND(ISNUMBER(Inputs!B19),Inputs!B19>=1,Inputs!B19<=5),"ok","ERROR")');

  auditFml('Cash Realization %', 'Inputs!B30', PCT,
    '0% - 100%',
    'IF(AND(ISNUMBER(Inputs!B30),Inputs!B30>=0,Inputs!B30<=1),"ok","ERROR")');

  // =========================
  // SECTION: KEY FORMULAS / ASSUMPTIONS
  // =========================
  auditSection('KEY FORMULAS & ASSUMPTIONS');

  auditFml('Automation Potential', "'Key Formulas'!B4", PCT,
    '0% - 95%',
    "IF(AND(ISNUMBER('Key Formulas'!B4),'Key Formulas'!B4>=0,'Key Formulas'!B4<=0.95),\"ok\",\"ERROR\")");

  auditFml('Adoption Rate', "'Key Formulas'!B6", PCT,
    '> 0 and <= 1',
    "IF(AND(ISNUMBER('Key Formulas'!B6),'Key Formulas'!B6>0,'Key Formulas'!B6<=1),\"ok\",\"ERROR\")");

  auditFml('Risk Multiplier', "'Key Formulas'!B9", PCT,
    '> 0 and <= 1',
    "IF(AND(ISNUMBER('Key Formulas'!B9),'Key Formulas'!B9>0,'Key Formulas'!B9<=1),\"ok\",\"ERROR\")");

  auditFml('Discount Rate', "'Key Formulas'!B69", PCT,
    '5% - 20%',
    "IF(AND(ISNUMBER('Key Formulas'!B69),'Key Formulas'!B69>=0.05,'Key Formulas'!B69<=0.2),\"ok\",\"ERROR\")");

  auditFml('Calculated Total Reduction Target', "'Key Formulas'!B18", '0',
    '0 - whole measured freed-capacity FTEs',
    "IF(AND(ISNUMBER('Key Formulas'!B18),'Key Formulas'!B18>=0,'Key Formulas'!B18<=Inputs!B11,'Key Formulas'!B18<=INT('Key Formulas'!B86/2080+0.000000001)),\"ok\",\"ERROR\")");

  auditFml('Selected Contractor Roll-Off', "'Key Formulas'!B19", '0',
    '0 - min(contractors, total target)',
    "IF(AND(ISNUMBER('Key Formulas'!B19),'Key Formulas'!B19>=0,'Key Formulas'!B19<=Inputs!B42,'Key Formulas'!B19<='Key Formulas'!B18),\"ok\",\"ERROR\")");

  auditFml('Selected Direct Employee Redundancies', "'Key Formulas'!B20", '0',
    '0 - min(direct employees, target less contractor roll-off)',
    "IF(AND(ISNUMBER('Key Formulas'!B20),'Key Formulas'!B20>=0,'Key Formulas'!B20<=Inputs!B40,'Key Formulas'!B20<=MAX(0,'Key Formulas'!B18-'Key Formulas'!B19)),\"ok\",\"ERROR\")");

  auditFml('Remaining Workforce', "'Key Formulas'!B21", '0',
    '>= 0',
    "IF(AND(ISNUMBER('Key Formulas'!B21),'Key Formulas'!B21>=0),\"ok\",\"ERROR\")");

  auditFml('Selected Actions + Remaining = Team', "'Key Formulas'!B19+'Key Formulas'!B20+'Key Formulas'!B21", '0',
    '= Team Size',
    "IF(ABS('Key Formulas'!B19+'Key Formulas'!B20+'Key Formulas'!B21-Inputs!B11)<1,\"ok\",\"ERROR\")");

  auditFml('Impl Engineers', "'Key Formulas'!B29", '0',
    '>= 1',
    "IF(AND(ISNUMBER('Key Formulas'!B29),'Key Formulas'!B29>=1),\"ok\",\"ERROR\")");

  // =========================
  // SECTION: CURRENT STATE
  // =========================
  auditSection('CURRENT STATE');

  auditFml('Annual Labor Cost', "'Key Formulas'!B13", DOL,
    '> 0',
    "IF(AND(ISNUMBER('Key Formulas'!B13),'Key Formulas'!B13>0),\"ok\",\"ERROR\")");

  auditFml('Measured Rework Cost', "'Key Formulas'!B85", DOL,
    '>= 0',
    "IF(AND(ISNUMBER('Key Formulas'!B85),'Key Formulas'!B85>=0),\"ok\",\"ERROR\")");

  auditFml('Total Current Cost', "'Key Formulas'!B15", DOL,
    '>= Labor Cost',
    "IF(AND(ISNUMBER('Key Formulas'!B15),'Key Formulas'!B15>='Key Formulas'!B13),\"ok\",\"ERROR\")");

  // =========================
  // SECTION: INVESTMENT COSTS
  // =========================
  auditSection('INVESTMENT COSTS');

  auditFml('Realistic Impl Cost', "'Key Formulas'!B42", DOL,
    '> 0',
    "IF(AND(ISNUMBER('Key Formulas'!B42),'Key Formulas'!B42>0),\"ok\",\"ERROR\")");

  auditFml('One-Time Costs', "'Key Formulas'!B40", DOL,
    '>= 0',
    "IF(AND(ISNUMBER('Key Formulas'!B40),'Key Formulas'!B40>=0),\"ok\",\"ERROR\")");

  auditFml('Upfront Investment', "'Key Formulas'!B64", DOL,
    '> 0',
    "IF(AND(ISNUMBER('Key Formulas'!B64),'Key Formulas'!B64>0),\"ok\",\"ERROR\")");

  auditFml('Contract Cancellation Cost', "'Key Formulas'!B62", DOL,
    '>= 0',
    "IF(AND(ISNUMBER('Key Formulas'!B62),'Key Formulas'!B62>=0),\"ok\",\"ERROR\")");

  auditFml('Separation Cost', "'Key Formulas'!B67", DOL,
    '>= 0',
    "IF(AND(ISNUMBER('Key Formulas'!B67),'Key Formulas'!B67>=0),\"ok\",\"ERROR\")");

  auditFml('Total Investment', "'Key Formulas'!B68", DOL,
    '>= Upfront',
    "IF(AND(ISNUMBER('Key Formulas'!B68),'Key Formulas'!B68>='Key Formulas'!B64),\"ok\",\"ERROR\")");

  auditFml('Base Ongoing Cost', "'Key Formulas'!B51", DOL,
    '> 0',
    "IF(AND(ISNUMBER('Key Formulas'!B51),'Key Formulas'!B51>0),\"ok\",\"ERROR\")");

  // =========================
  // SECTION: ANNUAL SAVINGS
  // =========================
  auditSection('ANNUAL SAVINGS');

  auditFml('Headcount Savings (Explicit Cash)', "'Key Formulas'!B54", DOL,
    '>= 0',
    "IF(AND(ISNUMBER('Key Formulas'!B54),'Key Formulas'!B54>=0),\"ok\",\"ERROR\")");

  auditFml('Enhancement Savings (RA)', "'Key Formulas'!B58", DOL,
    '>= 0',
    "IF(AND(ISNUMBER('Key Formulas'!B58),'Key Formulas'!B58>=0),\"ok\",\"ERROR\")");

  auditFml('Total Risk-Adj Savings', "'Key Formulas'!B59", DOL,
    '>= 0',
    "IF(AND(ISNUMBER('Key Formulas'!B59),'Key Formulas'!B59>=0),\"ok\",\"ERROR\")");

  auditFml('Net Annual Benefit', "'Key Formulas'!B60", DOL,
    'Is a number',
    "IF(ISNUMBER('Key Formulas'!B60),\"ok\",\"ERROR\")");

  auditFml('Annual Contract Savings', "'Key Formulas'!B61", DOL,
    '>= 0',
    "IF(AND(ISNUMBER('Key Formulas'!B61),'Key Formulas'!B61>=0),\"ok\",\"ERROR\")");

  auditFml('Gross >= Net Savings', "'Key Formulas'!B59-'Key Formulas'!B60", DOL,
    '>= 0',
    "IF('Key Formulas'!B59>='Key Formulas'!B60,\"ok\",\"ERROR\")");

  // =========================
  // SECTION: P&L YEAR-BY-YEAR (BASE CASE)
  // =========================
  auditSection('P&L YEAR-BY-YEAR (BASE CASE)');

  for (let y = 1; y <= 5; y++) {
    const c = String.fromCharCode(66 + y); // C, D, E, F, G
    auditFml(`FY ${y} Gross Savings`, `'P&L & Cash Flow'!${c}14`, DOL,
      '>= 0',
      `IF(AND(ISNUMBER('P&L & Cash Flow'!${c}14),'P&L & Cash Flow'!${c}14>=0),"ok","ERROR")`);
  }

  for (let y = 1; y <= 5; y++) {
    const c = String.fromCharCode(66 + y);
    auditFml(`FY ${y} Net Cash Flow`, `'P&L & Cash Flow'!${c}21`, DOL,
      'Is a number',
      `IF(ISNUMBER('P&L & Cash Flow'!${c}21),"ok","ERROR")`);
  }

  auditFml('FY 0 Cash Flow (upfront)', "'P&L & Cash Flow'!B21", DOL,
    '< 0 (outflow)',
    "IF(AND(ISNUMBER('P&L & Cash Flow'!B21),'P&L & Cash Flow'!B21<0),\"ok\",\"ERROR\")");

  auditFml('FY 5 Cumulative', "'P&L & Cash Flow'!G24", DOL,
    'Is a number',
    "IF(ISNUMBER('P&L & Cash Flow'!G24),\"ok\",\"ERROR\")");

  // =========================
  // SECTION: FINANCIAL METRICS
  // =========================
  auditSection('FINANCIAL METRICS (BASE CASE)');

  auditFml('NPV', "'P&L & Cash Flow'!B27", DOL,
    'Is a finite number',
    "IF(AND(ISNUMBER('P&L & Cash Flow'!B27),NOT(ISERROR('P&L & Cash Flow'!B27))),\"ok\",\"ERROR\")");

  auditFml('IRR', "'P&L & Cash Flow'!B28", PCT,
    'Is a number (or N/A)',
    "IF(OR(ISNUMBER('P&L & Cash Flow'!B28),'P&L & Cash Flow'!B28=\"N/A\"),\"ok\",\"ERROR\")");

  auditFml('Payback (months)', "'P&L & Cash Flow'!B29", '0',
    '> 0 and <= 61',
    "IF(AND(ISNUMBER('P&L & Cash Flow'!B29),'P&L & Cash Flow'!B29>0,'P&L & Cash Flow'!B29<=61),\"ok\",\"ERROR\")");

  auditFml('ROIC', "'P&L & Cash Flow'!B30", PCT,
    'Is a finite number',
    "IF(AND(ISNUMBER('P&L & Cash Flow'!B30),NOT(ISERROR('P&L & Cash Flow'!B30))),\"ok\",\"ERROR\")");

  // ROIC cross-check: P&L ROIC should match the walkthrough
  auditFml('ROIC Cross-Check (walkthrough)', "'P&L & Cash Flow'!B38", PCT,
    'Matches B30',
    "IF(ABS('P&L & Cash Flow'!B30-'P&L & Cash Flow'!B38)<0.01,\"ok\",\"ERROR\")");

  // =========================
  // SECTION: SCENARIO ORDERING
  // =========================
  auditSection('SCENARIO ORDERING');

  auditFml('Conservative NPV', 'Sensitivity!B14', DOL,
    '<= Base NPV',
    'IF(Sensitivity!B14<=Sensitivity!C14+1,"ok","ERROR")');

  auditFml('Base NPV', 'Sensitivity!C14', DOL,
    '<= Optimistic NPV',
    'IF(Sensitivity!C14<=Sensitivity!D14+1,"ok","ERROR")');

  auditFml('Optimistic NPV', 'Sensitivity!D14', DOL,
    'Is finite',
    'IF(AND(ISNUMBER(Sensitivity!D14),NOT(ISERROR(Sensitivity!D14))),"ok","ERROR")');

  auditFml('Conservative ROIC', 'Sensitivity!B16', PCT,
    '<= Base ROIC',
    'IF(Sensitivity!B16<=Sensitivity!C16+0.001,"ok","ERROR")');

  auditFml('Base ROIC', 'Sensitivity!C16', PCT,
    '<= Optimistic ROIC',
    'IF(Sensitivity!C16<=Sensitivity!D16+0.001,"ok","ERROR")');

  auditFml('Optimistic Payback', 'Sensitivity!D17', '0',
    '<= Base Payback',
    'IF(Sensitivity!D17<=Sensitivity!C17+1,"ok","ERROR")');

  auditFml('Base Payback', 'Sensitivity!C17', '0',
    '<= Conservative Payback',
    'IF(Sensitivity!C17<=Sensitivity!B17+1,"ok","ERROR")');

  // =========================
  // SECTION: CROSS-TAB CONSISTENCY
  // =========================
  auditSection('CROSS-TAB CONSISTENCY');

  auditFml('Summary NPV = P&L NPV', "Summary!B4-'P&L & Cash Flow'!B27", DOL,
    'Difference = 0',
    "IF(ABS(Summary!B4-'P&L & Cash Flow'!B27)<1,\"ok\",\"ERROR\")");

  auditFml('Summary ROIC = P&L ROIC', "Summary!B6-'P&L & Cash Flow'!B30", PCT,
    'Difference < 0.1%',
    "IF(ABS(Summary!B6-'P&L & Cash Flow'!B30)<0.001,\"ok\",\"ERROR\")");

  auditFml('Summary Payback = P&L Payback', "Summary!B7-'P&L & Cash Flow'!B29", '0',
    'Difference = 0',
    "IF(ABS(Summary!B7-'P&L & Cash Flow'!B29)<1,\"ok\",\"ERROR\")");

  auditFml('Upfront: Summary = KF', "Summary!B11-'Key Formulas'!B64", DOL,
    'Difference = 0',
    "IF(ABS(Summary!B11-'Key Formulas'!B64)<1,\"ok\",\"ERROR\")");

  auditFml('Capital: Summary = KF', "Summary!B14-'Key Formulas'!B68", DOL,
    'Difference = 0',
    "IF(ABS(Summary!B14-'Key Formulas'!B68)<1,\"ok\",\"ERROR\")");

  auditFml('Sensitivity Base NPV = P&L NPV', "Sensitivity!C14-'P&L & Cash Flow'!B27", DOL,
    'Difference < $100',
    "IF(ABS(Sensitivity!C14-'P&L & Cash Flow'!B27)<100,\"ok\",\"ERROR\")");

  // =========================
  // SECTION: SENSITIVITY TORNADO CHECKS
  // =========================
  auditSection('SENSITIVITY TORNADO');

  // Each tornado variable should have NPV Low < NPV High (or close)
  for (let i = 0; i < 6; i++) {
    const r = 26 + i;
    const name = ['Team Size', 'Avg Salary', 'Measured Rework Cost', 'Automation Potential', 'Implementation Cost', 'Ongoing Cost'][i];
    auditFml(`${name}: NPV range`, `Sensitivity!F${r}-Sensitivity!E${r}`, DOL,
      'High >= Low',
      `IF(Sensitivity!F${r}>=Sensitivity!E${r}-1,"ok","ERROR")`);
  }

  // Discount rate sensitivity
  auditFml('Discount Rate: NPV range', 'Sensitivity!F47-Sensitivity!E47', DOL,
    'Low DR gives higher NPV',
    'IF(Sensitivity!E47>=Sensitivity!F47-1,"ok","ERROR")');

  // =========================
  // SECTION: MONTE CARLO (snapshot values — hardcoded from MC run)
  // =========================
  auditSection('MONTE CARLO SIMULATION');

  if (mcResults) {
    // MC results are inherently stochastic — written as values, not formulas.
    // But the audit checks on those values ARE formulas.
    // Write MC values
    val(AU, auRow, 1, 'Sample Size'); val(AU, auRow, 2, mcResults.sampleSize, NUM); AU.getRow(auRow).getCell(2).fill = calcFill;
    val(AU, auRow, 3, '>= 100');
    fml(AU, auRow, 4, `IF(B${auRow}>=100,"ok","ERROR")`);
    auRow++;

    val(AU, auRow, 1, 'P(Positive NPV)'); val(AU, auRow, 2, mcResults.probabilityPositiveNPV, PCT); AU.getRow(auRow).getCell(2).fill = calcFill;
    val(AU, auRow, 3, '0 - 1');
    fml(AU, auRow, 4, `IF(AND(B${auRow}>=0,B${auRow}<=1),"ok","ERROR")`);
    auRow++;

    val(AU, auRow, 1, 'P10 NPV'); val(AU, auRow, 2, mcResults.npv?.p10 ?? 0, DOL); AU.getRow(auRow).getCell(2).fill = calcFill;
    val(AU, auRow, 3, 'Is a number');
    fml(AU, auRow, 4, `IF(ISNUMBER(B${auRow}),"ok","ERROR")`);
    const p10Row = auRow;
    auRow++;

    val(AU, auRow, 1, 'P50 NPV'); val(AU, auRow, 2, mcResults.npv?.p50 ?? 0, DOL); AU.getRow(auRow).getCell(2).fill = calcFill;
    val(AU, auRow, 3, '>= P10');
    fml(AU, auRow, 4, `IF(B${auRow}>=B${p10Row}-1,"ok","ERROR")`);
    const p50Row = auRow;
    auRow++;

    val(AU, auRow, 1, 'P90 NPV'); val(AU, auRow, 2, mcResults.npv?.p90 ?? 0, DOL); AU.getRow(auRow).getCell(2).fill = calcFill;
    val(AU, auRow, 3, '>= P50');
    fml(AU, auRow, 4, `IF(B${auRow}>=B${p50Row}-1,"ok","ERROR")`);
    auRow++;

    val(AU, auRow, 1, 'Mean NPV'); val(AU, auRow, 2, mcResults.npv?.mean ?? 0, DOL); AU.getRow(auRow).getCell(2).fill = calcFill;
    val(AU, auRow, 3, 'Is finite');
    fml(AU, auRow, 4, `IF(AND(ISNUMBER(B${auRow}),NOT(ISERROR(B${auRow}))),"ok","ERROR")`);
    auRow++;

    val(AU, auRow, 1, 'Std Dev NPV'); val(AU, auRow, 2, mcResults.npv?.stdDev ?? 0, DOL); AU.getRow(auRow).getCell(2).fill = calcFill;
    val(AU, auRow, 3, '>= 0');
    fml(AU, auRow, 4, `IF(B${auRow}>=0,"ok","ERROR")`);
    auRow++;

    if (mcResults.tailRisk) {
      val(AU, auRow, 1, 'P5 Worst Case NPV'); val(AU, auRow, 2, mcResults.tailRisk.p5Npv ?? 0, DOL); AU.getRow(auRow).getCell(2).fill = calcFill;
      val(AU, auRow, 3, 'Is a number');
      fml(AU, auRow, 4, `IF(ISNUMBER(B${auRow}),"ok","ERROR")`);
      auRow++;

      val(AU, auRow, 1, 'P(Capital Loss >50%)'); val(AU, auRow, 2, mcResults.tailRisk.probCapitalLoss50 ?? 0, PCT); AU.getRow(auRow).getCell(2).fill = calcFill;
      val(AU, auRow, 3, '0 - 1');
      fml(AU, auRow, 4, `IF(AND(B${auRow}>=0,B${auRow}<=1),"ok","ERROR")`);
      auRow++;
    }
  } else {
    val(AU, auRow, 1, 'Monte Carlo'); val(AU, auRow, 2, 'Not computed'); val(AU, auRow, 3, '—');
    AU.getRow(auRow).getCell(4).value = '—';
    AU.getRow(auRow).getCell(4).font = font9i;
    AU.getRow(auRow).getCell(4).alignment = { horizontal: 'center' };
    auRow++;
  }

  // =========================
  // SUMMARY — formula-based counts
  // =========================
  auRow += 1;
  const auDataEnd = auRow - 2;
  sub(AU, auRow, 'SUMMARY', 4);
  auRow++;

  val(AU, auRow, 1, 'Checks Passed');
  fmlBold(AU, auRow, 2, `COUNTIF(D${auDataStart}:D${auDataEnd},"ok")`, NUM, okFill);
  AU.getRow(auRow).getCell(2).font = okFont;
  auRow++;

  val(AU, auRow, 1, 'Errors Found');
  fmlBold(AU, auRow, 2, `COUNTIF(D${auDataStart}:D${auDataEnd},"ERROR")`, NUM, errFill);
  AU.getRow(auRow).getCell(2).font = errFont;
  const errCountRow = auRow;
  auRow++;

  val(AU, auRow, 1, 'Not Applicable');
  fml(AU, auRow, 2, `COUNTIF(D${auDataStart}:D${auDataEnd},"${'\u2014'}")`, NUM);
  auRow++;

  val(AU, auRow, 1, 'Overall Status');
  fmlBold(AU, auRow, 2,
    `IF(B${errCountRow}=0,"ALL CHECKS PASSED",B${errCountRow}&" ERROR"&IF(B${errCountRow}>1,"S","")&" FOUND")`,
    null, null);
  // Conditional font via formula: green if 0 errors, red otherwise
  AU.getRow(auRow).getCell(2).font = { name: 'Calibri', size: 12, bold: true };
  AU.mergeCells(auRow, 2, auRow, 4);

  // --- Conditional formatting for the entire Status column ---
  AU.addConditionalFormatting({
    ref: `D${auDataStart}:D${auDataEnd}`,
    rules: [
      {
        type: 'cellIs', operator: 'equal', formulae: ['"ok"'],
        style: { font: { color: { argb: 'FF2E7D32' }, bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } } },
      },
      {
        type: 'cellIs', operator: 'equal', formulae: ['"ERROR"'],
        style: { font: { color: { argb: 'FFC62828' }, bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } } },
      },
      {
        type: 'cellIs', operator: 'equal', formulae: ['"\u2014"'],
        style: { font: { color: { argb: 'FF9E9E9E' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } } },
      },
    ],
  });

  // Conditional formatting for Overall Status cell
  AU.addConditionalFormatting({
    ref: `B${auRow}:D${auRow}`,
    rules: [
      {
        type: 'containsText', operator: 'containsText', text: 'ALL CHECKS PASSED',
        style: { font: { color: { argb: 'FF2E7D32' }, bold: true, size: 12 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } } },
      },
      {
        type: 'containsText', operator: 'containsText', text: 'ERROR',
        style: { font: { color: { argb: 'FFC62828' }, bold: true, size: 12 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } } },
      },
    ],
  });

  printSetup(AU);

  // ===================================================================
  // TAB: GLOSSARY — Plain-English guide to the model
  // ===================================================================
  cols(GL, [27, 42, 42, 55, 38]);
  GL.views = [{ state: 'frozen', ySplit: 4 }];
  hdr(GL, 1, 'GLOSSARY — FOUR USE CASES, IN PLAIN ENGLISH', 5);

  const glossaryIntro = GL.getRow(2);
  glossaryIntro.getCell(1).value = 'Start with the case that matches the work. Every case follows the same path: Inputs → Assumptions → Calculation → Footnotes.';
  glossaryIntro.getCell(1).font = font9i;
  glossaryIntro.getCell(1).alignment = { vertical: 'middle', wrapText: true };
  GL.mergeCells(2, 1, 2, 5);
  glossaryIntro.height = 28;
  colorLegend(GL, 3);

  const glossaryStart = GL.getRow(4);
  glossaryStart.getCell(1).value = 'Suggested reading order: choose the case → validate blue inputs → check assumptions and footnotes → review the Summary.';
  glossaryStart.getCell(1).font = { ...font9i, color: { argb: 'FF1B2A4A' } };
  glossaryStart.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F6FA' } };
  glossaryStart.getCell(1).alignment = { vertical: 'middle', wrapText: true };
  GL.mergeCells(4, 1, 4, 5);
  glossaryStart.height = 26;

  const glossaryScope = GL.getRow(5);
  glossaryScope.getCell(1).value = 'Important: time saved is capacity, not cash, unless the company actually removes or avoids a cost. [M3] checks workload and evidence before customer-service cost avoidance or risk avoidance can be treated as decision-grade cash flow.';
  glossaryScope.getCell(1).font = { ...font9i, color: { argb: 'FF6D4C41' } };
  glossaryScope.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8E1' } };
  glossaryScope.getCell(1).alignment = { vertical: 'middle', wrapText: true };
  GL.mergeCells(5, 1, 5, 5);
  glossaryScope.height = 38;

  function addGlossarySection(startRow, title, headers, entries, rowHeight = 42) {
    sub(GL, startRow, title, 5);
    tableHeaders(GL, startRow + 1, headers);
    let rowNumber = startRow + 2;

    entries.forEach((entry, index) => {
      const row = GL.getRow(rowNumber);
      entry.forEach((value, columnIndex) => {
        const cell = row.getCell(columnIndex + 1);
        cell.value = value;
        cell.font = columnIndex === 0 ? fontBold : font10;
        cell.alignment = { vertical: 'top', wrapText: true };
        cell.border = thinBorder;
        if (index % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
        }
      });
      row.height = rowHeight;
      rowNumber++;
    });

    return rowNumber + 1;
  }

  // Taxonomy: U = user-entered/measured fact; M = transparent model or user
  // planning rule; S = external contextual benchmark. An S source gives
  // context—it does not turn a U/M input into a verified company fact.
  const sourceFootnotes = [
    {
      id: '[L1]', element: 'Direct-employee fully burdened cost starting point', taxonomy: 'M — editable model placeholder',
      citation: '$125,000 is an illustrative UI starting point only, not an industry benchmark. Replace it with the company’s annual fully burdened cost.',
      location: 'Inputs B41; Calculation Detail B24/B54/B66',
    },
    {
      id: '[L2]', element: 'Offshore-contractor fully burdened cost starting point', taxonomy: 'M — editable model placeholder',
      citation: '$65,000 is an illustrative UI starting point only, not an industry benchmark. Replace it with the company’s annual fully burdened contractor cost.',
      location: 'Inputs B43; Calculation Detail B24',
    },
    {
      id: '[H1]', element: 'Hours per person per week', taxonomy: 'M — work-calendar convention',
      citation: '40 hours/week (2,080 hours/year) is a planning convention for a full-time role, not a benchmark for time spent on this process. Enter the observed process allocation.',
      location: 'Inputs B12; Calculation Detail B79/B86',
    },
    {
      id: '[B1]', element: 'Contract breakage / notice period', taxonomy: 'U — user-entered contract fact; M default',
      citation: 'Use the actual contract term. The 3-month default is only a planning placeholder and has no external benchmark source.',
      location: 'Inputs B60; Calculation Detail B62',
    },
    {
      id: '[D1]', element: 'Delivery pace: Accelerated / Standard / Extended', taxonomy: 'M — user-directed planning scenario; S context',
      citation: `${sourceCitation(10)} The delivery-pace factors are model rules: Accelerated uses 120% staffing/cost and 80% duration; Extended uses 80% staffing/cost and 125% duration. PMI only provides contingency context.`,
      location: 'Inputs B65:B67; Calculation Detail B29:B34',
    },
    {
      id: '[E1]', element: 'Total efficiency gain default', taxonomy: 'M — model midpoint; S context',
      citation: `${sourceCitation(44)} The 10% default is the midpoint of that 6–14% context range, not a forecast. Validate through a pilot/process measurement; capacity remains outside core DCF cash flow.`,
      location: 'Inputs B53; Calculation Detail B55/B56/B86',
    },
    {
      id: '[W1]', element: 'Severance multiplier', taxonomy: 'M — user-directed calculation rule; S context',
      citation: `${sourceCitation(15)} This workbook applies 1.5× to fully burdened employee cost by model rule, while the cited range is 1.0–1.5× annual salary. Validate with HR and legal.`,
      location: 'Inputs B55; Calculation Detail B65–B67',
    },
    {
      id: '[W2]', element: 'Severance payment timing', taxonomy: 'M — explicit user/model schedule',
      citation: 'Selected direct-employee redundancies are spread evenly over the user-entered reduction period (1–5 years). This is a planning input, not an external benchmark. Contractor roll-off has no employee severance charge.',
      location: 'Inputs B38/B55:B56; Calculation Detail B18:B22/B67/B89; P&L rows 7/8/17',
    },
    {
      id: '[C1]', element: 'AI cost-bucket planning shares', taxonomy: 'M — user planning framework',
      citation: 'Build 30–45%, Access 20–30%, Consumption 10–25%, and Run 15–25% are directional planning ranges supplied for this model. They are not external benchmarks.',
      location: 'Calculation Detail B91:B95',
    },
    {
      id: '[C2]', element: 'AI usage meters and workload proxies', taxonomy: 'U — measured inputs; M fallback proxy; S context',
      citation: `${sourceCitation(11)} ${sourceCitation(29)} ${sourceCitation(30)} ${sourceCitation(36)} Requests, tokens, documents, and agent runs remain user-entered/measured where available; fallback workload values are model proxies, not facts.`,
      location: 'Inputs B69:B77; Calculation Detail B47',
    },
    {
      id: '[M1]', element: 'Industry/size/readiness/license/deployment lookup envelopes', taxonomy: 'M — model envelope',
      citation: 'Exact lookup multipliers, platform/license values, peer-planning ranges, tax placeholders, capital-allocation comparators, and deployment formulas are transparent model envelopes unless a cell cites a direct source. Do not represent them as external benchmarks. Source [10] does not validate delivery-pace deltas.',
      location: 'Lookups; Calculation Detail B4:B51; Summary B34:B36',
    },
    {
      id: '[M2]', element: 'Archetype planning-context tables', taxonomy: 'M — illustrative/model context',
      citation: 'The use-case tables contain illustrative model planning ranges only. They intentionally make no named external-report claim because this workbook does not include one-to-one source verification for each range. Replace a range with measured company evidence or a directly attributable cited source before relying on it in a decision.',
      location: 'Assumptions – use-case tabs',
    },
    {
      id: '[M3]', element: 'Model guardrails — capacity reconciliation and evidence gates', taxonomy: 'M — model-governance guardrail',
      citation: 'The model compares case workload estimated from the selected use-case drivers with the staffed capacity entered for the process. If the two do not reconcile, it flags or limits the result rather than implying that a small process can eliminate an entire team. Customer direct-cost savings, avoided-loss estimates, and any other non-observed value stream require operating and Finance evidence before they are treated as core cash flow. These guardrails are transparent model rules, not external benchmarks.',
      location: 'Web-model guardrail checks; Inputs; Archetype Detail; Key Formulas B81:B82; Glossary',
    },
  ];

  // The workbook uses the same four-step path for every supported use case.
  // Keep this copy deliberately short: the detailed values live on the
  // matching Assumptions tab and the full citations live on Sources &
  // Footnotes. This is a guide, not another calculation layer.
  const CASE_FLOW_CONTENT = {
    'internal-process-automation': {
      inputs: 'Volume, minutes per process, automatable steps, human review, and integration complexity.',
      assumptions: 'The automation estimate is a planning ceiling. Human review and integration complexity reduce it.',
      calculation: 'Process volume × minutes ÷ 4.33 gives weekly workload. The model then tests that workload against staffed capacity.',
      footnotes: '[M2] planning context · [M3] workload guardrail · [H1] 40-hour planning convention',
      assumptionRows: [
        ['Automation ceiling', 'The model adjusts the automatable-step input for human review and integration complexity.', 'Validate the share of work that can safely move to AI.', '[M2]'],
        ['Cash treatment', 'Freed time is capacity, not cash, unless there is an explicit redundancy, contract, or measured rework action.', 'Confirm the planned cash action with Finance.', '[M3]'],
      ],
    },
    'customer-facing-ai': {
      inputs: 'Tickets, minutes per contact, eligible intents, AI containment, cost per contact, and escalation floor.',
      assumptions: 'Only routine, eligible contacts can be contained. Cost per contact must be validated before it is treated as cash.',
      calculation: 'Eligible contacts × containment × validated cost per contact gives support-cost avoidance before adoption and risk factors.',
      footnotes: '[M2] planning context · [M3] Operations + Finance evidence gate · [C2] usage-meter context',
      assumptionRows: [
        ['Containment boundary', 'The model limits containment to eligible intents and retains a human escalation floor.', 'Confirm sensitive, complex, and escalated contacts stay with people.', '[M2]'],
        ['Cash evidence gate', 'Direct support-cost savings stay out of core cash flow until Operations validates the baseline and Finance confirms cash realization.', 'Use actual support-cost and quality-control data.', '[M3]'],
      ],
    },
    'data-analytics-automation': {
      inputs: 'Reports, hours per report, data sources, manual data-prep share, accuracy, and analyst utilization.',
      assumptions: 'Manual data preparation is more automatable than judgment. More data sources increase build effort.',
      calculation: 'Reports × hours × analyst utilization ÷ 4.33 gives weekly workload. Manual prep and accuracy shape the automation estimate.',
      footnotes: '[M2] planning context · [M3] workload guardrail · [H1] 40-hour planning convention',
      assumptionRows: [
        ['Automation ceiling', 'The model uses manual-prep share and current accuracy to estimate the portion AI can support.', 'Validate effort by report type and the tolerance for errors.', '[M2]'],
        ['Build effort', 'Data-source count changes implementation effort, not the benefit estimate.', 'Confirm source-system access, data quality, and integration scope.', '[M2]'],
      ],
    },
    'risk-compliance-legal-ai': {
      inputs: 'Reviews, hours per review, automatable share, findings, historical loss per finding, and preventable share.',
      assumptions: 'Historical loss is context. Only evidence-backed preventable findings should be entered.',
      calculation: 'Reviews × hours ÷ 4.33 gives weekly workload. Findings × historical loss × preventable share gives avoided-loss context.',
      footnotes: '[M2] planning context · [M3] Finance evidence gate · avoided-loss context is excluded from core NPV',
      assumptionRows: [
        ['Human oversight', 'The automatable-share input is limited to review work that can be supported while required oversight remains.', 'Confirm legal, regulatory, and control-owner approval requirements.', '[M2]'],
        ['Avoided-loss treatment', 'Historical-loss avoidance is planning context and is excluded from core NPV until Finance validates it.', 'Use realized remediation, settlement, service-credit, or loss data—not statutory maximums.', '[M3]'],
      ],
    },
  };

  const getCaseFlow = (schema) => {
    const archetype = PROJECT_ARCHETYPES.find(({ id }) => id === schema.id);
    const fallback = {
      inputs: schema.inputs.map(displayArchetypeInputLabel).join(', '),
      assumptions: 'Validate the operating inputs with the process owner before relying on the result.',
      calculation: 'The model converts the operating inputs into workload and case-specific planning context.',
      footnotes: '[M2] planning context · [M3] workload and evidence guardrails',
      assumptionRows: [],
    };
    return {
      id: schema.id,
      name: archetype?.label || schema.id,
      ...(CASE_FLOW_CONTENT[schema.id] || fallback),
    };
  };

  const caseFlowRows = supportedArchetypeSchemas.map((schema) => {
    const flow = getCaseFlow(schema);
    return [flow.name, flow.inputs, flow.assumptions, flow.calculation, flow.footnotes];
  });

  let glossaryRow = 7;
  glossaryRow = addGlossarySection(glossaryRow, 'FOUR USE CASES — START HERE', [
    'Use case', '1. Inputs', '2. Assumptions', '3. Calculation', '4. Footnotes',
  ], caseFlowRows, 72);

  glossaryRow = addGlossarySection(glossaryRow, 'DEFINITIONS', [
    'Term', 'Plain-English meaning', 'How the model uses it', 'What to check', 'Footnote',
  ], [
    ['Fully burdened cost', 'The annual cost of a person including pay, benefits, taxes, equipment, and overhead.', 'Employee and contractor costs create total ongoing headcount cost and the blended rate.', 'Use your company’s actual cost, not base salary alone.', '[L1] / [L2]'],
    ['Workload check', 'A check that the work described by the case could actually fit inside the team’s available hours.', 'The model limits or blocks savings when case workload and staffed capacity do not reconcile.', 'Resolve the mismatch before using the result.', '[M3] / [H1]'],
    ['Efficiency gain', 'The percentage of work expected to take less time after AI.', 'Creates freed capacity and measured rework savings; it does not automatically create cash savings.', 'Confirm what cost is actually removed or avoided.', '[E1] / [M3]'],
    ['Cash versus capacity', 'Saved time is capacity. It becomes cash only when the company avoids or removes a cost.', 'Core cash flow includes explicit redundancies, measured rework, contracts, and validated customer-service cost avoidance.', 'Do not count the same saved hour twice.', '[M3]'],
    ['NPV', 'The value today of future cash benefits after costs and timing are considered.', 'The five-year cash-flow model discounts future net cash flow.', 'Positive NPV means the case creates value after costs.', '[M1]'],
    ['Payback', 'How long it takes for benefits to recover the upfront investment.', 'Shown in months on the Summary tab.', 'Shorter is generally better, all else equal.', '—'],
  ], 48);

  glossaryRow = addGlossarySection(glossaryRow, 'KEY SECTIONS', [
    'Workbook section', 'What it shows', 'When to use it', 'Plain-English question', 'Footnote / guardrail',
  ], [
    ['Inputs', 'Blue cells: company facts and case-specific operating drivers.', 'Start here for every case.', 'What work, people, contracts, and costs exist today?', 'Validate user-entered facts.'],
    ['Assumptions – Process / Customer / Analytics / Compliance', 'One simple tab for each case: Inputs → Assumptions → Calculation → Footnotes.', 'Open the tab matching the selected use case.', 'What does the model assume for this kind of work?', '[M2] / [M3]'],
    ['Summary', 'NPV, ROIC, payback, scenarios, and one-time cost buckets.', 'Use it after the case inputs and assumptions are validated.', 'Is this case worth pursuing?', 'Do not treat capacity as cash without a cash action.'],
    ['P&L & Cash Flow', 'Year-by-year benefits, costs, and cumulative cash impact.', 'Use it when Finance needs the build-up behind the headline result.', 'When do benefits exceed costs?', 'Core DCF only.'],
    ['Sensitivity', 'A range of outcomes when key inputs change.', 'Use it to test the assumptions with the most impact.', 'What could make this case weaker or stronger?', 'Planning range, not a forecast.'],
    ['Model Audit', 'Checks for missing, inconsistent, or unsupported values.', 'Review before sharing the workbook.', 'What needs to be fixed before relying on this?', '[M3] guardrails are visible here.'],
    ['Sources & Footnotes', 'The four case maps, shared model rules, and full source library.', 'Use it whenever a number is a planning assumption or a cited source.', 'Is this a company fact, a model rule, or external context?', 'U / M / S taxonomy.'],
  ]);

  glossaryRow = addGlossarySection(glossaryRow, 'HOW TO READ ASSUMPTIONS & FOOTNOTES', [
    'Code', 'What it means', 'How to use it', 'Example', 'Where to read more',
  ], [
    ['U — User-entered', 'A company fact or observed workload.', 'Validate it against company records.', 'Actual people, contracts, errors, tickets, reviews, or report volumes.', 'Inputs and case tab.'],
    ['M — Model assumption', 'A transparent planning rule, starting point, or guardrail.', 'Replace it with company evidence where possible; do not call it a benchmark.', '40-hour convention, deployment pace, cost buckets, and use-case planning rules.', 'Sources & Footnotes.'],
    ['S — External context', 'A cited external source used only to provide context.', 'Use it to sense-check a number, not to prove your company will achieve it.', 'A cited study or industry source.', 'External source library.'],
    ['[M3] Guardrail', 'A reasonableness or evidence check.', 'Fix the workload mismatch or provide evidence before using the cash-flow claim.', 'Customer-service cost avoidance and risk avoidance.', 'Case tab and Model Audit.'],
  ], 46);

  sub(GL, glossaryRow, 'THIS MODEL\'S SELECTED USE CASE', 5);
  const selectedUseCaseRow = GL.getRow(glossaryRow + 1);
  selectedUseCaseRow.getCell(1).value = 'Selected use case';
  selectedUseCaseRow.getCell(1).font = fontBold;
  selectedUseCaseRow.getCell(2).value = { formula: 'Inputs!B10' };
  selectedUseCaseRow.getCell(2).font = greenFontBold;
  selectedUseCaseRow.getCell(2).fill = calcFill;
  selectedUseCaseRow.getCell(3).value = 'Next step';
  selectedUseCaseRow.getCell(3).font = fontBold;
  selectedUseCaseRow.getCell(4).value = 'Open the matching case tab and follow Inputs → Assumptions → Calculation → Footnotes before using the result in a decision.';
  selectedUseCaseRow.getCell(4).font = font10;
  GL.mergeCells(glossaryRow + 1, 4, glossaryRow + 1, 5);
  [1, 2, 3, 4, 5].forEach(c => {
    selectedUseCaseRow.getCell(c).alignment = { vertical: 'top', wrapText: true };
    selectedUseCaseRow.getCell(c).border = thinBorder;
  });
  selectedUseCaseRow.height = 42;

  printSetup(GL);
  GL.protect('', { selectLockedCells: true, selectUnlockedCells: true });

  // ===================================================================
  // TAB: SOURCES & FOOTNOTES — canonical source and assumption traceability
  // ===================================================================
  cols(SF, [27, 42, 42, 58, 40]);
  SF.views = [{ state: 'frozen', ySplit: 4 }];
  hdr(SF, 1, 'SOURCES & FOOTNOTES — FOUR USE CASES', 5);

  const sourceIntro = SF.getRow(2);
  sourceIntro.getCell(1).value = 'Read the row for your use case first. It shows the inputs, model assumptions, calculation, and footnotes in one place.';
  sourceIntro.getCell(1).font = font9i;
  sourceIntro.getCell(1).alignment = { vertical: 'middle', wrapText: true };
  sourceIntro.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F6FA' } };
  SF.mergeCells(2, 1, 2, 5);
  sourceIntro.height = 32;

  const sourceCaveat = SF.getRow(3);
  sourceCaveat.getCell(1).value = 'U = user-entered company fact. M = model assumption or guardrail. S = external context. Validate U inputs with company records; do not present M or S values as company facts or guaranteed outcomes.';
  sourceCaveat.getCell(1).font = { ...font9i, color: { argb: 'FF6D4C41' } };
  sourceCaveat.getCell(1).alignment = { vertical: 'middle', wrapText: true };
  sourceCaveat.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8E1' } };
  SF.mergeCells(3, 1, 3, 5);
  sourceCaveat.height = 34;

  sub(SF, 4, 'FOUR USE CASES — INPUTS → ASSUMPTIONS → CALCULATION → FOOTNOTES', 5);
  tableHeaders(SF, 5, ['Use case', '1. Inputs', '2. Assumptions', '3. Calculation', '4. Footnotes']);
  caseFlowRows.forEach((values, index) => {
    const row = SF.getRow(6 + index);
    values.forEach((value, columnIndex) => {
      const cell = row.getCell(columnIndex + 1);
      cell.value = value;
      cell.font = columnIndex === 0 ? fontBold : font10;
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = thinBorder;
      if (index % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      }
    });
    row.height = 76;
  });

  const sharedFootnoteStartRow = 6 + caseFlowRows.length + 1;
  sub(SF, sharedFootnoteStartRow, 'SHARED MODEL FOOTNOTES', 5);
  tableHeaders(SF, sharedFootnoteStartRow + 1, ['ID', 'Model element', 'Taxonomy', 'Source / limitation', 'Workbook location']);
  sourceFootnotes.forEach((entry, index) => {
    const row = SF.getRow(sharedFootnoteStartRow + 2 + index);
    const values = [entry.id, entry.element, entry.taxonomy, entry.citation, entry.location];
    values.forEach((value, columnIndex) => {
      const cell = row.getCell(columnIndex + 1);
      cell.value = value;
      cell.font = columnIndex === 0 ? fontBold : font10;
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = thinBorder;
      if (index % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      }
    });
    row.height = entry.citation.length > 700 ? 168 : entry.citation.length > 360 ? 110 : 72;
  });

  // Keep the full bibliography in the workbook, not only the handful of
  // sources referenced by the new decision-driver inputs. This makes every
  // bracketed source ID in legacy benchmark context traceable without
  // implying that a broad source proves an exact editable model multiplier.
  const sourceLibraryStartRow = sharedFootnoteStartRow + sourceFootnotes.length + 3;
  sub(SF, sourceLibraryStartRow, 'EXTERNAL SOURCE LIBRARY — FOOTNOTE DATA', 5);
  const sourceLibraryNote = SF.getRow(sourceLibraryStartRow + 1);
  sourceLibraryNote.getCell(1).value = 'These citations provide contextual evidence where a model element explicitly references a bracketed ID. They do not validate a user-entered company fact or turn a model planning rule into a forecast.';
  sourceLibraryNote.getCell(1).font = font9i;
  sourceLibraryNote.getCell(1).alignment = { vertical: 'middle', wrapText: true };
  sourceLibraryNote.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F6FA' } };
  SF.mergeCells(sourceLibraryStartRow + 1, 1, sourceLibraryStartRow + 1, 5);
  sourceLibraryNote.height = 30;
  tableHeaders(SF, sourceLibraryStartRow + 2, ['Footnote ID', 'Short source', 'Classification', 'Source data / citation', 'How to use it']);
  BENCHMARK_SOURCES.forEach((source, index) => {
    const row = SF.getRow(sourceLibraryStartRow + 3 + index);
    const values = [
      `[${source.id}]`,
      source.short,
      'S — external contextual source',
      source.full,
      'Use as context only where this ID is explicitly cited; validate company-specific inputs separately.',
    ];
    values.forEach((value, columnIndex) => {
      const cell = row.getCell(columnIndex + 1);
      cell.value = value;
      cell.font = columnIndex === 0 ? fontBold : font10;
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = thinBorder;
      if (index % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      }
    });
    row.height = source.full.length > 250 ? 54 : 40;
  });
  printSetup(SF);
  SF.protect('', { selectLockedCells: true, selectUnlockedCells: true });

  // ===================================================================
  // TABS: PER-USE-CASE ASSUMPTION SHEETS
  // Each tab follows the same short path: Inputs → Assumptions →
  // Calculation → Footnotes. Only actual model-linked inputs and formulas
  // appear here; broad illustrative ranges are intentionally excluded.
  // ===================================================================
  const archetypeSheets = [];

  for (const schema of supportedArchetypeSchemas) {
    const archetype = PROJECT_ARCHETYPES.find(a => a.id === schema.id);
    if (!archetype) continue;

    const tabName = ARCHETYPE_TAB_NAMES[schema.id] || `Assumptions - ${schema.id}`;
    const isActive = schema.id === activeArchetypeId;
    const caseFlow = getCaseFlow(schema);
    const tabColor = isActive ? 'FF4CAF50' : 'FFB0BEC5';
    const ws = wb.addWorksheet(tabName, { tabColor: { argb: tabColor } });

    cols(ws, [35, 20, 20, 45]);
    let r = 1;

    // Header
    hdr(ws, r, `${archetype.label.toUpperCase()} — INPUTS → ASSUMPTIONS → CALCULATION → FOOTNOTES`, 4);
    r++;
    colorLegend(ws, r);
    r += 2;

    // This status is formula-driven so changing Inputs!B10 switches the
    // central engine immediately; it is not a message frozen at export time.
    const activeRow = ws.getRow(r);
    activeRow.getCell(1).value = {
      formula: `IF(Inputs!$B$10="${schema.id}","✓ ACTIVE — This use case drives Key Formulas, P&L, Summary, and sensitivity.","Not active — select this use case on Inputs (row 10) to activate.")`,
    };
    activeRow.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF2E7D32' } };
    activeRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
    ws.mergeCells(r, 1, r, 4);
    r += 2;

    // 1. Use case definition
    sub(ws, r, 'USE CASE DEFINITION', 4);
    r++;
    val(ws, r, 1, 'Description');
    ws.getRow(r).getCell(2).value = archetype.description;
    ws.getRow(r).getCell(2).font = font10;
    ws.mergeCells(r, 2, r, 4);
    ws.getRow(r).getCell(2).alignment = { wrapText: true };
    r++;
    val(ws, r, 1, 'Real-World Example');
    ws.getRow(r).getCell(2).value = archetype.example || '';
    ws.getRow(r).getCell(2).font = { ...font10, italic: true };
    ws.mergeCells(r, 2, r, 4);
    ws.getRow(r).getCell(2).alignment = { wrapText: true };
    ws.getRow(r).height = 30;
    r++;
    r += 2;

    // 2. Inputs
    sub(ws, r, 'INPUTS — ENTER OR VALIDATE', 4);
    r++;
    tableHeaders(ws, r, ['Input', 'Your value', 'Supported range', 'What to validate']);
    r++;

    const inputDefaults = getArchetypeInputDefaults(schema.id);
    const userValues = resolveArchetypeInputValues(schema.id);

    for (const input of schema.inputs) {
      const cellValue = userValues[input.key] ?? inputDefaults[input.key] ?? input.default;
      // Every case keeps its own blue, unlocked input cells.  Analysts can
      // maintain all four cases, then use Inputs!B10 to select the live DCF
      // without copying values into a hidden or static calculation layer.
      const fill = inputFill;
      const cellFont = inputFont;

      val(ws, r, 1, displayArchetypeInputLabel(input));
      ws.getRow(r).getCell(1).font = fontBold;

      const vCell = ws.getRow(r).getCell(2);
      vCell.value = cellValue;
      vCell.font = cellFont;
      vCell.fill = fill;
      vCell.protection = { locked: false };
      vCell.dataValidation = {
        type: 'decimal', operator: 'between', formulae: [input.min ?? 0, input.max ?? 10000000],
        allowBlank: false, showErrorMessage: true,
      };
      if (input.type === 'percent') vCell.numFmt = PCT;
      else if (input.format === '$#,##0') vCell.numFmt = DOL;
      else vCell.numFmt = input.format || NUM;

      ws.getRow(r).getCell(3).value = `${input.min ?? 0} – ${input.max ?? '∞'}`;
      ws.getRow(r).getCell(3).font = font9i;

      ws.getRow(r).getCell(4).value = input.note;
      ws.getRow(r).getCell(4).font = font9i;
      ws.getRow(r).getCell(4).alignment = { wrapText: true };

      r++;
    }
    r++;

    // 3. Assumptions
    sub(ws, r, 'ASSUMPTIONS — MODEL RULES', 4);
    r++;
    tableHeaders(ws, r, ['Assumption', 'Model treatment', 'What to validate', 'Footnote']);
    r++;

    const assumptionRows = caseFlow.assumptionRows.length > 0
      ? caseFlow.assumptionRows
      : [['Case planning rule', caseFlow.assumptions, 'Validate the operating inputs with the process owner.', '[M2]']];
    assumptionRows.forEach((assumption, index) => {
      const row = ws.getRow(r);
      assumption.forEach((value, columnIndex) => {
        const cell = row.getCell(columnIndex + 1);
        cell.value = value;
        cell.font = columnIndex === 0 ? fontBold : font10;
        cell.alignment = { vertical: 'top', wrapText: true };
        cell.border = thinBorder;
        if (index % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
        }
      });
      row.height = 42;
      r++;
    });
    r++;

    // 4. Calculation
    sub(ws, r, 'CALCULATION — WHAT THE MODEL DERIVES', 4);
    r++;
    tableHeaders(ws, r, ['Calculated output', 'Current value', 'Exact model formula', 'How it is used']);
    r++;

    for (const mapping of schema.computedMappings) {
      val(ws, r, 1, mapping.mapsTo);
      ws.getRow(r).getCell(1).font = greenFontBold;

      // Formulas reference the case tab's editable blue cells.  Do not write
      // a JavaScript-calculated snapshot here: this cell is one of the live
      // links used by the selected-case engine.
      const caseInputReferences = Object.fromEntries(schema.inputs.map((input, inputIndex) => [
        input.key,
        `B${CASE_INPUT_START_ROW + inputIndex}`,
      ]));
      const liveFormula = (mapping.excelFormula || '0').replace(/\{([^}]+)\}/g,
        (_match, key) => caseInputReferences[key] || '0');
      fml(ws, r, 2, liveFormula, mappingNumberFormat(mapping.mapsTo), calcFill);

      ws.getRow(r).getCell(3).value = mapping.excelFormula || '';
      ws.getRow(r).getCell(3).font = { name: 'Calibri', size: 9, color: { argb: 'FF2E7D32' } };
      ws.getRow(r).getCell(3).alignment = { wrapText: true };

      ws.getRow(r).getCell(4).value = mapping.note || caseFlow.calculation;
      ws.getRow(r).getCell(4).font = font9i;
      ws.getRow(r).getCell(4).alignment = { wrapText: true };
      r++;
    }
    r++;

    // 5. Footnotes
    sub(ws, r, 'FOOTNOTES — READ BEFORE USING THE RESULT', 4);
    r++;
    tableHeaders(ws, r, ['Footnotes', 'What they mean', 'What to do', 'Where to read more']);
    r++;
    const footnoteRow = ws.getRow(r);
    [
      caseFlow.footnotes,
      'These tags distinguish user-entered facts from planning assumptions, guardrails, and contextual sources.',
      'Validate the blue inputs and resolve every [M3] message before treating the output as decision-grade.',
      'Sources & Footnotes tab and Model Audit.',
    ].forEach((value, columnIndex) => {
      const cell = footnoteRow.getCell(columnIndex + 1);
      cell.value = value;
      cell.font = columnIndex === 0 ? fontBold : font10;
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = thinBorder;
    });
    footnoteRow.height = 50;

    printSetup(ws);
    ws.protect('', { selectLockedCells: true, selectUnlockedCells: true });
    archetypeSheets.push({ ws, name: tabName });
  }

  // Hide tabs not included in the user's tier
  const allSheets = [
    { ws: I,  name: 'Inputs' },
    { ws: AD, name: 'Archetype Detail' },
    { ws: KF, name: 'Key Formulas' },
    { ws: SU, name: 'Summary' },
    { ws: PL, name: 'P&L & Cash Flow' },
    { ws: SE, name: 'Sensitivity' },
    { ws: V5, name: 'V5 Analysis' },
    { ws: AU, name: 'Model Audit' },
    { ws: GL, name: 'Glossary' },
    { ws: SF, name: 'Sources & Footnotes' },
    ...archetypeSheets,
  ];

  // Final presentation pass happens after every tab has been populated. It
  // applies number-format normalization, consistent label/value alignment,
  // and a bounded print area to every generated tab (including hidden
  // Lookups), without touching a cell's value, formula, color, or protection.
  [...allSheets.map(({ ws }) => ws), L].forEach(normalizeWorksheetPresentation);

  for (const { ws, name } of allSheets) {
    if (!includedTabs.includes(name)) {
      ws.state = 'hidden';
    }
  }

  // Keep the technical sheet names intact so existing cross-sheet formulas
  // remain valid, but present the workbook in the decision flow executives use.
  // ExcelJS serializes tabs by orderNo, so this is formula-safe.
  [SU, I, AD, KF, PL, SE, V5, AU, GL, SF, ...archetypeSheets.map(({ ws }) => ws), L]
    .forEach((ws, index) => { ws.orderNo = index + 1; });

  // ===================================================================
  // DOWNLOAD
  // ===================================================================
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const label = (formData.industry || 'Custom').replace(/[^a-zA-Z0-9]/g, '_');
  a.download = `AI_ROI_Model_${label}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
