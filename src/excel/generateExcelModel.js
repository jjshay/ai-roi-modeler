/**
 * AI ROI Calculator — Browser Excel Generator
 * Generates a fully formula-driven, personalized Excel model.
 * Every calculated cell uses real Excel formulas.
 * Compatible with Google Sheets.
 */
import ExcelJS from 'exceljs';

// ─── Styles ───────────────────────────────────────────────────────────
const NAVY = '1B2A4A', GOLD = 'D4A843';
const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${NAVY}` } };
const subFont = { bold: true, color: { argb: `FF${NAVY}` }, size: 10, name: 'Calibri' };
const subFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
const inputFill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F0' } }; // Blue — editable inputs
const calcFill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } }; // Green — formulas
const resultFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B2A4A' } }; // Navy — key outputs
const warnFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } };
const font10 = { name: 'Calibri', size: 10 };
const font9i = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF666666' } };
const fontBold = { name: 'Calibri', size: 10, bold: true };
const outputFont = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
const outputFont10 = { name: 'Calibri', size: 10, color: { argb: 'FFFFFFFF' } };
const PCT = '0.0%', DOL = '$#,##0', DOL2 = '$#,##0.00', NUM = '#,##0', DEC = '0.000';

// ─── Helpers ──────────────────────────────────────────────────────────
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
  cell.font = font10;
  if (fmt) cell.numFmt = fmt;
  if (fill) cell.fill = fill;
}

function fml(ws, r, c, formula, fmt, fill) {
  const cell = ws.getRow(r).getCell(c);
  cell.value = { formula };
  cell.font = fill === resultFill ? outputFont10 : font10;
  if (fmt) cell.numFmt = fmt;
  cell.fill = fill || calcFill;
}

function fmlBold(ws, r, c, formula, fmt, fill) {
  const cell = ws.getRow(r).getCell(c);
  cell.value = { formula };
  cell.font = (fill || resultFill) === resultFill ? outputFont : fontBold;
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
  row.getCell(2).font = { name: 'Calibri', size: 9, bold: true, color: { argb: `FF${NAVY}` } };
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

// ─── Data ─────────────────────────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════════════
export async function generateExcelModel(formData) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'AI ROI Calculator';
  wb.created = new Date();

  // Create all worksheets in desired tab order (Guide first)
  const G = wb.addWorksheet('Guide', { tabColor: { argb: 'FF4CAF50' } });
  const DA = wb.addWorksheet('Dashboard', { tabColor: { argb: `FF${GOLD}` } });
  const I = wb.addWorksheet('Inputs', { tabColor: { argb: `FF${GOLD}` } });
  const C = wb.addWorksheet('Calc Engine', { tabColor: { argb: 'FF2196F3' } });
  const D = wb.addWorksheet('5-Year DCF', { tabColor: { argb: `FF${NAVY}` } });
  const S = wb.addWorksheet('Scenarios', { tabColor: { argb: 'FF9C27B0' } });
  const SE = wb.addWorksheet('Sensitivity', { tabColor: { argb: 'FFFF9800' } });
  const O = wb.addWorksheet('Opportunity Cost', { tabColor: { argb: 'FFFF5722' } });
  const R = wb.addWorksheet('Revenue & Scale', { tabColor: { argb: 'FF00BCD4' } });
  const L = wb.addWorksheet('Lookups', { tabColor: { argb: 'FF9E9E9E' } });
  const SRC = wb.addWorksheet('Sources', { tabColor: { argb: 'FF607D8B' } });

  // ═══════════════════════════════════════════════════════════════════
  // TAB 9: LOOKUPS — All reference tables
  // ═══════════════════════════════════════════════════════════════════
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
  // Cell map: B82=DCFYears, B83=MaxHR, B84=Contingency, B85=CulturalRes,
  // B86=WageInfl, B87=LegacyCreep, B88=ModelRetrain, B89=RetainedRetrain, B90=TechDebt,
  // B91=AdjProduct, B92=RevRiskDisc, B93=RDQualRate, B94=FedRDRate, B95=MaxROIC,
  // B96=MaxIRR, B97=ChangeMgmt, B98=InfraCost, B99=TrainingCost, B100=PMSalaryFactor
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
  ['Customer Communication','Content Creation','Data Analysis & Reporting','Research & Intelligence']
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

  // ═══════════════════════════════════════════════════════════════════
  // TAB 2: INPUTS — Pre-filled from formData
  // ═══════════════════════════════════════════════════════════════════
  cols(I, [35, 28, 45]);
  hdr(I, 1, 'USER INPUTS', 3);
  colorLegend(I, 2);

  sub(I, 3, 'Company Context', 3);
  val(I, 4, 1, 'Industry'); val(I, 4, 2, formData.industry || 'Technology / Software', null, inputFill); note(I, 4, 3, 'Select from dropdown');
  val(I, 5, 1, 'Company Size'); val(I, 5, 2, formData.companySize || 'Mid-Market (501-5,000)', null, inputFill); note(I, 5, 3, 'Select from dropdown');
  val(I, 6, 1, 'Team Location'); val(I, 6, 2, formData.teamLocation || 'US - Major Tech Hub', null, inputFill); note(I, 6, 3, 'Select from dropdown');
  val(I, 7, 1, 'State (for R&D credit)'); val(I, 7, 2, formData.companyState || 'Other / Not Sure', null, inputFill); note(I, 7, 3, 'US only — optional');

  sub(I, 9, 'Process Details', 3);
  val(I, 10, 1, 'Process Type'); val(I, 10, 2, formData.processType || 'Document Processing', null, inputFill); note(I, 10, 3, 'Select from dropdown');
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

  // Data validation dropdowns
  I.getRow(4).getCell(2).dataValidation = { type: 'list', formulae: ['Lookups!$A$3:$A$12'] };
  I.getRow(5).getCell(2).dataValidation = { type: 'list', formulae: ['Lookups!$A$37:$A$41'] };
  I.getRow(6).getCell(2).dataValidation = { type: 'list', formulae: ['Lookups!$A$45:$A$52'] };
  I.getRow(7).getCell(2).dataValidation = { type: 'list', formulae: ['Lookups!$A$67:$A$79'] };
  I.getRow(10).getCell(2).dataValidation = { type: 'list', formulae: ['Lookups!$A$56:$A$63'] };
  I.getRow(18).getCell(2).dataValidation = { type: 'list', formulae: ['"1,2,3,4,5"'] };
  I.getRow(19).getCell(2).dataValidation = { type: 'list', formulae: ['"1,2,3,4,5"'] };
  I.getRow(20).getCell(2).dataValidation = { type: 'list', formulae: ['"Yes,No"'] };

  sub(I, 29, 'Advanced Value Modeling (V3)', 3);
  val(I, 30, 1, 'Cash Realization %'); val(I, 30, 2, formData.cashRealizationPct ?? 0.40, PCT, inputFill); note(I, 30, 3, '% of efficiency gains as cash');
  val(I, 31, 1, 'Annual Revenue'); val(I, 31, 2, formData.annualRevenue || 0, DOL, inputFill); note(I, 31, 3, 'For revenue acceleration');
  val(I, 32, 1, 'Contribution Margin'); val(I, 32, 2, formData.contributionMargin ?? 0.30, PCT, inputFill); note(I, 32, 3, 'Gross margin on revenue');
  val(I, 33, 1, 'Include Capacity in NPV?'); val(I, 33, 2, formData.includeCapacityValue ? 'Yes' : 'No', null, inputFill);
  val(I, 34, 1, 'Include Risk Reduction in NPV?'); val(I, 34, 2, formData.includeRiskReduction ? 'Yes' : 'No', null, inputFill);
  val(I, 35, 1, 'Include Rev Acceleration in NPV?'); val(I, 35, 2, formData.includeRevenueAcceleration ? 'Yes' : 'No', null, inputFill);
  I.getRow(33).getCell(2).dataValidation = { type: 'list', formulae: ['"Yes,No"'] };
  I.getRow(34).getCell(2).dataValidation = { type: 'list', formulae: ['"Yes,No"'] };
  I.getRow(35).getCell(2).dataValidation = { type: 'list', formulae: ['"Yes,No"'] };

  val(I, 37, 1, 'Blue cells are editable inputs. Change any value to recalculate the entire model.', null, inputFill);
  I.mergeCells(37, 1, 37, 3);
  I.getRow(37).getCell(1).font = { ...fontBold, color: { argb: `FF${NAVY}` } };

  // ═══════════════════════════════════════════════════════════════════
  // TAB 3: CALC ENGINE — Every intermediate calculation as a formula
  // ═══════════════════════════════════════════════════════════════════
  cols(C, [35, 22, 50]);
  hdr(C, 1, 'CALCULATION ENGINE — All formulas, no hardcoded values', 3);
  colorLegend(C, 2);

  // Industry Benchmarks (R3-R7)
  sub(C, 3, 'Industry Benchmarks', 3);
  val(C, 4, 1, 'Automation Potential');
  fml(C, 4, 2, 'INDEX(Lookups!B3:I12,MATCH(Inputs!B4,Lookups!A3:A12,0),MATCH(Inputs!B10,Lookups!B2:I2,0))', PCT);
  note(C, 4, 3, 'INDEX/MATCH: Industry x Process Type');
  val(C, 5, 1, 'Industry Success Rate'); fml(C, 5, 2, 'VLOOKUP(Inputs!B4,Lookups!A16:B25,2,FALSE)', PCT);
  val(C, 6, 1, 'Competitive Penalty Rate'); fml(C, 6, 2, 'VLOOKUP(Inputs!B4,Lookups!A16:C25,3,FALSE)', PCT);
  val(C, 7, 1, 'Compliance Risk Rate'); fml(C, 7, 2, 'VLOOKUP(Inputs!B4,Lookups!A16:D25,4,FALSE)', PCT);

  // Org Readiness (R9-R13)
  sub(C, 9, 'Organizational Readiness', 3);
  val(C, 10, 1, 'Adoption Rate'); fml(C, 10, 2, 'VLOOKUP(Inputs!B18,Lookups!A29:B33,2,FALSE)', PCT);
  val(C, 11, 1, 'Sponsor Adjustment'); fml(C, 11, 2, 'IF(Inputs!B20="Yes",1,0.85)', DEC);
  val(C, 12, 1, 'Org Readiness'); fml(C, 12, 2, 'B10*B11', DEC); note(C, 12, 3, 'Adoption x Sponsor');
  val(C, 13, 1, 'Risk Multiplier'); fml(C, 13, 2, '(B12+B5)/2', PCT); note(C, 13, 3, '(OrgReadiness + IndustrySuccess) / 2');

  // Discount & Timeline (R15-R21)
  sub(C, 15, 'Discount Rate & Timeline', 3);
  val(C, 16, 1, 'Discount Rate'); fml(C, 16, 2, 'VLOOKUP(Inputs!B5,Lookups!A37:C41,3,FALSE)', PCT);
  val(C, 17, 1, 'Data Timeline Mult'); fml(C, 17, 2, 'VLOOKUP(Inputs!B19,Lookups!A29:C33,3,FALSE)', DEC);
  val(C, 18, 1, 'Size Multiplier'); fml(C, 18, 2, 'VLOOKUP(Inputs!B5,Lookups!A37:B41,2,FALSE)', DEC);
  val(C, 19, 1, 'Sponsor Time Mult'); fml(C, 19, 2, 'IF(Inputs!B20="Yes",1,1.25)', DEC);
  val(C, 20, 1, 'Adjusted Timeline (mo)'); fml(C, 20, 2, 'CEILING(Inputs!B24*B17*B18*B19,1)', '0');
  val(C, 21, 1, 'Impl Timeline (years)'); fml(C, 21, 2, 'B20/12', DEC);

  // Current State (R23-R29)
  sub(C, 23, 'Current State', 3);
  val(C, 24, 1, 'Hourly Rate'); fml(C, 24, 2, 'Inputs!B13/2080', DOL2);
  val(C, 25, 1, 'Annual Labor Cost'); fml(C, 25, 2, 'Inputs!B11*Inputs!B13', DOL);
  val(C, 26, 1, 'Weekly Hours (team)'); fml(C, 26, 2, 'Inputs!B11*Inputs!B12', NUM);
  val(C, 27, 1, 'Annual Hours (team)'); fml(C, 27, 2, 'B26*52', NUM);
  val(C, 28, 1, 'Annual Rework Cost'); fml(C, 28, 2, 'B25*Inputs!B14', DOL);
  val(C, 29, 1, 'Total Current Cost'); fml(C, 29, 2, 'B25+B28+Inputs!B15', DOL); note(C, 29, 3, 'Labor + Rework + Tools');

  // FTE Displacement (R31-R35)
  sub(C, 31, 'FTE Displacement', 3);
  val(C, 32, 1, 'Raw Displaced FTEs'); fml(C, 32, 2, 'ROUND(Inputs!B11*B4*B10,0)', '0');
  val(C, 33, 1, 'Max Displaced (75%)'); fml(C, 33, 2, 'FLOOR(Inputs!B11*Lookups!B83,1)', '0');
  val(C, 34, 1, 'Displaced FTEs'); fml(C, 34, 2, 'MIN(B32,B33)', '0');
  val(C, 35, 1, 'Retained FTEs'); fml(C, 35, 2, 'Inputs!B11-B34', '0');

  // AI Implementation Sizing (R37-R56)
  sub(C, 37, 'AI Implementation Sizing', 3);
  val(C, 38, 1, 'AI Team Salary'); fml(C, 38, 2, 'VLOOKUP(Inputs!B6,Lookups!A45:B52,2,FALSE)', DOL);
  val(C, 39, 1, 'Scope Min Engineers'); fml(C, 39, 2, 'MAX(1,CEILING(Inputs!B11/12,1))', '0');
  val(C, 40, 1, 'Timeline Pressure'); fml(C, 40, 2, 'IF(Inputs!B24<=3,1.5,IF(Inputs!B24<=6,1.2,1))', DEC);
  val(C, 41, 1, 'Data Headcount Mult'); fml(C, 41, 2, 'IF(Inputs!B19<=2,1.3,IF(Inputs!B19=3,1.1,1))', DEC);
  val(C, 42, 1, 'Max Team'); fml(C, 42, 2, 'VLOOKUP(Inputs!B5,Lookups!A37:D41,4,FALSE)', '0');
  val(C, 43, 1, 'Raw Engineers'); fml(C, 43, 2, 'CEILING(B39*B40*B41,1)', '0');
  val(C, 44, 1, 'Impl Engineers'); fml(C, 44, 2, 'MIN(B43,B42)', '0');
  val(C, 45, 1, 'Impl PMs'); fml(C, 45, 2, 'MAX(0.5,CEILING(B44/5,1))', DEC);

  sub(C, 47, 'Implementation Cost Breakdown', 3);
  val(C, 48, 1, 'Engineering Cost'); fml(C, 48, 2, 'B44*B38*B21', DOL); note(C, 48, 3, 'Engineers x Salary x Timeline(yrs)');
  val(C, 49, 1, 'PM Cost'); fml(C, 49, 2, 'B45*(B38*Lookups!B100)*B21', DOL);
  val(C, 50, 1, 'Infrastructure Cost'); fml(C, 50, 2, '(B48+B49)*Lookups!B98', DOL);
  val(C, 51, 1, 'Training Cost'); fml(C, 51, 2, '(B48+B49)*Lookups!B99', DOL);
  val(C, 52, 1, 'Computed Impl Cost'); fmlBold(C, 52, 2, 'B48+B49+B50+B51', DOL);
  val(C, 53, 1, 'Data Cost Mult'); fml(C, 53, 2, 'VLOOKUP(Inputs!B19,Lookups!A29:D33,4,FALSE)', DEC);
  val(C, 54, 1, 'User Adjusted Budget'); fml(C, 54, 2, 'Inputs!B23*B53', DOL);
  val(C, 55, 1, 'Realistic Impl Cost'); fmlBold(C, 55, 2, 'MAX(B54,B52)', DOL);
  val(C, 56, 1, 'Budget Gap'); fml(C, 56, 2, 'B52-B54', DOL);

  // Ongoing Costs (R58-R73)
  sub(C, 58, 'Ongoing Annual AI Costs', 3);
  val(C, 59, 1, 'Ongoing AI Headcount'); fml(C, 59, 2, 'MAX(0.5,ROUND(B44*0.25*2,0)/2)', DEC);
  val(C, 60, 1, 'Ongoing AI Labor'); fml(C, 60, 2, 'B59*B38', DOL);
  val(C, 61, 1, 'Requests/Hour'); fml(C, 61, 2, 'VLOOKUP(Inputs!B10,Lookups!A56:C63,3,FALSE)', '0');
  val(C, 62, 1, 'Monthly API Volume'); fml(C, 62, 2, 'Inputs!B11*Inputs!B12*4.33*B61', NUM);
  val(C, 63, 1, 'API Cost/1K'); fml(C, 63, 2, 'VLOOKUP(Inputs!B10,Lookups!A56:B63,2,FALSE)', DOL);
  val(C, 64, 1, 'Annual API Cost'); fml(C, 64, 2, '(B62/1000)*B63*12', DOL);
  val(C, 65, 1, 'Annual License'); fml(C, 65, 2, 'VLOOKUP(Inputs!B5,Lookups!A37:F41,6,FALSE)', DOL);
  val(C, 66, 1, 'Adjacent Products'); fml(C, 66, 2, 'B65*Lookups!B91', DOL);
  val(C, 67, 1, 'Model Retraining'); fml(C, 67, 2, 'B55*Lookups!B88', DOL);
  val(C, 68, 1, 'Annual Compliance'); fml(C, 68, 2, 'VLOOKUP(Inputs!B5,Lookups!A37:I41,9,FALSE)', DOL);
  val(C, 69, 1, 'Retained Retraining'); fml(C, 69, 2, 'B35*Inputs!B13*Lookups!B89', DOL);
  val(C, 70, 1, 'Tech Debt'); fml(C, 70, 2, 'B55*Lookups!B90', DOL);
  val(C, 71, 1, 'Cyber Insurance'); fml(C, 71, 2, 'VLOOKUP(Inputs!B5,Lookups!A37:J41,10,FALSE)', DOL);
  val(C, 72, 1, 'Computed Ongoing'); fmlBold(C, 72, 2, 'B60+B64+B65+B66+B67+B68+B69+B70+B71', DOL);
  val(C, 73, 1, 'Base Ongoing Cost'); fmlBold(C, 73, 2, 'MAX(Inputs!B25,B72)', DOL);

  // One-Time & Hidden Costs (R75-R88)
  sub(C, 75, 'One-Time Costs', 3);
  val(C, 76, 1, 'Legal & Compliance'); fml(C, 76, 2, 'VLOOKUP(Inputs!B5,Lookups!A37:G41,7,FALSE)', DOL);
  val(C, 77, 1, 'Security Audit'); fml(C, 77, 2, 'VLOOKUP(Inputs!B5,Lookups!A37:H41,8,FALSE)', DOL);
  val(C, 78, 1, 'Contingency'); fml(C, 78, 2, 'B55*Lookups!B84', DOL);
  val(C, 79, 1, 'Vendor Termination'); fml(C, 79, 2, 'Inputs!B27', DOL);
  val(C, 80, 1, 'Total One-Time'); fmlBold(C, 80, 2, 'SUM(B76:B79)', DOL);

  sub(C, 82, 'Hidden Costs', 3);
  val(C, 83, 1, 'Change Management'); fml(C, 83, 2, 'B55*Lookups!B97', DOL);
  val(C, 84, 1, 'Cultural Resistance'); fml(C, 84, 2, 'B55*Lookups!B85', DOL);
  val(C, 85, 1, 'Data Cleanup'); fml(C, 85, 2, 'B55*IF(Inputs!B19<=2,0.25,IF(Inputs!B19=3,0.1,0))', DOL);
  val(C, 86, 1, 'Integration Testing'); fml(C, 86, 2, 'B55*0.1', DOL);
  val(C, 87, 1, 'Productivity Dip'); fml(C, 87, 2, '(B25/12)*3*0.25', DOL); note(C, 87, 3, '3 months at 25% dip');
  val(C, 88, 1, 'Total Hidden'); fmlBold(C, 88, 2, 'SUM(B83:B87)', DOL);

  // Investment Summary (R90-R95)
  sub(C, 90, 'Investment Summary', 3);
  val(C, 91, 1, 'Upfront Investment'); fmlBold(C, 91, 2, 'B55+B88+B80', DOL); note(C, 91, 3, 'Impl + Hidden + OneTime');
  val(C, 92, 1, 'Separation Multiplier'); fml(C, 92, 2, 'VLOOKUP(Inputs!B5,Lookups!A37:E41,5,FALSE)', DEC);
  val(C, 93, 1, 'Separation Cost/FTE'); fml(C, 93, 2, 'Inputs!B13*B92', DOL);
  val(C, 94, 1, 'Total Separation Cost'); fml(C, 94, 2, 'B34*B93', DOL);
  val(C, 95, 1, 'Total Investment'); fmlBold(C, 95, 2, 'B91+B94', DOL); note(C, 95, 3, 'Upfront + Separation');

  // Value Breakdown (R97-R114)
  sub(C, 97, 'Value Creation Breakdown', 3);
  val(C, 98, 1, 'Headcount (Gross)'); fml(C, 98, 2, 'B34*Inputs!B13', DOL);
  val(C, 99, 1, 'Headcount (Risk-Adj)'); fml(C, 99, 2, 'B98*B13', DOL);
  val(C, 100, 1, 'Efficiency (Gross)'); fml(C, 100, 2, 'MAX(0,(B25*B4)-B98)', DOL);
  val(C, 101, 1, 'Efficiency (Risk-Adj)'); fml(C, 101, 2, 'B100*B13', DOL);
  val(C, 102, 1, 'Error Reduction (Gross)'); fml(C, 102, 2, 'B28*B4', DOL);
  val(C, 103, 1, 'Error Reduction (Risk-Adj)'); fml(C, 103, 2, 'B102*B13', DOL);
  val(C, 104, 1, 'Tool Replace Rate'); fml(C, 104, 2, 'VLOOKUP(Inputs!B10,Lookups!A56:D63,4,FALSE)', PCT);
  val(C, 105, 1, 'Tool Replace (Gross)'); fml(C, 105, 2, 'Inputs!B15*B104', DOL);
  val(C, 106, 1, 'Tool Replace (Risk-Adj)'); fml(C, 106, 2, 'B105*B13', DOL);
  val(C, 107, 1, 'Total Gross Savings'); fmlBold(C, 107, 2, 'B98+B100+B102+B105', DOL);
  val(C, 108, 1, 'Total Risk-Adj Savings'); fmlBold(C, 108, 2, 'B99+B101+B103+B106', DOL);
  val(C, 109, 1, 'Enhancement (Gross)'); fml(C, 109, 2, 'B100+B102+B105', DOL); note(C, 109, 3, 'Efficiency + Error + Tool');
  val(C, 110, 1, 'Enhancement (Risk-Adj)'); fml(C, 110, 2, 'B109*B13', DOL);
  val(C, 111, 1, 'Gross Annual Savings'); fml(C, 111, 2, 'B29*B4', DOL);
  val(C, 112, 1, 'Risk-Adj Annual Savings'); fml(C, 112, 2, 'B111*B13', DOL);
  val(C, 113, 1, 'Net Annual Savings'); fmlBold(C, 113, 2, 'B112-B73', DOL);
  val(C, 114, 1, 'Per-Employee Gain'); fml(C, 114, 2, 'IF(Inputs!B11>0,B110/Inputs!B11,0)', DOL);

  // Phased Value Timeline (R116-R120)
  sub(C, 116, 'Phased Value Timeline', 3);
  val(C, 117, 1, 'Foundation (0-3 mo)'); fml(C, 117, 2, 'B106*0.25', DOL); note(C, 117, 3, 'Tool replacement x 25%');
  val(C, 118, 1, 'Quick Wins (3-6 mo)'); fml(C, 118, 2, '(B101+B103)*0.5', DOL); note(C, 118, 3, '(Efficiency + Error) x 50%');
  val(C, 119, 1, 'Optimization (6-12 mo)'); fml(C, 119, 2, '(B101+B103+B106)*0.75', DOL); note(C, 119, 3, '(Eff + Err + Tool) x 75%');
  val(C, 120, 1, 'Scale (12-24 mo)'); fml(C, 120, 2, 'B108', DOL); note(C, 120, 3, 'All risk-adj savings x 100%');

  // Threshold / Breakeven (R122-R129)
  sub(C, 122, 'Threshold / Breakeven Analysis', 3);
  val(C, 123, 1, 'PV Factor');
  fml(C, 123, 2, 'Lookups!D104/(1+B16)^1+Lookups!D105/(1+B16)^2+Lookups!D106/(1+B16)^3+Lookups!D107/(1+B16)^4+Lookups!D108/(1+B16)^5', DEC);
  val(C, 124, 1, 'Breakeven Risk Mult'); fml(C, 124, 2, 'IF(B111>0,((B91/B123)+B73)/B111,0)', PCT);
  note(C, 124, 3, 'Risk level that makes NPV = 0');
  val(C, 125, 1, 'Current Risk Mult'); fml(C, 125, 2, 'B13', PCT);
  val(C, 126, 1, 'Risk Margin'); fml(C, 126, 2, 'B125-B124', PCT);
  val(C, 127, 1, 'Viable?'); fml(C, 127, 2, 'IF(B125>B124,"Yes","No")');
  val(C, 128, 1, 'Max Tolerable Ongoing'); fml(C, 128, 2, 'IF(B123>0,B112-(B91/B123),0)', DOL);
  val(C, 129, 1, 'Ongoing Cost Margin'); fml(C, 129, 2, 'B128-B73', DOL);

  // Vendor Lock-in (R131-R136)
  sub(C, 131, 'Vendor Lock-in Analysis', 3);
  val(C, 132, 1, 'Switching Rate'); fml(C, 132, 2, 'VLOOKUP(Inputs!B5,Lookups!A37:K41,11,FALSE)', PCT);
  val(C, 133, 1, 'Switching Cost'); fml(C, 133, 2, 'B55*B132', DOL);
  val(C, 134, 1, 'Lock-in Level');
  fml(C, 134, 2, 'IF(AND(B55>500000,Inputs!B10="Workflow Automation"),"High",IF(B55>250000,"Medium","Low"))');
  val(C, 135, 1, 'Year-5 Ongoing'); fml(C, 135, 2, 'B73*Lookups!F108', DOL);
  val(C, 136, 1, 'Total 5-Year Ongoing');
  fml(C, 136, 2, 'B73*Lookups!F104+B73*Lookups!F105+B73*Lookups!F106+B73*Lookups!F107+B73*Lookups!F108', DOL);

  // Peer Comparison (R138-R145)
  sub(C, 138, 'Industry Peer Comparison', 3);
  val(C, 139, 1, 'Peer Lookup Key'); fml(C, 139, 2, 'Inputs!B4&"|"&Inputs!B5');
  val(C, 140, 1, 'Peer Median ROIC'); fml(C, 140, 2, 'VLOOKUP(B139,Lookups!A126:D175,2,FALSE)', PCT);
  val(C, 141, 1, 'Peer P25'); fml(C, 141, 2, 'VLOOKUP(B139,Lookups!A126:D175,3,FALSE)', PCT);
  val(C, 142, 1, 'Peer P75'); fml(C, 142, 2, 'VLOOKUP(B139,Lookups!A126:D175,4,FALSE)', PCT);
  val(C, 143, 1, 'User ROIC'); fml(C, 143, 2, "'5-Year DCF'!B30", PCT);
  val(C, 144, 1, 'Percentile Rank');
  fml(C, 144, 2, 'ROUND(IF(B143<=B141,MAX(5,B143/B141*25),IF(B143<=B140,25+(B143-B141)/(B140-B141)*25,IF(B143<=B142,50+(B143-B140)/(B142-B140)*25,MIN(95,75+(B143-B142)/(B142*0.5)*20)))),0)', '0');
  val(C, 145, 1, 'vs Median'); fml(C, 145, 2, 'B143-B140', PCT);

  // Separation Breakdown (R147-R153)
  sub(C, 147, 'Separation Cost Breakdown', 3);
  for (let i = 0; i < 5; i++) {
    fml(C, 148 + i, 1, `Lookups!A${118 + i}`);
    fml(C, 148 + i, 2, `B94*Lookups!B${118 + i}`, DOL);
  }

  // Confidence Level (R155)
  sub(C, 155, 'Confidence Assessment', 3);
  val(C, 156, 1, 'Confidence Level');
  fml(C, 156, 2, 'IF(AND((Inputs!B18+Inputs!B19)/2>=4,Inputs!B20="Yes"),"High",IF((Inputs!B18+Inputs!B19)/2>=3,"Moderate","Conservative"))');

  // V3: Value Pathways (R158-R180)
  sub(C, 158, 'V3: Cost Efficiency Pathway', 3);
  val(C, 159, 1, 'Cash Realization %'); fml(C, 159, 2, 'Inputs!B30', PCT);
  val(C, 160, 1, 'Annual Cash Realized'); fml(C, 160, 2, 'B112*B159', DOL);
  val(C, 161, 1, 'Annual Capacity Only'); fml(C, 161, 2, 'B112*(1-B159)', DOL);

  sub(C, 163, 'V3: Capacity Creation Pathway', 3);
  val(C, 164, 1, 'Hours Freed (annual)'); fml(C, 164, 2, 'B27*B4*B13', NUM);
  val(C, 165, 1, 'FTE Equivalent'); fml(C, 165, 2, 'B164/2080', DEC);
  val(C, 166, 1, 'Capacity Value'); fml(C, 166, 2, 'B164*B24', DOL);
  val(C, 167, 1, 'Revenue Acceleration');
  fml(C, 167, 2, 'IF(Inputs!B31>0,Inputs!B31*Inputs!B32*2/12*B13,0)', DOL);
  note(C, 167, 3, 'Revenue x Margin x CycleReduction/12 x RiskMult');
  val(C, 168, 1, 'Total Capacity Value'); fmlBold(C, 168, 2, 'B166+B167', DOL);

  sub(C, 170, 'V3: Risk Reduction Pathway', 3);
  val(C, 171, 1, 'Reg Event Probability'); fml(C, 171, 2, '0.05', PCT);
  note(C, 171, 3, 'Industry default — see Lookups');
  val(C, 172, 1, 'Avg Event Impact'); fml(C, 172, 2, '20000000', DOL);
  val(C, 173, 1, 'AI Risk Reduction %'); fml(C, 173, 2, '0.30', PCT);
  val(C, 174, 1, 'Expected Loss Before'); fml(C, 174, 2, 'B171*B172', DOL);
  val(C, 175, 1, 'Expected Loss After'); fml(C, 175, 2, 'B171*(1-B173)*B172', DOL);
  val(C, 176, 1, 'Annual Risk Value'); fmlBold(C, 176, 2, 'B174-B175', DOL);

  sub(C, 178, 'V3: Capital Efficiency', 3);
  val(C, 179, 1, 'WACC'); fml(C, 179, 2, 'B16', PCT); note(C, 179, 3, 'Same as discount rate');
  val(C, 180, 1, 'Avg Annual Net Return'); fml(C, 180, 2, "SUM('5-Year DCF'!C21:G21)/5", DOL);
  val(C, 181, 1, 'NOPAT'); fml(C, 181, 2, 'B180*(1-0.21)', DOL); note(C, 181, 3, 'After 21% tax');
  val(C, 182, 1, 'EVA'); fmlBold(C, 182, 2, 'B181-(B95*B179)', DOL); note(C, 182, 3, 'NOPAT - (Capital x WACC)');
  val(C, 183, 1, 'Cash-on-Cash (Yr 3)');
  fml(C, 183, 2, "IF(B95>0,'5-Year DCF'!E21/B95,0)", PCT);
  note(C, 183, 3, 'Stabilized year return');
  val(C, 184, 1, 'ROIC vs WACC Spread'); fml(C, 184, 2, "'5-Year DCF'!B30-B179", PCT);
  val(C, 185, 1, 'Creates Value?'); fml(C, 185, 2, "IF(B184>0,\"Yes\",\"No\")");

  sub(C, 187, 'V3: Gate Structure', 3);
  val(C, 188, 1, 'Gate 1 — Pilot (0-6mo)'); fml(C, 188, 2, 'B95*0.15', DOL); note(C, 188, 3, '15% of total investment');
  val(C, 189, 1, 'Gate 2 — Controlled (6-12mo)'); fml(C, 189, 2, 'B95*0.35', DOL); note(C, 189, 3, '35% of total investment');
  val(C, 190, 1, 'Gate 3 — Enterprise (12-36mo)'); fml(C, 190, 2, 'B95*0.50', DOL); note(C, 190, 3, '50% of total investment');
  val(C, 191, 1, 'Gate 1 Cumulative'); fml(C, 191, 2, 'B188', DOL);
  val(C, 192, 1, 'Gate 2 Cumulative'); fml(C, 192, 2, 'B191+B189', DOL);
  val(C, 193, 1, 'Gate 3 Cumulative'); fml(C, 193, 2, 'B192+B190', DOL);

  // ═══════════════════════════════════════════════════════════════════
  // TAB 4: 5-YEAR DCF (Base Case)
  // ═══════════════════════════════════════════════════════════════════
  cols(D, [32, 18, 18, 18, 18, 18, 18, 40]);
  hdr(D, 1, '5-YEAR DCF MODEL (BASE CASE)', 8);
  colorLegend(D, 2);
  tableHeaders(D, 3, ['', 'Year 0', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Formula']);

  sub(D, 4, 'PARAMETERS', 8);
  val(D, 5, 1, 'Adoption Ramp');
  for (let y = 1; y <= 5; y++) fml(D, 5, y + 2, `Lookups!D${103 + y}`, PCT);
  val(D, 6, 1, 'Wage Growth Factor');
  for (let y = 1; y <= 5; y++) fml(D, 6, y + 2, `(1+Lookups!B86)^${y - 1}`, DEC);
  val(D, 7, 1, 'HR Reduction (year)');
  for (let y = 1; y <= 5; y++) fml(D, 7, y + 2, `Lookups!B${103 + y}`, PCT);
  val(D, 8, 1, 'Cumulative HR Reduction');
  for (let y = 1; y <= 5; y++) fml(D, 8, y + 2, `Lookups!C${103 + y}`, PCT);
  val(D, 9, 1, 'Cost Escalation Factor');
  for (let y = 1; y <= 5; y++) fml(D, 9, y + 2, `Lookups!F${103 + y}`, DEC);

  sub(D, 11, 'CASH INFLOWS', 8);
  val(D, 12, 1, 'Enhancement Savings'); note(D, 12, 8, 'EnhancementRA x AdoptRamp x WageGrowth');
  for (let y = 1; y <= 5; y++) {
    const c = String.fromCharCode(66 + y);
    fml(D, 12, y + 2, `'Calc Engine'!B110*${c}5*${c}6`, DOL);
  }
  val(D, 13, 1, 'Headcount Savings'); note(D, 13, 8, 'HeadcountRA x CumHR x WageGrowth');
  for (let y = 1; y <= 5; y++) {
    const c = String.fromCharCode(66 + y);
    fml(D, 13, y + 2, `'Calc Engine'!B99*${c}8*${c}6`, DOL);
  }
  val(D, 14, 1, 'GROSS SAVINGS');
  for (let y = 1; y <= 5; y++) {
    const c = String.fromCharCode(66 + y);
    fmlBold(D, 14, y + 2, `${c}12+${c}13`, DOL);
  }

  sub(D, 16, 'CASH OUTFLOWS', 8);
  val(D, 17, 1, 'Separation Cost'); note(D, 17, 8, 'TotalSep x HR Schedule');
  for (let y = 1; y <= 5; y++) {
    const c = String.fromCharCode(66 + y);
    fml(D, 17, y + 2, `'Calc Engine'!B94*${c}7`, DOL, warnFill);
  }
  val(D, 18, 1, 'Ongoing AI Cost'); note(D, 18, 8, 'BaseOngoing x CumEscalation');
  for (let y = 1; y <= 5; y++) {
    const c = String.fromCharCode(66 + y);
    fml(D, 18, y + 2, `'Calc Engine'!B73*${c}9`, DOL, warnFill);
  }

  sub(D, 20, 'NET CASH FLOWS', 8);
  val(D, 21, 1, 'NET CASH FLOW'); D.getRow(21).getCell(1).font = fontBold;
  fmlBold(D, 21, 2, "-'Calc Engine'!B91", DOL, warnFill);
  for (let y = 1; y <= 5; y++) {
    const c = String.fromCharCode(66 + y);
    fmlBold(D, 21, y + 2, `${c}14-${c}17-${c}18`, DOL, calcFill);
  }
  val(D, 22, 1, 'Discount Factor');
  fml(D, 22, 2, '1', '0.0000');
  for (let y = 1; y <= 5; y++) fml(D, 22, y + 2, `1/(1+'Calc Engine'!B16)^${y}`, '0.0000');
  val(D, 23, 1, 'PRESENT VALUE'); D.getRow(23).getCell(1).font = fontBold;
  for (let y = 0; y <= 5; y++) {
    const c = String.fromCharCode(66 + y);
    fmlBold(D, 23, y + 2, `${c}21*${c}22`, DOL);
  }
  val(D, 24, 1, 'CUMULATIVE');
  fml(D, 24, 2, 'B21', DOL);
  for (let y = 1; y <= 5; y++) {
    const c = String.fromCharCode(66 + y);
    const p = String.fromCharCode(65 + y);
    fml(D, 24, y + 2, `${p}24+${c}21`, DOL);
  }

  sub(D, 26, 'FINANCIAL METRICS', 8);
  val(D, 27, 1, 'Net Present Value (NPV)'); fmlBold(D, 27, 2, 'SUM(B23:G23)', DOL);
  val(D, 28, 1, 'IRR'); fmlBold(D, 28, 2, 'IFERROR(IRR(B21:G21),"N/A")', PCT);
  val(D, 29, 1, 'Payback (months)');
  fml(D, 29, 2, 'IF(B24>=0,0,IF(C24>=0,ROUND(-B24/C21*12,0),IF(D24>=0,ROUND(12+(-C24/D21*12),0),IF(E24>=0,ROUND(24+(-D24/E21*12),0),IF(F24>=0,ROUND(36+(-E24/F21*12),0),IF(G24>=0,ROUND(48+(-F24/G21*12),0),61))))))', '0');
  val(D, 30, 1, 'ROIC');
  fmlBold(D, 30, 2, "(SUM(C21:G21)-'Calc Engine'!B91)/'Calc Engine'!B95", PCT);
  note(D, 30, 3, '(TotalNetReturn - Upfront) / TotalInvestment');
  val(D, 31, 1, 'Total Net Return'); fml(D, 31, 2, 'SUM(C21:G21)', DOL);
  val(D, 32, 1, 'Total Investment'); fml(D, 32, 2, "'Calc Engine'!B95", DOL);

  // ═══════════════════════════════════════════════════════════════════
  // TAB 5: SCENARIOS
  // ═══════════════════════════════════════════════════════════════════
  cols(S, [32, 22, 22, 22]);
  hdr(S, 1, 'SCENARIO ANALYSIS', 4);
  colorLegend(S, 2);
  tableHeaders(S, 3, ['', 'Conservative', 'Base Case', 'Optimistic']);
  val(S, 4, 1, 'Scenario Multiplier');
  val(S, 4, 2, 0.70, DEC); val(S, 4, 3, 1.00, DEC); val(S, 4, 4, 1.20, DEC);

  sub(S, 6, 'Year-by-Year Net Cash Flows', 4);
  val(S, 7, 1, 'Year 0');
  for (let s = 0; s < 3; s++) fml(S, 7, s + 2, "-'Calc Engine'!B91", DOL);

  for (let y = 1; y <= 5; y++) {
    val(S, 7 + y, 1, `Year ${y}`);
    for (let s = 0; s < 3; s++) {
      const m = `$${String.fromCharCode(66 + s)}$4`;
      const f = `('Calc Engine'!$B$110*Lookups!$D$${103 + y}*${m}*(1+Lookups!$B$86)^${y - 1}` +
        `+'Calc Engine'!$B$99*Lookups!$C$${103 + y}*${m}*(1+Lookups!$B$86)^${y - 1})` +
        `-'Calc Engine'!$B$94*Lookups!$B$${103 + y}` +
        `-'Calc Engine'!$B$73*Lookups!$F$${103 + y}`;
      fml(S, 7 + y, s + 2, f, DOL);
    }
  }

  sub(S, 14, 'Key Metrics', 4);
  val(S, 15, 1, 'NPV');
  for (let s = 0; s < 3; s++) {
    const c = String.fromCharCode(66 + s);
    fml(S, 15, s + 2, `${c}7+NPV('Calc Engine'!B16,${c}8:${c}12)`, DOL,
      s === 0 ? warnFill : s === 2 ? resultFill : calcFill);
  }
  val(S, 16, 1, 'IRR');
  for (let s = 0; s < 3; s++) {
    const c = String.fromCharCode(66 + s);
    fml(S, 16, s + 2, `IFERROR(MIN(MAX(IRR(${c}7:${c}12),Lookups!B96*-1),Lookups!B96),"N/A")`, PCT,
      s === 0 ? warnFill : s === 2 ? resultFill : calcFill);
  }
  val(S, 17, 1, 'ROIC');
  for (let s = 0; s < 3; s++) {
    const c = String.fromCharCode(66 + s);
    fml(S, 17, s + 2, `MIN(MAX((SUM(${c}8:${c}12)-'Calc Engine'!B91)/'Calc Engine'!B95,Lookups!B95*-1),Lookups!B95)`, PCT,
      s === 0 ? warnFill : s === 2 ? resultFill : calcFill);
  }
  val(S, 18, 1, 'Payback (months)');
  for (let s = 0; s < 3; s++) {
    const c = String.fromCharCode(66 + s);
    const cu0 = `${c}7`, cu1 = `${c}7+${c}8`, cu2 = `${cu1}+${c}9`, cu3 = `${cu2}+${c}10`, cu4 = `${cu3}+${c}11`, cu5 = `${cu4}+${c}12`;
    fml(S, 18, s + 2,
      `IF(${cu0}>=0,0,IF(${cu1}>=0,ROUND(-${cu0}/${c}8*12,0),IF(${cu2}>=0,ROUND(12+(-${cu1})/${c}9*12,0),IF(${cu3}>=0,ROUND(24+(-${cu2})/${c}10*12,0),IF(${cu4}>=0,ROUND(36+(-${cu3})/${c}11*12,0),IF(${cu5}>=0,ROUND(48+(-${cu4})/${c}12*12,0),61))))))`,
      '0', s === 0 ? warnFill : s === 2 ? resultFill : calcFill);
  }
  val(S, 19, 1, '5-Yr Total Net');
  for (let s = 0; s < 3; s++) {
    const c = String.fromCharCode(66 + s);
    fml(S, 19, s + 2, `SUM(${c}8:${c}12)`, DOL, s === 0 ? warnFill : s === 2 ? resultFill : calcFill);
  }

  sub(S, 21, 'Probability-Weighted Expected Value', 4);
  val(S, 22, 1, 'Scenario Weight');
  val(S, 22, 2, 0.25, PCT); val(S, 22, 3, 0.50, PCT); val(S, 22, 4, 0.25, PCT);
  val(S, 23, 1, 'Expected NPV'); fmlBold(S, 23, 2, 'SUMPRODUCT(B15:D15,B22:D22)', DOL);
  val(S, 24, 1, 'Expected ROIC'); fmlBold(S, 24, 2, 'SUMPRODUCT(B17:D17,B22:D22)', PCT);

  // ═══════════════════════════════════════════════════════════════════
  // TAB 6: SENSITIVITY (NEW)
  // ═══════════════════════════════════════════════════════════════════
  cols(SE, [28, 16, 16, 16, 18, 18, 18, 18]);
  hdr(SE, 1, 'SENSITIVITY ANALYSIS — TORNADO', 8);
  colorLegend(SE, 2);

  // Helper values
  val(SE, 3, 1, 'PV Factor');
  fml(SE, 3, 2, "Lookups!D104/(1+'Calc Engine'!B16)^1+Lookups!D105/(1+'Calc Engine'!B16)^2+Lookups!D106/(1+'Calc Engine'!B16)^3+Lookups!D107/(1+'Calc Engine'!B16)^4+Lookups!D108/(1+'Calc Engine'!B16)^5", DEC);
  val(SE, 4, 1, 'Base Simplified NPV');
  fml(SE, 4, 2, "-'Calc Engine'!B91+'Calc Engine'!B113*B3", DOL);
  val(SE, 5, 1, 'Upfront Investment'); fml(SE, 5, 2, "'Calc Engine'!B91", DOL);
  val(SE, 6, 1, 'Hidden Scale Rate');
  fml(SE, 6, 2, "Lookups!B97+Lookups!B85+IF(Inputs!B19<=2,0.25,IF(Inputs!B19=3,0.1,0))+0.1", DEC);

  // Tornado summary table
  sub(SE, 8, 'NPV IMPACT BY VARIABLE', 8);
  tableHeaders(SE, 9, ['Variable', 'Base Value', 'Low', 'High', 'NPV Low', 'NPV High', 'Delta (-)', 'Delta (+)']);

  // Row mapping: summary=10-15, intermediate=19-24
  const sensVars = [
    { r: 10, ir: 19, name: 'Team Size', base: '=Inputs!B11', lo: '-20%', hi: '+20%' },
    { r: 11, ir: 20, name: 'Avg Salary', base: '=Inputs!B13', lo: '-20%', hi: '+20%' },
    { r: 12, ir: 21, name: 'Error Rate', base: '=Inputs!B14', lo: '-50%', hi: '+50%' },
    { r: 13, ir: 22, name: 'Automation Potential', base: "='Calc Engine'!B4", lo: '-15pp', hi: '+15pp' },
    { r: 14, ir: 23, name: 'Implementation Cost', base: "='Calc Engine'!B55", lo: '-20%', hi: '+50%' },
    { r: 15, ir: 24, name: 'Ongoing Cost', base: "='Calc Engine'!B73", lo: '-50%', hi: '+100%' },
  ];
  sensVars.forEach(v => {
    val(SE, v.r, 1, v.name);
    fml(SE, v.r, 2, v.base.replace('=', ''), v.name === 'Error Rate' || v.name === 'Automation Potential' ? PCT : v.name === 'Team Size' ? '0' : DOL);
    val(SE, v.r, 3, v.lo); val(SE, v.r, 4, v.hi);
    // NPV formulas differ by variable type
    if (v.name === 'Implementation Cost') {
      fml(SE, v.r, 5, `-F${v.ir}+'Calc Engine'!B113*$B$3`, DOL, warnFill);
      fml(SE, v.r, 6, `-G${v.ir}+'Calc Engine'!B113*$B$3`, DOL, resultFill);
    } else {
      fml(SE, v.r, 5, `-$B$5+D${v.ir}*$B$3`, DOL, warnFill);
      fml(SE, v.r, 6, `-$B$5+E${v.ir}*$B$3`, DOL, resultFill);
    }
    fml(SE, v.r, 7, `E${v.r}-$B$4`, DOL, warnFill);
    fml(SE, v.r, 8, `F${v.r}-$B$4`, DOL, resultFill);
  });

  // Intermediate calculations
  sub(SE, 17, 'INTERMEDIATE CALCULATIONS', 8);
  tableHeaders(SE, 18, ['Variable', 'Mod Cost Low', 'Mod Cost High', 'Mod Net Low', 'Mod Net High', 'Mod Invest Low', 'Mod Invest High', '']);

  // Team Size (row 19)
  val(SE, 19, 1, 'Team Size');
  fml(SE, 19, 2, 'ROUND(Inputs!B11*0.8,0)*Inputs!B13*(1+Inputs!B14)+Inputs!B15', DOL);
  fml(SE, 19, 3, 'ROUND(Inputs!B11*1.2,0)*Inputs!B13*(1+Inputs!B14)+Inputs!B15', DOL);
  fml(SE, 19, 4, "B19*'Calc Engine'!B4*'Calc Engine'!B13-'Calc Engine'!B73", DOL);
  fml(SE, 19, 5, "C19*'Calc Engine'!B4*'Calc Engine'!B13-'Calc Engine'!B73", DOL);

  // Avg Salary (row 20)
  val(SE, 20, 1, 'Avg Salary');
  fml(SE, 20, 2, 'Inputs!B11*(Inputs!B13*0.8)*(1+Inputs!B14)+Inputs!B15', DOL);
  fml(SE, 20, 3, 'Inputs!B11*(Inputs!B13*1.2)*(1+Inputs!B14)+Inputs!B15', DOL);
  fml(SE, 20, 4, "B20*'Calc Engine'!B4*'Calc Engine'!B13-'Calc Engine'!B73", DOL);
  fml(SE, 20, 5, "C20*'Calc Engine'!B4*'Calc Engine'!B13-'Calc Engine'!B73", DOL);

  // Error Rate (row 21)
  val(SE, 21, 1, 'Error Rate');
  fml(SE, 21, 2, 'Inputs!B11*Inputs!B13*(1+MAX(0,Inputs!B14*0.5))+Inputs!B15', DOL);
  fml(SE, 21, 3, 'Inputs!B11*Inputs!B13*(1+MIN(0.5,Inputs!B14*1.5))+Inputs!B15', DOL);
  fml(SE, 21, 4, "B21*'Calc Engine'!B4*'Calc Engine'!B13-'Calc Engine'!B73", DOL);
  fml(SE, 21, 5, "C21*'Calc Engine'!B4*'Calc Engine'!B13-'Calc Engine'!B73", DOL);

  // Automation Potential (row 22) — cost doesn't change, automation factor does
  val(SE, 22, 1, 'Automation Potential');
  fml(SE, 22, 4, "'Calc Engine'!B29*MAX(0.1,'Calc Engine'!B4-0.15)*'Calc Engine'!B13-'Calc Engine'!B73", DOL);
  fml(SE, 22, 5, "'Calc Engine'!B29*MIN(0.95,'Calc Engine'!B4+0.15)*'Calc Engine'!B13-'Calc Engine'!B73", DOL);

  // Impl Cost (row 23) — savings don't change, investment does
  val(SE, 23, 1, 'Impl Cost');
  fml(SE, 23, 6, "'Calc Engine'!B55*0.8*(1+$B$6)+'Calc Engine'!B87+'Calc Engine'!B80", DOL);
  fml(SE, 23, 7, "'Calc Engine'!B55*1.5*(1+$B$6)+'Calc Engine'!B87+'Calc Engine'!B80", DOL);

  // Ongoing Cost (row 24) — net savings change
  val(SE, 24, 1, 'Ongoing Cost');
  fml(SE, 24, 4, "'Calc Engine'!B112-'Calc Engine'!B73*0.5", DOL);
  fml(SE, 24, 5, "'Calc Engine'!B112-'Calc Engine'!B73*2", DOL);

  // Confidence Intervals (derived from scenarios + sensitivity)
  sub(SE, 26, 'CONFIDENCE INTERVALS (P25 / P50 / P75)', 8);
  tableHeaders(SE, 27, ['Metric', 'P25 (Cons)', 'P50 (Base)', 'P75 (Opt)', '', '', '', '']);
  val(SE, 28, 1, 'Min NPV (helper)');
  fml(SE, 28, 2, 'MIN(Scenarios!B15,E10,E11,E12,E13,E14,E15,F10,F11,F12,F13,F14,F15)', DOL);
  val(SE, 29, 1, 'Max NPV (helper)');
  fml(SE, 29, 2, 'MAX(Scenarios!D15,E10,E11,E12,E13,E14,E15,F10,F11,F12,F13,F14,F15)', DOL);

  val(SE, 31, 1, 'NPV');
  fml(SE, 31, 2, 'Scenarios!C15+(B28-Scenarios!C15)*0.5', DOL, warnFill);
  fml(SE, 31, 3, 'Scenarios!C15', DOL, calcFill);
  fml(SE, 31, 4, 'Scenarios!C15+(B29-Scenarios!C15)*0.5', DOL, resultFill);

  val(SE, 32, 1, 'ROIC');
  fml(SE, 32, 2, 'Scenarios!B17', PCT, warnFill);
  fml(SE, 32, 3, 'Scenarios!C17', PCT, calcFill);
  fml(SE, 32, 4, 'Scenarios!D17', PCT, resultFill);

  val(SE, 33, 1, 'Payback (months)');
  fml(SE, 33, 2, 'Scenarios!B18', '0', warnFill); note(SE, 33, 5, 'Conservative = longest');
  fml(SE, 33, 3, 'Scenarios!C18', '0', calcFill);
  fml(SE, 33, 4, 'Scenarios!D18', '0', resultFill); note(SE, 33, 6, 'Optimistic = shortest');

  // ═══════════════════════════════════════════════════════════════════
  // TAB 7: OPPORTUNITY COST
  // ═══════════════════════════════════════════════════════════════════
  cols(O, [30, 18, 18, 18, 18, 18]);
  hdr(O, 1, 'COST OF INACTION — 5-YEAR', 6);
  colorLegend(O, 2);
  tableHeaders(O, 3, ['Component', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5']);

  val(O, 4, 1, 'Forgone Savings');
  for (let y = 1; y <= 5; y++) fml(O, 4, y + 1, `'Calc Engine'!B113*Lookups!D${103 + y}`, DOL);
  val(O, 5, 1, 'Wage Inflation');
  for (let y = 1; y <= 5; y++) fml(O, 5, y + 1, `'Calc Engine'!B25*((1+Lookups!B86)^${y}-1)`, DOL);
  val(O, 6, 1, 'Legacy System Creep');
  for (let y = 1; y <= 5; y++) fml(O, 6, y + 1, `Inputs!B15*((1+Lookups!B87)^${y}-1)`, DOL);
  val(O, 7, 1, 'Competitive Penalty');
  for (let y = 1; y <= 5; y++) fml(O, 7, y + 1, `'Calc Engine'!B29*((1+'Calc Engine'!B6)^${y}-1)`, DOL);
  val(O, 8, 1, 'Compliance Risk');
  for (let y = 1; y <= 5; y++) fml(O, 8, y + 1, `'Calc Engine'!B29*((1+'Calc Engine'!B7)^${y}-1)`, DOL);

  val(O, 10, 1, 'YEAR TOTAL'); O.getRow(10).getCell(1).font = fontBold;
  for (let y = 1; y <= 5; y++) {
    const c = String.fromCharCode(65 + y);
    fmlBold(O, 10, y + 1, `SUM(${c}4:${c}8)`, DOL);
  }
  val(O, 11, 1, 'CUMULATIVE'); O.getRow(11).getCell(1).font = fontBold;
  fmlBold(O, 11, 2, 'B10', DOL);
  for (let y = 2; y <= 5; y++) {
    const c = String.fromCharCode(65 + y);
    const p = String.fromCharCode(64 + y);
    fmlBold(O, 11, y + 1, `${p}11+${c}10`, DOL);
  }

  sub(O, 13, 'Summary', 6);
  val(O, 14, 1, '12-Month Delay'); fmlBold(O, 14, 2, 'B10', DOL);
  val(O, 15, 1, '24-Month Delay'); fmlBold(O, 15, 2, 'B10+C10', DOL);
  val(O, 16, 1, '5-Year Total'); fmlBold(O, 16, 2, 'F11', DOL);

  // ═══════════════════════════════════════════════════════════════════
  // TAB 8: REVENUE & SCALE
  // ═══════════════════════════════════════════════════════════════════
  cols(R, [35, 22, 22, 22, 16]);
  hdr(R, 1, 'REVENUE ENABLEMENT (informational — NOT in NPV)', 5);
  colorLegend(R, 2);
  val(R, 3, 1, 'Revenue Proxy'); fml(R, 3, 2, "'Calc Engine'!B29*3", DOL); note(R, 3, 3, 'Process supports ~3x its cost in revenue');
  val(R, 4, 1, 'Eligible?'); fml(R, 4, 2, 'IF(COUNTIF(Lookups!A111:A114,Inputs!B10)>0,"Yes","No")');
  val(R, 5, 1, 'TTM Revenue');
  fml(R, 5, 2, "IF(B4=\"Yes\",B3*VLOOKUP(Inputs!B4,Lookups!A16:G25,5,FALSE)*Lookups!B92*'Calc Engine'!B13,0)", DOL);
  val(R, 6, 1, 'CX Revenue');
  fml(R, 6, 2, "IF(B4=\"Yes\",B3*VLOOKUP(Inputs!B4,Lookups!A16:G25,6,FALSE)*Lookups!B92*'Calc Engine'!B13,0)", DOL);
  val(R, 7, 1, 'New Capability Revenue');
  fml(R, 7, 2, "IF(B4=\"Yes\",B3*VLOOKUP(Inputs!B4,Lookups!A16:G25,7,FALSE)*Lookups!B92*'Calc Engine'!B13,0)", DOL);
  val(R, 8, 1, 'Total Annual Revenue'); fmlBold(R, 8, 2, 'B5+B6+B7', DOL);

  hdr(R, 10, 'SCALABILITY PREMIUM', 5);
  tableHeaders(R, 11, ['Volume', 'Traditional Cost', 'AI Cost', 'Savings', 'Savings %']);
  val(R, 12, 1, '2x Volume');
  fml(R, 12, 2, "'Calc Engine'!B29*2", DOL);
  fml(R, 12, 3, "'Calc Engine'!B73*1.25", DOL, resultFill);
  fml(R, 12, 4, 'B12-C12', DOL, resultFill);
  fml(R, 12, 5, 'IF(B12>0,D12/B12,0)', PCT, resultFill);
  val(R, 13, 1, '3x Volume');
  fml(R, 13, 2, "'Calc Engine'!B29*3", DOL);
  fml(R, 13, 3, "'Calc Engine'!B73*1.40", DOL, resultFill);
  fml(R, 13, 4, 'B13-C13', DOL, resultFill);
  fml(R, 13, 5, 'IF(B13>0,D13/B13,0)', PCT, resultFill);

  hdr(R, 15, 'R&D TAX CREDIT (informational)', 5);
  val(R, 16, 1, 'US-Based?'); fml(R, 16, 2, 'IF(OR(Inputs!B6="US - Major Tech Hub",Inputs!B6="US - Other"),"Yes","No")');
  val(R, 17, 1, 'Qualified Expenses'); fml(R, 17, 2, "'Calc Engine'!B55*Lookups!B93", DOL);
  val(R, 18, 1, 'Federal Credit (6.5%)'); fml(R, 18, 2, 'IF(B16="Yes",B17*Lookups!B94,0)', DOL);
  val(R, 19, 1, 'State Credit'); fml(R, 19, 2, 'IF(B16="Yes",B17*VLOOKUP(Inputs!B7,Lookups!A67:B79,2,FALSE),0)', DOL);
  val(R, 20, 1, 'Total R&D Credit'); fmlBold(R, 20, 2, 'B18+B19', DOL);

  // ═══════════════════════════════════════════════════════════════════
  // TAB 1: DASHBOARD — Executive summary
  // ═══════════════════════════════════════════════════════════════════
  cols(DA, [35, 25, 45]);
  hdr(DA, 1, 'AI ROI CALCULATOR — EXECUTIVE DASHBOARD', 3);
  colorLegend(DA, 2);

  sub(DA, 3, 'Bottom Line (Base Case)', 3);
  val(DA, 4, 1, 'Net Present Value (NPV)'); fmlBold(DA, 4, 2, "'5-Year DCF'!B27", DOL);
  val(DA, 5, 1, 'Internal Rate of Return'); fml(DA, 5, 2, "'5-Year DCF'!B28", PCT);
  val(DA, 6, 1, 'ROIC (net profit / total capital)'); fml(DA, 6, 2, "'5-Year DCF'!B30", PCT);
  val(DA, 7, 1, 'Payback Period (months)'); fml(DA, 7, 2, "'5-Year DCF'!B29", '0');
  val(DA, 8, 1, '5-Year Net Savings'); fml(DA, 8, 2, "'5-Year DCF'!G24", DOL); note(DA, 8, 3, 'Cumulative undiscounted');

  sub(DA, 10, 'Investment Summary', 3);
  val(DA, 11, 1, 'Upfront Investment'); fml(DA, 11, 2, "'Calc Engine'!B91", DOL);
  val(DA, 12, 1, 'Phased Separation Cost'); fml(DA, 12, 2, "'Calc Engine'!B94", DOL);
  val(DA, 13, 1, 'Total Capital Deployed'); fmlBold(DA, 13, 2, "'Calc Engine'!B95", DOL);
  val(DA, 14, 1, 'Annual Ongoing (Yr1)'); fml(DA, 14, 2, "'Calc Engine'!B73", DOL);

  sub(DA, 16, 'Expected Value (Probability-Weighted)', 3);
  val(DA, 17, 1, 'Expected NPV (25/50/25)'); fmlBold(DA, 17, 2, 'Scenarios!B23', DOL);
  val(DA, 18, 1, 'Expected ROIC'); fml(DA, 18, 2, 'Scenarios!B24', PCT);

  sub(DA, 20, 'Confidence Intervals (P25/P50/P75)', 3);
  val(DA, 21, 1, 'NPV Range');
  fml(DA, 21, 2, 'Sensitivity!B31', DOL, warnFill); note(DA, 21, 3, 'P25');
  fml(DA, 21, 3, 'Sensitivity!D31', DOL, resultFill);
  val(DA, 22, 1, 'ROIC Range');
  fml(DA, 22, 2, 'Sensitivity!B32', PCT, warnFill);
  fml(DA, 22, 3, 'Sensitivity!D32', PCT, resultFill);
  val(DA, 23, 1, 'Payback Range (months)');
  fml(DA, 23, 2, 'Sensitivity!D33', '0', resultFill); note(DA, 23, 3, 'Optimistic to Conservative');
  fml(DA, 23, 3, 'Sensitivity!B33', '0', warnFill);

  sub(DA, 25, 'Cost of Inaction', 3);
  val(DA, 26, 1, '12-Month Delay Cost'); fml(DA, 26, 2, "'Opportunity Cost'!B14", DOL);
  val(DA, 27, 1, '24-Month Delay Cost'); fml(DA, 27, 2, "'Opportunity Cost'!B15", DOL);
  val(DA, 28, 1, '5-Year Inaction Cost'); fml(DA, 28, 2, "'Opportunity Cost'!B16", DOL);

  sub(DA, 30, 'Peer Comparison', 3);
  val(DA, 31, 1, 'Industry Percentile Rank'); fml(DA, 31, 2, "'Calc Engine'!B144", '0'); note(DA, 31, 3, 'vs industry peers');
  val(DA, 32, 1, 'Peer Median ROIC'); fml(DA, 32, 2, "'Calc Engine'!B140", PCT);
  val(DA, 33, 1, 'Your ROIC vs Median'); fml(DA, 33, 2, "'Calc Engine'!B145", PCT);

  sub(DA, 35, 'Threshold / Viability', 3);
  val(DA, 36, 1, 'Path to Positive NPV'); fml(DA, 36, 2, "'Calc Engine'!B127");
  val(DA, 37, 1, 'Risk Margin'); fml(DA, 37, 2, "'Calc Engine'!B126", PCT);
  val(DA, 38, 1, 'Max Tolerable Ongoing'); fml(DA, 38, 2, "'Calc Engine'!B128", DOL);

  sub(DA, 40, 'Vendor Lock-in', 3);
  val(DA, 41, 1, 'Lock-in Level'); fml(DA, 41, 2, "'Calc Engine'!B134");
  val(DA, 42, 1, 'Switching Cost'); fml(DA, 42, 2, "'Calc Engine'!B133", DOL);
  val(DA, 43, 1, 'Total 5-Year Ongoing'); fml(DA, 43, 2, "'Calc Engine'!B136", DOL);

  sub(DA, 45, 'Key Assumptions', 3);
  val(DA, 46, 1, 'Automation Potential'); fml(DA, 46, 2, "'Calc Engine'!B4", PCT);
  val(DA, 47, 1, 'Industry Success Rate'); fml(DA, 47, 2, "'Calc Engine'!B5", PCT);
  val(DA, 48, 1, 'Risk Multiplier'); fml(DA, 48, 2, "'Calc Engine'!B13", PCT);
  val(DA, 49, 1, 'Discount Rate'); fml(DA, 49, 2, "'Calc Engine'!B16", PCT);
  val(DA, 50, 1, 'Displaced FTEs'); fml(DA, 50, 2, "'Calc Engine'!B34", '0');
  val(DA, 51, 1, 'Retained FTEs'); fml(DA, 51, 2, "'Calc Engine'!B35", '0');
  val(DA, 52, 1, 'Confidence Level'); fml(DA, 52, 2, "'Calc Engine'!B156");

  sub(DA, 54, 'Revenue & Tax (informational — not in NPV)', 3);
  val(DA, 55, 1, 'Revenue Uplift (annual)'); fml(DA, 55, 2, "'Revenue & Scale'!B8", DOL);
  val(DA, 56, 1, 'R&D Tax Credit'); fml(DA, 56, 2, "'Revenue & Scale'!B20", DOL);

  sub(DA, 58, 'V3: Value Creation Pathways', 3);
  val(DA, 59, 1, 'A. Cost Efficiency (risk-adj)'); fml(DA, 59, 2, "'Calc Engine'!B112", DOL);
  note(DA, 59, 3, 'Cash realized: ' + "='Calc Engine'!B160");
  val(DA, 60, 1, 'B. Capacity Creation'); fml(DA, 60, 2, "'Calc Engine'!B168", DOL);
  val(DA, 61, 1, 'C. Risk Reduction'); fml(DA, 61, 2, "'Calc Engine'!B176", DOL);

  sub(DA, 63, 'V3: Capital Efficiency', 3);
  val(DA, 64, 1, 'EVA (Economic Value Added)'); fml(DA, 64, 2, "'Calc Engine'!B182", DOL);
  val(DA, 65, 1, 'Cash-on-Cash (Yr 3)'); fml(DA, 65, 2, "'Calc Engine'!B183", PCT);
  val(DA, 66, 1, 'ROIC vs WACC Spread'); fml(DA, 66, 2, "'Calc Engine'!B184", PCT);
  val(DA, 67, 1, 'Creates Value?'); fml(DA, 67, 2, "'Calc Engine'!B185");

  sub(DA, 69, 'V3: Gate Structure', 3);
  val(DA, 70, 1, 'Gate 1 — Pilot'); fml(DA, 70, 2, "'Calc Engine'!B188", DOL);
  val(DA, 71, 1, 'Gate 2 — Controlled Rollout'); fml(DA, 71, 2, "'Calc Engine'!B189", DOL);
  val(DA, 72, 1, 'Gate 3 — Enterprise Scale'); fml(DA, 72, 2, "'Calc Engine'!B190", DOL);

  sub(DA, 74, 'Phased Value Timeline', 3);
  val(DA, 75, 1, 'Foundation (0-3 mo)'); fml(DA, 75, 2, "'Calc Engine'!B117", DOL);
  val(DA, 76, 1, 'Quick Wins (3-6 mo)'); fml(DA, 76, 2, "'Calc Engine'!B118", DOL);
  val(DA, 77, 1, 'Optimization (6-12 mo)'); fml(DA, 77, 2, "'Calc Engine'!B119", DOL);
  val(DA, 78, 1, 'Scale (12-24 mo)'); fml(DA, 78, 2, "'Calc Engine'!B120", DOL);

  // Conditional formatting on NPV
  DA.addConditionalFormatting({
    ref: 'B4', rules: [
      { type: 'cellIs', operator: 'greaterThan', formulae: ['0'], style: { font: { color: { argb: 'FF66BB6A' }, bold: true } } },
      { type: 'cellIs', operator: 'lessThan', formulae: ['0'], style: { font: { color: { argb: 'FFEF5350' }, bold: true } } },
    ]
  });

  val(DA, 80, 1, 'Blue cells on the Inputs tab are editable — change any value to recalculate the entire model.', null, inputFill);
  DA.mergeCells(80, 1, 80, 3);
  DA.getRow(80).getCell(1).font = { ...fontBold, color: { argb: `FF${NAVY}` } };

  // ═══════════════════════════════════════════════════════════════════
  // TAB 1: GUIDE — Table of Contents + Reference Guide
  // ═══════════════════════════════════════════════════════════════════
  cols(G, [32, 22, 55]);
  hdr(G, 1, 'AI ROI MODEL — GUIDE', 3);
  colorLegend(G, 2);

  // --- How to Use ---
  sub(G, 4, 'How to Use This Model', 3);
  const guideFont = { name: 'Calibri', size: 10 };
  const guideFontB = { name: 'Calibri', size: 10, bold: true };
  const guideLines = [
    'This model uses an industry-standard color code:',
    'BLUE cells = Inputs you can edit. GREEN cells = Formulas (do not edit). NAVY/BLACK cells = Key outputs and results.',
    'Start on the Inputs tab. Change any blue cell and every sheet recalculates automatically.',
    'Use the Table of Contents below to jump to any section.',
  ];
  guideLines.forEach((line, i) => {
    G.getRow(5 + i).getCell(1).value = line;
    G.getRow(5 + i).getCell(1).font = i === 0 ? guideFontB : guideFont;
    G.mergeCells(5 + i, 1, 5 + i, 3);
  });

  // --- Table of Contents ---
  sub(G, 10, 'Table of Contents', 3);
  tableHeaders(G, 11, ['Section', 'Sheet', 'Description']);

  const tocEntries = [
    ['Executive Summary', 'Dashboard', 'A3', 'NPV, IRR, ROIC, Payback at a glance'],
    ['Investment Summary', 'Dashboard', 'A10', 'Upfront + ongoing cost breakdown'],
    ['Expected Value', 'Dashboard', 'A16', 'Probability-weighted NPV and ROIC'],
    ['Scenario Ranges', 'Dashboard', 'A20', 'P25/P50/P75 confidence intervals'],
    ['Cost of Inaction', 'Dashboard', 'A25', '12/24/60 month delay costs'],
    ['Peer Comparison', 'Dashboard', 'A30', 'Industry percentile ranking'],
    ['Threshold / Viability', 'Dashboard', 'A35', 'Path to positive NPV and risk margin'],
    ['Value Pathways (V3)', 'Dashboard', 'A58', 'Cost efficiency, capacity, risk reduction'],
    ['Capital Efficiency (V3)', 'Dashboard', 'A63', 'EVA, Cash-on-Cash, ROIC vs WACC'],
    ['Gate Structure (V3)', 'Dashboard', 'A69', 'Pilot / Controlled / Enterprise phases'],
    ['Company Context', 'Inputs', 'A3', 'Industry, size, location, state'],
    ['Process Details', 'Inputs', 'A9', 'Process type, team, hours, salary, errors'],
    ['Organization Readiness', 'Inputs', 'A17', 'Change/data readiness, executive sponsor'],
    ['AI Investment', 'Inputs', 'A22', 'Budget, timeline, ongoing cost'],
    ['Advanced Value (V3)', 'Inputs', 'A29', 'Cash realization, revenue, margins'],
    ['Industry Benchmarks', 'Calc Engine', 'A3', 'Automation potential, success rates'],
    ['Org Readiness Calcs', 'Calc Engine', 'A9', 'Adoption, sponsor adj, risk multiplier'],
    ['Discount & Timeline', 'Calc Engine', 'A15', 'Discount rate, adjusted timeline'],
    ['Current State', 'Calc Engine', 'A23', 'Labor cost, rework, total current cost'],
    ['FTE Displacement', 'Calc Engine', 'A31', 'Raw/max/final displaced + retained'],
    ['Implementation Sizing', 'Calc Engine', 'A37', 'Engineers, PMs, cost breakdown'],
    ['Ongoing AI Costs', 'Calc Engine', 'A58', 'API, license, retraining, compliance'],
    ['One-Time & Hidden Costs', 'Calc Engine', 'A75', 'Legal, security, contingency, change mgmt'],
    ['Value Breakdown', 'Calc Engine', 'A97', 'Headcount, efficiency, error, tool savings'],
    ['V3 Pathways', 'Calc Engine', 'A158', 'Cost efficiency, capacity, risk reduction'],
    ['V3 Capital Efficiency', 'Calc Engine', 'A178', 'EVA, NOPAT, Cash-on-Cash'],
    ['V3 Gate Structure', 'Calc Engine', 'A187', 'Pilot/Controlled/Enterprise investment'],
    ['5-Year DCF', '5-Year DCF', 'A1', 'Full discounted cash flow model'],
    ['Financial Metrics', '5-Year DCF', 'A26', 'NPV, IRR, ROIC, Payback'],
    ['Scenario Analysis', 'Scenarios', 'A1', 'Conservative/Base/Optimistic cash flows'],
    ['Probability-Weighted', 'Scenarios', 'A21', 'Expected NPV and ROIC'],
    ['Tornado Analysis', 'Sensitivity', 'A8', '6-variable NPV impact'],
    ['Confidence Intervals', 'Sensitivity', 'A26', 'P25/P50/P75 ranges'],
    ['Cost of Inaction', 'Opportunity Cost', 'A1', '5-year forgone savings + penalties'],
    ['Revenue Enablement', 'Revenue & Scale', 'A1', 'TTM, CX, new capability revenue'],
    ['R&D Tax Credit', 'Revenue & Scale', 'A15', 'Federal + state credit estimates'],
    ['Scalability', 'Revenue & Scale', 'A10', '2x/3x volume cost comparison'],
    ['Reference Tables', 'Lookups', 'A1', 'All benchmark data tables'],
    ['Sources', 'Sources', 'A1', '26 cited research sources'],
  ];

  const linkFont = { name: 'Calibri', size: 10, color: { argb: 'FF0563C1' }, underline: true };
  tocEntries.forEach(([section, sheet, cell, desc], i) => {
    const r = 12 + i;
    G.getRow(r).getCell(1).value = section;
    G.getRow(r).getCell(1).font = guideFont;
    G.getRow(r).getCell(2).value = { text: sheet, hyperlink: `#'${sheet}'!${cell}` };
    G.getRow(r).getCell(2).font = linkFont;
    G.getRow(r).getCell(3).value = desc;
    G.getRow(r).getCell(3).font = font9i;
  });

  // --- Input Definitions ---
  const inputDefStart = 12 + tocEntries.length + 2;
  sub(G, inputDefStart, 'Input Definitions', 3);
  tableHeaders(G, inputDefStart + 1, ['Input Field', 'Where to Find It', 'What It Means / Typical Range']);

  const inputDefs = [
    ['Industry', 'Inputs B4', 'Your company\'s primary sector. Drives benchmark lookups for automation potential and success rates.'],
    ['Company Size', 'Inputs B5', 'Employee count tier (Startup to Large Enterprise). Affects discount rate, team sizing, and cost multipliers.'],
    ['Team Location', 'Inputs B6', 'Geographic region of AI team. Determines salary benchmarks for implementation cost.'],
    ['State', 'Inputs B7', 'US state for R&D tax credit calculation. Non-US locations get $0 credit.'],
    ['Process Type', 'Inputs B10', 'Type of work being automated. Determines automation potential and API cost per request.'],
    ['Team Size (FTEs)', 'Inputs B11', 'Number of full-time equivalents on the process. Typical: 5-50. Drives all headcount-based savings.'],
    ['Hours per Week', 'Inputs B12', 'Average hours per person per week. Default: 40. Used for annual hours and API volume.'],
    ['Avg Fully-Loaded Salary', 'Inputs B13', 'Annual salary + benefits per person. Typical: $80K-$300K depending on location/role.'],
    ['Error / Rework Rate', 'Inputs B14', 'Percentage of output requiring rework. Typical: 3%-15%. Higher = more AI savings potential.'],
    ['Current Tool Costs', 'Inputs B15', 'Annual spend on existing SaaS/tools for this process. AI may replace a portion.'],
    ['Change Readiness (1-5)', 'Inputs B18', '1=Resistant, 5=Champion. Affects adoption rate and timeline. Typical: 2-4.'],
    ['Data Readiness (1-5)', 'Inputs B19', '1=Messy/siloed, 5=Governed/clean. Low scores increase timeline and cost. Typical: 2-4.'],
    ['Executive Sponsor', 'Inputs B20', 'Yes/No. Having a sponsor improves adoption by ~15% and shortens timeline by ~20%.'],
    ['Implementation Budget', 'Inputs B23', 'Planned upfront spend. Model will flag if computed cost exceeds this.'],
    ['Expected Timeline', 'Inputs B24', 'Planned months to deploy. Gets adjusted by readiness and size factors. Typical: 3-12 months.'],
    ['Ongoing Annual Cost', 'Inputs B25', 'Annual AI operating budget (API, licenses, maintenance). Model computes a floor.'],
    ['Cash Realization %', 'Inputs B30', 'Portion of efficiency gains captured as cash (vs. capacity). Typical: 20%-60%.'],
    ['Annual Revenue', 'Inputs B31', 'Company revenue for V3 revenue acceleration calculations. $0 = skip.'],
    ['Contribution Margin', 'Inputs B32', 'Gross margin on incremental revenue. Typical: 20%-50%.'],
  ];

  inputDefs.forEach(([field, loc, desc], i) => {
    const r = inputDefStart + 2 + i;
    G.getRow(r).getCell(1).value = field;
    G.getRow(r).getCell(1).font = guideFontB;
    G.getRow(r).getCell(2).value = loc;
    G.getRow(r).getCell(2).font = guideFont;
    G.getRow(r).getCell(3).value = desc;
    G.getRow(r).getCell(3).font = guideFont;
    G.getRow(r).getCell(3).alignment = { wrapText: true };
  });

  // --- Key Output Definitions ---
  const outputDefStart = inputDefStart + 2 + inputDefs.length + 2;
  sub(G, outputDefStart, 'Key Output Definitions', 3);
  tableHeaders(G, outputDefStart + 1, ['Metric', 'What It Means', 'Why It Matters / How to Read It']);

  const outputDefs = [
    ['NPV (Net Present Value)', 'Sum of all future cash flows discounted to today\'s dollars, minus upfront investment.', 'Positive = project creates value. Higher = better. The single most important metric.'],
    ['IRR (Internal Rate of Return)', 'Annualized return rate that makes NPV = 0.', 'Compare to your cost of capital (WACC). IRR > WACC means the project earns more than it costs to fund.'],
    ['ROIC (Return on Invested Capital)', 'Total net return divided by total capital deployed.', 'Shows how efficiently capital is used. >50% is strong. >100% means you more than doubled your investment.'],
    ['Payback Period', 'Months until cumulative cash flows turn positive.', 'Shorter = lower risk. <12 months is excellent. >36 months raises concerns.'],
    ['EVA (Economic Value Added)', 'Profit after subtracting the cost of capital employed.', 'Positive EVA = project creates shareholder value beyond what investors require as a return.'],
    ['Cash-on-Cash (Yr 3)', 'Year 3 net cash flow divided by total investment.', 'Shows stabilized annual return. >30% is strong for AI projects.'],
    ['ROIC vs WACC Spread', 'ROIC minus your weighted average cost of capital.', 'Positive spread = creating value. Negative = destroying value. Bigger spread = better.'],
    ['Risk Multiplier', 'Combined organizational readiness and industry success probability.', 'Applied to all savings. Higher = more confidence in projections. Range: 30%-80% typical.'],
    ['Confidence Level', 'Overall model confidence: Conservative / Moderate / High.', 'Based on data readiness, change readiness, and executive sponsorship.'],
    ['Expected NPV', 'Probability-weighted average of Conservative (25%), Base (50%), Optimistic (25%) NPVs.', 'More realistic than base case alone. Use this for budgeting decisions.'],
  ];

  outputDefs.forEach(([metric, meaning, reading], i) => {
    const r = outputDefStart + 2 + i;
    G.getRow(r).getCell(1).value = metric;
    G.getRow(r).getCell(1).font = guideFontB;
    G.getRow(r).getCell(2).value = meaning;
    G.getRow(r).getCell(2).font = guideFont;
    G.getRow(r).getCell(2).alignment = { wrapText: true };
    G.getRow(r).getCell(3).value = reading;
    G.getRow(r).getCell(3).font = guideFont;
    G.getRow(r).getCell(3).alignment = { wrapText: true };
  });

  // --- Section Summaries ---
  const sectionStart = outputDefStart + 2 + outputDefs.length + 2;
  sub(G, sectionStart, 'Sheet Summaries', 3);
  tableHeaders(G, sectionStart + 1, ['Sheet', 'Purpose', '']);

  const sheetSummaries = [
    ['Dashboard', 'Executive summary of all key results. Start here for the bottom line.'],
    ['Inputs', 'All editable assumptions (blue cells). Change these to run your own scenarios.'],
    ['Calc Engine', 'Every intermediate calculation as a live formula. Full audit trail from inputs to outputs.'],
    ['5-Year DCF', 'Year-by-year discounted cash flow model. Shows how value accrues over time.'],
    ['Scenarios', 'Conservative (0.7x), Base (1.0x), and Optimistic (1.2x) projections side by side.'],
    ['Sensitivity', 'Tornado analysis showing which variables have the most impact on NPV.'],
    ['Opportunity Cost', 'What inaction costs: forgone savings, wage inflation, competitive penalty over 5 years.'],
    ['Revenue & Scale', 'Revenue uplift potential, R&D tax credits, and scalability economics (informational).'],
    ['Lookups', 'All benchmark data tables used by formulas. Industry-specific reference data.'],
    ['Sources', '26 cited research sources backing every benchmark and assumption.'],
  ];

  sheetSummaries.forEach(([sheet, purpose], i) => {
    const r = sectionStart + 2 + i;
    G.getRow(r).getCell(1).value = sheet;
    G.getRow(r).getCell(1).font = guideFontB;
    G.getRow(r).getCell(2).value = purpose;
    G.getRow(r).getCell(2).font = guideFont;
    G.getRow(r).getCell(2).alignment = { wrapText: true };
    G.mergeCells(r, 2, r, 3);
  });

  // ═══════════════════════════════════════════════════════════════════
  // TAB 11: SOURCES
  // ═══════════════════════════════════════════════════════════════════
  cols(SRC, [5, 20, 80]);
  hdr(SRC, 1, 'BENCHMARK SOURCES', 3);
  tableHeaders(SRC, 3, ['#', 'Short', 'Full Citation']);
  const sources = [
    [1,'McKinsey 2025','McKinsey, "The State of AI in 2025," Global Survey, 2025.'],
    [2,'IBM 2023','IBM, "Generating ROI with AI," 2023.'],
    [3,'Gartner 2024','Gartner, "30% of GenAI Projects Abandoned After POC," 2024.'],
    [4,'MIT/RAND','MIT Sloan / RAND Corporation, aggregate research 2022-2024.'],
    [5,'Deloitte 2026','Deloitte, "State of AI in the Enterprise," 6th Ed, 2026.'],
    [6,'Bloomberg 2024','Bloomberg, Russell 3K severance analysis, 2024.'],
    [7,'Glassdoor 2026','Glassdoor AI/ML Engineer Salary Data, Feb 2026.'],
    [8,'Alcor BPO 2025','Alcor BPO, "AI Engineer Salary by Country," 2025.'],
    [9,'Xenoss 2025','Xenoss, "Total Cost of Ownership for Enterprise AI," 2025.'],
    [10,'PMI','PMI standard practice for technology projects.'],
    [11,'LLM Pricing','IntuitionLabs, "LLM API Pricing Comparison," 2025.'],
    [12,'LHH 2025','LHH, "How Much Severance Should Companies Pay," 2025.'],
    [13,'Gartner 2025','Gartner, "AI-Ready Data Puts AI Projects at Risk," 2025.'],
    [14,'Worklytics 2025','Worklytics, "2025 AI Adoption Benchmarks."'],
    [15,'SHRM 2025','SHRM, "Total Cost of Employee Separation," 2025.'],
    [16,'Forrester 2024','Forrester, "TEI of AI Platform Consolidation," 2024.'],
    [17,'BLS 2025','BLS, "Employment Cost Index," Q4 2025.'],
    [18,'BCG 2025','BCG, "How AI Creates Value," 2025.'],
    [19,'IRS 2025','IRS, "Section 41 Research Credit," 2025.'],
    [20,'a16z 2024','a16z, "AI in the Enterprise," 2024.'],
    [21,'McKinsey Change','McKinsey, "Human Side of AI Transformation," 2025.'],
    [22,'Forrester Lock-in','Forrester, "True Cost of AI Vendor Lock-in," 2025.'],
    [23,'SHRM Retraining','SHRM, "Upskilling for AI-Augmented Workplaces," 2025.'],
    [24,'Marsh 2025','Marsh McLennan, "AI and Cyber Insurance Risk," 2025.'],
    [25,'IDC 2025','IDC, "AI Infrastructure TCO," 2025.'],
    [26,'Damodaran 2025','Damodaran, "Cost of Capital by Lifecycle," NYU Stern, 2025.'],
  ];
  sources.forEach(([id, short, full], i) => {
    const row = SRC.getRow(4 + i);
    row.getCell(1).value = id; row.getCell(1).font = { size: 9, bold: true, name: 'Calibri' };
    row.getCell(2).value = short; row.getCell(2).font = { size: 9, bold: true, name: 'Calibri' };
    row.getCell(3).value = full; row.getCell(3).font = { size: 9, name: 'Calibri' };
    row.getCell(3).alignment = { wrapText: true };
  });

  // ─── Download ────────────────────────────────────────────────────
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
