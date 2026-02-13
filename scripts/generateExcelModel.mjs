#!/usr/bin/env node
/**
 * AI ROI Calculator — Formula-Driven Excel Model
 * Every calculated cell uses a real Excel formula.
 * Usage: node scripts/generateExcelModel.mjs
 */
import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Styles ───────────────────────────────────────────────────────────
const NAVY = '1B2A4A', GOLD = 'D4A843';
const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${NAVY}` } };
const subFont = { bold: true, color: { argb: `FF${NAVY}` }, size: 10, name: 'Calibri' };
const subFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
const inputFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8E1' } };
const calcFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
const resultFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
const warnFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } };
const font10 = { name: 'Calibri', size: 10 };
const font9i = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF666666' } };
const fontBold = { name: 'Calibri', size: 10, bold: true };
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
  cell.font = font10;
  if (fmt) cell.numFmt = fmt;
  cell.fill = fill || calcFill;
}

function fmlBold(ws, r, c, formula, fmt, fill) {
  const cell = ws.getRow(r).getCell(c);
  cell.value = { formula };
  cell.font = fontBold;
  if (fmt) cell.numFmt = fmt;
  cell.fill = fill || resultFill;
}

function note(ws, r, c, text) {
  const cell = ws.getRow(r).getCell(c);
  cell.value = text;
  cell.font = font9i;
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
async function generate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'AI ROI Calculator';
  wb.created = new Date();

  // ═══════════════════════════════════════════════════════════════════
  // TAB: LOOKUPS — All reference tables for VLOOKUP/INDEX-MATCH
  // ═══════════════════════════════════════════════════════════════════
  const L = wb.addWorksheet('Lookups', { tabColor: { argb: 'FF9E9E9E' } });
  cols(L, [35, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12]);

  // ── Section 1: Automation Potential Matrix (R1-R12) ──
  // Row 1 header, Row 2 col headers, Rows 3-12 data
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
  const pctFmts = Array(9).fill(PCT);
  INDUSTRIES.forEach((ind, i) => {
    dataRow(L, 3 + i, [ind, ...AP[i]], [null, ...Array(8).fill(PCT)]);
  });

  // ── Section 2: Industry Benchmarks (R14-R25) ──
  // Combines: success rate, competitive penalty, compliance risk, revenue uplift (3)
  hdr(L, 14, 'INDUSTRY BENCHMARKS', 7);
  tableHeaders(L, 15, ['Industry', 'Success Rate', 'Comp Penalty', 'Compl Risk', 'Rev:TTM', 'Rev:CX', 'Rev:NewCap']);

  const IB = [
    [0.72, 0.05, 0.02, 0.08, 0.05, 0.04],
    [0.65, 0.04, 0.05, 0.05, 0.06, 0.03],
    [0.58, 0.02, 0.06, 0.04, 0.03, 0.05],
    [0.62, 0.03, 0.03, 0.06, 0.03, 0.03],
    [0.68, 0.05, 0.02, 0.07, 0.08, 0.04],
    [0.64, 0.04, 0.03, 0.05, 0.04, 0.04],
    [0.60, 0.04, 0.02, 0.08, 0.06, 0.05],
    [0.55, 0.02, 0.04, 0.03, 0.03, 0.02],
    [0.45, 0.01, 0.04, 0.02, 0.02, 0.01],
    [0.55, 0.03, 0.02, 0.04, 0.04, 0.03],
  ];
  INDUSTRIES.forEach((ind, i) => {
    dataRow(L, 16 + i, [ind, ...IB[i]], [null, PCT, PCT, PCT, PCT, PCT, PCT]);
  });

  // ── Section 3: Readiness Multipliers (R27-R33) ──
  hdr(L, 27, 'READINESS MULTIPLIERS', 4);
  tableHeaders(L, 28, ['Level', 'Adoption Rate', 'Timeline Mult', 'Cost Mult']);
  [[1,0.40,1.40,1.30],[2,0.55,1.25,1.20],[3,0.70,1.10,1.10],[4,0.85,1.00,1.00],[5,0.95,0.90,1.00]].forEach((d, i) => {
    dataRow(L, 29 + i, d, ['0', PCT, DEC, DEC]);
  });

  // ── Section 4: Company Size Master (R35-R41) ──
  hdr(L, 35, 'COMPANY SIZE MASTER', 11);
  tableHeaders(L, 36, ['Size','Size Mult','Disc Rate','Max Team','Sep Mult','License','Legal','Security','Compliance','Cyber Ins','Vendor Switch']);
  const SM = [
    ['Startup (1-50)',        0.70, 0.18,  3, 0.70,  12000,  25000,  20000,   8000,  2000, 0.30],
    ['SMB (51-500)',           0.85, 0.14,  5, 1.00,  24000,  50000,  40000,  15000,  5000, 0.35],
    ['Mid-Market (501-5,000)',1.00, 0.10, 10, 1.15,  48000, 100000,  75000,  30000, 12000, 0.40],
    ['Enterprise (5,001-50,000)',1.30,0.09,15, 1.30,  96000, 175000, 125000,  60000, 25000, 0.50],
    ['Large Enterprise (50,000+)',1.60,0.08,25, 1.50, 180000, 300000, 200000, 100000, 50000, 0.60],
  ];
  SM.forEach((d, i) => {
    dataRow(L, 37 + i, d, [null, DEC, PCT, '0', DEC, DOL, DOL, DOL, DOL, DOL, PCT]);
  });

  // ── Section 5: AI Team Salary (R43-R52) ──
  hdr(L, 43, 'AI TEAM SALARY', 2);
  tableHeaders(L, 44, ['Location', 'Salary']);
  const SAL = [[215000],[155000],[150000],[140000],[145000],[80000],[55000],[40000]];
  LOCATIONS.forEach((loc, i) => { dataRow(L, 45 + i, [loc, SAL[i][0]], [null, DOL]); });

  // ── Section 6: Process Type Master (R54-R63) ──
  hdr(L, 54, 'PROCESS TYPE MASTER', 4);
  tableHeaders(L, 55, ['Process Type', 'API $/1K', 'Req/Hour', 'Tool Replace %']);
  const PT = [[20,12,0.55],[8,25,0.45],[15,8,0.50],[25,6,0.40],[5,30,0.65],[20,10,0.45],[12,15,0.50],[10,12,0.40]];
  PROCESS_TYPES.forEach((p, i) => { dataRow(L, 56 + i, [p, ...PT[i]], [null, DOL, '0', PCT]); });

  // ── Section 7: State R&D Credit (R65-R79) ──
  hdr(L, 65, 'STATE R&D CREDIT RATES', 2);
  tableHeaders(L, 66, ['State', 'Rate']);
  const STATES = [
    ['California',0.24],['New York',0.06],['Texas',0.05],['Massachusetts',0.10],
    ['Washington',0.015],['Illinois',0.065],['Pennsylvania',0.10],['Georgia',0.10],
    ['New Jersey',0.10],['Colorado',0.03],['Virginia',0.0],['Florida',0.0],['Other / Not Sure',0.0],
  ];
  STATES.forEach((s, i) => { dataRow(L, 67 + i, s, [null, PCT]); });

  // ── Section 8: Constants (R81-R100) ──
  hdr(L, 81, 'MODEL CONSTANTS', 2);
  const CONSTS = [
    ['DCF Years', 5, '0'],
    ['Max Headcount Reduction', 0.75, PCT],
    ['Contingency Rate', 0.20, PCT],
    ['Cultural Resistance Rate', 0.12, PCT],
    ['Wage Inflation Rate', 0.04, PCT],
    ['Legacy Maintenance Creep', 0.07, PCT],
    ['Model Retraining Rate', 0.07, PCT],
    ['Retained Retraining Rate', 0.03, PCT],
    ['Tech Debt Rate', 0.05, PCT],
    ['Adjacent Product Rate', 0.25, PCT],
    ['Revenue Risk Discount', 0.50, PCT],
    ['R&D Qualification Rate', 0.65, PCT],
    ['Federal R&D Rate', 0.065, PCT],
    ['Max ROIC Cap', 1.00, PCT],
    ['Max IRR Cap', 0.75, PCT],
    ['Change Mgmt Rate', 0.15, PCT],
    ['Infra Cost Rate', 0.12, PCT],
    ['Training Cost Rate', 0.08, PCT],
    ['PM Salary Factor', 0.85, DEC],
  ];
  CONSTS.forEach((c, i) => {
    val(L, 82 + i, 1, c[0], null, null);
    val(L, 82 + i, 2, c[1], c[2], null);
  });
  // Constants cell map: B82=DCFYears, B83=MaxHR, B84=Contingency, B85=CulturalRes,
  // B86=WageInfl, B87=LegacyCreep, B88=ModelRetrain, B89=RetainedRetrain, B90=TechDebt,
  // B91=AdjProduct, B92=RevRiskDisc, B93=RDQualRate, B94=FedRDRate, B95=MaxROIC,
  // B96=MaxIRR, B97=ChangeMgmt, B98=InfraCost, B99=TrainingCost, B100=PMSalaryFactor

  // ── Section 9: Schedules (R102-R108) ──
  hdr(L, 102, 'YEAR-BY-YEAR SCHEDULES', 6);
  tableHeaders(L, 103, ['Year', 'HR Reduction', 'Cum HR', 'Adoption Ramp', 'Cost Escalation', 'Cum Escalation']);
  const SCHED = [
    [1, 0, 0, 0.75, 0, 1.000],
    [2, 0.20, 0.20, 0.90, 0.12, 1.120],
    [3, 0.25, 0.45, 1.00, 0.12, 1.2544],
    [4, 0.20, 0.65, 1.00, 0.07, 1.342208],
    [5, 0.10, 0.75, 1.00, 0.07, 1.436163],
  ];
  SCHED.forEach((s, i) => { dataRow(L, 104 + i, s, ['0', PCT, PCT, PCT, PCT, DEC]); });

  // ── Section 10: Revenue Eligible Processes (R110-R114) ──
  hdr(L, 110, 'REVENUE ELIGIBLE PROCESSES', 1);
  ['Customer Communication','Content Creation','Data Analysis & Reporting','Research & Intelligence']
    .forEach((p, i) => { val(L, 111 + i, 1, p); });

  // ── Section 11: Separation Breakdown (R116-R122) ──
  hdr(L, 116, 'SEPARATION COST BREAKDOWN', 2);
  tableHeaders(L, 117, ['Component', 'Rate']);
  [['Severance Pay',0.55],['Benefits Continuation',0.15],['Outplacement Services',0.12],
   ['Administrative / HR',0.10],['Legal Review',0.08]].forEach((s, i) => {
    dataRow(L, 118 + i, s, [null, PCT]);
  });

  // ── Section 12: Peer Benchmarks flattened (R124-R175) ──
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
      const p = PEERS[ind][si];
      dataRow(L, pr, [`${ind}|${sz}`, ...p], [null, PCT, PCT, PCT]);
      pr++;
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // TAB: INPUTS — User-editable with data validation dropdowns
  // ═══════════════════════════════════════════════════════════════════
  const I = wb.addWorksheet('Inputs', { tabColor: { argb: `FF${GOLD}` } });
  cols(I, [35, 28, 45]);

  hdr(I, 1, 'USER INPUTS', 3);

  sub(I, 3, 'Company Context', 3);
  // Row 4: Industry, Row 5: Size, Row 6: Location, Row 7: State
  const inputRows = [
    [4, 'Industry', 'Technology / Software', 'Select from dropdown'],
    [5, 'Company Size', 'Mid-Market (501-5,000)', 'Select from dropdown'],
    [6, 'Team Location', 'US - Major Tech Hub', 'Select from dropdown'],
    [7, 'State (for R&D credit)', 'California', 'US only — optional'],
  ];
  inputRows.forEach(([r, label, defVal, n]) => {
    val(I, r, 1, label); val(I, r, 2, defVal, null, inputFill); note(I, r, 3, n);
  });

  sub(I, 9, 'Process Details', 3);
  const procRows = [
    [10, 'Process Type', 'Document Processing', null, 'Select from dropdown'],
    [11, 'Team Size (FTEs)', 10, NUM, 'Number of people'],
    [12, 'Hours per Week (per person)', 40, NUM, 'Avg hours worked'],
    [13, 'Avg Fully-Loaded Salary', 200000, DOL, 'Annual salary + benefits'],
    [14, 'Error / Rework Rate', 0.10, PCT, '% requiring rework'],
    [15, 'Current Tool Costs (annual)', 0, DOL, 'Licenses, SaaS fees'],
  ];
  procRows.forEach(([r, label, defVal, fmt, n]) => {
    val(I, r, 1, label); val(I, r, 2, defVal, fmt, inputFill); note(I, r, 3, n);
  });

  sub(I, 17, 'Organization Readiness', 3);
  val(I, 18, 1, 'Change Readiness (1-5)'); val(I, 18, 2, 3, '0', inputFill); note(I, 18, 3, '1=Low, 5=Champion');
  val(I, 19, 1, 'Data Readiness (1-5)'); val(I, 19, 2, 3, '0', inputFill); note(I, 19, 3, '1=Messy, 5=Governed');
  val(I, 20, 1, 'Executive Sponsor?'); val(I, 20, 2, 'Yes', null, inputFill); note(I, 20, 3, 'Yes or No');

  sub(I, 22, 'AI Investment', 3);
  const aiRows = [
    [23, 'Implementation Budget', 100000, DOL, 'Your stated budget'],
    [24, 'Expected Timeline (months)', 4.5, '0.0', 'Months to first results'],
    [25, 'Ongoing Annual Cost', 25000, DOL, 'Your est. annual AI cost'],
    [26, 'Vendors to Replace', 0, '0', 'Current vendors AI replaces'],
    [27, 'Vendor Termination Cost', 0, DOL, 'Cost to exit contracts'],
  ];
  aiRows.forEach(([r, label, defVal, fmt, n]) => {
    val(I, r, 1, label); val(I, r, 2, defVal, fmt, inputFill); note(I, r, 3, n);
  });

  // Data validation dropdowns
  I.getRow(4).getCell(2).dataValidation = { type: 'list', formulae: ['Lookups!$A$3:$A$12'] };
  I.getRow(5).getCell(2).dataValidation = { type: 'list', formulae: ['Lookups!$A$37:$A$41'] };
  I.getRow(6).getCell(2).dataValidation = { type: 'list', formulae: ['Lookups!$A$45:$A$52'] };
  I.getRow(7).getCell(2).dataValidation = { type: 'list', formulae: ['Lookups!$A$67:$A$79'] };
  I.getRow(10).getCell(2).dataValidation = { type: 'list', formulae: ['Lookups!$A$56:$A$63'] };
  I.getRow(18).getCell(2).dataValidation = { type: 'list', formulae: ['"1,2,3,4,5"'] };
  I.getRow(19).getCell(2).dataValidation = { type: 'list', formulae: ['"1,2,3,4,5"'] };
  I.getRow(20).getCell(2).dataValidation = { type: 'list', formulae: ['"Yes,No"'] };

  val(I, 29, 1, 'Yellow cells are editable inputs. Change any value to recalculate the entire model.', null, inputFill);
  I.mergeCells(29, 1, 29, 3);
  I.getRow(29).getCell(1).font = { ...fontBold, color: { argb: `FF${NAVY}` } };

  // ═══════════════════════════════════════════════════════════════════
  // TAB: CALC — Every intermediate calculation as a real formula
  // ═══════════════════════════════════════════════════════════════════
  const C = wb.addWorksheet('Calc Engine', { tabColor: { argb: 'FF2196F3' } });
  cols(C, [35, 22, 50]);

  hdr(C, 1, 'CALCULATION ENGINE — All formulas, no hardcoded values', 3);

  // ── Industry Benchmarks ──
  sub(C, 3, 'Industry Benchmarks', 3);
  val(C, 4, 1, 'Automation Potential');
  fml(C, 4, 2, 'INDEX(Lookups!B3:I12,MATCH(Inputs!B4,Lookups!A3:A12,0),MATCH(Inputs!B10,Lookups!B2:I2,0))', PCT);
  note(C, 4, 3, 'INDEX/MATCH: Industry × Process Type');

  val(C, 5, 1, 'Industry Success Rate');
  fml(C, 5, 2, 'VLOOKUP(Inputs!B4,Lookups!A16:B25,2,FALSE)', PCT);

  val(C, 6, 1, 'Competitive Penalty Rate');
  fml(C, 6, 2, 'VLOOKUP(Inputs!B4,Lookups!A16:C25,3,FALSE)', PCT);

  val(C, 7, 1, 'Compliance Risk Rate');
  fml(C, 7, 2, 'VLOOKUP(Inputs!B4,Lookups!A16:D25,4,FALSE)', PCT);

  // ── Org Readiness ──
  sub(C, 9, 'Organizational Readiness', 3);
  val(C, 10, 1, 'Adoption Rate');
  fml(C, 10, 2, 'VLOOKUP(Inputs!B18,Lookups!A29:B33,2,FALSE)', PCT);

  val(C, 11, 1, 'Sponsor Adjustment');
  fml(C, 11, 2, 'IF(Inputs!B20="Yes",1,0.85)', DEC);

  val(C, 12, 1, 'Org Readiness');
  fml(C, 12, 2, 'B10*B11', DEC);
  note(C, 12, 3, 'Adoption × Sponsor');

  val(C, 13, 1, 'Risk Multiplier');
  fml(C, 13, 2, '(B12+B5)/2', PCT);
  note(C, 13, 3, '(OrgReadiness + IndustrySuccess) / 2');

  // ── Discount & Timeline ──
  sub(C, 15, 'Discount Rate & Timeline', 3);
  val(C, 16, 1, 'Discount Rate');
  fml(C, 16, 2, 'VLOOKUP(Inputs!B5,Lookups!A37:C41,3,FALSE)', PCT);

  val(C, 17, 1, 'Data Timeline Mult');
  fml(C, 17, 2, 'VLOOKUP(Inputs!B19,Lookups!A29:C33,3,FALSE)', DEC);

  val(C, 18, 1, 'Size Multiplier');
  fml(C, 18, 2, 'VLOOKUP(Inputs!B5,Lookups!A37:B41,2,FALSE)', DEC);

  val(C, 19, 1, 'Sponsor Time Mult');
  fml(C, 19, 2, 'IF(Inputs!B20="Yes",1,1.25)', DEC);

  val(C, 20, 1, 'Adjusted Timeline (mo)');
  fml(C, 20, 2, 'CEILING(Inputs!B24*B17*B18*B19,1)', '0');
  note(C, 20, 3, 'Expected × Data × Size × Sponsor');

  val(C, 21, 1, 'Impl Timeline (years)');
  fml(C, 21, 2, 'B20/12', DEC);

  // ── Current State ──
  sub(C, 23, 'Current State', 3);
  val(C, 24, 1, 'Hourly Rate'); fml(C, 24, 2, 'Inputs!B13/2080', DOL2);
  val(C, 25, 1, 'Annual Labor Cost'); fml(C, 25, 2, 'Inputs!B11*Inputs!B13', DOL);
  val(C, 26, 1, 'Weekly Hours (team)'); fml(C, 26, 2, 'Inputs!B11*Inputs!B12', NUM);
  val(C, 27, 1, 'Annual Hours (team)'); fml(C, 27, 2, 'B26*52', NUM);
  val(C, 28, 1, 'Annual Rework Cost'); fml(C, 28, 2, 'B25*Inputs!B14', DOL);
  val(C, 29, 1, 'Total Current Cost'); fml(C, 29, 2, 'B25+B28+Inputs!B15', DOL);
  note(C, 29, 3, 'Labor + Rework + Tools');

  // ── FTE Displacement ──
  sub(C, 31, 'FTE Displacement', 3);
  val(C, 32, 1, 'Raw Displaced FTEs'); fml(C, 32, 2, 'ROUND(Inputs!B11*B4*B10,0)', '0');
  val(C, 33, 1, 'Max Displaced (75%)'); fml(C, 33, 2, 'FLOOR(Inputs!B11*Lookups!B83,1)', '0');
  val(C, 34, 1, 'Displaced FTEs'); fml(C, 34, 2, 'MIN(B32,B33)', '0');
  val(C, 35, 1, 'Retained FTEs'); fml(C, 35, 2, 'Inputs!B11-B34', '0');

  // ── AI Cost Model ──
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
  val(C, 48, 1, 'Engineering Cost'); fml(C, 48, 2, 'B44*B38*B21', DOL);
  note(C, 48, 3, 'Engineers × Salary × Timeline(yrs)');
  val(C, 49, 1, 'PM Cost'); fml(C, 49, 2, 'B45*(B38*Lookups!B100)*B21', DOL);
  note(C, 49, 3, 'PMs × (Salary×0.85) × Timeline');
  val(C, 50, 1, 'Infrastructure Cost'); fml(C, 50, 2, '(B48+B49)*Lookups!B98', DOL);
  val(C, 51, 1, 'Training Cost'); fml(C, 51, 2, '(B48+B49)*Lookups!B99', DOL);
  val(C, 52, 1, 'Computed Impl Cost'); fmlBold(C, 52, 2, 'B48+B49+B50+B51', DOL);
  val(C, 53, 1, 'Data Cost Mult'); fml(C, 53, 2, 'VLOOKUP(Inputs!B19,Lookups!A29:D33,4,FALSE)', DEC);
  val(C, 54, 1, 'User Adjusted Budget'); fml(C, 54, 2, 'Inputs!B23*B53', DOL);
  val(C, 55, 1, 'Realistic Impl Cost'); fmlBold(C, 55, 2, 'MAX(B54,B52)', DOL);
  note(C, 55, 3, 'MAX(user budget adj, computed cost)');
  val(C, 56, 1, 'Budget Gap'); fml(C, 56, 2, 'B52-B54', DOL);

  // ── Ongoing Costs ──
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
  note(C, 73, 3, 'MAX(user est, computed)');

  // ── One-Time & Hidden Costs ──
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
  val(C, 87, 1, 'Productivity Dip'); fml(C, 87, 2, '(B25/12)*3*0.25', DOL);
  note(C, 87, 3, '3 months at 25% dip');
  val(C, 88, 1, 'Total Hidden'); fmlBold(C, 88, 2, 'SUM(B83:B87)', DOL);

  // ── Investment Summary ──
  sub(C, 90, 'Investment Summary', 3);
  val(C, 91, 1, 'Upfront Investment'); fmlBold(C, 91, 2, 'B55+B88+B80', DOL);
  note(C, 91, 3, 'Impl + Hidden + OneTime');
  val(C, 92, 1, 'Separation Multiplier'); fml(C, 92, 2, 'VLOOKUP(Inputs!B5,Lookups!A37:E41,5,FALSE)', DEC);
  val(C, 93, 1, 'Separation Cost/FTE'); fml(C, 93, 2, 'Inputs!B13*B92', DOL);
  val(C, 94, 1, 'Total Separation Cost'); fml(C, 94, 2, 'B34*B93', DOL);
  val(C, 95, 1, 'Total Investment'); fmlBold(C, 95, 2, 'B91+B94', DOL);
  note(C, 95, 3, 'Upfront + Separation');

  // ── Value Breakdown ──
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
  val(C, 109, 1, 'Enhancement (Gross)'); fml(C, 109, 2, 'B100+B102+B105', DOL);
  note(C, 109, 3, 'Efficiency + Error + Tool (no headcount)');
  val(C, 110, 1, 'Enhancement (Risk-Adj)'); fml(C, 110, 2, 'B109*B13', DOL);
  val(C, 111, 1, 'Gross Annual Savings'); fml(C, 111, 2, 'B29*B4', DOL);
  val(C, 112, 1, 'Risk-Adj Annual Savings'); fml(C, 112, 2, 'B111*B13', DOL);
  val(C, 113, 1, 'Net Annual Savings'); fmlBold(C, 113, 2, 'B112-B73', DOL);

  // ═══════════════════════════════════════════════════════════════════
  // TAB: 5-YEAR DCF (Base Case — detailed breakdown)
  // ═══════════════════════════════════════════════════════════════════
  const D = wb.addWorksheet('5-Year DCF', { tabColor: { argb: `FF${NAVY}` } });
  cols(D, [32, 18, 18, 18, 18, 18, 18, 40]);

  hdr(D, 1, '5-YEAR DCF MODEL (BASE CASE)', 8);

  tableHeaders(D, 3, ['', 'Year 0', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Formula']);

  sub(D, 4, 'PARAMETERS', 8);
  // Row 5: Adoption Ramp
  val(D, 5, 1, 'Adoption Ramp');
  for (let y = 1; y <= 5; y++) fml(D, 5, y + 2, `Lookups!D${103 + y}`, PCT);

  // Row 6: Wage Growth Factor
  val(D, 6, 1, 'Wage Growth Factor');
  for (let y = 1; y <= 5; y++) fml(D, 6, y + 2, `(1+Lookups!B86)^${y - 1}`, DEC);

  // Row 7: HR Reduction (year)
  val(D, 7, 1, 'HR Reduction (year)');
  for (let y = 1; y <= 5; y++) fml(D, 7, y + 2, `Lookups!B${103 + y}`, PCT);

  // Row 8: Cumulative HR
  val(D, 8, 1, 'Cumulative HR Reduction');
  for (let y = 1; y <= 5; y++) fml(D, 8, y + 2, `Lookups!C${103 + y}`, PCT);

  // Row 9: Cost Escalation
  val(D, 9, 1, 'Cost Escalation Factor');
  for (let y = 1; y <= 5; y++) fml(D, 9, y + 2, `Lookups!F${103 + y}`, DEC);

  // ── Cash Inflows ──
  sub(D, 11, 'CASH INFLOWS', 8);

  // Row 12: Enhancement Savings = EnhRA × AdoptRamp × 1(base) × WageGrowth
  val(D, 12, 1, 'Enhancement Savings');
  note(D, 12, 8, 'EnhancementRA × AdoptRamp × WageGrowth');
  for (let y = 1; y <= 5; y++) {
    const col = String.fromCharCode(66 + y); // C,D,E,F,G
    fml(D, 12, y + 2, `'Calc Engine'!B110*${col}5*${col}6`, DOL);
  }

  // Row 13: Headcount Savings = HeadcountRA × CumHR × 1(base) × WageGrowth
  val(D, 13, 1, 'Headcount Savings');
  note(D, 13, 8, 'HeadcountRA × CumHR × WageGrowth');
  for (let y = 1; y <= 5; y++) {
    const col = String.fromCharCode(66 + y);
    fml(D, 13, y + 2, `'Calc Engine'!B99*${col}8*${col}6`, DOL);
  }

  // Row 14: GROSS SAVINGS
  val(D, 14, 1, 'GROSS SAVINGS');
  for (let y = 1; y <= 5; y++) {
    const col = String.fromCharCode(66 + y);
    fmlBold(D, 14, y + 2, `${col}12+${col}13`, DOL);
  }

  // ── Cash Outflows ──
  sub(D, 16, 'CASH OUTFLOWS', 8);

  // Row 17: Separation Cost
  val(D, 17, 1, 'Separation Cost');
  note(D, 17, 8, 'TotalSep × HR Schedule');
  for (let y = 1; y <= 5; y++) {
    const col = String.fromCharCode(66 + y);
    fml(D, 17, y + 2, `'Calc Engine'!B94*${col}7`, DOL, warnFill);
  }

  // Row 18: Ongoing AI Cost
  val(D, 18, 1, 'Ongoing AI Cost');
  note(D, 18, 8, 'BaseOngoing × CumEscalation');
  for (let y = 1; y <= 5; y++) {
    const col = String.fromCharCode(66 + y);
    fml(D, 18, y + 2, `'Calc Engine'!B73*${col}9`, DOL, warnFill);
  }

  // ── Net Cash Flows ──
  sub(D, 20, 'NET CASH FLOWS', 8);

  // Row 21: Net Cash Flow
  val(D, 21, 1, 'NET CASH FLOW'); D.getRow(21).getCell(1).font = fontBold;
  fmlBold(D, 21, 2, "-'Calc Engine'!B91", DOL, warnFill); // Year 0 = -upfront
  for (let y = 1; y <= 5; y++) {
    const col = String.fromCharCode(66 + y);
    fmlBold(D, 21, y + 2, `${col}14-${col}17-${col}18`, DOL, calcFill);
  }

  // Row 22: Discount Factor
  val(D, 22, 1, 'Discount Factor');
  fml(D, 22, 2, '1', '0.0000');
  for (let y = 1; y <= 5; y++) {
    fml(D, 22, y + 2, `1/(1+'Calc Engine'!B16)^${y}`, '0.0000');
  }

  // Row 23: Present Value
  val(D, 23, 1, 'PRESENT VALUE'); D.getRow(23).getCell(1).font = fontBold;
  for (let y = 0; y <= 5; y++) {
    const col = String.fromCharCode(66 + y);
    fmlBold(D, 23, y + 2, `${col}21*${col}22`, DOL);
  }

  // Row 24: Cumulative (undiscounted)
  val(D, 24, 1, 'CUMULATIVE');
  fml(D, 24, 2, 'B21', DOL);
  for (let y = 1; y <= 5; y++) {
    const col = String.fromCharCode(66 + y);
    const prev = String.fromCharCode(65 + y);
    fml(D, 24, y + 2, `${prev}24+${col}21`, DOL);
  }

  // ── Financial Metrics ──
  sub(D, 26, 'FINANCIAL METRICS', 8);
  val(D, 27, 1, 'Net Present Value (NPV)'); fmlBold(D, 27, 2, 'SUM(B23:G23)', DOL);
  val(D, 28, 1, 'IRR'); fmlBold(D, 28, 2, 'IRR(B21:G21)', PCT);
  val(D, 29, 1, 'Payback (months)');
  fml(D, 29, 2, 'IF(B24>=0,0,IF(C24>=0,ROUND(-B24/C21*12,0),IF(D24>=0,ROUND(12+(-C24/D21*12),0),IF(E24>=0,ROUND(24+(-D24/E21*12),0),IF(F24>=0,ROUND(36+(-E24/F21*12),0),IF(G24>=0,ROUND(48+(-F24/G21*12),0),61))))))', '0');
  note(D, 29, 3, 'Interpolated from cumulative');
  val(D, 30, 1, 'ROIC');
  fmlBold(D, 30, 2, "(SUM(C21:G21)-'Calc Engine'!B91)/'Calc Engine'!B95", PCT);
  note(D, 30, 3, '(TotalNetReturn - Upfront) / TotalInvestment');
  val(D, 31, 1, 'Total Net Return'); fml(D, 31, 2, 'SUM(C21:G21)', DOL);
  val(D, 32, 1, 'Total Investment'); fml(D, 32, 2, "'Calc Engine'!B95", DOL);

  // ═══════════════════════════════════════════════════════════════════
  // TAB: SCENARIOS — 3-scenario comparison with formulas
  // ═══════════════════════════════════════════════════════════════════
  const S = wb.addWorksheet('Scenarios', { tabColor: { argb: 'FF9C27B0' } });
  cols(S, [32, 22, 22, 22]);

  hdr(S, 1, 'SCENARIO ANALYSIS', 4);
  tableHeaders(S, 3, ['', 'Conservative', 'Base Case', 'Optimistic']);
  val(S, 4, 1, 'Scenario Multiplier');
  val(S, 4, 2, 0.70, DEC); val(S, 4, 3, 1.00, DEC); val(S, 4, 4, 1.20, DEC);

  sub(S, 6, 'Year-by-Year Net Cash Flows', 4);
  // Year 0 is same for all scenarios
  val(S, 7, 1, 'Year 0');
  for (let s = 0; s < 3; s++) {
    fml(S, 7, s + 2, "-'Calc Engine'!B91", DOL);
  }

  // Years 1-5: each scenario multiplies savings by its multiplier
  for (let y = 1; y <= 5; y++) {
    val(S, 7 + y, 1, `Year ${y}`);
    for (let s = 0; s < 3; s++) {
      const mCell = `$${String.fromCharCode(66 + s)}$4`; // B4, C4, D4
      const formula = `('Calc Engine'!$B$110*Lookups!$D$${103 + y}*${mCell}*(1+Lookups!$B$86)^${y - 1}` +
        `+'Calc Engine'!$B$99*Lookups!$C$${103 + y}*${mCell}*(1+Lookups!$B$86)^${y - 1})` +
        `-'Calc Engine'!$B$94*Lookups!$B$${103 + y}` +
        `-'Calc Engine'!$B$73*Lookups!$F$${103 + y}`;
      fml(S, 7 + y, s + 2, formula, DOL);
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
    // Simplified payback using cumulative check
    const cum0 = `${c}7`;
    const cum1 = `${c}7+${c}8`;
    const cum2 = `${cum1}+${c}9`;
    const cum3 = `${cum2}+${c}10`;
    const cum4 = `${cum3}+${c}11`;
    const cum5 = `${cum4}+${c}12`;
    fml(S, 18, s + 2,
      `IF(${cum0}>=0,0,IF(${cum1}>=0,ROUND(-${cum0}/${c}8*12,0),IF(${cum2}>=0,ROUND(12+(-${cum1})/${c}9*12,0),IF(${cum3}>=0,ROUND(24+(-${cum2})/${c}10*12,0),IF(${cum4}>=0,ROUND(36+(-${cum3})/${c}11*12,0),IF(${cum5}>=0,ROUND(48+(-${cum4})/${c}12*12,0),61))))))`,
      '0', s === 0 ? warnFill : s === 2 ? resultFill : calcFill);
  }

  val(S, 19, 1, '5-Yr Total Net');
  for (let s = 0; s < 3; s++) {
    const c = String.fromCharCode(66 + s);
    fml(S, 19, s + 2, `SUM(${c}8:${c}12)`, DOL,
      s === 0 ? warnFill : s === 2 ? resultFill : calcFill);
  }

  // Probability-weighted expected value
  sub(S, 21, 'Probability-Weighted Expected Value', 4);
  val(S, 22, 1, 'Scenario Weight');
  val(S, 22, 2, 0.25, PCT); val(S, 22, 3, 0.50, PCT); val(S, 22, 4, 0.25, PCT);
  val(S, 23, 1, 'Expected NPV');
  fmlBold(S, 23, 2, 'SUMPRODUCT(B15:D15,B22:D22)', DOL);
  val(S, 24, 1, 'Expected ROIC');
  fmlBold(S, 24, 2, 'SUMPRODUCT(B17:D17,B22:D22)', PCT);

  // ═══════════════════════════════════════════════════════════════════
  // TAB: OPPORTUNITY COST
  // ═══════════════════════════════════════════════════════════════════
  const O = wb.addWorksheet('Opportunity Cost', { tabColor: { argb: 'FFFF5722' } });
  cols(O, [30, 18, 18, 18, 18, 18]);

  hdr(O, 1, 'COST OF INACTION — 5-YEAR', 6);
  tableHeaders(O, 3, ['Component', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5']);

  // Row 4: Forgone Savings = NetAnnualSavings × AdoptRamp
  val(O, 4, 1, 'Forgone Savings');
  for (let y = 1; y <= 5; y++) {
    fml(O, 4, y + 1, `'Calc Engine'!B113*Lookups!D${103 + y}`, DOL);
  }

  // Row 5: Wage Inflation = AnnualLabor × ((1+WageRate)^yr - 1) (compounding)
  val(O, 5, 1, 'Wage Inflation');
  for (let y = 1; y <= 5; y++) {
    fml(O, 5, y + 1, `'Calc Engine'!B25*((1+Lookups!B86)^${y}-1)`, DOL);
  }

  // Row 6: Legacy Creep = ToolCosts × ((1+LegacyRate)^yr - 1) (compounding)
  val(O, 6, 1, 'Legacy System Creep');
  for (let y = 1; y <= 5; y++) {
    fml(O, 6, y + 1, `Inputs!B15*((1+Lookups!B87)^${y}-1)`, DOL);
  }

  // Row 7: Competitive = TotalCurrentCost × ((1+CompPenalty)^yr - 1) (compounding)
  val(O, 7, 1, 'Competitive Penalty');
  for (let y = 1; y <= 5; y++) {
    fml(O, 7, y + 1, `'Calc Engine'!B29*((1+'Calc Engine'!B6)^${y}-1)`, DOL);
  }

  // Row 8: Compliance = TotalCurrentCost × ((1+ComplRisk)^yr - 1) (compounding)
  val(O, 8, 1, 'Compliance Risk');
  for (let y = 1; y <= 5; y++) {
    fml(O, 8, y + 1, `'Calc Engine'!B29*((1+'Calc Engine'!B7)^${y}-1)`, DOL);
  }

  // Row 10: Year Total
  val(O, 10, 1, 'YEAR TOTAL'); O.getRow(10).getCell(1).font = fontBold;
  for (let y = 1; y <= 5; y++) {
    const c = String.fromCharCode(65 + y);
    fmlBold(O, 10, y + 1, `SUM(${c}4:${c}8)`, DOL);
  }

  // Row 11: Cumulative
  val(O, 11, 1, 'CUMULATIVE'); O.getRow(11).getCell(1).font = fontBold;
  fmlBold(O, 11, 2, 'B10', DOL);
  for (let y = 2; y <= 5; y++) {
    const c = String.fromCharCode(65 + y);
    const prev = String.fromCharCode(64 + y);
    fmlBold(O, 11, y + 1, `${prev}11+${c}10`, DOL);
  }

  sub(O, 13, 'Summary', 6);
  val(O, 14, 1, '12-Month Delay'); fmlBold(O, 14, 2, 'B10', DOL);
  val(O, 15, 1, '24-Month Delay'); fmlBold(O, 15, 2, 'B10+C10', DOL);
  val(O, 16, 1, '5-Year Total'); fmlBold(O, 16, 2, 'F11', DOL);

  // ═══════════════════════════════════════════════════════════════════
  // TAB: REVENUE & SCALE
  // ═══════════════════════════════════════════════════════════════════
  const R = wb.addWorksheet('Revenue & Scale', { tabColor: { argb: 'FF00BCD4' } });
  cols(R, [35, 22, 22]);

  hdr(R, 1, 'REVENUE ENABLEMENT (informational — NOT in NPV)', 3);
  val(R, 3, 1, 'Revenue Proxy'); fml(R, 3, 2, "'Calc Engine'!B29*3", DOL);
  note(R, 3, 3, 'Process supports ~3× its cost in revenue');
  val(R, 4, 1, 'Eligible?');
  fml(R, 4, 2, 'IF(COUNTIF(Lookups!A111:A114,Inputs!B10)>0,"Yes","No")');
  val(R, 5, 1, 'TTM Revenue');
  fml(R, 5, 2, "IF(B4=\"Yes\",B3*VLOOKUP(Inputs!B4,Lookups!A16:G25,5,FALSE)*Lookups!B92*'Calc Engine'!B13,0)", DOL);
  val(R, 6, 1, 'CX Revenue');
  fml(R, 6, 2, "IF(B4=\"Yes\",B3*VLOOKUP(Inputs!B4,Lookups!A16:G25,6,FALSE)*Lookups!B92*'Calc Engine'!B13,0)", DOL);
  val(R, 7, 1, 'New Capability Revenue');
  fml(R, 7, 2, "IF(B4=\"Yes\",B3*VLOOKUP(Inputs!B4,Lookups!A16:G25,7,FALSE)*Lookups!B92*'Calc Engine'!B13,0)", DOL);
  val(R, 8, 1, 'Total Annual Revenue'); fmlBold(R, 8, 2, 'B5+B6+B7', DOL);

  hdr(R, 10, 'SCALABILITY PREMIUM', 3);
  tableHeaders(R, 11, ['Volume', 'Traditional Cost', 'AI Cost']);
  val(R, 12, 1, '2× Volume');
  fml(R, 12, 2, "'Calc Engine'!B29*2", DOL);
  fml(R, 12, 3, "'Calc Engine'!B73*1.25", DOL, resultFill);
  val(R, 13, 1, '3× Volume');
  fml(R, 13, 2, "'Calc Engine'!B29*3", DOL);
  fml(R, 13, 3, "'Calc Engine'!B73*1.40", DOL, resultFill);

  hdr(R, 15, 'R&D TAX CREDIT (informational)', 3);
  val(R, 16, 1, 'US-Based?');
  fml(R, 16, 2, 'IF(OR(Inputs!B6="US - Major Tech Hub",Inputs!B6="US - Other"),"Yes","No")');
  val(R, 17, 1, 'Qualified Expenses');
  fml(R, 17, 2, "'Calc Engine'!B55*Lookups!B93", DOL);
  val(R, 18, 1, 'Federal Credit (6.5%)');
  fml(R, 18, 2, 'IF(B16="Yes",B17*Lookups!B94,0)', DOL);
  val(R, 19, 1, 'State Credit');
  fml(R, 19, 2, 'IF(B16="Yes",B17*VLOOKUP(Inputs!B7,Lookups!A67:B79,2,FALSE),0)', DOL);
  val(R, 20, 1, 'Total R&D Credit');
  fmlBold(R, 20, 2, 'B18+B19', DOL);

  // ═══════════════════════════════════════════════════════════════════
  // TAB: DASHBOARD — Executive summary pulling from all tabs
  // ═══════════════════════════════════════════════════════════════════
  const DA = wb.addWorksheet('Dashboard', { tabColor: { argb: `FF${GOLD}` } });
  cols(DA, [35, 25, 45]);

  hdr(DA, 1, 'AI ROI CALCULATOR — EXECUTIVE DASHBOARD', 3);

  sub(DA, 3, 'Bottom Line (Base Case)', 3);
  val(DA, 4, 1, 'Net Present Value (NPV)'); fmlBold(DA, 4, 2, "'5-Year DCF'!B27", DOL);
  val(DA, 5, 1, 'Internal Rate of Return'); fml(DA, 5, 2, "'5-Year DCF'!B28", PCT);
  val(DA, 6, 1, 'ROIC (net profit / total capital)'); fml(DA, 6, 2, "'5-Year DCF'!B30", PCT);
  val(DA, 7, 1, 'Payback Period (months)'); fml(DA, 7, 2, "'5-Year DCF'!B29", '0');
  val(DA, 8, 1, '5-Year Net Savings'); fml(DA, 8, 2, "'5-Year DCF'!G24", DOL);
  note(DA, 8, 3, 'Cumulative undiscounted');

  sub(DA, 10, 'Investment Summary', 3);
  val(DA, 11, 1, 'Upfront Investment'); fml(DA, 11, 2, "'Calc Engine'!B91", DOL);
  val(DA, 12, 1, 'Phased Separation Cost'); fml(DA, 12, 2, "'Calc Engine'!B94", DOL);
  val(DA, 13, 1, 'Total Capital Deployed'); fmlBold(DA, 13, 2, "'Calc Engine'!B95", DOL);
  val(DA, 14, 1, 'Annual Ongoing (Yr1)'); fml(DA, 14, 2, "'Calc Engine'!B73", DOL);

  sub(DA, 16, 'Expected Value (Probability-Weighted)', 3);
  val(DA, 17, 1, 'Expected NPV (25/50/25)'); fmlBold(DA, 17, 2, 'Scenarios!B23', DOL);
  val(DA, 18, 1, 'Expected ROIC'); fml(DA, 18, 2, 'Scenarios!B24', PCT);

  sub(DA, 20, 'Cost of Inaction', 3);
  val(DA, 21, 1, '12-Month Delay Cost'); fml(DA, 21, 2, "'Opportunity Cost'!B14", DOL);
  val(DA, 22, 1, '24-Month Delay Cost'); fml(DA, 22, 2, "'Opportunity Cost'!B15", DOL);
  val(DA, 23, 1, '5-Year Inaction Cost'); fml(DA, 23, 2, "'Opportunity Cost'!B16", DOL);

  sub(DA, 25, 'Key Assumptions', 3);
  val(DA, 26, 1, 'Automation Potential'); fml(DA, 26, 2, "'Calc Engine'!B4", PCT);
  val(DA, 27, 1, 'Industry Success Rate'); fml(DA, 27, 2, "'Calc Engine'!B5", PCT);
  val(DA, 28, 1, 'Risk Multiplier'); fml(DA, 28, 2, "'Calc Engine'!B13", PCT);
  val(DA, 29, 1, 'Discount Rate'); fml(DA, 29, 2, "'Calc Engine'!B16", PCT);
  val(DA, 30, 1, 'Displaced FTEs'); fml(DA, 30, 2, "'Calc Engine'!B34", '0');
  val(DA, 31, 1, 'Retained FTEs'); fml(DA, 31, 2, "'Calc Engine'!B35", '0');

  sub(DA, 33, 'Revenue & Tax (informational — not in NPV)', 3);
  val(DA, 34, 1, 'Revenue Uplift (annual)'); fml(DA, 34, 2, "'Revenue & Scale'!B8", DOL);
  val(DA, 35, 1, 'R&D Tax Credit'); fml(DA, 35, 2, "'Revenue & Scale'!B20", DOL);

  // Conditional formatting on NPV
  DA.addConditionalFormatting({
    ref: 'B4', rules: [
      { type: 'cellIs', operator: 'greaterThan', formulae: ['0'], style: { font: { color: { argb: 'FF2E7D32' }, bold: true } } },
      { type: 'cellIs', operator: 'lessThan', formulae: ['0'], style: { font: { color: { argb: 'FFC62828' }, bold: true } } },
    ]
  });

  val(DA, 37, 1, 'Change any value on the Inputs tab → every cell in this model recalculates automatically.', null, inputFill);
  DA.mergeCells(37, 1, 37, 3);
  DA.getRow(37).getCell(1).font = { ...fontBold, color: { argb: `FF${NAVY}` } };

  // ═══════════════════════════════════════════════════════════════════
  // TAB: SOURCES
  // ═══════════════════════════════════════════════════════════════════
  const SRC = wb.addWorksheet('Sources', { tabColor: { argb: 'FF607D8B' } });
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

  // ═══════════════════════════════════════════════════════════════════
  // Reorder tabs: Dashboard first
  // ═══════════════════════════════════════════════════════════════════
  // ExcelJS orders worksheets by creation order; move Dashboard to position 0
  const dashIdx = wb.worksheets.findIndex(ws => ws.name === 'Dashboard');
  if (dashIdx > 0) {
    const [dash] = wb.worksheets.splice(dashIdx, 1);
    wb.worksheets.unshift(dash);
    // Fix orderNo for proper tab ordering
    wb.worksheets.forEach((ws, i) => { ws.orderNo = i; });
  }

  // ─── Write ──────────────────────────────────────────────────────
  const outputPath = process.argv[2] || path.join(__dirname, '..', 'AI_ROI_Model.xlsx');
  await wb.xlsx.writeFile(outputPath);
  console.log(`\n✓ Formula-driven Excel model generated: ${outputPath}`);
  console.log(`  Tabs: ${wb.worksheets.map(ws => ws.name).join(', ')}`);
  console.log(`  Every calculated cell uses a real Excel formula.`);
  console.log(`  Change any input → entire model recalculates.`);
}

generate().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
