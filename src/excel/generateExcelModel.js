/**
 * AI ROI Calculator — Presentation-Ready Excel Model
 * 6 tabs: Inputs, Key Formulas, Summary, P&L & Cash Flow, Sensitivity, Lookups
 * Color coded: Blue=Inputs, Green=Formulas, Black=Results
 * All calculated cells use real Excel formulas.
 */
import ExcelJS from 'exceljs';

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
const font10 = { name: 'Calibri', size: 10 };
const font9i = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF666666' } };
const fontBold = { name: 'Calibri', size: 10, bold: true };
const outputFont = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
const outputFont10 = { name: 'Calibri', size: 10, color: { argb: 'FFFFFFFF' } };
const inputFont = { name: 'Calibri', size: 10, color: { argb: 'FF1B2A4A' } };
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
  'US - Major Tech Hub', 'US - Other', 'UK / Western Europe', 'Canada / Australia',
  'Remote / Distributed', 'Eastern Europe', 'Latin America', 'India / South Asia',
];

// =====================================================================
export async function generateExcelModel(formData) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'AI ROI Calculator';
  wb.created = new Date();

  // Create all 6 worksheets in tab order
  const I = wb.addWorksheet('Inputs', { tabColor: { argb: 'FF2196F3' } });
  const KF = wb.addWorksheet('Key Formulas', { tabColor: { argb: 'FF4CAF50' } });
  const SU = wb.addWorksheet('Summary', { tabColor: { argb: `FF${NAVY}` } });
  const PL = wb.addWorksheet('P&L & Cash Flow', { tabColor: { argb: `FF${NAVY}` } });
  const SE = wb.addWorksheet('Sensitivity', { tabColor: { argb: 'FFFF9800' } });
  const L = wb.addWorksheet('Lookups', { tabColor: { argb: 'FF9E9E9E' } });

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

  // AI Team Salary (R43-R52)
  hdr(L, 43, 'AI TEAM SALARY', 2);
  tableHeaders(L, 44, ['Location', 'Salary']);
  const SAL = [215000,155000,150000,140000,145000,80000,55000,40000];
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
    ['Max ROIC Cap',1.00,PCT],['Max IRR Cap',0.75,PCT],
    ['Change Mgmt Rate',0.15,PCT],['Infra Cost Rate',0.12,PCT],
    ['Training Cost Rate',0.08,PCT],['PM Salary Factor',0.85,DEC],
  ];
  CONSTS.forEach((c, i) => { val(L, 82 + i, 1, c[0]); val(L, 82 + i, 2, c[1], c[2]); });

  // Schedules (R102-R108)
  hdr(L, 102, 'YEAR-BY-YEAR SCHEDULES', 6);
  tableHeaders(L, 103, ['Year', 'HR Reduction', 'Cum HR', 'Adoption Ramp', 'Cost Escalation', 'Cum Escalation']);
  const SCHED = [
    [1,0,0,0.75,0,1.000],[2,0.20,0.20,0.90,0.12,1.120],
    [3,0.25,0.45,1.00,0.12,1.2544],[4,0.20,0.65,1.00,0.07,1.342208],[5,0.10,0.75,1.00,0.07,1.436163],
  ];
  SCHED.forEach((s, i) => { dataRow(L, 104 + i, s, ['0', PCT, PCT, PCT, PCT, DEC]); });

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

  // Hide the Lookups tab
  L.state = 'hidden';

  // ===================================================================
  // TAB 1: INPUTS — Pre-filled from formData
  // ===================================================================
  cols(I, [35, 28, 45]);
  hdr(I, 1, 'USER INPUTS', 3);
  colorLegend(I, 2);

  sub(I, 3, 'Company Context', 3);
  val(I, 4, 1, 'Industry'); val(I, 4, 2, formData.industry || 'Technology / Software', null, inputFill); note(I, 4, 3, 'Select from dropdown');
  val(I, 5, 1, 'Company Size'); val(I, 5, 2, formData.companySize || 'Mid-Market (501-5,000)', null, inputFill); note(I, 5, 3, 'Select from dropdown');
  val(I, 6, 1, 'Team Location'); val(I, 6, 2, formData.teamLocation || 'US - Major Tech Hub', null, inputFill); note(I, 6, 3, 'Select from dropdown');
  val(I, 7, 1, 'State (for R&D credit)'); val(I, 7, 2, formData.companyState || 'Other / Not Sure', null, inputFill); note(I, 7, 3, 'US only -- optional');

  sub(I, 9, 'Project Details', 3);
  val(I, 10, 1, 'Project Archetype'); val(I, 10, 2, formData.projectArchetype || formData.processType || 'internal-process-automation', null, inputFill); note(I, 10, 3, 'Archetype ID');
  val(I, 11, 1, 'Team Size (FTEs)'); val(I, 11, 2, formData.teamSize || 10, NUM, inputFill); note(I, 11, 3, 'Number of people');
  val(I, 12, 1, 'Hours per Week (per person)'); val(I, 12, 2, formData.hoursPerWeek || 40, NUM, inputFill); note(I, 12, 3, 'Avg hours worked');
  val(I, 13, 1, 'Avg Fully-Loaded Salary'); val(I, 13, 2, formData.avgSalary || 200000, DOL, inputFill); note(I, 13, 3, 'Annual salary + benefits');
  val(I, 14, 1, 'Error / Rework Rate'); val(I, 14, 2, formData.errorRate ?? 0.10, PCT, inputFill); note(I, 14, 3, '% requiring rework');
  val(I, 15, 1, 'Current Tool Costs (annual)'); val(I, 15, 2, formData.currentToolCosts || 0, DOL, inputFill); note(I, 15, 3, 'Licenses, SaaS fees');

  sub(I, 17, 'Organization Readiness', 3);
  val(I, 18, 1, 'Change Readiness (1-5)'); val(I, 18, 2, formData.changeReadiness || 3, '0', inputFill); note(I, 18, 3, '1=Low, 5=Champion');
  val(I, 19, 1, 'Data Readiness (1-5)'); val(I, 19, 2, formData.dataReadiness || 3, '0', inputFill); note(I, 19, 3, '1=Messy, 5=Governed');
  val(I, 20, 1, 'Executive Sponsor?'); val(I, 20, 2, formData.execSponsor === false ? 'No' : 'Yes', null, inputFill); note(I, 20, 3, 'Yes or No');

  sub(I, 22, 'AI Investment', 3);
  val(I, 23, 1, 'Implementation Budget'); val(I, 23, 2, formData.implementationBudget || 100000, DOL, inputFill);
  val(I, 24, 1, 'Expected Timeline (months)'); val(I, 24, 2, formData.expectedTimeline || 4.5, '0.0', inputFill);
  val(I, 25, 1, 'Ongoing Annual Cost'); val(I, 25, 2, formData.ongoingAnnualCost || 25000, DOL, inputFill);
  val(I, 26, 1, 'Vendors to Replace'); val(I, 26, 2, formData.vendorsReplaced || 0, '0', inputFill);
  val(I, 27, 1, 'Vendor Termination Cost'); val(I, 27, 2, formData.vendorTerminationCost || 0, DOL, inputFill);

  sub(I, 29, 'Advanced Value Modeling', 3);
  val(I, 30, 1, 'Cash Realization %'); val(I, 30, 2, formData.cashRealizationPct ?? 0.40, PCT, inputFill); note(I, 30, 3, '% of efficiency gains as cash');
  val(I, 31, 1, 'Annual Revenue'); val(I, 31, 2, formData.annualRevenue || 0, DOL, inputFill); note(I, 31, 3, 'For revenue acceleration');
  val(I, 32, 1, 'Contribution Margin'); val(I, 32, 2, formData.contributionMargin ?? 0.30, PCT, inputFill); note(I, 32, 3, 'Gross margin on revenue');
  val(I, 33, 1, 'Include Capacity in NPV?'); val(I, 33, 2, formData.includeCapacityValue ? 'Yes' : 'No', null, inputFill);
  val(I, 34, 1, 'Include Risk Reduction in NPV?'); val(I, 34, 2, formData.includeRiskReduction ? 'Yes' : 'No', null, inputFill);
  val(I, 35, 1, 'Include Rev Acceleration in NPV?'); val(I, 35, 2, formData.includeRevenueAcceleration ? 'Yes' : 'No', null, inputFill);

  // Data validation dropdowns
  I.getRow(4).getCell(2).dataValidation = { type: 'list', formulae: ['Lookups!$A$3:$A$12'] };
  I.getRow(5).getCell(2).dataValidation = { type: 'list', formulae: ['Lookups!$A$37:$A$41'] };
  I.getRow(6).getCell(2).dataValidation = { type: 'list', formulae: ['Lookups!$A$45:$A$52'] };
  I.getRow(7).getCell(2).dataValidation = { type: 'list', formulae: ['Lookups!$A$67:$A$79'] };
  I.getRow(10).getCell(2).dataValidation = { type: 'list', formulae: ['Lookups!$A$56:$A$63'] };
  I.getRow(18).getCell(2).dataValidation = { type: 'list', formulae: ['"1,2,3,4,5"'] };
  I.getRow(19).getCell(2).dataValidation = { type: 'list', formulae: ['"1,2,3,4,5"'] };
  I.getRow(20).getCell(2).dataValidation = { type: 'list', formulae: ['"Yes,No"'] };
  I.getRow(33).getCell(2).dataValidation = { type: 'list', formulae: ['"Yes,No"'] };
  I.getRow(34).getCell(2).dataValidation = { type: 'list', formulae: ['"Yes,No"'] };
  I.getRow(35).getCell(2).dataValidation = { type: 'list', formulae: ['"Yes,No"'] };

  val(I, 37, 1, 'Blue cells are editable inputs. Change any value to recalculate the entire model.', null, inputFill);
  I.mergeCells(37, 1, 37, 3);
  I.getRow(37).getCell(1).font = { ...fontBold, color: { argb: `FF${NAVY}` } };
  printSetup(I);

  // ===================================================================
  // TAB 2: KEY FORMULAS — Essential calculation chain (green font)
  // ===================================================================
  cols(KF, [35, 22, 50]);
  hdr(KF, 1, 'KEY FORMULAS — Calculation Chain', 3);
  colorLegend(KF, 2);

  // --- Industry & Readiness (rows 3-9) ---
  sub(KF, 3, 'Industry & Readiness', 3);
  val(KF, 4, 1, 'Automation Potential');
  fml(KF, 4, 2, 'INDEX(Lookups!B3:I12,MATCH(Inputs!B4,Lookups!A3:A12,0),MATCH(Inputs!B10,Lookups!B2:I2,0))', PCT);
  note(KF, 4, 3, 'INDEX/MATCH: Industry x Process Type');
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
  fml(KF, 18, 2, 'ROUND(Inputs!B11*B4*B6,0)', '0');
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
  fml(KF, 24, 2, 'VLOOKUP(Inputs!B6,Lookups!A45:B52,2,FALSE)', DOL);
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
  fml(KF, 47, 2, '(Inputs!B11*Inputs!B12*4.33*VLOOKUP(Inputs!B10,Lookups!A56:C63,3,FALSE)/1000)*VLOOKUP(Inputs!B10,Lookups!A56:B63,2,FALSE)*12', DOL);
  val(KF, 48, 1, 'License + Retraining');
  fml(KF, 48, 2, 'VLOOKUP(Inputs!B5,Lookups!A37:F41,6,FALSE)+B42*Lookups!B88', DOL);
  val(KF, 49, 1, 'Compliance + Insurance');
  fml(KF, 49, 2, 'VLOOKUP(Inputs!B5,Lookups!A37:I41,9,FALSE)+VLOOKUP(Inputs!B5,Lookups!A37:J41,10,FALSE)', DOL);
  val(KF, 50, 1, 'Computed Ongoing');
  fml(KF, 50, 2, 'B46+B47+B48+B49', DOL);
  val(KF, 51, 1, 'Base Ongoing Cost');
  fmlBold(KF, 51, 2, 'MAX(Inputs!B25,B50)', DOL, calcFill);

  // --- Annual Savings (rows 53-61) ---
  sub(KF, 53, 'Annual Savings', 3);
  val(KF, 54, 1, 'Headcount Savings (Risk-Adj)');
  fml(KF, 54, 2, 'B20*Inputs!B13*B9', DOL);
  val(KF, 55, 1, 'Efficiency Savings (Risk-Adj)');
  fml(KF, 55, 2, 'MAX(0,(B13*B4)-B20*Inputs!B13)*B9', DOL);
  val(KF, 56, 1, 'Error Reduction (Risk-Adj)');
  fml(KF, 56, 2, 'B14*B4*B9', DOL);
  val(KF, 57, 1, 'Tool Replacement (Risk-Adj)');
  fml(KF, 57, 2, 'Inputs!B15*VLOOKUP(Inputs!B10,Lookups!A56:D63,4,FALSE)*B9', DOL);
  val(KF, 58, 1, 'Enhancement Savings (RA)');
  fml(KF, 58, 2, 'B55+B56+B57', DOL);
  note(KF, 58, 3, 'Efficiency + Error + Tool');
  val(KF, 59, 1, 'Total Risk-Adj Savings');
  fmlBold(KF, 59, 2, 'B54+B58', DOL, calcFill);
  val(KF, 60, 1, 'Net Annual Benefit');
  fmlBold(KF, 60, 2, 'B59-B51', DOL, calcFill);
  val(KF, 61, 1, 'Gross Annual Savings');
  fml(KF, 61, 2, 'B15*B4', DOL);

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
  tableHeaders(PL, 3, ['', 'Year 0', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5']);

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
    fmlBold(PL, 23, y + 2, `${c}21*${c}22`, DOL);
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
  val(PL, 27, 1, 'Net Present Value (NPV)');
  fmlBold(PL, 27, 2, 'SUM(B23:G23)', DOL);
  val(PL, 28, 1, 'IRR');
  fmlBold(PL, 28, 2, 'IFERROR(MIN(MAX(IRR(B21:G21),Lookups!B96*-1),Lookups!B96),"N/A")', PCT);
  val(PL, 29, 1, 'Payback (months)');
  fml(PL, 29, 2, 'IF(B24>=0,0,IF(C24>=0,ROUND(-B24/C21*12,0),IF(D24>=0,ROUND(12+(-C24/D21*12),0),IF(E24>=0,ROUND(24+(-D24/E21*12),0),IF(F24>=0,ROUND(36+(-E24/F21*12),0),IF(G24>=0,ROUND(48+(-F24/G21*12),0),61))))))', '0');
  val(PL, 30, 1, 'ROIC');
  fmlBold(PL, 30, 2, "(SUM(C21:G21)-'Key Formulas'!B64)/'Key Formulas'!B68", PCT);

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
  val(PL, 38, 1, 'F. ROIC = E / D');
  fmlBold(PL, 38, 2, 'IF(B36>0,B37/B36,0)', PCT);
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
  val(SE, 4, 2, 0.70, DEC); val(SE, 4, 3, 1.00, DEC); val(SE, 4, 4, 1.20, DEC);

  sub(SE, 6, 'Year-by-Year Net Cash Flows', 4);
  val(SE, 7, 1, 'Year 0');
  for (let s = 0; s < 3; s++) fml(SE, 7, s + 2, "-'Key Formulas'!B64", DOL);

  for (let y = 1; y <= 5; y++) {
    val(SE, 7 + y, 1, `Year ${y}`);
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
  printSetup(SE);

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
