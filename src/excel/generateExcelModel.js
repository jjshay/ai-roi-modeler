/**
 * AI ROI Calculator — Presentation-Ready Excel Model
 * 9 tabs: Inputs, Archetype Detail, Key Formulas, Summary, P&L & Cash Flow, Sensitivity, V5 Analysis, Lookups, Assumption Definitions + Model Audit
 * Color coded: Blue=Inputs, Green=Formulas, Black=Results
 * All calculated cells use real Excel formulas.
 */
import ExcelJS from 'exceljs';
import { getOutputTier, EXCEL_TABS } from '../utils/outputTier';
import { ARCHETYPE_INPUT_SCHEMAS, ARCHETYPE_INPUT_MAP, CLASSIFICATION_PROFILES, CLASSIFICATION_QUESTIONS, getArchetypeInputDefaults } from '../logic/archetypeInputs';
import { PROJECT_ARCHETYPES } from '../logic/archetypes';

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
const PCT = '0.0%', DOL = '$#,##0', DOL2 = '$#,##0.00', NUM = '#,##0', DEC = '0.000';

// --- Helpers ---
function cols(ws, w) { w.forEach((v, i) => { ws.getColumn(i + 1).width = v; }); }

function hdr(ws, r, text, n) {
  const row = ws.getRow(r);
  for (let c = 1; c <= n; c++) { row.getCell(c).fill = headerFill; row.getCell(c).font = headerFont; }
  row.getCell(1).value = text;
  ws.mergeCells(r, 1, r, n);
  row.height = 22;
}

function sub(ws, r, text, n) {
  const row = ws.getRow(r);
  for (let c = 1; c <= n; c++) { row.getCell(c).fill = subFill; row.getCell(c).font = subFont; }
  row.getCell(1).value = text;
  ws.mergeCells(r, 1, r, n);
}

function val(ws, r, c, v, fmt, fill) {
  const cell = ws.getRow(r).getCell(c);
  cell.value = v;
  cell.font = fill === inputFill ? inputFont : font10;
  if (fmt) cell.numFmt = fmt;
  if (fill) cell.fill = fill;
}

function fml(ws, r, c, formula, fmt, fill) {
  const cell = ws.getRow(r).getCell(c);
  cell.value = { formula };
  cell.font = fill === resultFill ? outputFont10 : greenFont;
  if (fmt) cell.numFmt = fmt;
  cell.fill = fill || calcFill;
}

function fmlBold(ws, r, c, formula, fmt, fill) {
  const cell = ws.getRow(r).getCell(c);
  cell.value = { formula };
  cell.font = (fill || resultFill) === resultFill ? outputFont : greenFontBold;
  if (fmt) cell.numFmt = fmt;
  cell.fill = fill || resultFill;
}

function note(ws, r, c, text) {
  ws.getRow(r).getCell(c).value = text;
  ws.getRow(r).getCell(c).font = font9i;
}

function tableHeaders(ws, r, headers) {
  const row = ws.getRow(r);
  headers.forEach((h, i) => {
    row.getCell(i + 1).value = h;
    row.getCell(i + 1).font = { bold: true, size: 9, name: 'Calibri' };
    row.getCell(i + 1).fill = subFill;
    row.getCell(i + 1).alignment = { wrapText: true };
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
  });
}

function printSetup(ws) {
  ws.pageSetup = { fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
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
const LOCATIONS = [
  'US - Major Tech Hub', 'Remote / Distributed', 'Offshore - Employee', 'Offshore - Contractor', 'Blended',
];

// =====================================================================
export async function generateExcelModel(formData, mcResults, results) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'AI ROI Calculator';
  wb.created = new Date();

  // Determine which tabs to show based on role tier
  const tier = getOutputTier(formData.role);
  const includedTabs = EXCEL_TABS[tier] || EXCEL_TABS.detailed;

  // Create all 10 worksheets in tab order (all needed for formula cross-refs)
  const I = wb.addWorksheet('Inputs', { tabColor: { argb: 'FF2196F3' } });
  const AD = wb.addWorksheet('Archetype Detail', { tabColor: { argb: 'FF7C4DFF' } });
  const KF = wb.addWorksheet('Key Formulas', { tabColor: { argb: 'FF4CAF50' } });
  const SU = wb.addWorksheet('Summary', { tabColor: { argb: `FF${NAVY}` } });
  const PL = wb.addWorksheet('P&L & Cash Flow', { tabColor: { argb: `FF${NAVY}` } });
  const SE = wb.addWorksheet('Sensitivity', { tabColor: { argb: 'FFFF9800' } });
  const V5 = wb.addWorksheet('V5 Analysis', { tabColor: { argb: 'FF00897B' } });
  const L = wb.addWorksheet('Lookups', { tabColor: { argb: 'FF9E9E9E' } });
  const AU = wb.addWorksheet('Model Audit', { tabColor: { argb: 'FFE53935' } });
  const DF = wb.addWorksheet('Assumption Definitions', { tabColor: { argb: 'FF6A1B9A' } });

  // ===================================================================
  // TAB 6: LOOKUPS — All reference tables (EXACT same cell positions)
  // ===================================================================
  cols(L, [35, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12]);

  // Automation Potential Matrix (R1-R12)
  hdr(L, 1, 'AUTOMATION POTENTIAL MATRIX', 9);
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

  // Industry Benchmarks (R14-R25)
  hdr(L, 14, 'INDUSTRY BENCHMARKS', 7);
  tableHeaders(L, 15, ['Industry', 'Success Rate', 'Comp Penalty', 'Compl Risk', 'Rev:TTM', 'Rev:CX', 'Rev:NewCap']);
  const IB = [
    [0.72,0.05,0.02,0.08,0.05,0.04],[0.65,0.04,0.05,0.05,0.06,0.03],
    [0.58,0.02,0.06,0.04,0.03,0.05],[0.62,0.03,0.03,0.06,0.03,0.03],
    [0.68,0.05,0.02,0.07,0.08,0.04],[0.64,0.04,0.03,0.05,0.04,0.04],
    [0.60,0.04,0.02,0.08,0.06,0.05],[0.55,0.02,0.04,0.03,0.03,0.02],
    [0.45,0.01,0.04,0.02,0.02,0.01],[0.55,0.03,0.02,0.04,0.04,0.03],
  ];
  INDUSTRIES.forEach((ind, i) => {
    dataRow(L, 16 + i, [ind, ...IB[i]], [null, PCT, PCT, PCT, PCT, PCT, PCT]);
  });

  // Readiness Multipliers (R27-R33)
  hdr(L, 27, 'READINESS MULTIPLIERS', 4);
  tableHeaders(L, 28, ['Level', 'Adoption Rate', 'Timeline Mult', 'Cost Mult']);
  [[1,0.40,1.40,1.30],[2,0.55,1.25,1.20],[3,0.70,1.10,1.10],[4,0.85,1.00,1.00],[5,0.95,0.90,1.00]].forEach((d, i) => {
    dataRow(L, 29 + i, d, ['0', PCT, DEC, DEC]);
  });

  // Company Size Master (R35-R41)
  hdr(L, 35, 'COMPANY SIZE MASTER', 11);
  tableHeaders(L, 36, ['Size','Size Mult','Disc Rate','Max Team','Sep Mult','License','Legal','Security','Compliance','Cyber Ins','Vendor Switch']);
  const SM = [
    ['Startup (1-50)',0.70,0.18,3,0.70,12000,25000,20000,8000,2000,0.30],
    ['SMB (51-500)',0.85,0.14,5,1.00,24000,50000,40000,15000,5000,0.35],
    ['Mid-Market (501-5,000)',1.00,0.10,10,1.15,48000,100000,75000,30000,12000,0.40],
    ['Enterprise (5,001-50,000)',1.30,0.09,15,1.30,96000,175000,125000,60000,25000,0.50],
    ['Large Enterprise (50,000+)',1.60,0.08,25,1.50,180000,300000,200000,100000,50000,0.60],
  ];
  SM.forEach((d, i) => {
    dataRow(L, 37 + i, d, [null, DEC, PCT, '0', DEC, DOL, DOL, DOL, DOL, DOL, PCT]);
  });

  // AI Team Salary (R43-R48)
  hdr(L, 43, 'AI TEAM SALARY', 2);
  tableHeaders(L, 44, ['Location', 'Salary']);
  const blendedSal = formData.blendedAISalary || 169500;
  const SAL = [225000, 150000, 55000, 40000, blendedSal];
  LOCATIONS.forEach((loc, i) => { dataRow(L, 45 + i, [loc, SAL[i]], [null, DOL]); });

  // Process Type Master (R54-R63)
  hdr(L, 54, 'PROCESS TYPE MASTER', 4);
  tableHeaders(L, 55, ['Process Type', 'API $/1K', 'Req/Hour', 'Tool Replace %']);
  const PT = [[20,12,0.55],[8,25,0.45],[15,8,0.50],[25,6,0.40],[5,30,0.65],[20,10,0.45],[12,15,0.50],[10,12,0.40]];
  PROCESS_TYPES.forEach((p, i) => { dataRow(L, 56 + i, [p, ...PT[i]], [null, DOL, '0', PCT]); });

  // State R&D Credit (R65-R79)
  hdr(L, 65, 'STATE R&D CREDIT RATES', 2);
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
    ['DCF Years',5,'0'],['Max Headcount Reduction',0.75,PCT],['Contingency Rate',0.20,PCT],
    ['Cultural Resistance Rate',0.12,PCT],['Wage Inflation Rate',0.04,PCT],
    ['Legacy Maintenance Creep',0.07,PCT],['Model Retraining Rate',0.07,PCT],
    ['Retained Retraining Rate',0.03,PCT],['Tech Debt Rate',0.05,PCT],
    ['Adjacent Product Rate',0.25,PCT],['Revenue Risk Discount',0.50,PCT],
    ['R&D Qualification Rate',0.65,PCT],['Federal R&D Rate',0.065,PCT],
    ['Max ROIC Cap',1.00,PCT],['Max IRR Cap',2.00,PCT],
    ['Change Mgmt Rate',0.15,PCT],['Infra Cost Rate',0.12,PCT],
    ['Training Cost Rate',0.08,PCT],['PM Salary Factor',0.85,DEC],
  ];
  CONSTS.forEach((c, i) => { val(L, 82 + i, 1, c[0]); val(L, 82 + i, 2, c[1], c[2], inputFill); });

  // Schedules (R102-R108)
  hdr(L, 102, 'YEAR-BY-YEAR SCHEDULES', 6);
  tableHeaders(L, 103, ['Year', 'HR Reduction', 'Cum HR', 'Adoption Ramp', 'Cost Escalation', 'Cum Escalation']);
  const SCHED = [
    [1,0,0,0.75,0,1.000],[2,0.20,0.20,0.90,0.12,1.120],
    [3,0.25,0.45,1.00,0.12,1.2544],[4,0.20,0.65,1.00,0.07,1.342208],[5,0.10,0.75,1.00,0.07,1.436163],
  ];
  SCHED.forEach((s, i) => {
    dataRow(L, 104 + i, s, ['0', PCT, PCT, PCT, PCT, DEC]);
    // Color schedule values as input cells for auditability
    for (let c = 2; c <= 6; c++) L.getRow(104 + i).getCell(c).fill = inputFill;
  });

  // Revenue Eligible Processes (R110-R114)
  hdr(L, 110, 'REVENUE ELIGIBLE PROCESSES', 1);
  ['Customer Communication','Content Creation','Research & Intelligence']
    .forEach((p, i) => { val(L, 111 + i, 1, p); });

  // Separation Breakdown (R116-R122)
  hdr(L, 116, 'SEPARATION COST BREAKDOWN', 2);
  tableHeaders(L, 117, ['Component', 'Rate']);
  [['Severance Pay',0.55],['Benefits Continuation',0.15],['Outplacement Services',0.12],
   ['Administrative / HR',0.10],['Legal Review',0.08]].forEach((s, i) => {
    dataRow(L, 118 + i, s, [null, PCT]);
  });

  // Peer Benchmarks flattened (R124-R175)
  hdr(L, 124, 'INDUSTRY PEER BENCHMARKS', 4);
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

  // Regulatory Event Benchmarks by Industry (R177-R188)
  hdr(L, 177, 'REGULATORY EVENT BENCHMARKS', 4);
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
  hdr(L, 190, 'CYCLE TIME REDUCTION', 3);
  tableHeaders(L, 191, ['Industry', 'Months Reduced', 'Revenue Multiplier']);
  const CYCLE_TIMES = [
    [2,0.08],[3,0.05],[4,0.04],[2,0.06],[1.5,0.07],
    [2,0.05],[1,0.08],[3,0.03],[4,0.02],[2,0.04],
  ];
  INDUSTRIES.forEach((ind, i) => {
    dataRow(L, 192 + i, [ind, ...CYCLE_TIMES[i]], [null, DEC, PCT]);
  });

  // Archetype List (R203-R210) — for dropdown on Inputs tab + Archetype Detail
  // Column C = primary process type — used to translate archetype ID → process type for MATCH
  hdr(L, 203, 'ARCHETYPE LIST', 3);
  tableHeaders(L, 204, ['Archetype ID', 'Label', 'Primary Process Type']);
  PROJECT_ARCHETYPES.forEach((a, i) => {
    dataRow(L, 205 + i, [a.id, a.label, a.sourceProcessTypes[0] || 'Other']);
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
  const idFont  = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF546E7A' } };
  const descFont = { name: 'Calibri', size: 9, color: { argb: 'FF757575' } };
  const impactKeyFont = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF0000FF' } };
  const impactStdFont = { name: 'Calibri', size: 9, color: { argb: 'FF90A4AE' } };

  // Helper: write an input row with ID, value, description, impact
  function inp(ws, r, id, v, fmt, isKey, desc, impact) {
    const fill = isKey ? keyFill : stdFill;
    const vFont = isKey ? keyFont : stdInputFont;
    // Col A: ID
    ws.getRow(r).getCell(1).value = id;
    ws.getRow(r).getCell(1).font = idFont;
    // Col B: Value
    const cell = ws.getRow(r).getCell(2);
    cell.value = v;
    cell.font = vFont;
    cell.fill = fill;
    if (fmt) cell.numFmt = fmt;
    // Col C: Description
    ws.getRow(r).getCell(3).value = desc || '';
    ws.getRow(r).getCell(3).font = descFont;
    // Col D: Impact
    if (impact) {
      ws.getRow(r).getCell(4).value = impact;
      ws.getRow(r).getCell(4).font = isKey ? impactKeyFont : impactStdFont;
    }
  }

  cols(I, [8, 28, 52, 18]);
  hdr(I, 1, 'MODEL INPUTS — Your Assumptions', 4);

  // Legend row
  {
    const lr = I.getRow(2);
    lr.height = 18;
    lr.getCell(1).value = 'KEY DRIVER';
    lr.getCell(1).fill = keyFill;
    lr.getCell(1).font = { ...idFont, bold: true, color: { argb: 'FF0000FF' } };
    I.mergeCells(2, 1, 2, 2);
    lr.getCell(3).value = 'Blue text = editable input. Highlighted = biggest impact on your ROI. Change any value to recalculate.';
    lr.getCell(3).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF546E7A' } };
    I.mergeCells(2, 3, 2, 4);
  }

  // ---------------------------------------------------------------
  // 1. THE BIG THREE — Key Drivers (highlighted)
  // ---------------------------------------------------------------
  sub(I, 3, '1. COMPANY CONTEXT — Who are you?', 4);

  inp(I, 4, '1a', formData.industry || 'Technology / Software', null, false,
    'Your industry — sets automation benchmarks & risk profiles', '');

  inp(I, 5, '1b', formData.companySize || 'Mid-Market (501-5,000)', null, false,
    'Company size — affects discount rate, compliance costs, and team capacity', '');

  inp(I, 6, '1c', formData.teamLocation || 'US - Major Tech Hub', null, false,
    'Where your AI team is based — sets engineering salary benchmarks', '');

  inp(I, 7, '1d', formData.companyState || 'Other / Not Sure', null, false,
    'US state for R&D tax credit (optional)', '');

  // Row 8: blank
  // ---------------------------------------------------------------
  // 2. PROJECT SCOPE — What are you automating?
  // ---------------------------------------------------------------
  sub(I, 9, '2. PROJECT SCOPE — What are you automating?', 4);

  inp(I, 10, '2a', formData.projectArchetype || formData.processType || 'internal-process-automation', null, true,
    'Type of AI project — determines automation potential (the #3 biggest lever)', 'KEY DRIVER');

  inp(I, 11, '2b', formData.teamSize || 10, NUM, true,
    'How many people currently do this work? More people = more savings from AI', 'KEY DRIVER #1');

  inp(I, 12, '2c', formData.hoursPerWeek || 40, NUM, false,
    'Average hours per person per week spent on this process', '');

  inp(I, 13, '2d', formData.avgSalary || 200000, DOL, true,
    'Fully-loaded annual cost per person (salary + benefits + overhead). Multiply base salary by 1.3-1.5x', 'KEY DRIVER #2');

  inp(I, 14, '2e', formData.errorRate ?? 0.10, PCT, false,
    'What % of work requires rework or correction? Higher = more savings from AI accuracy', '');

  inp(I, 15, '2f', formData.currentToolCosts || 0, DOL, false,
    'Annual spend on current software/tools for this process (licenses, SaaS, maintenance)', '');

  // Row 16: blank
  // ---------------------------------------------------------------
  // 3. ORGANIZATION READINESS — How prepared are you?
  // ---------------------------------------------------------------
  sub(I, 17, '3. ORGANIZATION READINESS — How prepared are you?', 4);

  inp(I, 18, '3a', formData.changeReadiness || 3, '0', false,
    'How open is your team to new tools? 1=Resistant, 3=Neutral, 5=Champion. Affects adoption speed', 'High Impact');

  inp(I, 19, '3b', formData.dataReadiness || 3, '0', false,
    'How clean and accessible is your data? 1=Messy/siloed, 3=Usable, 5=Governed/API-ready', 'High Impact');

  inp(I, 20, '3c', formData.execSponsor === false ? 'No' : 'Yes', null, false,
    'Do you have a C-level or VP sponsor? Projects with exec support succeed 2x more often', 'High Impact');

  // Row 21: blank
  // ---------------------------------------------------------------
  // 4. AI INVESTMENT — What will it cost?
  // ---------------------------------------------------------------
  sub(I, 22, '4. AI INVESTMENT — What will it cost?', 4);

  inp(I, 23, '4a', formData.implementationBudget || 100000, DOL, false,
    'Total budget for building/deploying the AI solution (engineering, setup, integration)', '');

  inp(I, 24, '4b', formData.expectedTimeline || 4.5, '0.0', false,
    'How many months to go live? Shorter timelines increase engineering cost', '');

  inp(I, 25, '4c', formData.ongoingAnnualCost || 25000, DOL, false,
    'Annual cost to run the AI after launch (API fees, hosting, maintenance, monitoring)', '');

  inp(I, 26, '4d', formData.vendorsReplaced || 0, '0', false,
    'How many existing software vendors or service contracts will AI replace?', '');

  inp(I, 27, '4e', formData.vendorTerminationCost || 0, DOL, false,
    'One-time cost to exit those vendor contracts (early termination fees, migration)', '');

  // Row 28: blank
  // ---------------------------------------------------------------
  // 5. ADVANCED (Optional) — Fine-tune the model
  // ---------------------------------------------------------------
  sub(I, 29, '5. ADVANCED (Optional) — Fine-tune the model', 4);

  inp(I, 30, '5a', formData.cashRealizationPct ?? 0.40, PCT, false,
    'What % of efficiency gains translate to actual cash savings? (vs. just "freed up time")', '');

  inp(I, 31, '5b', formData.annualRevenue || 0, DOL, false,
    'Your company annual revenue — used for revenue acceleration estimates', '');

  inp(I, 32, '5c', formData.contributionMargin ?? 0.30, PCT, false,
    'Gross profit margin on revenue — how much of each new dollar is profit', '');

  inp(I, 33, '5d', formData.includeCapacityValue ? 'Yes' : 'No', null, false,
    'Count freed-up employee time as value in the ROI calculation?', '');

  inp(I, 34, '5e', formData.includeRiskReduction ? 'Yes' : 'No', null, false,
    'Count reduced compliance/regulatory risk as value in the ROI calculation?', '');

  inp(I, 35, '5f', formData.includeRevenueAcceleration ? 'Yes' : 'No', null, false,
    'Count revenue acceleration (faster time-to-market, better CX) in the ROI?', '');

  inp(I, 36, '5g', formData.retainedTalentPremiumRate ?? 0.10, PCT, false,
    'Wage increase for employees you keep (to retain top talent during AI transition)', '');

  inp(I, 37, '5h', formData.isAgenticWorkflow ? 'Yes' : 'No', null, false,
    'Is this a multi-step AI agent workflow? Uses 2-5x more API calls = higher ongoing cost', '');

  // Data validation dropdowns (same cell positions as before)
  I.getRow(4).getCell(2).dataValidation = { type: 'list', formulae: ['Lookups!$A$3:$A$12'] };
  I.getRow(5).getCell(2).dataValidation = { type: 'list', formulae: ['Lookups!$A$37:$A$41'] };
  I.getRow(6).getCell(2).dataValidation = { type: 'list', formulae: ['Lookups!$A$45:$A$49'] };
  I.getRow(7).getCell(2).dataValidation = { type: 'list', formulae: ['Lookups!$A$67:$A$79'] };
  I.getRow(10).getCell(2).dataValidation = { type: 'list', formulae: ['Lookups!$A$205:$A$210'] };
  I.getRow(18).getCell(2).dataValidation = { type: 'list', formulae: ['"1,2,3,4,5"'] };
  I.getRow(19).getCell(2).dataValidation = { type: 'list', formulae: ['"1,2,3,4,5"'] };
  I.getRow(20).getCell(2).dataValidation = { type: 'list', formulae: ['"Yes,No"'] };
  I.getRow(33).getCell(2).dataValidation = { type: 'list', formulae: ['"Yes,No"'] };
  I.getRow(34).getCell(2).dataValidation = { type: 'list', formulae: ['"Yes,No"'] };
  I.getRow(35).getCell(2).dataValidation = { type: 'list', formulae: ['"Yes,No"'] };
  I.getRow(37).getCell(2).dataValidation = { type: 'list', formulae: ['"Yes,No"'] };

  // ---------------------------------------------------------------
  // 6. ARCHETYPE FINE-TUNING — Active archetype inputs surfaced here
  // ---------------------------------------------------------------
  {
    const activeId = formData.projectArchetype || formData.processType || 'internal-process-automation';
    const archInfo = PROJECT_ARCHETYPES.find(a => a.id === activeId);
    const archSchema = ARCHETYPE_INPUT_MAP[activeId];
    const archDefaults = archSchema ? getArchetypeInputDefaults(activeId) : {};
    const archUserVals = (formData.archetypeInputs || {})[activeId] || formData.archetypeInputs || {};

    sub(I, 39, `6. ARCHETYPE FINE-TUNING — ${archInfo?.label || activeId}`, 4);

    let atRow = 40;
    let atIdx = 0;
    if (archSchema) {
      for (const input of archSchema.inputs) {
        const cellValue = archUserVals[input.key] ?? archDefaults[input.key] ?? input.default;
        const letter = String.fromCharCode(97 + atIdx); // a, b, c, ...
        const fmt = input.type === 'percent' ? PCT : input.format === '$#,##0' ? DOL : input.format || NUM;
        inp(I, atRow, `6${letter}`, cellValue, fmt, false, input.note || input.label, '');
        atIdx++;
        atRow++;
      }

      // Computed outputs from archetype
      for (const mapping of archSchema.computedMappings) {
        const merged = { ...archDefaults, ...archUserVals };
        let computed;
        try { computed = mapping.jsMap(merged); } catch { computed = 'N/A'; }
        const mFmt = mapping.mapsTo.includes('hours') ? NUM : mapping.mapsTo.includes('revenue') || mapping.mapsTo.includes('risk') ? DOL : PCT;
        val(I, atRow, 1, '');
        const cCell = I.getRow(atRow).getCell(2);
        if (typeof computed === 'number') {
          cCell.value = computed;
          cCell.numFmt = mFmt;
        } else {
          cCell.value = computed;
        }
        cCell.fill = calcFill;
        cCell.font = greenFontBold;
        I.getRow(atRow).getCell(3).value = `Computed: ${mapping.mapsTo} (feeds into DCF engine)`;
        I.getRow(atRow).getCell(3).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF2E7D32' } };
        atRow++;
      }
    } else {
      val(I, atRow, 1, '');
      I.getRow(atRow).getCell(3).value = 'Select a project archetype above to see fine-tuning inputs.';
      I.getRow(atRow).getCell(3).font = descFont;
      atRow++;
    }

    // Footer
    atRow += 1;
    I.getRow(atRow).getCell(1).value = 'HOW TO READ THIS TAB';
    I.getRow(atRow).getCell(1).font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF546E7A' } };
    atRow++;
    I.getRow(atRow).getCell(1).value = '';
    I.getRow(atRow).getCell(2).value = 'KEY DRIVER';
    I.getRow(atRow).getCell(2).fill = keyFill;
    I.getRow(atRow).getCell(2).font = impactKeyFont;
    I.getRow(atRow).getCell(3).value = 'These 3 inputs drive 80%+ of your ROI. Start here.';
    I.getRow(atRow).getCell(3).font = descFont;
    atRow++;
    I.getRow(atRow).getCell(1).value = '';
    I.getRow(atRow).getCell(2).value = 'Standard Input';
    I.getRow(atRow).getCell(2).fill = stdFill;
    I.getRow(atRow).getCell(2).font = stdInputFont;
    I.getRow(atRow).getCell(3).value = 'These inputs matter but have less impact. Defaults are reasonable for most cases.';
    I.getRow(atRow).getCell(3).font = descFont;
    atRow++;
    I.getRow(atRow).getCell(1).value = '';
    I.getRow(atRow).getCell(2).value = 'Computed';
    I.getRow(atRow).getCell(2).fill = calcFill;
    I.getRow(atRow).getCell(2).font = greenFontBold;
    I.getRow(atRow).getCell(3).value = 'Calculated by the model — not editable. Shows how your inputs feed the engine.';
    I.getRow(atRow).getCell(3).font = descFont;
  }

  printSetup(I);

  // ===================================================================
  // TAB 2: ARCHETYPE DETAIL — Granular inputs per archetype
  // ===================================================================
  const inactiveInputFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
  const inactiveFont = { name: 'Calibri', size: 10, color: { argb: 'FF999999' } };
  cols(AD, [35, 22, 50]);
  hdr(AD, 1, 'ARCHETYPE DETAIL — Granular Inputs', 3);
  colorLegend(AD, 2);

  // Active archetype display (row 3)
  sub(AD, 3, 'Active Archetype', 3);
  val(AD, 4, 1, 'Selected Archetype');
  fml(AD, 4, 2, 'Inputs!B10', null, calcFill);
  note(AD, 4, 3, 'Change on Inputs tab to switch archetype sections');

  // Determine which archetype is active from formData
  const activeArchetypeId = formData.projectArchetype || formData.processType || 'internal-process-automation';
  const archetypeInputValues = formData.archetypeInputs || {};

  // Build all 6 archetype sections (each ~12 rows: subheader + 8 inputs + 2-3 computed + blank)
  let adRow = 6;
  const archetypeSectionRows = {}; // track start/end rows per archetype

  for (const schema of ARCHETYPE_INPUT_SCHEMAS) {
    const isActive = schema.id === activeArchetypeId;
    const sectionStart = adRow;

    // Section subheader
    sub(AD, adRow, `${schema.id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`, 3);
    adRow++;

    // Input rows
    const inputDefaults = getArchetypeInputDefaults(schema.id);
    const userValues = archetypeInputValues[schema.id] || {};

    for (const input of schema.inputs) {
      const cellValue = userValues[input.key] ?? inputDefaults[input.key] ?? input.default;
      const fill = isActive ? inputFill : inactiveInputFill;
      val(AD, adRow, 1, input.label);
      val(AD, adRow, 2, cellValue, input.format === '$#,##0' ? DOL : input.format === '0.0%' || input.type === 'percent' ? PCT : input.format || NUM, fill);
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
      // Compute the value from defaults if active
      if (isActive) {
        const vals = { ...inputDefaults, ...userValues };
        try {
          const computed = mapping.jsMap(vals);
          val(AD, adRow, 2, computed, mapping.mapsTo.includes('hours') ? NUM : mapping.mapsTo.includes('revenue') || mapping.mapsTo.includes('risk') ? DOL : PCT, calcFill);
        } catch {
          val(AD, adRow, 2, 'N/A', null, calcFill);
        }
      } else {
        val(AD, adRow, 2, '', null, inactiveInputFill);
      }
      note(AD, adRow, 3, mapping.note || `Refines ${mapping.mapsTo} in DCF`);
      if (!isActive) AD.getRow(adRow).getCell(3).font = { ...font9i, color: { argb: 'FFBBBBBB' } };
      adRow++;
    }

    const sectionEnd = adRow - 1;
    archetypeSectionRows[schema.id] = { start: sectionStart, end: sectionEnd };
    adRow++; // blank separator row
  }

  // --- Mapping Summary (bottom of Archetype Detail tab) ---
  const summaryStart = adRow;
  sub(AD, adRow, 'MAPPING SUMMARY — Active Archetype Overrides', 3);
  adRow++;

  // Pre-compute mapping values from the active archetype
  const activeSchema = ARCHETYPE_INPUT_MAP[activeArchetypeId];
  const activeDefaults = activeSchema ? getArchetypeInputDefaults(activeArchetypeId) : {};
  const activeUserVals = archetypeInputValues[activeArchetypeId] || {};
  const activeMerged = { ...activeDefaults, ...activeUserVals };

  const summaryMappings = [
    'automationPotential', 'errorRate', 'hoursPerWeek', 'toolReplacementRate', 'revenueImpact', 'riskReduction',
  ];

  for (const targetVar of summaryMappings) {
    val(AD, adRow, 1, `Adjusted ${targetVar}`);
    if (activeSchema) {
      const mapping = activeSchema.computedMappings.find(m => m.mapsTo === targetVar);
      if (mapping) {
        try {
          const computed = mapping.jsMap(activeMerged);
          const fmt = targetVar.includes('hours') ? NUM : targetVar.includes('revenue') || targetVar.includes('risk') ? DOL : PCT;
          val(AD, adRow, 2, computed, fmt, calcFill);
          note(AD, adRow, 3, 'From archetype detail inputs');
        } catch {
          val(AD, adRow, 2, 'N/A', null, calcFill);
          note(AD, adRow, 3, 'Not available for this archetype');
        }
      } else {
        val(AD, adRow, 2, 'N/A', null, inactiveInputFill);
        note(AD, adRow, 3, 'Not applicable to this archetype');
      }
    } else {
      val(AD, adRow, 2, 'N/A', null, inactiveInputFill);
    }
    adRow++;
  }

  // Store the summary row numbers for bridge formulas
  const adSummaryRow = summaryStart + 1; // first data row of summary

  printSetup(AD);

  // ===================================================================
  // TAB 3: KEY FORMULAS — Essential calculation chain (green font)
  // ===================================================================
  cols(KF, [35, 22, 50]);
  hdr(KF, 1, 'KEY FORMULAS — Calculation Chain', 3);
  colorLegend(KF, 2);

  // --- Industry & Readiness (rows 3-9) ---
  sub(KF, 3, 'Industry & Readiness', 3);
  val(KF, 4, 1, 'Automation Potential');
  fml(KF, 4, 2, 'INDEX(Lookups!B3:I12,MATCH(Inputs!B4,Lookups!A3:A12,0),MATCH(B10,Lookups!B2:I2,0))', PCT);
  note(KF, 4, 3, 'INDEX/MATCH: Industry x Process Type (B10 = derived process type)');
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
  fml(KF, 10, 2, 'VLOOKUP(Inputs!B10,Lookups!A205:C210,3,FALSE)', null, calcFill);
  note(KF, 10, 3, 'Maps archetype ID → primary process type');

  // --- Current State (rows 11-15) ---
  sub(KF, 11, 'Current State', 3);
  val(KF, 12, 1, 'Hourly Rate');
  fml(KF, 12, 2, 'Inputs!B13/2080', DOL2);
  val(KF, 13, 1, 'Annual Labor Cost');
  fml(KF, 13, 2, 'Inputs!B11*Inputs!B13', DOL);
  val(KF, 14, 1, 'Annual Rework Cost');
  fml(KF, 14, 2, 'B13*Inputs!B14', DOL);
  val(KF, 15, 1, 'Total Current Cost');
  fml(KF, 15, 2, 'B13+B14+Inputs!B15', DOL);
  note(KF, 15, 3, 'Labor + Rework + Tools');

  // --- FTE Displacement (rows 17-21) ---
  sub(KF, 17, 'FTE Displacement', 3);
  val(KF, 18, 1, 'Raw Displaced');
  fml(KF, 18, 2, 'ROUND(Inputs!B11*B77*B6,0)', '0');
  val(KF, 19, 1, 'Max Displaced');
  fml(KF, 19, 2, 'FLOOR(Inputs!B11*Lookups!B83,1)', '0');
  note(KF, 19, 3, '75% cap');
  val(KF, 20, 1, 'Displaced FTEs');
  fml(KF, 20, 2, 'MIN(B18,B19)', '0');
  val(KF, 21, 1, 'Retained FTEs');
  fml(KF, 21, 2, 'Inputs!B11-B20', '0');

  // --- Implementation Cost (rows 23-33) ---
  sub(KF, 23, 'Implementation Cost', 3);
  val(KF, 24, 1, 'AI Team Salary');
  fml(KF, 24, 2, 'VLOOKUP(Inputs!B6,Lookups!A45:B49,2,FALSE)', DOL);
  val(KF, 25, 1, 'Scope Engineers');
  fml(KF, 25, 2, 'MAX(1,CEILING(Inputs!B11/12,1))', '0');
  val(KF, 26, 1, 'Timeline Pressure');
  fml(KF, 26, 2, 'IF(Inputs!B24<=3,1.5,IF(Inputs!B24<=6,1.2,1))', DEC);
  val(KF, 27, 1, 'Data Headcount Mult');
  fml(KF, 27, 2, 'IF(Inputs!B19<=2,1.3,IF(Inputs!B19=3,1.1,1))', DEC);
  val(KF, 28, 1, 'Max Team');
  fml(KF, 28, 2, 'VLOOKUP(Inputs!B5,Lookups!A37:D41,4,FALSE)', '0');
  val(KF, 29, 1, 'Impl Engineers');
  fml(KF, 29, 2, 'MIN(CEILING(B25*B26*B27,1),B28)', '0');
  val(KF, 30, 1, 'Impl Timeline (yrs)');
  fml(KF, 30, 2, 'CEILING(Inputs!B24*VLOOKUP(Inputs!B19,Lookups!A29:C33,3,FALSE)*VLOOKUP(Inputs!B5,Lookups!A37:B41,2,FALSE)*IF(Inputs!B20="Yes",1,1.25),1)/12', DEC);
  val(KF, 31, 1, 'Engineering Cost');
  fml(KF, 31, 2, 'B29*B24*B30', DOL);
  note(KF, 31, 3, 'Engineers x Salary x Timeline');
  val(KF, 32, 1, 'PM + Infra + Training');
  fml(KF, 32, 2, 'B31*(Lookups!B100*MAX(0.5,CEILING(B29/5,1))/B29+Lookups!B98+Lookups!B99)', DOL);
  val(KF, 33, 1, 'Computed Impl Cost');
  fmlBold(KF, 33, 2, 'B31+B32', DOL, calcFill);

  // --- One-Time & Hidden Costs (rows 35-42) ---
  sub(KF, 35, 'One-Time & Hidden Costs', 3);
  val(KF, 36, 1, 'Legal & Compliance');
  fml(KF, 36, 2, 'VLOOKUP(Inputs!B5,Lookups!A37:G41,7,FALSE)', DOL);
  val(KF, 37, 1, 'Security Audit');
  fml(KF, 37, 2, 'VLOOKUP(Inputs!B5,Lookups!A37:H41,8,FALSE)', DOL);
  val(KF, 38, 1, 'Contingency');
  fml(KF, 38, 2, 'B42*Lookups!B84', DOL);
  note(KF, 38, 3, '20% of Realistic Impl Cost');
  val(KF, 39, 1, 'Change Management');
  fml(KF, 39, 2, 'B42*Lookups!B97', DOL);
  note(KF, 39, 3, '15% of Realistic Impl Cost');
  val(KF, 40, 1, 'Total One-Time');
  fmlBold(KF, 40, 2, 'SUM(B36:B39)', DOL, calcFill);
  val(KF, 41, 1, 'Data Cost Mult');
  fml(KF, 41, 2, 'VLOOKUP(Inputs!B19,Lookups!A29:D33,4,FALSE)', DEC);
  val(KF, 42, 1, 'Realistic Impl Cost');
  fmlBold(KF, 42, 2, 'MAX(Inputs!B23*B41,B33)', DOL, calcFill);

  // --- Ongoing AI Costs (rows 44-51) ---
  sub(KF, 44, 'Ongoing AI Costs', 3);
  val(KF, 45, 1, 'Ongoing AI Headcount');
  fml(KF, 45, 2, 'MAX(0.5,ROUND(B29*0.25*2,0)/2)', DEC);
  val(KF, 46, 1, 'Ongoing Labor');
  fml(KF, 46, 2, 'B45*B24', DOL);
  val(KF, 47, 1, 'Annual API Cost');
  fml(KF, 47, 2, '(Inputs!B11*Inputs!B12*IF(Inputs!B37="Yes",2.5,1)*4.33*VLOOKUP(B10,Lookups!A56:C63,3,FALSE)/1000)*VLOOKUP(B10,Lookups!A56:B63,2,FALSE)*12', DOL);
  note(KF, 47, 3, 'Agentic workflows use 2.5x API calls');
  val(KF, 48, 1, 'License + Retraining');
  fml(KF, 48, 2, 'VLOOKUP(Inputs!B5,Lookups!A37:F41,6,FALSE)+B42*Lookups!B88', DOL);
  val(KF, 49, 1, 'Compliance + Insurance');
  fml(KF, 49, 2, 'VLOOKUP(Inputs!B5,Lookups!A37:I41,9,FALSE)+VLOOKUP(Inputs!B5,Lookups!A37:J41,10,FALSE)', DOL);
  val(KF, 50, 1, 'Computed Ongoing');
  fml(KF, 50, 2, 'B46+B47+B48+B49+B72+B73', DOL);
  val(KF, 51, 1, 'Base Ongoing Cost');
  fmlBold(KF, 51, 2, 'MAX(Inputs!B25,B50)', DOL, calcFill);

  // --- Annual Savings (rows 53-61) ---
  sub(KF, 53, 'Annual Savings', 3);
  val(KF, 54, 1, 'Headcount Savings (Risk-Adj)');
  fml(KF, 54, 2, 'B20*Inputs!B13*B9', DOL);
  val(KF, 55, 1, 'Efficiency Savings (Risk-Adj)');
  fml(KF, 55, 2, 'MAX(0,(B13*B77)-B20*Inputs!B13)*B9', DOL);
  val(KF, 56, 1, 'Error Reduction (Risk-Adj)');
  fml(KF, 56, 2, '(B13*B78)*B77*B9', DOL);
  val(KF, 57, 1, 'Tool Replacement (Risk-Adj)');
  fml(KF, 57, 2, 'Inputs!B15*B80*B9', DOL);
  val(KF, 58, 1, 'Enhancement Savings (RA)');
  fml(KF, 58, 2, 'B55+B56+B57', DOL);
  note(KF, 58, 3, 'Efficiency + Error + Tool');
  val(KF, 59, 1, 'Total Risk-Adj Savings');
  fmlBold(KF, 59, 2, 'B54+B58', DOL, calcFill);
  val(KF, 60, 1, 'Net Annual Benefit');
  fmlBold(KF, 60, 2, 'B59-B51', DOL, calcFill);
  val(KF, 61, 1, 'Gross Annual Savings');
  fml(KF, 61, 2, 'Inputs!B15*B80', DOL);

  // --- Investment Summary (rows 63-69) ---
  sub(KF, 63, 'Investment Summary', 3);
  val(KF, 64, 1, 'Upfront Investment');
  fmlBold(KF, 64, 2, 'B42+B40', DOL, calcFill);
  note(KF, 64, 3, 'Realistic Impl + One-Time');
  val(KF, 65, 1, 'Separation Multiplier');
  fml(KF, 65, 2, 'VLOOKUP(Inputs!B5,Lookups!A37:E41,5,FALSE)', DEC);
  val(KF, 66, 1, 'Separation Cost/FTE');
  fml(KF, 66, 2, 'Inputs!B13*B65', DOL);
  val(KF, 67, 1, 'Total Separation Cost');
  fml(KF, 67, 2, 'B20*B66', DOL);
  val(KF, 68, 1, 'Total Investment');
  fmlBold(KF, 68, 2, 'B64+B67', DOL);
  note(KF, 68, 3, 'Upfront + Separation');
  val(KF, 69, 1, 'Discount Rate');
  fml(KF, 69, 2, 'VLOOKUP(Inputs!B5,Lookups!A37:C41,3,FALSE)', PCT);

  // --- Additional Ongoing Costs (rows 71-73) ---
  sub(KF, 71, 'Additional Ongoing Costs (included in Computed Ongoing above)', 3);
  val(KF, 72, 1, 'Retained Talent Premium');
  fml(KF, 72, 2, 'B21*Inputs!B13*Inputs!B36', DOL);
  note(KF, 72, 3, 'Retained FTEs × Salary × Premium Rate (Mercer 2025)');
  val(KF, 73, 1, 'Data Transfer Cost');
  fml(KF, 73, 2, 'IF(Inputs!B5="Startup (1-50)",2400,IF(Inputs!B5="SMB (51-500)",9600,IF(Inputs!B5="Mid-Market (501-5,000)",36000,IF(Inputs!B5="Enterprise (5,001-50,000)",144000,480000))))', DOL);
  note(KF, 73, 3, 'Annual cloud egress/ingress (AWS/Azure/GCP 2025)');

  // --- Archetype Detail Refinement Bridge (rows 75-82) ---
  sub(KF, 75, 'Archetype Detail Refinement', 3);
  val(KF, 76, 1, 'Has Archetype Detail?');
  fml(KF, 76, 2, `IF(COUNTA('Archetype Detail'!B${adSummaryRow}:B${adSummaryRow + 5})>0,"Yes","No")`, null, calcFill);
  note(KF, 76, 3, 'Detects if archetype inputs have been filled');
  val(KF, 77, 1, 'Adj Automation Potential');
  fml(KF, 77, 2, `IF(B76="Yes",IF(ISNUMBER('Archetype Detail'!B${adSummaryRow}),'Archetype Detail'!B${adSummaryRow},B4),B4)`, PCT, calcFill);
  note(KF, 77, 3, 'Uses archetype-refined value if available');
  val(KF, 78, 1, 'Adj Error Rate');
  fml(KF, 78, 2, `IF(B76="Yes",IF(ISNUMBER('Archetype Detail'!B${adSummaryRow + 1}),'Archetype Detail'!B${adSummaryRow + 1},Inputs!B14),Inputs!B14)`, PCT, calcFill);
  note(KF, 78, 3, 'Uses archetype-refined value if available');
  val(KF, 79, 1, 'Adj Hours/Week');
  fml(KF, 79, 2, `IF(B76="Yes",IF(ISNUMBER('Archetype Detail'!B${adSummaryRow + 2}),'Archetype Detail'!B${adSummaryRow + 2},Inputs!B12),Inputs!B12)`, NUM, calcFill);
  note(KF, 79, 3, 'Uses archetype-refined value if available');
  val(KF, 80, 1, 'Adj Tool Replace %');
  fml(KF, 80, 2, `IF(B76="Yes",IF(ISNUMBER('Archetype Detail'!B${adSummaryRow + 3}),'Archetype Detail'!B${adSummaryRow + 3},VLOOKUP(B10,Lookups!A56:D63,4,FALSE)),VLOOKUP(B10,Lookups!A56:D63,4,FALSE))`, PCT, calcFill);
  val(KF, 81, 1, 'Revenue Impact');
  fml(KF, 81, 2, `IF(B76="Yes",IF(ISNUMBER('Archetype Detail'!B${adSummaryRow + 4}),'Archetype Detail'!B${adSummaryRow + 4},0),0)`, DOL, calcFill);
  note(KF, 81, 3, 'Archetype-specific annual revenue impact');
  val(KF, 82, 1, 'Risk Reduction Factor');
  fml(KF, 82, 2, `IF(B76="Yes",IF(ISNUMBER('Archetype Detail'!B${adSummaryRow + 5}),'Archetype Detail'!B${adSummaryRow + 5},0),0)`, DOL, calcFill);
  note(KF, 82, 3, 'Archetype-specific annual risk reduction');

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
  val(SU, 11, 1, 'Upfront Investment');
  fml(SU, 11, 2, "'Key Formulas'!B64", DOL);
  val(SU, 12, 1, 'Phased Separation Cost');
  fml(SU, 12, 2, "'Key Formulas'!B67", DOL);
  val(SU, 13, 1, 'Total Capital Deployed');
  fmlBold(SU, 13, 2, "'Key Formulas'!B68", DOL);
  val(SU, 14, 1, 'Annual Ongoing (Yr 1)');
  fml(SU, 14, 2, "'Key Formulas'!B51", DOL);

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
  val(SU, 28, 1, 'Displaced FTEs');
  fml(SU, 28, 2, "'Key Formulas'!B20", '0');
  val(SU, 29, 1, 'Retained FTEs');
  fml(SU, 29, 2, "'Key Formulas'!B21", '0');
  val(SU, 30, 1, 'Confidence Level');
  fml(SU, 30, 2, 'IF(AND((Inputs!B18+Inputs!B19)/2>=4,Inputs!B20="Yes"),"High",IF((Inputs!B18+Inputs!B19)/2>=3,"Moderate","Conservative"))');

  // --- Capital Allocation Comparison (rows 32-37) ---
  sub(SU, 32, 'Capital Allocation Comparison', 4);
  val(SU, 33, 1, 'AI Project IRR');
  fml(SU, 33, 2, "'P&L & Cash Flow'!B28", PCT);
  val(SU, 34, 1, 'vs Stock Buyback (8%)');
  fml(SU, 34, 2, "'P&L & Cash Flow'!B28-0.08", PCT);
  note(SU, 34, 3, 'Typical equity return benchmark');
  val(SU, 35, 1, 'vs M&A Hurdle (15%)');
  fml(SU, 35, 2, "'P&L & Cash Flow'!B28-0.15", PCT);
  note(SU, 35, 3, 'Standard M&A return threshold');
  val(SU, 36, 1, 'vs Treasury Bond (4.5%)');
  fml(SU, 36, 2, "'P&L & Cash Flow'!B28-0.045", PCT);
  note(SU, 36, 3, 'Risk-free rate benchmark');

  // --- Cost of Inaction (rows 38-41) ---
  sub(SU, 38, 'Cost of Inaction (Do-Nothing Scenario)', 4);
  val(SU, 39, 1, '5-Year Do-Nothing Cost');
  fml(SU, 39, 2, "'Key Formulas'!B13*(VLOOKUP(Inputs!B4,Lookups!A16:C25,3,FALSE)+VLOOKUP(Inputs!B4,Lookups!A16:D25,4,FALSE))*((1+Lookups!B86)^0+(1+Lookups!B86)^1+(1+Lookups!B86)^2+(1+Lookups!B86)^3+(1+Lookups!B86)^4)", DOL);
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

  // --- Parameters (rows 4-9) ---
  sub(PL, 4, 'PARAMETERS', 7);
  val(PL, 5, 1, 'Adoption Ramp');
  for (let y = 1; y <= 5; y++) fml(PL, 5, y + 2, `Lookups!D${103 + y}`, PCT);
  val(PL, 6, 1, 'Wage Growth Factor');
  for (let y = 1; y <= 5; y++) fml(PL, 6, y + 2, `(1+Lookups!B86)^${y - 1}`, DEC);
  val(PL, 7, 1, 'HR Reduction (year)');
  for (let y = 1; y <= 5; y++) fml(PL, 7, y + 2, `Lookups!B${103 + y}`, PCT);
  val(PL, 8, 1, 'Cumulative HR Reduction');
  for (let y = 1; y <= 5; y++) fml(PL, 8, y + 2, `Lookups!C${103 + y}`, PCT);
  val(PL, 9, 1, 'Cost Escalation Factor');
  for (let y = 1; y <= 5; y++) fml(PL, 9, y + 2, `Lookups!F${103 + y}`, DEC);

  // --- Cash Inflows (rows 11-14) ---
  sub(PL, 11, 'CASH INFLOWS', 7);
  val(PL, 12, 1, 'Enhancement Savings');
  for (let y = 1; y <= 5; y++) {
    const c = String.fromCharCode(66 + y);
    fml(PL, 12, y + 2, `'Key Formulas'!B58*${c}5*${c}6`, DOL);
  }
  val(PL, 13, 1, 'Headcount Savings');
  for (let y = 1; y <= 5; y++) {
    const c = String.fromCharCode(66 + y);
    fml(PL, 13, y + 2, `'Key Formulas'!B54*${c}8*${c}6`, DOL);
  }
  val(PL, 14, 1, 'GROSS SAVINGS');
  for (let y = 1; y <= 5; y++) {
    const c = String.fromCharCode(66 + y);
    fmlBold(PL, 14, y + 2, `${c}12+${c}13`, DOL, calcFill);
  }

  // --- Cash Outflows (rows 16-18) ---
  sub(PL, 16, 'CASH OUTFLOWS', 7);
  val(PL, 17, 1, 'Separation Cost');
  for (let y = 1; y <= 5; y++) {
    const c = String.fromCharCode(66 + y);
    fml(PL, 17, y + 2, `'Key Formulas'!B67*${c}7`, DOL, warnFill);
  }
  val(PL, 18, 1, 'Ongoing AI Cost');
  for (let y = 1; y <= 5; y++) {
    const c = String.fromCharCode(66 + y);
    fml(PL, 18, y + 2, `'Key Formulas'!B51*${c}9`, DOL, warnFill);
  }

  // --- Net Cash Flow (row 20) ---
  sub(PL, 20, 'NET CASH FLOWS', 7);
  val(PL, 21, 1, 'NET CASH FLOW'); PL.getRow(21).getCell(1).font = fontBold;
  fmlBold(PL, 21, 2, "-'Key Formulas'!B64", DOL, warnFill);
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
  { const cell = PL.getRow(30).getCell(2); cell.value = { formula: "(SUM(C21:G21)-'Key Formulas'!B64)/'Key Formulas'!B68" }; cell.numFmt = PCT; cell.fill = goldFill; cell.font = goldFont; }

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
  note(PL, 36, 3, 'Upfront + Separation');
  val(PL, 37, 1, 'E. Net Return');
  fmlBold(PL, 37, 2, "B35-'Key Formulas'!B64", DOL, calcFill);
  note(PL, 37, 3, 'C - Upfront Investment');
  val(PL, 38, 1, 'F. ROIC = E / D'); PL.getRow(38).getCell(1).font = fontBold;
  { const cell = PL.getRow(38).getCell(2); cell.value = { formula: 'IF(B36>0,B37/B36,0)' }; cell.numFmt = PCT; cell.fill = goldFill; cell.font = goldFont; }
  note(PL, 38, 3, 'Net Return / Total Capital Deployed');

  // ROIC note
  note(PL, 40, 1, 'ROIC measures total net profit relative to total capital invested. A positive ROIC means the project returns more than it costs.');
  PL.mergeCells(40, 1, 40, 7);
  printSetup(PL);

  // ===================================================================
  // TAB 5: SENSITIVITY — Scenarios + Tornado + Confidence
  // ===================================================================
  cols(SE, [28, 22, 22, 22, 18, 18, 18, 18]);
  hdr(SE, 1, 'SENSITIVITY ANALYSIS', 8);
  colorLegend(SE, 2);

  // --- Scenario Analysis (rows 3-19) ---
  sub(SE, 3, 'SCENARIO ANALYSIS', 8);
  tableHeaders(SE, 4, ['', 'Conservative', 'Base Case', 'Optimistic', '', '', '', '']);
  val(SE, 4, 1, 'Scenario Multiplier');
  val(SE, 4, 2, 0.75, DEC); val(SE, 4, 3, 1.00, DEC); val(SE, 4, 4, 1.25, DEC);

  sub(SE, 6, 'Year-by-Year Net Cash Flows', 4);
  val(SE, 7, 1, 'FY 0');
  for (let s = 0; s < 3; s++) fml(SE, 7, s + 2, "-'Key Formulas'!B64", DOL);

  for (let y = 1; y <= 5; y++) {
    val(SE, 7 + y, 1, `FY ${y}`);
    for (let s = 0; s < 3; s++) {
      const m = `$${String.fromCharCode(66 + s)}$4`;
      const f = `('Key Formulas'!$B$58*Lookups!$D$${103 + y}*${m}*(1+Lookups!$B$86)^${y - 1}` +
        `+'Key Formulas'!$B$54*Lookups!$C$${103 + y}*${m}*(1+Lookups!$B$86)^${y - 1})` +
        `-'Key Formulas'!$B$67*Lookups!$B$${103 + y}` +
        `-'Key Formulas'!$B$51*Lookups!$F$${103 + y}`;
      fml(SE, 7 + y, s + 2, f, DOL);
    }
  }

  // --- Scenario Metrics (rows 14-19) ---
  sub(SE, 13, 'Scenario Metrics', 4);
  val(SE, 14, 1, 'NPV');
  for (let s = 0; s < 3; s++) {
    const c = String.fromCharCode(66 + s);
    fml(SE, 14, s + 2, `${c}7+NPV('Key Formulas'!B69,${c}8:${c}12)`, DOL,
      s === 0 ? warnFill : s === 2 ? resultFill : calcFill);
  }
  val(SE, 15, 1, 'IRR');
  for (let s = 0; s < 3; s++) {
    const c = String.fromCharCode(66 + s);
    fml(SE, 15, s + 2, `IFERROR(MIN(MAX(IRR(${c}7:${c}12),Lookups!B96*-1),Lookups!B96),"N/A")`, PCT,
      s === 0 ? warnFill : s === 2 ? resultFill : calcFill);
  }
  val(SE, 16, 1, 'ROIC');
  for (let s = 0; s < 3; s++) {
    const c = String.fromCharCode(66 + s);
    fml(SE, 16, s + 2, `MIN(MAX((SUM(${c}8:${c}12)-'Key Formulas'!B64)/'Key Formulas'!B68,Lookups!B95*-1),Lookups!B95)`, PCT,
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
    fml(SE, 18, s + 2, `SUM(${c}8:${c}12)`, DOL, s === 0 ? warnFill : s === 2 ? resultFill : calcFill);
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
  val(SE, 24, 1, 'Upfront Investment');
  fml(SE, 24, 2, "'Key Formulas'!B64", DOL);

  tableHeaders(SE, 25, ['Variable', 'Base Value', 'Low', 'High', 'NPV Low', 'NPV High', 'Delta (-)', 'Delta (+)']);

  // Tornado intermediate formulas (rows 32-37 for intermediates)
  // Summary rows 26-31 in tornado table
  const sensVars = [
    { r: 26, ir: 32, name: 'Team Size', base: '=Inputs!B11', lo: '-20%', hi: '+20%' },
    { r: 27, ir: 33, name: 'Avg Salary', base: '=Inputs!B13', lo: '-20%', hi: '+20%' },
    { r: 28, ir: 34, name: 'Error Rate', base: '=Inputs!B14', lo: '-50%', hi: '+50%' },
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
    fml(SE, v.r, 2, v.base.replace('=', ''), v.name === 'Error Rate' || v.name === 'Automation Potential' ? PCT : v.name === 'Team Size' ? '0' : DOL);
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
  fml(SE, 32, 2, 'ROUND(Inputs!B11*0.8,0)*Inputs!B13*(1+Inputs!B14)+Inputs!B15', DOL);
  fml(SE, 32, 3, 'ROUND(Inputs!B11*1.2,0)*Inputs!B13*(1+Inputs!B14)+Inputs!B15', DOL);
  fml(SE, 32, 4, "B32*'Key Formulas'!B4*'Key Formulas'!B9-'Key Formulas'!B51", DOL);
  fml(SE, 32, 5, "C32*'Key Formulas'!B4*'Key Formulas'!B9-'Key Formulas'!B51", DOL);

  // Avg Salary (row 33)
  val(SE, 33, 1, 'Avg Salary');
  fml(SE, 33, 2, 'Inputs!B11*(Inputs!B13*0.8)*(1+Inputs!B14)+Inputs!B15', DOL);
  fml(SE, 33, 3, 'Inputs!B11*(Inputs!B13*1.2)*(1+Inputs!B14)+Inputs!B15', DOL);
  fml(SE, 33, 4, "B33*'Key Formulas'!B4*'Key Formulas'!B9-'Key Formulas'!B51", DOL);
  fml(SE, 33, 5, "C33*'Key Formulas'!B4*'Key Formulas'!B9-'Key Formulas'!B51", DOL);

  // Error Rate (row 34)
  val(SE, 34, 1, 'Error Rate');
  fml(SE, 34, 2, 'Inputs!B11*Inputs!B13*(1+MAX(0,Inputs!B14*0.5))+Inputs!B15', DOL);
  fml(SE, 34, 3, 'Inputs!B11*Inputs!B13*(1+MIN(0.5,Inputs!B14*1.5))+Inputs!B15', DOL);
  fml(SE, 34, 4, "B34*'Key Formulas'!B4*'Key Formulas'!B9-'Key Formulas'!B51", DOL);
  fml(SE, 34, 5, "C34*'Key Formulas'!B4*'Key Formulas'!B9-'Key Formulas'!B51", DOL);

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
  fml(SE, 47, 5, "-'Key Formulas'!B64+NPV('Key Formulas'!B69-0.03,'P&L & Cash Flow'!C21:G21)", DOL, warnFill);
  fml(SE, 47, 6, "-'Key Formulas'!B64+NPV('Key Formulas'!B69+0.05,'P&L & Cash Flow'!C21:G21)", DOL, resultFill);
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
    note(SE, 59, 1, `Monte Carlo: ${mcResults.sampleSize} correlated iterations varying automation potential, change readiness, implementation budget, ongoing costs, cash realization, and error rate.`);
  }

  printSetup(SE);

  // ===================================================================
  // TAB 7: V5 ANALYSIS — Workforce Alternatives, Break-Even Units, Cost Model
  // ===================================================================
  cols(V5, [32, 22, 22, 22, 22, 22]);
  hdr(V5, 1, 'V5 ANALYSIS — CAPITAL ALLOCATION & UNIT ECONOMICS', 6);
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

  note(V5, beRow + 1, 1, 'Model drift rate based on Stanford HAI research. Drift compounds annually and reduces projected benefits in years 2-5.');

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

  auditFml('Error Rate', 'Inputs!B14', PCT,
    '0% - 50%',
    'IF(AND(ISNUMBER(Inputs!B14),Inputs!B14>=0,Inputs!B14<=0.5),"ok","ERROR")');

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

  auditFml('Displaced FTEs', "'Key Formulas'!B20", '0',
    '0 - Team Size',
    "IF(AND(ISNUMBER('Key Formulas'!B20),'Key Formulas'!B20>=0,'Key Formulas'!B20<=Inputs!B11),\"ok\",\"ERROR\")");

  auditFml('Retained FTEs', "'Key Formulas'!B21", '0',
    '>= 0',
    "IF(AND(ISNUMBER('Key Formulas'!B21),'Key Formulas'!B21>=0),\"ok\",\"ERROR\")");

  auditFml('Displaced + Retained = Team', "'Key Formulas'!B20+'Key Formulas'!B21", '0',
    '= Team Size',
    "IF(ABS('Key Formulas'!B20+'Key Formulas'!B21-Inputs!B11)<1,\"ok\",\"ERROR\")");

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

  auditFml('Rework Cost', "'Key Formulas'!B14", DOL,
    '>= 0',
    "IF(AND(ISNUMBER('Key Formulas'!B14),'Key Formulas'!B14>=0),\"ok\",\"ERROR\")");

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

  auditFml('Headcount Savings (RA)', "'Key Formulas'!B54", DOL,
    '>= 0',
    "IF(AND(ISNUMBER('Key Formulas'!B54),'Key Formulas'!B54>=0),\"ok\",\"ERROR\")");

  auditFml('Enhancement Savings (RA)', "'Key Formulas'!B58", DOL,
    '>= 0',
    "IF(AND(ISNUMBER('Key Formulas'!B58),'Key Formulas'!B58>=0),\"ok\",\"ERROR\")");

  auditFml('Total Risk-Adj Savings', "'Key Formulas'!B59", DOL,
    '> 0',
    "IF(AND(ISNUMBER('Key Formulas'!B59),'Key Formulas'!B59>0),\"ok\",\"ERROR\")");

  auditFml('Net Annual Benefit', "'Key Formulas'!B60", DOL,
    'Is a number',
    "IF(ISNUMBER('Key Formulas'!B60),\"ok\",\"ERROR\")");

  auditFml('Gross Annual Savings', "'Key Formulas'!B61", DOL,
    '> 0',
    "IF(AND(ISNUMBER('Key Formulas'!B61),'Key Formulas'!B61>0),\"ok\",\"ERROR\")");

  auditFml('Gross >= Net Savings', "'Key Formulas'!B61-'Key Formulas'!B60", DOL,
    '>= 0',
    "IF('Key Formulas'!B61>='Key Formulas'!B60,\"ok\",\"ERROR\")");

  // =========================
  // SECTION: P&L YEAR-BY-YEAR (BASE CASE)
  // =========================
  auditSection('P&L YEAR-BY-YEAR (BASE CASE)');

  for (let y = 1; y <= 5; y++) {
    const c = String.fromCharCode(66 + y); // C, D, E, F, G
    auditFml(`FY ${y} Gross Savings`, `'P&L & Cash Flow'!${c}14`, DOL,
      '> 0',
      `IF(AND(ISNUMBER('P&L & Cash Flow'!${c}14),'P&L & Cash Flow'!${c}14>0),"ok","ERROR")`);
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

  auditFml('Capital: Summary = KF', "Summary!B13-'Key Formulas'!B68", DOL,
    'Difference = 0',
    "IF(ABS(Summary!B13-'Key Formulas'!B68)<1,\"ok\",\"ERROR\")");

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
    const name = ['Team Size', 'Avg Salary', 'Error Rate', 'Automation Potential', 'Implementation Cost', 'Ongoing Cost'][i];
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
    const mcStartRow = auRow;

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

  const sumStartRow = auRow;
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
  // TAB: ASSUMPTION DEFINITIONS — Archetype cases with key drivers
  // ===================================================================
  cols(DF, [30, 45, 55, 40]);
  hdr(DF, 1, 'ASSUMPTION DEFINITIONS BY USE CASE', 4);

  // Column headers
  const defHdrRow = DF.getRow(3);
  ['Use Case', 'Key Drivers', 'Definition', 'Why It Matters'].forEach((h, ci) => {
    const cell = defHdrRow.getCell(ci + 1);
    cell.value = h;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  defHdrRow.height = 22;

  const ARCHETYPE_DEFINITIONS = [
    {
      label: 'Internal Process Automation',
      drivers: 'Process volume, handling time, error rate, automation %',
      definition: 'Automate repetitive internal workflows, document handling, and back-office operations using AI to reduce manual effort and errors.',
      importance: 'Typically the fastest ROI path — high volume processes with measurable time savings and error reduction compound quickly.',
    },
    {
      label: 'Customer-Facing AI',
      drivers: 'Ticket volume, resolution time, CSAT, churn rate',
      definition: 'Deploy AI-powered customer interactions including chatbots, intelligent routing, and personalized support experiences.',
      importance: 'Directly impacts revenue retention and customer satisfaction — a 1-point CSAT improvement can increase retention by 5-10%.',
    },
    {
      label: 'Data, Analytics & FP&A',
      drivers: 'Reports/month, analyst hours, data sources, close cycle, reconciliation volume',
      definition: 'Automate reporting, forecasting, financial close, reconciliation, and data-driven decision making to reduce analyst burden and improve insight speed.',
      importance: 'Frees expensive analyst and finance team time for strategic work. Days-to-close reduction and faster forecasting compound across the organization.',
    },
    {
      label: 'Revenue & Growth AI',
      drivers: 'Pipeline value, conversion rate, deal cycle, lead volume',
      definition: 'Drive revenue through AI-enhanced sales intelligence, marketing optimization, and market opportunity identification.',
      importance: 'Revenue-eligible archetype — models both cost savings and top-line revenue impact from improved conversion.',
    },
    {
      label: 'Risk, Compliance & Legal AI',
      drivers: 'Audit volume, compliance checks, violation cost, contracts/month, review hours',
      definition: 'Reduce compliance risk, automate contract review, improve audit quality, and streamline regulatory and legal processes with AI-driven monitoring.',
      importance: 'Penalty avoidance, audit efficiency, and contract acceleration — a single compliance failure can cost 10-100x the annual AI investment.',
    },
    {
      label: 'Knowledge Management AI',
      drivers: 'Search queries/day, onboarding time, document count, resolution rate',
      definition: 'Capture institutional knowledge, power enterprise search, and automate documentation with AI-driven knowledge systems.',
      importance: 'Reduces knowledge loss from turnover and cuts onboarding time — critical for scaling organizations.',
    },
  ];

  ARCHETYPE_DEFINITIONS.forEach((arch, i) => {
    const r = DF.getRow(4 + i);
    r.getCell(1).value = arch.label;
    r.getCell(1).font = fontBold;
    r.getCell(2).value = arch.drivers;
    r.getCell(2).font = font10;
    r.getCell(3).value = arch.definition;
    r.getCell(3).font = font10;
    r.getCell(4).value = arch.importance;
    r.getCell(4).font = font10;
    [1, 2, 3, 4].forEach(c => {
      r.getCell(c).alignment = { vertical: 'top', wrapText: true };
      r.getCell(c).border = thinBorder;
    });
    r.height = 45;
    if (i % 2 === 1) {
      [1, 2, 3, 4].forEach(c => {
        r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      });
    }
  });

  // Add selected archetype highlight note
  const noteRow = DF.getRow(4 + ARCHETYPE_DEFINITIONS.length + 1);
  noteRow.getCell(1).value = 'Selected Use Case:';
  noteRow.getCell(1).font = fontBold;
  noteRow.getCell(2).value = { formula: 'Inputs!B10' };
  noteRow.getCell(2).font = { ...fontBold, color: { argb: 'FF0000FF' } };

  printSetup(DF);
  DF.protect('', { selectLockedCells: true, selectUnlockedCells: true });

  // ===================================================================
  // TABS: PER-ARCHETYPE ASSUMPTION SHEETS
  // One tab per archetype with key drivers, input variables, computed
  // formulas, and real-world benchmarks.
  // ===================================================================
  const ARCHETYPE_TAB_NAMES = {
    'internal-process-automation': 'Assumptions: Process',
    'customer-facing-ai':         'Assumptions: Customer',
    'data-analytics-automation':  'Assumptions: Analytics',
    'revenue-growth-ai':          'Assumptions: Revenue',
    'risk-compliance-legal-ai':   'Assumptions: Compliance',
    'knowledge-management-ai':    'Assumptions: Knowledge',
  };

  const ARCHETYPE_BENCHMARKS = {
    'internal-process-automation': [
      ['Process automation ROI', '200-300%', 'McKinsey Digital (2024)'],
      ['Avg handling time reduction', '40-65%', 'Deloitte AI Survey (2024)'],
      ['Error rate reduction', '50-80%', 'IEEE Intelligent Systems (2024)'],
      ['Time to value', '3-6 months', 'Gartner RPA Market Guide (2024)'],
    ],
    'customer-facing-ai': [
      ['AI deflection rate (best-in-class)', '40-60%', 'Gartner Customer Service (2025)'],
      ['First-response time improvement', '50-70%', 'Zendesk CX Trends (2024)'],
      ['CSAT improvement from AI', '+5 to +15 pts', 'Forrester CX Index (2024)'],
      ['Churn reduction from faster resolution', '5-10%', 'Harvard Business Review (2024)'],
    ],
    'data-analytics-automation': [
      ['Report generation time reduction', '60-80%', 'McKinsey Analytics (2024)'],
      ['Financial close cycle reduction', '40-60%', 'Deloitte CFO Insights (2024)'],
      ['Analyst productivity gain', '30-50%', 'Gartner Data & Analytics (2025)'],
      ['Forecast accuracy improvement', '15-30%', 'MIT Sloan Management Review (2024)'],
    ],
    'revenue-growth-ai': [
      ['Lead conversion improvement', '15-30%', 'Salesforce State of Sales (2024)'],
      ['Pipeline velocity increase', '20-40%', 'Forrester B2B Sales (2024)'],
      ['Customer acquisition cost reduction', '10-25%', 'HubSpot Marketing Trends (2024)'],
      ['Revenue per rep increase', '10-20%', 'McKinsey B2B Sales (2024)'],
    ],
    'risk-compliance-legal-ai': [
      ['False positive reduction', '20-50%', 'Celent Financial Services (2024)'],
      ['Contract review time reduction', '60-80%', 'Thomson Reuters Legal AI (2024)'],
      ['Audit prep time reduction', '30-50%', 'KPMG Regulatory Insights (2024)'],
      ['Regulatory finding prevention rate', '30-40%', 'Deloitte Risk Advisory (2024)'],
    ],
    'knowledge-management-ai': [
      ['Search success rate improvement', '40-60%', 'Coveo Enterprise Search (2024)'],
      ['Onboarding time reduction', '30-50%', 'Gartner Digital Workplace (2025)'],
      ['Duplicate work reduction', '20-40%', 'McKinsey Knowledge Worker (2024)'],
      ['Time-to-find information reduction', '50-70%', 'IDC Knowledge Management (2024)'],
    ],
  };

  const archetypeSheets = [];

  for (const schema of ARCHETYPE_INPUT_SCHEMAS) {
    const archetype = PROJECT_ARCHETYPES.find(a => a.id === schema.id);
    if (!archetype) continue;

    const tabName = ARCHETYPE_TAB_NAMES[schema.id] || `Assumptions: ${schema.id}`;
    const isActive = schema.id === activeArchetypeId;
    const tabColor = isActive ? 'FF4CAF50' : 'FFB0BEC5';
    const ws = wb.addWorksheet(tabName, { tabColor: { argb: tabColor } });

    cols(ws, [35, 20, 20, 45]);
    let r = 1;

    // Header
    hdr(ws, r, `ASSUMPTIONS: ${archetype.label.toUpperCase()}`, 4);
    r++;
    colorLegend(ws, r);
    r += 2;

    // Active indicator
    if (isActive) {
      const activeRow = ws.getRow(r);
      activeRow.getCell(1).value = '\u2713 ACTIVE — This archetype is selected in your model';
      activeRow.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF2E7D32' } };
      activeRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
      ws.mergeCells(r, 1, r, 4);
    } else {
      const activeRow = ws.getRow(r);
      activeRow.getCell(1).value = 'Not active — switch archetype on Inputs tab (row 10) to activate';
      activeRow.getCell(1).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF999999' } };
      ws.mergeCells(r, 1, r, 4);
    }
    r += 2;

    // Use case definition
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
    val(ws, r, 1, 'Source Process Types');
    ws.getRow(r).getCell(2).value = archetype.sourceProcessTypes.join(', ');
    ws.getRow(r).getCell(2).font = font10;
    ws.mergeCells(r, 2, r, 4);
    r++;
    val(ws, r, 1, 'Revenue Eligible');
    ws.getRow(r).getCell(2).value = archetype.revenueEligible ? 'Yes' : 'No';
    ws.getRow(r).getCell(2).font = fontBold;
    r += 2;

    // Key input variables
    sub(ws, r, 'KEY INPUT VARIABLES', 4);
    r++;
    tableHeaders(ws, r, ['Variable', 'Default Value', 'Range', 'Description']);
    r++;

    const inputDefaults = getArchetypeInputDefaults(schema.id);
    const userValues = (formData.archetypeInputs || {})[schema.id] || {};

    for (const input of schema.inputs) {
      const cellValue = userValues[input.key] ?? inputDefaults[input.key] ?? input.default;
      const fill = isActive ? inputFill : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      const cellFont = isActive ? inputFont : { name: 'Calibri', size: 10, color: { argb: 'FF999999' } };

      val(ws, r, 1, input.label);
      ws.getRow(r).getCell(1).font = fontBold;

      const vCell = ws.getRow(r).getCell(2);
      vCell.value = cellValue;
      vCell.font = cellFont;
      vCell.fill = fill;
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

    // Computed outputs
    sub(ws, r, 'COMPUTED OUTPUTS — How Inputs Feed the DCF', 4);
    r++;
    tableHeaders(ws, r, ['DCF Variable', 'Computed Value', 'Formula Logic', '']);
    r++;

    for (const mapping of schema.computedMappings) {
      val(ws, r, 1, mapping.mapsTo);
      ws.getRow(r).getCell(1).font = greenFontBold;

      // Compute the value
      const merged = { ...inputDefaults, ...userValues };
      try {
        const computed = mapping.jsMap(merged);
        const mFmt = mapping.mapsTo.includes('hours') ? NUM
          : mapping.mapsTo.includes('revenue') || mapping.mapsTo.includes('risk') ? DOL
          : PCT;
        val(ws, r, 2, computed, mFmt, calcFill);
      } catch {
        val(ws, r, 2, 'N/A', null, calcFill);
      }

      ws.getRow(r).getCell(3).value = mapping.excelFormula || '';
      ws.getRow(r).getCell(3).font = { name: 'Calibri', size: 9, color: { argb: 'FF2E7D32' } };
      ws.getRow(r).getCell(3).alignment = { wrapText: true };

      if (mapping.note) {
        ws.getRow(r).getCell(4).value = mapping.note;
        ws.getRow(r).getCell(4).font = font9i;
        ws.getRow(r).getCell(4).alignment = { wrapText: true };
      }
      r++;
    }
    r += 2;

    // Industry benchmarks
    const benchmarks = ARCHETYPE_BENCHMARKS[schema.id];
    if (benchmarks) {
      sub(ws, r, 'INDUSTRY BENCHMARKS & SOURCES', 4);
      r++;
      tableHeaders(ws, r, ['Metric', 'Benchmark Range', 'Source', '']);
      r++;

      for (const [metric, range, source] of benchmarks) {
        val(ws, r, 1, metric);
        ws.getRow(r).getCell(1).font = fontBold;
        val(ws, r, 2, range);
        ws.getRow(r).getCell(2).font = font10;
        ws.getRow(r).getCell(3).value = source;
        ws.getRow(r).getCell(3).font = font9i;
        r++;
      }
    }

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
    { ws: DF, name: 'Assumption Definitions' },
    ...archetypeSheets,
  ];
  for (const { ws, name } of allSheets) {
    if (!includedTabs.includes(name)) {
      ws.state = 'hidden';
    }
  }

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
