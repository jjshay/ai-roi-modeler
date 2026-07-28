// ---------------------------------------------------------------------------
// Executive PPTX Report Generator
// Produces a branded 11-slide deck matching the executive presentation template.
// Sole output deliverable — data sourced entirely from the calculation model.
// ---------------------------------------------------------------------------
import PptxGenJS from 'pptxgenjs';
import { generateAssessmentId } from '../utils/formatters';
import { getArchetypeById } from '../logic/archetypes';
import { ARCHETYPE_INPUT_MAP } from '../logic/archetypeInputs';
import {
  ADOPTION_RAMP,
  DISCOUNT_RATE,
  MAX_HEADCOUNT_REDUCTION,
} from '../logic/benchmarks';

// ---------------------------------------------------------------------------
// Brand palette (from template)
// ---------------------------------------------------------------------------
const C = {
  navy:       '1A3A6B',
  navyDark:   '0F2548',   // right panel on title slide
  gold:       'C9A227',
  white:      'FFFFFF',
  lightGray:  'D0D8E8',
  midGray:    '4A5568',
  darkText:   '1E293B',
  red:        'C0392B',
  green:      '27AE60',
  amber:      'E67E22',   // orange from template risk badges
  cardBg:     'F4F6FA',   // alternating row bg from template
  cardBgAlt:  'EDF1F9',   // phase card bg from template
  calloutBg:  'EBF2F7',   // note box bg from template
  divider:    '2A4A7A',   // divider lines in right panel
};

// ---------------------------------------------------------------------------
// Slide dimensions: 10" × 5.625" (16:9)
// ---------------------------------------------------------------------------
const W = 10;
const H = 5.625;
const HEADER_H = 0.72;
const FOOTER_H = 0.35;
const FOOTER_Y = H - FOOTER_H;
const ACCENT_W = 0.18;
const CONTENT_Y = HEADER_H + 0.15;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmt$(v) {
  if (v == null || isNaN(v)) return '$0';
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${Math.round(abs / 1e3)}K`;
  return `${sign}$${Math.round(abs).toLocaleString()}`;
}

function fmtFull$(v) {
  if (v == null || isNaN(v)) return '$0';
  const sign = v < 0 ? '-' : '';
  return `${sign}$${Math.abs(Math.round(v)).toLocaleString()}`;
}

function fmtPct(v) {
  if (v == null || isNaN(v) || !isFinite(v)) return 'N/A';
  if (Math.abs(v) > 2) return v > 0 ? '>200%' : '<-200%';
  return `${(v * 100).toFixed(1)}%`;
}

function fmtMo(v) {
  if (!v || v > 60) return '60+ mo';
  return `${v} mo`;
}

function fmtPaybackLabel(v) {
  if (!v || v > 60) return '>60 months';
  return `Month ${v}`;
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function readinessRisk(v) {
  if (v >= 4) return 'LOW RISK';
  if (v === 3) return 'MODERATE';
  return 'HIGH RISK';
}

function readinessBadgeColor(v) {
  if (v >= 4) return C.green;
  if (v === 3) return C.amber;
  return C.red;
}

/**
 * The executive deck needs to make the selected use case legible without
 * exposing implementation details or generic, unused inputs.  This keeps the
 * same four-part structure that appears in the model and export: inputs,
 * assumptions, calculation, and footnote.
 */
function getSelectedCaseGuide(formData = {}) {
  const archetype = getArchetypeById(formData.projectArchetype);
  const schema = ARCHETYPE_INPUT_MAP[formData.projectArchetype];
  const submittedInputs = formData.archetypeInputs || {};

  if (!schema) {
    return {
      label: archetype?.label || 'Selected AI Use Case',
      description: archetype?.description || 'Select a supported AI use case to view its operating drivers.',
      inputRows: [],
      caseGuide: null,
    };
  }

  const inputRows = schema.inputs.map((input) => {
    const rawValue = submittedInputs[input.key] ?? input.default;
    const value = Number(rawValue);
    const numericValue = Number.isFinite(value) ? value : input.default;
    let formatted = String(numericValue);

    if (input.type === 'percent') formatted = fmtPct(numericValue);
    else if (input.format?.startsWith('$')) formatted = fmtFull$(numericValue);
    else if (input.format?.includes('0.0')) formatted = numericValue.toFixed(1);
    else formatted = numericValue.toLocaleString();

    return [input.label, formatted];
  });

  return {
    label: archetype?.label || 'Selected AI Use Case',
    description: archetype?.description || '',
    inputRows,
    caseGuide: schema.caseGuide || null,
  };
}

// ---------------------------------------------------------------------------
// Reusable slide elements
// ---------------------------------------------------------------------------

/** Navy left accent bar on content slides */
function addAccentBar(slide) {
  slide.addShape('rect', {
    x: 0, y: 0, w: ACCENT_W, h: FOOTER_Y,
    fill: { color: C.navy },
  });
}

/** Navy header with white title text */
function addHeader(slide, title) {
  slide.addShape('rect', {
    x: ACCENT_W, y: 0, w: W - ACCENT_W, h: HEADER_H,
    fill: { color: C.navy },
  });
  slide.addText(title, {
    x: 0.38, y: 0.1, w: W - 0.6, h: 0.55,
    fontSize: 25, fontFace: 'Arial', bold: true, color: C.white,
  });
}

/** Footer bar on all slides */
function addFooter(slide, text, fillColor = C.navy) {
  slide.addShape('rect', {
    x: 0, y: FOOTER_Y, w: W, h: FOOTER_H,
    fill: { color: fillColor },
  });
  slide.addText(text, {
    x: 0.25, y: FOOTER_Y + 0.01, w: W - 0.5, h: FOOTER_H - 0.02,
    fontSize: 10, fontFace: 'Arial', bold: true,
    color: fillColor === C.navy ? C.white : C.navy,
    valign: 'middle',
  });
}

/** Navy section title strip with gold text (matching template) */
function addSectionTitle(slide, text, x, y, w) {
  slide.addShape('rect', {
    x, y, w, h: 0.35,
    fill: { color: C.navy },
  });
  slide.addText(text, {
    x: x + 0.1, y, w: w - 0.2, h: 0.35,
    fontSize: 12, fontFace: 'Arial', bold: true, color: C.gold,
    valign: 'middle',
  });
}

/** Standard content slide setup */
function contentSlide(pptx, title, footerText, footerColor = C.navy) {
  const slide = pptx.addSlide();
  slide.background = { color: C.white };
  addAccentBar(slide);
  addHeader(slide, title);
  addFooter(slide, footerText, footerColor);
  return slide;
}

// Table style helpers
const thOpts = (align = 'left') => ({
  bold: true, fontSize: 9, color: C.white, fill: { color: C.navy },
  align, valign: 'middle',
});
const tdOpts = (i, align = 'left', bold = false, color = C.midGray) => ({
  fontSize: 9, color, fill: { color: i % 2 === 0 ? C.cardBg : C.white },
  align, bold, valign: 'middle',
});
const tdBold = (i, align = 'left', color = C.navy) => tdOpts(i, align, true, color);

// ---------------------------------------------------------------------------
// SLIDE 1: Title (split layout)
// ---------------------------------------------------------------------------
function slide1_Title(pptx, formData, results, recommendation, footerText) {
  const slide = pptx.addSlide();
  slide.background = { color: C.navyDark };

  // Small gold accent in top-right corner
  slide.addShape('rect', {
    x: W - 0.8, y: 0, w: 0.8, h: 0.8,
    fill: { color: C.gold },
  });

  // LEFT panel (~56% width) — dark navy
  const leftW = 5.6;
  slide.addShape('rect', {
    x: 0, y: 0, w: leftW, h: H,
    fill: { color: C.navyDark },
  });

  // Gold accent bar on left
  slide.addShape('rect', {
    x: 0.42, y: 0.55, w: 0.1, h: 3.8,
    fill: { color: C.gold },
  });

  // Title text
  slide.addText('AI IMPLEMENTATION', {
    x: 0.72, y: 0.9, w: 4.8, h: 0.55,
    fontSize: 34, fontFace: 'Arial', bold: true, color: C.gold,
  });
  slide.addText('ROI ANALYSIS', {
    x: 0.72, y: 1.46, w: 4.8, h: 0.7,
    fontSize: 48, fontFace: 'Arial', bold: true, color: C.white,
  });

  // Gold divider
  slide.addShape('rect', {
    x: 0.72, y: 2.3, w: 2.8, h: 0.05,
    fill: { color: C.gold },
  });

  // Meta info
  const archetype = getArchetypeById(formData.projectArchetype);
  const archetypeLabel = archetype?.label || formData.projectArchetype || 'AI Project';
  slide.addText(formData.industry || 'N/A', {
    x: 0.72, y: 2.55, w: 4.6, h: 0.35,
    fontSize: 16, fontFace: 'Arial', color: C.lightGray,
  });
  slide.addText(`${formData.companySize || ''}  |  ${formData.teamSize || ''}-Person Team  |  ${archetypeLabel}`, {
    x: 0.72, y: 2.92, w: 4.8, h: 0.3,
    fontSize: 12, fontFace: 'Arial', color: C.lightGray,
  });

  // Prepared by
  slide.addText('Prepared by:', {
    x: 0.72, y: 3.55, w: 2.0, h: 0.28,
    fontSize: 11, fontFace: 'Arial', bold: true, color: C.gold,
  });
  slide.addText('Global Gauntlet AI', {
    x: 0.72, y: 3.83, w: 3.5, h: 0.32,
    fontSize: 15, fontFace: 'Arial', bold: true, color: C.white,
  });

  const assessmentId = generateAssessmentId();
  slide.addText(`JJ Shay  |  ${formatDate()}  |  Assessment ID: ${assessmentId}`, {
    x: 0.72, y: 4.15, w: 4.6, h: 0.28,
    fontSize: 11, fontFace: 'Arial', color: C.lightGray,
  });

  // RIGHT panel — Key Outcomes
  const rightX = 5.8;
  const rightW = 3.9;
  slide.addShape('roundRect', {
    x: rightX - 0.2, y: 0.5, w: rightW + 0.2, h: 4.5,
    fill: { color: C.divider },
    rectRadius: 0.08,
  });

  slide.addText('KEY OUTCOMES', {
    x: rightX, y: 0.75, w: rightW, h: 0.35,
    fontSize: 12, fontFace: 'Arial', bold: true, color: C.gold,
  });

  const base = results.scenarios?.base || {};
  const peer = results.peerComparison || {};
  const metrics = [
    { value: fmtPct(base.roic), label: '5-Year ROIC' },
    { value: fmt$(base.npv != null ? (results.savingsBridge?.netReturn ?? base.npv) : 0), label: 'Net Cumulative Value' },
    { value: fmtMo(base.paybackMonths), label: 'Break-Even' },
    { value: fmtPct(base.irr), label: 'Internal Rate of Return' },
    { value: peer.percentileRank ? `${Math.round(peer.percentileRank)}th` : 'N/A', label: 'Peer Percentile Rank' },
  ];

  metrics.forEach((m, i) => {
    const my = 1.25 + i * 0.72;
    slide.addText(m.value, {
      x: rightX, y: my, w: rightW, h: 0.38,
      fontSize: 27, fontFace: 'Arial', bold: true, color: C.white,
    });
    slide.addText(m.label, {
      x: rightX, y: my + 0.37, w: rightW, h: 0.24,
      fontSize: 10.5, fontFace: 'Arial', color: C.lightGray,
    });
    if (i < metrics.length - 1) {
      slide.addShape('rect', {
        x: rightX + 0.2, y: my + 0.65, w: rightW - 0.4, h: 0.01,
        fill: { color: C.divider },
      });
    }
  });

  // Footer — gold on title slide per template
  addFooter(slide, footerText, C.gold);
}

// ---------------------------------------------------------------------------
// SLIDE 2: Executive Summary
// ---------------------------------------------------------------------------
function slide2_ExecSummary(pptx, formData, results, recommendation, footerText) {
  const slide = contentSlide(pptx, 'Executive Summary', footerText);

  const base = results.scenarios?.base || {};
  const cons = results.scenarios?.conservative || {};
  const opt = results.scenarios?.optimistic || {};

  // Verdict banner — gold fill per template
  slide.addShape('roundRect', {
    x: 0.28, y: 0.87, w: W - 0.56, h: 0.58,
    fill: { color: C.gold },
    rectRadius: 0.06,
  });
  slide.addText(`\u2714  VERDICT: ${recommendation.verdict} \u2014 ${recommendation.headline}`, {
    x: 0.38, y: 0.88, w: W - 0.76, h: 0.55,
    fontSize: 17, fontFace: 'Arial', bold: true, color: C.navy,
    valign: 'middle',
  });

  // 4 metric cards
  const cards = [
    { value: fmtPct(base.roic), label: '5-FY ROIC', sub: `vs. ${Math.round((results.peerComparison?.peerMedian || 0.45) * 100)}% peer median` },
    { value: fmt$(results.savingsBridge?.netReturn ?? base.npv), label: 'Net Cumulative Value', sub: 'Base case, 5-year' },
    { value: fmtMo(base.paybackMonths), label: 'Break-Even', sub: `Month ${opt.paybackMonths || '?'} optimistic` },
    { value: fmt$(results.totalInvestment), label: 'Capital Deployed', sub: 'Upfront + separation' },
  ];

  const cardW = 2.15;
  const cardGap = 0.18;
  const cardStartX = 0.28;
  cards.forEach((c, i) => {
    const cx = cardStartX + i * (cardW + cardGap);
    const cy = 1.62;
    // Card background
    slide.addShape('roundRect', {
      x: cx, y: cy, w: cardW, h: 1.22,
      fill: { color: C.cardBg },
      rectRadius: 0.06,
    });
    // Left accent
    slide.addShape('rect', {
      x: cx, y: cy, w: 0.07, h: 1.22,
      fill: { color: C.gold },
    });
    // Value
    slide.addText(c.value, {
      x: cx + 0.15, y: cy + 0.12, w: cardW - 0.25, h: 0.61,
      fontSize: 36, fontFace: 'Arial', bold: true, color: C.navy,
    });
    // Label
    slide.addText(c.label, {
      x: cx + 0.15, y: cy + 0.72, w: cardW - 0.25, h: 0.22,
      fontSize: 12, fontFace: 'Arial', bold: true, color: C.midGray,
    });
    // Sub
    slide.addText(c.sub, {
      x: cx + 0.15, y: cy + 0.94, w: cardW - 0.25, h: 0.2,
      fontSize: 10, fontFace: 'Arial', color: C.midGray,
    });
  });

  // Three-Scenario Summary section title
  addSectionTitle(slide, 'THREE-SCENARIO SUMMARY', 0.28, 3.05, W - 0.56);

  // Scenario table
  const scenarioData = [
    ['5-Year Cumulative Savings', fmt$(cons.projections?.reduce((s, p) => s + (p.grossSavings || 0), 0) || 0), fmt$(base.projections?.reduce((s, p) => s + (p.grossSavings || 0), 0) || 0), fmt$(opt.projections?.reduce((s, p) => s + (p.grossSavings || 0), 0) || 0)],
    ['Net Present Value (NPV)', fmt$(cons.npv), fmt$(base.npv), fmt$(opt.npv)],
    ['Internal Rate of Return', fmtPct(cons.irr), fmtPct(base.irr), fmtPct(opt.irr)],
    ['ROIC (Avg Annual)', fmtPct(cons.roic), fmtPct(base.roic), fmtPct(opt.roic)],
    ['Payback Period', fmtPaybackLabel(cons.paybackMonths), fmtPaybackLabel(base.paybackMonths), fmtPaybackLabel(opt.paybackMonths)],
  ];

  const rows = [
    [
      { text: 'Metric', options: thOpts() },
      { text: 'Conservative', options: thOpts('center') },
      { text: 'Base Case', options: thOpts('center') },
      { text: 'Optimistic', options: thOpts('center') },
    ],
    ...scenarioData.map((r, i) => [
      { text: r[0], options: tdBold(i) },
      { text: r[1], options: tdOpts(i, 'center') },
      { text: r[2], options: tdOpts(i, 'center', true, C.navy) },
      { text: r[3], options: tdOpts(i, 'center') },
    ]),
  ];

  slide.addTable(rows, {
    x: 0.28, y: 3.42, w: W - 0.56,
    colW: [3.5, 2.0, 2.0, 2.0],
    rowH: 0.27,
    border: { type: 'solid', pt: 0.5, color: 'E2E8F0' },
  });
}

// ---------------------------------------------------------------------------
// SLIDE 3: Current State Analysis
// ---------------------------------------------------------------------------
function slide3_CurrentState(pptx, formData, results, footerText) {
  const slide = contentSlide(pptx, 'Current State Analysis', footerText);
  const cs = results.currentState || {};
  const bm = results.benchmarks || {};
  const archetype = getArchetypeById(formData.projectArchetype);
  const archetypeLabel = archetype?.label || formData.projectArchetype || '';
  const halfW = 4.56;
  const leftX = 0.28;
  const rightX = 5.1;

  // LEFT: Annual Process Cost
  addSectionTitle(slide, 'ANNUAL PROCESS COST', leftX, 0.88, halfW);
  const costRows = [
    [`Annual Labor Cost (${formData.teamSize || 0} FTEs)`, fmtFull$(cs.annualLaborCost)],
    [`Annual Rework Cost (${((formData.errorRate || 0.1) * 100).toFixed(0)}% error rate)`, fmtFull$(cs.annualReworkCost)],
    ['Current Tool/Software Costs', fmtFull$(formData.currentToolCosts || 0)],
    ['Total Annual Process Cost', fmtFull$(cs.totalCurrentCost)],
  ];
  slide.addTable(
    costRows.map((r, i) => [
      { text: r[0], options: i === costRows.length - 1 ? tdBold(i) : tdOpts(i) },
      { text: r[1], options: i === costRows.length - 1 ? tdBold(i, 'right', C.gold) : tdOpts(i, 'right', true, C.navy) },
    ]),
    { x: leftX, y: 1.24, w: halfW, colW: [3.2, 1.36], rowH: 0.28, border: { type: 'solid', pt: 0.5, color: 'E2E8F0' } }
  );

  // LEFT: Hours Analysis
  addSectionTitle(slide, 'HOURS ANALYSIS', leftX, 2.5, halfW);
  const hoursRows = [
    ['Team Size', `${formData.teamSize || 0} people`],
    ['Hours per Person per Week', `${formData.hoursPerWeek || 20} hours`],
    ['Total Weekly Hours', `${(cs.weeklyHours || 0).toLocaleString()} hours`],
    ['Total Annual Hours', `${(cs.annualHours || 0).toLocaleString()} hours`],
  ];
  slide.addTable(
    hoursRows.map((r, i) => [
      { text: r[0], options: tdOpts(i) },
      { text: r[1], options: tdOpts(i, 'right', true, C.navy) },
    ]),
    { x: leftX, y: 2.86, w: halfW, colW: [3.2, 1.36], rowH: 0.28, border: { type: 'solid', pt: 0.5, color: 'E2E8F0' } }
  );

  // RIGHT: Key Parameters
  addSectionTitle(slide, 'KEY PARAMETERS', rightX, 0.88, halfW);
  const params = [
    ['Industry', formData.industry || 'N/A'],
    ['Company Size', formData.companySize || 'N/A'],
    ['Project Archetype', archetypeLabel],
    ['Automation Potential', `${Math.round((bm.automationPotential || 0) * 100)}%`],
    ['Industry Success Rate', `${Math.round((bm.industrySuccessRate || 0) * 100)}%`],
  ];
  params.forEach((p, i) => {
    const py = 1.3 + i * 0.42;
    slide.addShape('rect', {
      x: rightX, y: py, w: halfW, h: 0.38,
      fill: { color: i % 2 === 0 ? C.cardBg : C.white },
    });
    slide.addText(p[0], {
      x: rightX + 0.1, y: py, w: 2.0, h: 0.38,
      fontSize: 12, fontFace: 'Arial', color: C.midGray, valign: 'middle',
    });
    slide.addText(p[1], {
      x: rightX + 2.2, y: py, w: 2.26, h: 0.38,
      fontSize: 12, fontFace: 'Arial', bold: true, color: C.navy, valign: 'middle',
    });
  });

  // RIGHT: Total Annual Cost callout
  slide.addShape('roundRect', {
    x: rightX, y: 3.5, w: halfW, h: 1.35,
    fill: { color: C.navy },
    rectRadius: 0.08,
  });
  slide.addText(fmtFull$(cs.totalCurrentCost), {
    x: rightX + 0.1, y: 3.55, w: halfW - 0.2, h: 0.7,
    fontSize: 38, fontFace: 'Arial', bold: true, color: C.gold,
  });
  slide.addText('Total Annual Process Cost \u2014 Baseline for ROI Model', {
    x: rightX + 0.1, y: 4.3, w: halfW - 0.2, h: 0.38,
    fontSize: 11, fontFace: 'Arial', color: C.lightGray,
  });
}

// ---------------------------------------------------------------------------
// SLIDE 4: Selected AI Use Case — Inputs, Assumptions & Calculation
// ---------------------------------------------------------------------------
function slide4_UseCaseGuide(pptx, formData, footerText) {
  const slide = contentSlide(pptx, 'Selected AI Use Case', footerText);
  const selectedCase = getSelectedCaseGuide(formData);

  slide.addText(selectedCase.label, {
    x: 0.28, y: 0.88, w: 4.56, h: 0.35,
    fontSize: 18, fontFace: 'Arial', bold: true, color: C.navy,
  });
  slide.addText(selectedCase.description, {
    x: 0.28, y: 1.18, w: 9.36, h: 0.3,
    fontSize: 9, fontFace: 'Arial', color: C.midGray, italic: true,
  });

  addSectionTitle(slide, '1. INPUTS', 0.28, 1.58, 4.56);
  const inputRows = selectedCase.inputRows.length > 0
    ? selectedCase.inputRows
    : [['No supported case inputs found', 'Select a current AI use case']];
  slide.addTable([
    [
      { text: 'Case input', options: thOpts() },
      { text: 'Value', options: thOpts('right') },
    ],
    ...inputRows.map((row, i) => [
      { text: row[0], options: tdOpts(i) },
      { text: row[1], options: tdOpts(i, 'right', true, C.navy) },
    ]),
  ], {
    x: 0.28, y: 1.95, w: 4.56,
    colW: [3.35, 1.21], rowH: 0.32,
    border: { type: 'solid', pt: 0.5, color: 'E2E8F0' },
  });

  const guide = selectedCase.caseGuide || {
    assumption: 'Choose one of the four supported use cases to load its specific guardrails.',
    calculation: 'The model cannot calculate a case-specific ROI until a supported use case is selected.',
    footnote: 'Retired use cases are intentionally excluded from the financial model.',
  };

  const addGuideCard = (title, text, y, h, fill) => {
    slide.addShape('roundRect', {
      x: 5.1, y, w: 4.54, h,
      fill: { color: fill },
      rectRadius: 0.06,
      line: { color: C.lightGray, width: 0.5 },
    });
    slide.addText(title, {
      x: 5.24, y: y + 0.08, w: 4.25, h: 0.22,
      fontSize: 9, fontFace: 'Arial', bold: true, color: C.navy,
    });
    slide.addText(text, {
      x: 5.24, y: y + 0.31, w: 4.18, h: h - 0.4,
      fontSize: 8.5, fontFace: 'Arial', color: C.darkText,
      breakLine: false, margin: 0,
      valign: 'mid',
    });
  };

  // The sections are deliberately in business-user order. These are not
  // independent estimates: they document exactly how the selected case enters
  // the model before the broader DCF and scenario analysis.
  addGuideCard('2. ASSUMPTION', guide.assumption, 1.58, 1.02, C.cardBgAlt);
  addGuideCard('3. CALCULATION', guide.calculation, 2.74, 1.20, C.cardBg);
  addGuideCard('4. FOOTNOTE', guide.footnote, 4.08, 0.82, C.calloutBg);
}

// ---------------------------------------------------------------------------
// SLIDE 5: AI Investment & Cost Model
// ---------------------------------------------------------------------------
function slide4_InvestmentCost(pptx, formData, results, footerText) {
  const slide = contentSlide(pptx, 'AI Investment & Cost Model', footerText);
  const ai = results.aiCostModel || {};
  const oc = results.oneTimeCosts || {};
  const hc = results.hiddenCosts || {};
  const halfW = 4.56;
  const leftX = 0.28;
  const rightX = 5.1;

  // LEFT: Implementation Costs
  addSectionTitle(slide, 'IMPLEMENTATION COSTS', leftX, 0.88, halfW);
  const implRows = [
    [`AI/ML Engineers (${ai.implEngineers || 0} FTE \u00d7 ${(ai.implTimelineYears || 0).toFixed(1)}yr)`, fmtFull$(ai.implEngineeringCost)],
    [`Project Management (${ai.implPMs || 0} FTE \u00d7 ${(ai.implTimelineYears || 0).toFixed(1)}yr)`, fmtFull$(ai.implPMCost)],
    [`Infrastructure & Tooling (12%)`, fmtFull$(ai.implInfraCost)],
    [`Training & Knowledge Transfer (8%)`, fmtFull$(ai.implTrainingCost)],
    [`Change Management (15%)`, fmtFull$(hc.changeManagement)],
    ['Data Cleanup & Integration', fmtFull$(hc.dataCleanup)],
    [`Productivity Dip`, fmtFull$(hc.productivityDip)],
    ['Legal, Security & Contingency', fmtFull$((oc.legalComplianceCost || 0) + (oc.securityAuditCost || 0) + (oc.contingencyReserve || 0))],
    ['Total Upfront Investment', fmtFull$(results.upfrontInvestment)],
  ];
  slide.addTable(
    implRows.map((r, i) => [
      { text: r[0], options: i === implRows.length - 1 ? tdBold(i, 'left', C.navy) : tdOpts(i) },
      { text: r[1], options: i === implRows.length - 1 ? tdBold(i, 'right', C.gold) : tdOpts(i, 'right', true, C.navy) },
    ]),
    { x: leftX, y: 1.24, w: halfW, colW: [3.4, 1.16], rowH: 0.24, border: { type: 'solid', pt: 0.5, color: 'E2E8F0' } }
  );

  // RIGHT: Separation & Ongoing Costs
  addSectionTitle(slide, 'SEPARATION & ONGOING COSTS', rightX, 0.88, halfW);
  const sepBreakdown = oc.separationBreakdown || {};
  const sepRows = Object.values(sepBreakdown).map(item => [item.label, fmtFull$(item.total)]);
  sepRows.push(['Total Separation Costs', fmtFull$(oc.totalSeparationCost)]);
  slide.addTable(
    sepRows.map((r, i) => [
      { text: r[0], options: i === sepRows.length - 1 ? tdBold(i, 'left', C.navy) : tdOpts(i) },
      { text: r[1], options: i === sepRows.length - 1 ? tdBold(i, 'right', C.gold) : tdOpts(i, 'right', true, C.navy) },
    ]),
    { x: rightX, y: 1.24, w: halfW, colW: [3.4, 1.16], rowH: 0.28, border: { type: 'solid', pt: 0.5, color: 'E2E8F0' } }
  );

  // RIGHT: Ongoing AI Operations — gray header per template
  const ongoingY = 1.24 + (sepRows.length + 0.3) * 0.28 + 0.2;
  slide.addShape('rect', {
    x: rightX, y: ongoingY, w: halfW, h: 0.3,
    fill: { color: C.midGray },
  });
  slide.addText('ONGOING AI OPERATIONS (Annual)', {
    x: rightX + 0.1, y: ongoingY, w: halfW - 0.2, h: 0.3,
    fontSize: 10.5, fontFace: 'Arial', bold: true, color: C.white, valign: 'middle',
  });

  const ongoingRows = [
    [`AI Ops Team (${(ai.ongoingAiHeadcount || 0.5).toFixed(1)} FTE)`, `${fmtFull$(ai.ongoingAiLaborCost)}/yr`],
    ['API / Inference', `${fmtFull$(ai.annualApiCost)}/yr`],
    ['Platform & Licenses', `${fmtFull$(ai.annualLicenseCost)}/yr`],
    ['Monitoring, Compliance, Insurance', `${fmtFull$((ai.annualComplianceCost || 0) + (ai.cyberInsuranceCost || 0))}/yr`],
    ['FY1 Ongoing (model-adjusted)', `${fmtFull$(ai.ongoingCostsByYear?.[0] || ai.baseOngoingCost)}/yr`],
  ];
  slide.addTable(
    ongoingRows.map((r, i) => [
      { text: r[0], options: tdOpts(i) },
      { text: r[1], options: tdOpts(i, 'right', i === ongoingRows.length - 1, C.navy) },
    ]),
    { x: rightX, y: ongoingY + 0.32, w: halfW, colW: [3.2, 1.36], rowH: 0.24, border: { type: 'solid', pt: 0.5, color: 'E2E8F0' } }
  );

  // Total Capital callout — gold fill per template
  slide.addShape('roundRect', {
    x: leftX, y: 4.3, w: halfW, h: 0.75,
    fill: { color: C.gold },
    rectRadius: 0.06,
  });
  slide.addText('Total Capital Deployed (Upfront + Separation):', {
    x: leftX + 0.1, y: 4.33, w: 2.8, h: 0.35,
    fontSize: 11, fontFace: 'Arial', bold: true, color: C.navy,
  });
  slide.addText(fmtFull$(results.totalInvestment), {
    x: leftX + 2.9, y: 4.3, w: 1.5, h: 0.75,
    fontSize: 25, fontFace: 'Arial', bold: true, color: C.navy, valign: 'middle',
  });
}

// ---------------------------------------------------------------------------
// SLIDE 5: 5-Year Cash Flow Projection
// ---------------------------------------------------------------------------
function slide5_CashFlow(pptx, results, footerText) {
  const slide = contentSlide(pptx, '5-Year Cash Flow Projection', footerText);
  const base = results.scenarios?.base || {};
  const cons = results.scenarios?.conservative || {};
  const opt = results.scenarios?.optimistic || {};
  const proj = base.projections || [];
  const halfW = 4.7;
  const leftX = 0.28;
  const rightX = 5.2;

  // LEFT: Cash flow table
  const header = [
    { text: 'Year', options: thOpts('center') },
    { text: 'Gross Savings', options: thOpts('right') },
    { text: 'AI Costs', options: thOpts('right') },
    { text: 'Net Cash Flow', options: thOpts('right') },
    { text: 'Cumulative', options: thOpts('right') },
  ];

  let cumulative = -results.upfrontInvestment;
  const cfRows = proj.map((yr, i) => {
    const gross = yr.grossSavings || 0;
    const aiCosts = (yr.ongoingCost || 0) + (yr.separationCost || 0);
    const net = yr.netCashFlow || (gross - aiCosts);
    cumulative += net;
    return [
      { text: `FY ${i + 1}`, options: tdBold(i, 'center') },
      { text: fmt$(gross), options: tdOpts(i, 'right') },
      { text: fmt$(aiCosts), options: tdOpts(i, 'right') },
      { text: fmt$(net), options: tdOpts(i, 'right', true, net >= 0 ? C.green : C.red) },
      { text: fmt$(cumulative), options: tdOpts(i, 'right', true, cumulative >= 0 ? C.green : C.red) },
    ];
  });

  slide.addTable([header, ...cfRows], {
    x: leftX, y: 0.88, w: halfW,
    colW: [0.6, 1.05, 0.95, 1.05, 1.05],
    rowH: 0.27,
    border: { type: 'solid', pt: 0.5, color: 'E2E8F0' },
  });

  // Note box — callout bg per template
  const noteY = 0.88 + (cfRows.length + 1) * 0.27 + 0.15;
  slide.addShape('roundRect', {
    x: leftX, y: noteY, w: halfW, h: 0.62,
    fill: { color: C.calloutBg },
    rectRadius: 0.06,
  });
  slide.addShape('rect', {
    x: leftX, y: noteY, w: 0.07, h: 0.62,
    fill: { color: C.gold },
  });
  const retainedFTEs = results.oneTimeCosts?.retainedFTEs;
  slide.addText(
    `FY1 is enhancement only \u2014 no headcount separation until FY2.\n${retainedFTEs != null ? retainedFTEs : ''} roles retained permanently (${Math.round(MAX_HEADCOUNT_REDUCTION * 100)}% always-human threshold).`,
    {
      x: leftX + 0.15, y: noteY + 0.05, w: halfW - 0.3, h: 0.52,
      fontSize: 10.5, fontFace: 'Arial', color: C.midGray, lineSpacingMultiple: 1.3,
    }
  );

  // Break-even banner
  const beY = noteY + 0.72;
  slide.addShape('roundRect', {
    x: leftX, y: beY, w: halfW, h: 0.55,
    fill: { color: C.navy },
    rectRadius: 0.06,
  });
  slide.addText(
    `Break-Even: ${fmtPaybackLabel(base.paybackMonths)}  (Base Case)  |  ${fmtPaybackLabel(opt.paybackMonths)} (Optimistic)  |  ${fmtPaybackLabel(cons.paybackMonths)} (Conservative)`,
    {
      x: leftX + 0.1, y: beY, w: halfW - 0.2, h: 0.55,
      fontSize: 11, fontFace: 'Arial', bold: true, color: C.gold, valign: 'middle',
    }
  );

  // RIGHT: Chart — cumulative cash flow line chart
  let chartCumulative = -results.upfrontInvestment;
  const chartData = proj.map((yr) => {
    chartCumulative += yr.netCashFlow || 0;
    return chartCumulative;
  });

  slide.addChart('line', [
    { name: 'Cumulative', labels: ['FY1', 'FY2', 'FY3', 'FY4', 'FY5'], values: chartData },
  ], {
    x: rightX, y: 0.88, w: 4.5, h: 3.2,
    showTitle: true, title: 'Cumulative Cash Flow (Base Case)',
    titleColor: C.navy, titleFontSize: 12,
    showValue: true, valueFontSize: 9, valueColor: C.navy,
    catAxisLabelColor: C.midGray, catAxisLabelFontSize: 10,
    valAxisLabelColor: C.midGray, valAxisLabelFontSize: 9,
    lineDataSymbol: 'circle', lineDataSymbolSize: 8,
    chartColors: [C.gold],
    plotArea: { fill: { color: C.calloutBg } },
  });

  // Financial metrics box
  slide.addShape('roundRect', {
    x: rightX, y: 4.2, w: 4.5, h: 0.9,
    fill: { color: C.navy },
    rectRadius: 0.06,
  });
  slide.addText(`NPV: ${fmtFull$(base.npv)}  |  IRR: ${fmtPct(base.irr)}  |  EVA: ${fmt$(results.capitalEfficiency?.annualEVA || 0)}/yr`, {
    x: rightX + 0.1, y: 4.22, w: 4.3, h: 0.4,
    fontSize: 16, fontFace: 'Arial', bold: true, color: C.gold,
  });
  slide.addText(`Excess return over WACC (${Math.round((results.discountRate || DISCOUNT_RATE) * 100)}%): +${((base.irr || 0) * 100 - (results.discountRate || DISCOUNT_RATE) * 100).toFixed(1)} percentage points`, {
    x: rightX + 0.1, y: 4.62, w: 4.3, h: 0.32,
    fontSize: 11, fontFace: 'Arial', color: C.lightGray,
  });
}

// ---------------------------------------------------------------------------
// SLIDE 6: Value Creation Breakdown
// ---------------------------------------------------------------------------
const positiveAmount = (value) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;

/**
 * Executive-report categories intentionally omit legacy archetypeRevenue.
 * The only customer-specific cash item displayed is a validated support-cost
 * avoidance amount returned by the calculation model.
 */
export function getExecutiveValueCategories(valueBreakdown = {}) {
  const categories = [
    { key: 'headcount', name: 'Headcount Optimization' },
    { key: 'efficiency', name: 'Efficiency Gains' },
    { key: 'errorReduction', name: 'Error Reduction' },
    { key: 'toolReplacement', name: 'Tool Replacement' },
  ].map(({ key, name }) => ({
    key,
    name,
    gross: positiveAmount(valueBreakdown[key]?.gross),
    riskAdjusted: positiveAmount(valueBreakdown[key]?.riskAdjusted),
  }));

  if (positiveAmount(valueBreakdown.contractExit?.gross) > 0 || positiveAmount(valueBreakdown.contractExit?.riskAdjusted) > 0) {
    categories.push({
      key: 'contractExit',
      name: 'Existing contract savings',
      gross: positiveAmount(valueBreakdown.contractExit?.gross),
      riskAdjusted: positiveAmount(valueBreakdown.contractExit?.riskAdjusted),
    });
  }

  if (positiveAmount(valueBreakdown.caseDirectSavings?.gross) > 0 || positiveAmount(valueBreakdown.caseDirectSavings?.riskAdjusted) > 0) {
    const suppliedLabel = typeof valueBreakdown.caseDirectSavings?.label === 'string'
      ? valueBreakdown.caseDirectSavings.label.trim()
      : '';
    categories.push({
      key: 'caseDirectSavings',
      name: suppliedLabel && !/revenue/i.test(suppliedLabel)
        ? suppliedLabel
        : 'Verified customer support cost avoidance',
      gross: positiveAmount(valueBreakdown.caseDirectSavings?.gross),
      riskAdjusted: positiveAmount(valueBreakdown.caseDirectSavings?.riskAdjusted),
    });
  }

  return categories.filter((category) => category.gross > 0 || category.riskAdjusted > 0);
}

function slide6_ValueBreakdown(pptx, results, footerText) {
  const slide = contentSlide(pptx, 'Value Creation Breakdown', footerText);
  const vb = results.valueBreakdown || {};
  const leftX = 0.28;
  const rightX = 5.0;

  // LEFT: Pie chart of value categories
  const categories = getExecutiveValueCategories(vb);

  if (categories.length > 0) {
    slide.addChart('pie', [{
      name: 'Value Breakdown',
      labels: categories.map((category) => category.name),
      values: categories.map((category) => category.riskAdjusted),
    }], {
      x: leftX, y: 0.9, w: 4.0, h: 3.5,
      showTitle: false,
      showLegend: true, legendPos: 'b', legendFontSize: 9, legendColor: C.midGray,
      showValue: false,
      showPercent: true,
      chartColors: [C.navy, C.gold, '4A90D9', '7B8794', '6366F1', '0891B2'],
      dataLabelPosition: 'outEnd',
      dataLabelColor: C.navy,
      dataLabelFontSize: 10,
    });
  }

  // RIGHT: Gross vs Risk-Adjusted table
  addSectionTitle(slide, 'GROSS vs. RISK-ADJUSTED SAVINGS', rightX, 0.88, 4.72);
  const totalGross = categories.reduce((sum, category) => sum + category.gross, 0);
  const totalRA = categories.reduce((sum, category) => sum + category.riskAdjusted, 0);
  const vbRows = [
    ...categories.map((category) => [
      category.name,
      fmtFull$(category.gross),
      fmtFull$(category.riskAdjusted),
      totalRA > 0 ? `${Math.round((category.riskAdjusted / totalRA) * 100)}%` : '0%',
    ]),
    ['TOTAL', fmtFull$(totalGross), fmtFull$(totalRA), '100%'],
  ];

  slide.addTable([
    [
      { text: 'Category', options: thOpts() },
      { text: 'Gross Annual', options: thOpts('right') },
      { text: 'Risk-Adjusted', options: thOpts('right') },
      { text: '% of Total', options: thOpts('right') },
    ],
    ...vbRows.map((r, i) => [
      { text: r[0], options: i === vbRows.length - 1 ? tdBold(i) : tdOpts(i) },
      { text: r[1], options: tdOpts(i, 'right') },
      { text: r[2], options: tdOpts(i, 'right', true, C.navy) },
      { text: r[3], options: tdOpts(i, 'right') },
    ]),
  ], {
    x: rightX, y: 1.24, w: 4.72,
    colW: [1.8, 1.0, 1.0, 0.92],
    rowH: 0.22,
    border: { type: 'solid', pt: 0.5, color: 'E2E8F0' },
  });

  // Phased Value Timeline — gray header per template
  const phaseY = Math.max(3.0, 1.24 + (vbRows.length + 1) * 0.22 + 0.08);
  slide.addShape('rect', {
    x: rightX, y: phaseY, w: 4.72, h: 0.3,
    fill: { color: C.midGray },
  });
  slide.addText('PHASED VALUE REALIZATION TIMELINE', {
    x: rightX + 0.1, y: phaseY, w: 4.52, h: 0.3,
    fontSize: 10.5, fontFace: 'Arial', bold: true, color: C.white, valign: 'middle',
  });

  const phases = results.phasedTimeline || [];
  const phaseCardW = 1.12;
  phases.slice(0, 4).forEach((ph, i) => {
    const px = rightX + 0.04 + i * (phaseCardW + 0.08);
    const py = phaseY + 0.38;
    const isLater = i >= 2;
    slide.addShape('roundRect', {
      x: px, y: py, w: phaseCardW, h: 1.55,
      fill: { color: isLater ? C.navy : C.cardBgAlt },
      rectRadius: 0.06,
    });
    // Gold arrow dot between cards
    if (i < 3 && i < phases.length - 1) {
      slide.addShape('ellipse', {
        x: px + phaseCardW + 0.01, y: py + 0.65, w: 0.06, h: 0.06,
        fill: { color: C.gold },
      });
    }
    slide.addText(`Phase ${ph.phase}\nMo ${ph.monthRange[0]}\u2013${ph.monthRange[1]}`, {
      x: px + 0.02, y: py + 0.05, w: phaseCardW - 0.04, h: 0.42,
      fontSize: 10, fontFace: 'Arial', bold: true,
      color: isLater ? C.gold : C.navy, lineSpacingMultiple: 1.2,
    });
    slide.addText(fmt$(ph.estimatedValue) + '/yr', {
      x: px + 0.02, y: py + 0.5, w: phaseCardW - 0.04, h: 0.38,
      fontSize: 15, fontFace: 'Arial', bold: true,
      color: isLater ? C.white : C.navy,
    });
    slide.addText(ph.label, {
      x: px + 0.02, y: py + 0.95, w: phaseCardW - 0.04, h: 0.38,
      fontSize: 9.5, fontFace: 'Arial',
      color: isLater ? C.lightGray : C.midGray, lineSpacingMultiple: 1.2,
    });
  });
}

// ---------------------------------------------------------------------------
// SLIDE 7: Risk Assessment & Sensitivity Analysis
// ---------------------------------------------------------------------------
function slide7_RiskSensitivity(pptx, formData, results, footerText) {
  const slide = contentSlide(pptx, 'Risk Assessment & Sensitivity Analysis', footerText);
  const halfW = 4.56;
  const leftX = 0.28;
  const rightX = 5.1;

  // LEFT: Risk Factors
  addSectionTitle(slide, 'RISK FACTORS', leftX, 0.88, halfW);

  const risks = [
    { label: 'Change Readiness', value: `${formData.changeReadiness || 3}/5`, badge: readinessRisk(formData.changeReadiness), badgeColor: readinessBadgeColor(formData.changeReadiness) },
    { label: 'Data Readiness', value: `${formData.dataReadiness || 3}/5`, badge: readinessRisk(formData.dataReadiness), badgeColor: readinessBadgeColor(formData.dataReadiness) },
    { label: 'Executive Sponsor', value: formData.execSponsor ? 'YES' : 'NO', badge: formData.execSponsor ? 'LOW RISK' : 'HIGH RISK', badgeColor: formData.execSponsor ? C.green : C.red },
    { label: 'Industry Success Rate', value: `${Math.round((results.benchmarks?.industrySuccessRate || 0) * 100)}%`, badge: (results.benchmarks?.industrySuccessRate || 0) >= 0.6 ? 'FAVORABLE' : 'MODERATE', badgeColor: (results.benchmarks?.industrySuccessRate || 0) >= 0.6 ? C.green : C.amber },
    { label: 'Vendor Lock-In Risk', value: results.vendorLockIn?.level || 'MEDIUM', badge: results.vendorLockIn?.level === 'LOW' ? 'LOW RISK' : 'MONITOR', badgeColor: results.vendorLockIn?.level === 'LOW' ? C.green : C.amber },
  ];

  risks.forEach((r, i) => {
    const ry = 1.3 + i * 0.42;
    slide.addShape('rect', {
      x: leftX, y: ry, w: halfW, h: 0.42,
      fill: { color: i % 2 === 0 ? C.cardBg : C.white },
    });
    slide.addText(r.label, {
      x: leftX + 0.12, y: ry, w: 1.9, h: 0.42,
      fontSize: 12, fontFace: 'Arial', color: C.midGray, valign: 'middle',
    });
    slide.addText(r.value, {
      x: leftX + 2.1, y: ry, w: 0.9, h: 0.42,
      fontSize: 12, fontFace: 'Arial', bold: true, color: C.navy, valign: 'middle',
    });
    slide.addShape('roundRect', {
      x: leftX + 3.1, y: ry + 0.08, w: 1.3, h: 0.26,
      fill: { color: r.badgeColor },
      rectRadius: 0.04,
    });
    slide.addText(r.badge, {
      x: leftX + 3.1, y: ry + 0.08, w: 1.3, h: 0.26,
      fontSize: 9.5, fontFace: 'Arial', bold: true, color: C.white,
      align: 'center', valign: 'middle',
    });
  });

  // LEFT: Adoption Ramp — gray header per template
  const rampY = 3.5;
  slide.addShape('rect', {
    x: leftX, y: rampY, w: halfW, h: 0.3,
    fill: { color: C.midGray },
  });
  slide.addText('ADOPTION RAMP', {
    x: leftX + 0.1, y: rampY, w: halfW - 0.2, h: 0.3,
    fontSize: 10.5, fontFace: 'Arial', bold: true, color: C.white, valign: 'middle',
  });

  const ramp = results.adoptionRamp || ADOPTION_RAMP;
  const rampLabels = ['FY1', 'FY2', 'FY3+'];
  const rampValues = [ramp[0], ramp[1], ramp[2] || 1.0];
  const rampCardW = 1.3;
  rampLabels.forEach((lbl, i) => {
    const rx = leftX + 0.1 + i * (rampCardW + 0.15);
    const ry2 = rampY + 0.4;
    const isLast = i === rampLabels.length - 1;
    slide.addShape('roundRect', {
      x: rx, y: ry2, w: rampCardW, h: 0.6,
      fill: { color: isLast ? C.navy : C.cardBgAlt },
      rectRadius: 0.06,
    });
    slide.addText(lbl, {
      x: rx, y: ry2, w: rampCardW, h: 0.22,
      fontSize: 11, fontFace: 'Arial', bold: true,
      color: isLast ? C.gold : C.midGray, align: 'center',
    });
    slide.addText(`${Math.round(rampValues[i] * 100)}%`, {
      x: rx, y: ry2 + 0.22, w: rampCardW, h: 0.3,
      fontSize: 18, fontFace: 'Arial', bold: true,
      color: isLast ? C.white : C.navy, align: 'center',
    });
  });

  // RIGHT: Sensitivity Analysis bar chart
  addSectionTitle(slide, 'SENSITIVITY ANALYSIS \u2014 NPV IMPACT', rightX, 0.88, halfW);

  const sens = results.sensitivity || {};
  const baseNPV = sens.quickBaseNPV || results.scenarios?.base?.npv || 0;
  const sensItems = [
    { label: 'Lower Adoption (-20%)', delta: sens.lowerAdoptionDelta || 0 },
    { label: 'Higher Costs (+30%)', delta: sens.higherCostsDelta || 0 },
    { label: 'Double Timeline', delta: sens.doubleTimelineDelta || 0 },
  ];

  // Extended sensitivity if available
  const extSens = results.extendedSensitivity || [];
  extSens.slice(0, 3).forEach(item => {
    if (item && item.label && item.npvLow != null) {
      sensItems.push({ label: item.label, delta: item.npvLow - baseNPV });
    }
  });

  if (sensItems.length > 0) {
    slide.addChart('bar', [{
      name: 'NPV Delta',
      labels: sensItems.map(s => s.label),
      values: sensItems.map(s => Math.round(s.delta)),
    }], {
      x: rightX, y: 1.24, w: halfW, h: 2.5,
      showTitle: false,
      barDir: 'bar',
      barGrouping: 'clustered',
      catAxisLabelColor: C.midGray, catAxisLabelFontSize: 9,
      valAxisLabelColor: C.midGray, valAxisLabelFontSize: 8,
      chartColors: [C.navy],
      showValue: true, valueFontSize: 8, valueColor: C.navy,
      valAxisNumFmt: '$#,##0',
    });
  }

  // Key Insight box — callout bg per template
  const insightY = 3.86;
  slide.addShape('roundRect', {
    x: rightX, y: insightY, w: halfW, h: 0.82,
    fill: { color: C.calloutBg },
    rectRadius: 0.06,
  });
  slide.addShape('rect', {
    x: rightX, y: insightY, w: 0.07, h: 0.82,
    fill: { color: C.gold },
  });
  slide.addText('KEY INSIGHT', {
    x: rightX + 0.15, y: insightY + 0.04, w: halfW - 0.3, h: 0.25,
    fontSize: 10.5, fontFace: 'Arial', bold: true, color: C.navy,
  });

  // Find the largest sensitivity driver
  const biggest = sensItems.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
  const insightText = biggest
    ? `${biggest.label} is the #1 risk driver (${fmt$(biggest.delta)} NPV impact). Prioritize change management investment \u2014 minimum 15% of implementation budget. Organizations with structured change programs are 6\u00d7 more likely to meet adoption targets.`
    : 'Risk analysis complete. Monitor adoption rates and adjust change management budget accordingly.';
  slide.addText(insightText, {
    x: rightX + 0.15, y: insightY + 0.28, w: halfW - 0.3, h: 0.5,
    fontSize: 10.5, fontFace: 'Arial', color: C.midGray, lineSpacingMultiple: 1.2,
  });
}

// ---------------------------------------------------------------------------
// SLIDE 8: Capital Allocation: AI vs. Alternatives
// ---------------------------------------------------------------------------
function slide8_CapitalAllocation(pptx, results, footerText) {
  const slide = contentSlide(pptx, 'Capital Allocation: AI vs. Alternatives', footerText);
  const wf = results.workforceAlternatives || {};

  const alternatives = [
    {
      tag: 'RECOMMENDED', tagColor: C.green, bgColor: C.navy, textColor: C.white, accentColor: C.gold,
      title: 'AI\nAutomation',
      upfront: fmt$(wf.aiInvestment?.upfrontCost || results.upfrontInvestment),
      fiveYear: `+${fmt$(wf.aiInvestment?.annual5YearNet || 0)}`,
      fiveYearColor: C.gold,
      roic: fmtPct(wf.aiInvestment?.roi || results.scenarios?.base?.roic),
      payback: fmtMo(wf.aiInvestment?.paybackMonths || results.scenarios?.base?.paybackMonths),
      risk: `Risk: ${wf.aiInvestment?.riskLevel || 'Medium'}`,
    },
    {
      tag: 'HIGH COST', tagColor: C.red, bgColor: C.cardBg, textColor: C.navy, accentColor: C.red,
      title: 'Hire\nMore Staff',
      upfront: '$0',
      fiveYear: fmt$(-(wf.hiring?.total5YearCost || 0)),
      fiveYearColor: C.red,
      roic: 'N/A',
      payback: 'Never',
      risk: `Risk: ${wf.hiring?.riskLevel || 'Low'}`,
    },
    {
      tag: 'MODERATE', tagColor: C.amber, bgColor: C.cardBg, textColor: C.navy, accentColor: C.amber,
      title: 'Outsource\n/ BPO',
      upfront: '$0',
      fiveYear: fmt$(wf.outsourcing?.total5YearNet || 0),
      fiveYearColor: (wf.outsourcing?.total5YearNet || 0) >= 0 ? C.green : C.red,
      roic: 'N/A',
      payback: 'Never',
      risk: `Risk: ${wf.outsourcing?.riskLevel || 'Low-Med'}`,
    },
    {
      tag: 'AVOID', tagColor: C.red, bgColor: C.cardBg, textColor: C.navy, accentColor: C.red,
      title: 'Do\nNothing',
      upfront: '$0',
      fiveYear: fmt$(-(wf.statusQuo?.total5YearCost || 0)),
      fiveYearColor: C.red,
      roic: 'N/A',
      payback: 'Never',
      risk: `Risk: ${wf.statusQuo?.riskLevel || 'HIGH'}`,
    },
  ];

  const cardW = 2.2;
  const cardH = 4.15;
  alternatives.forEach((alt, i) => {
    const cx = 0.28 + i * (cardW + 0.12);
    const cy = 0.9;

    // Card background
    slide.addShape('roundRect', {
      x: cx, y: cy, w: cardW, h: cardH,
      fill: { color: alt.bgColor },
      rectRadius: 0.08,
    });

    // Tag badge at top
    slide.addShape('rect', {
      x: cx, y: cy, w: cardW, h: 0.38,
      fill: { color: alt.tagColor },
    });
    slide.addText(alt.tag, {
      x: cx, y: cy, w: cardW, h: 0.34,
      fontSize: 10.5, fontFace: 'Arial', bold: true, color: C.white,
      align: 'center', valign: 'middle',
    });

    // Title
    slide.addText(alt.title, {
      x: cx + 0.1, y: cy + 0.45, w: cardW - 0.2, h: 0.55,
      fontSize: 18, fontFace: 'Arial', bold: true, color: alt.textColor,
      lineSpacingMultiple: 1.1,
    });

    // Metrics
    const metrics = [
      { label: 'Upfront Cost', value: alt.upfront, color: alt.textColor },
      { label: '5-FY Economics', value: alt.fiveYear, color: alt.fiveYearColor },
      { label: 'ROIC', value: alt.roic, color: i === 0 ? C.gold : alt.textColor },
      { label: 'Payback', value: alt.payback, color: alt.textColor },
    ];

    metrics.forEach((m, mi) => {
      const my = cy + 1.1 + mi * 0.62;
      slide.addText(m.label, {
        x: cx + 0.1, y: my, w: cardW - 0.2, h: 0.25,
        fontSize: 10, fontFace: 'Arial', color: i === 0 ? C.lightGray : C.midGray,
      });
      slide.addText(m.value, {
        x: cx + 0.1, y: my + 0.25, w: cardW - 0.2, h: 0.3,
        fontSize: 16, fontFace: 'Arial', bold: true, color: m.color,
      });
    });

    // Risk badge at bottom
    slide.addShape('roundRect', {
      x: cx + 0.3, y: cy + cardH - 0.42, w: cardW - 0.6, h: 0.3,
      fill: { color: alt.accentColor },
      rectRadius: 0.04,
    });
    slide.addText(alt.risk, {
      x: cx + 0.3, y: cy + cardH - 0.42, w: cardW - 0.6, h: 0.3,
      fontSize: 10.5, fontFace: 'Arial', bold: true, color: C.white,
      align: 'center', valign: 'middle',
    });
  });

  // Bottom comparison line
  const aiNet = wf.aiInvestment?.annual5YearNet || 0;
  const statusQuoCost = wf.statusQuo?.total5YearCost || 0;
  const hiringCost = wf.hiring?.total5YearCost || 0;
  const outsourcingNet = Math.abs(wf.outsourcing?.total5YearNet || 0);

  slide.addShape('rect', {
    x: 0.28, y: 5.08, w: W - 0.56, h: 0.16,
    fill: { color: C.cardBg },
  });
  slide.addText(
    `AI automation costs ${fmt$(statusQuoCost - aiNet)} less than "Do Nothing" over 5 years  |  ${fmt$(hiringCost - aiNet)} less than hiring  |  ${fmt$(outsourcingNet + aiNet)} less than outsourcing`,
    {
      x: 0.38, y: 5.05, w: W - 0.76, h: 0.16,
      fontSize: 9, fontFace: 'Arial', bold: true, color: C.navy,
      valign: 'middle',
    }
  );
}

// ---------------------------------------------------------------------------
// SLIDE 9: Industry Peer Comparison & Confidence Intervals
// ---------------------------------------------------------------------------
function slide9_PeerComparison(pptx, formData, results, footerText) {
  const slide = contentSlide(pptx, 'Industry Peer Comparison & Confidence Intervals', footerText);
  const peer = results.peerComparison || {};
  const base = results.scenarios?.base || {};
  const cons = results.scenarios?.conservative || {};
  const opt = results.scenarios?.optimistic || {};
  const halfW = 4.56;
  const leftX = 0.28;
  const rightX = 5.1;

  // LEFT: ROIC Peer Benchmarks chart
  addSectionTitle(slide, `ROIC PEER BENCHMARKS \u2014 ${formData.industry || ''}`, leftX, 0.88, halfW);

  const peerData = [
    { label: 'P25 Peers', value: Math.round((peer.peerP25 || 0.25) * 100) },
    { label: 'Median Peers', value: Math.round((peer.peerMedian || 0.45) * 100) },
    { label: 'Your ROIC', value: Math.round((base.roic || 0) * 100) },
    { label: 'P75 Peers', value: Math.round((peer.peerP75 || 0.85) * 100) },
  ];

  slide.addChart('bar', [{
    name: 'ROIC %',
    labels: peerData.map(p => p.label),
    values: peerData.map(p => p.value),
  }], {
    x: leftX, y: 1.26, w: halfW, h: 2.6,
    showTitle: false,
    barDir: 'col',
    chartColors: [C.navy],
    showValue: true, valueFontSize: 10, valueColor: C.navy,
    catAxisLabelColor: C.midGray, catAxisLabelFontSize: 10,
    valAxisLabelColor: C.midGray, valAxisLabelFontSize: 9,
    valAxisNumFmt: '#,##0"%"',
  });

  // Percentile callout
  slide.addShape('roundRect', {
    x: leftX, y: 3.98, w: halfW, h: 0.72,
    fill: { color: C.navy },
    rectRadius: 0.06,
  });
  slide.addText(`${peer.percentileRank ? Math.round(peer.percentileRank) : '?'}th Percentile`, {
    x: leftX + 0.1, y: 4.0, w: halfW - 0.2, h: 0.35,
    fontSize: 25, fontFace: 'Arial', bold: true, color: C.gold,
  });
  slide.addText(`Your projected ROIC vs. ${formData.companySize || ''} ${formData.industry || ''} peers`, {
    x: leftX + 0.1, y: 4.4, w: halfW - 0.2, h: 0.28,
    fontSize: 10.5, fontFace: 'Arial', color: C.lightGray,
  });

  // RIGHT: Confidence Intervals table
  addSectionTitle(slide, 'CONFIDENCE INTERVALS', rightX, 0.88, halfW);

  const ciRows = [
    ['NPV', fmt$(cons.npv), fmt$(base.npv), fmt$(opt.npv)],
    ['Payback', fmtMo(cons.paybackMonths), fmtMo(base.paybackMonths), fmtMo(opt.paybackMonths)],
    ['ROIC', fmtPct(cons.roic), fmtPct(base.roic), fmtPct(opt.roic)],
  ];

  slide.addTable([
    [
      { text: 'Metric', options: thOpts() },
      { text: 'P25 (Downside)', options: thOpts('center') },
      { text: 'P50 (Base)', options: thOpts('center') },
      { text: 'P75 (Upside)', options: thOpts('center') },
    ],
    ...ciRows.map((r, i) => [
      { text: r[0], options: tdBold(i) },
      { text: r[1], options: tdOpts(i, 'center') },
      { text: r[2], options: tdOpts(i, 'center', true, C.navy) },
      { text: r[3], options: tdOpts(i, 'center') },
    ]),
  ], {
    x: rightX, y: 1.26, w: halfW,
    colW: [1.2, 1.12, 1.12, 1.12],
    rowH: 0.28,
    border: { type: 'solid', pt: 0.5, color: 'E2E8F0' },
  });

  // IRR vs Capital Alternatives
  const irrY = 2.82;
  slide.addShape('rect', {
    x: rightX, y: irrY, w: halfW, h: 0.3,
    fill: { color: C.navy },
  });
  slide.addText('IRR vs. CAPITAL ALTERNATIVES', {
    x: rightX + 0.1, y: irrY, w: halfW - 0.2, h: 0.3,
    fontSize: 10.5, fontFace: 'Arial', bold: true, color: C.white, valign: 'middle',
  });

  const baseIRR = (base.irr || 0) * 100;
  const irrAlts = [
    { label: 'Treasury Bond', rate: 4.5 },
    { label: 'Stock Buyback', rate: 8 },
    { label: 'M&A Hurdle Rate', rate: 15 },
    { label: 'AI Project IRR (Base)', rate: baseIRR, isProject: true },
  ];

  irrAlts.forEach((alt, i) => {
    const ay = irrY + 0.35 + i * 0.4;
    const bg = alt.isProject ? C.navy : (i % 2 === 0 ? C.cardBg : C.white);
    slide.addShape('rect', {
      x: rightX, y: ay, w: halfW, h: 0.4,
      fill: { color: bg },
    });
    slide.addText(alt.label, {
      x: rightX + 0.1, y: ay, w: 2.0, h: 0.4,
      fontSize: 12, fontFace: 'Arial',
      bold: alt.isProject, color: alt.isProject ? C.white : C.midGray, valign: 'middle',
    });
    slide.addText(`${alt.rate.toFixed(alt.isProject ? 1 : 1)}%`, {
      x: rightX + 2.1, y: ay, w: 0.9, h: 0.4,
      fontSize: 12, fontFace: 'Arial', bold: true,
      color: alt.isProject ? C.gold : C.navy, valign: 'middle',
    });
    slide.addText(alt.isProject ? '\u2191 WINNER' : `${(baseIRR - alt.rate).toFixed(1)}% below AI`, {
      x: rightX + 3.0, y: ay, w: 1.5, h: 0.4,
      fontSize: 10.5, fontFace: 'Arial',
      color: alt.isProject ? C.gold : C.midGray, valign: 'middle',
    });
  });
}

// ---------------------------------------------------------------------------
// SLIDE 10: Recommendations & Next Steps
// ---------------------------------------------------------------------------
function slide10_Recommendations(pptx, formData, results, recommendation, _footerText) {
  const slide = pptx.addSlide();
  slide.background = { color: C.white };

  // Gold corner accent (matching title slide)
  slide.addShape('rect', {
    x: W - 0.8, y: 0, w: 0.8, h: 0.8,
    fill: { color: C.gold },
  });

  // Left accent + header for left side
  addAccentBar(slide);
  slide.addShape('rect', {
    x: ACCENT_W, y: 0, w: 5.48, h: HEADER_H,
    fill: { color: C.navy },
  });
  slide.addText('Recommendations & Next Steps', {
    x: 0.38, y: 0.1, w: 5.0, h: 0.55,
    fontSize: 25, fontFace: 'Arial', bold: true, color: C.white,
  });

  // RIGHT header
  slide.addShape('rect', {
    x: 5.66, y: 0, w: 4.34, h: HEADER_H,
    fill: { color: C.navyDark },
  });
  slide.addText('RECOMMENDED NEXT STEPS', {
    x: 5.76, y: 0.1, w: 4.14, h: 0.55,
    fontSize: 16, fontFace: 'Arial', bold: true, color: C.gold,
  });

  // LEFT: Verdict box — navy fill per template
  const verdictY = 0.88;
  slide.addShape('roundRect', {
    x: 0.28, y: verdictY, w: 5.1, h: 1.05,
    fill: { color: C.navy },
    rectRadius: 0.06,
  });
  slide.addText(`VERDICT: ${recommendation.verdict} \u2014 ${recommendation.headline.toUpperCase()}`, {
    x: 0.38, y: verdictY + 0.05, w: 4.9, h: 0.45,
    fontSize: 22, fontFace: 'Arial', bold: true, color: C.gold,
  });
  slide.addText(recommendation.summary || 'Even under worst-case assumptions, this investment generates positive returns.', {
    x: 0.38, y: verdictY + 0.55, w: 4.9, h: 0.35,
    fontSize: 12, fontFace: 'Arial', color: C.white,
  });

  // LEFT: Delay cost warning
  const delayCost = results.opportunityCost;
  const delay12 = delayCost?.delayCosts?.[0]?.totalCost || 0;
  const delay24 = delayCost?.delayCosts?.[1]?.totalCost || 0;

  const warnY = 2.05;
  slide.addShape('roundRect', {
    x: 0.28, y: warnY, w: 5.1, h: 0.72,
    fill: { color: C.navy },
    rectRadius: 0.06,
  });
  slide.addText(`\u26a0  Delaying 12 months costs an estimated ${fmt$(delay12)} in forgone savings, wage inflation, and competitive erosion.`, {
    x: 0.38, y: warnY + 0.05, w: 4.9, h: 0.58,
    fontSize: 12, fontFace: 'Arial', bold: true, color: C.white,
    lineSpacingMultiple: 1.2,
  });

  // Delay cost table
  const delayRows = [
    [{ text: 'Delay', options: thOpts() }, { text: 'Cost', options: thOpts('right') }],
    [{ text: '12-Month Delay', options: tdOpts(0) }, { text: fmt$(delay12), options: tdBold(0, 'right', C.red) }],
    [{ text: '24-Month Delay', options: tdOpts(1) }, { text: fmt$(delay24), options: tdBold(1, 'right', C.red) }],
  ];
  slide.addTable(delayRows, {
    x: 0.28, y: 2.85, w: 5.1,
    colW: [3.5, 1.6],
    rowH: 0.27,
    border: { type: 'solid', pt: 0.5, color: 'E2E8F0' },
  });

  // RIGHT: Next steps
  const steps = recommendation.steps || [
    'Confirm executive sponsor commitment and governance structure',
    'Begin vendor evaluation with clear selection criteria',
    'Allocate change management budget (min. 15% of implementation cost)',
    'Define 90-day pilot scope with measurable success criteria',
    'Establish measurement framework before implementation begins',
  ];

  steps.slice(0, 5).forEach((step, i) => {
    const sy = 0.88 + i * 0.75;
    // Number badge
    slide.addShape('roundRect', {
      x: 5.66, y: sy, w: 0.52, h: 0.58,
      fill: { color: C.navy },
      rectRadius: 0.06,
    });
    slide.addText(`0${i + 1}`, {
      x: 5.66, y: sy, w: 0.52, h: 0.58,
      fontSize: 20, fontFace: 'Arial', bold: true, color: C.white,
      align: 'center', valign: 'middle',
    });

    // Step text — alternating cardBgAlt / white per template
    const stepBg = i % 2 === 0 ? C.cardBgAlt : C.white;
    slide.addShape('roundRect', {
      x: 6.24, y: sy, w: 3.48, h: 0.58,
      fill: { color: stepBg },
      rectRadius: 0.06,
    });
    slide.addText(step, {
      x: 6.34, y: sy, w: 3.28, h: 0.58,
      fontSize: 12, fontFace: 'Arial', color: C.navy, valign: 'middle',
      lineSpacingMultiple: 1.1,
    });
  });

  // Footer with full branding
  addFooter(slide, `Global Gauntlet AI  |  Built by JJ Shay  |  15+ yrs M&A  \u00b7  10+ Production AI Systems  |  ${formatDate()}  |  Assessment ID: ${generateAssessmentId()}`);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export default function generateExecutiveReport(formData, results, recommendation, _mcResults) {
  const pptx = new PptxGenJS();
  pptx.title = 'AI Implementation ROI Analysis';
  pptx.subject = 'Risk-Adjusted ROI Assessment';
  pptx.author = 'Global Gauntlet AI';
  pptx.layout = 'LAYOUT_16x9'; // 10" x 5.625"

  const footerText = 'Global Gauntlet AI  |  Confidential \u2014 Directional Guidance Only';

  slide1_Title(pptx, formData, results, recommendation, footerText);
  slide2_ExecSummary(pptx, formData, results, recommendation, footerText);
  slide3_CurrentState(pptx, formData, results, footerText);
  slide4_UseCaseGuide(pptx, formData, footerText);
  slide4_InvestmentCost(pptx, formData, results, footerText);
  slide5_CashFlow(pptx, results, footerText);
  slide6_ValueBreakdown(pptx, results, footerText);
  slide7_RiskSensitivity(pptx, formData, results, footerText);
  slide8_CapitalAllocation(pptx, results, footerText);
  slide9_PeerComparison(pptx, formData, results, footerText);
  slide10_Recommendations(pptx, formData, results, recommendation, footerText);

  const industry = (formData.industry || 'AI').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `AI_ROI_Executive_Presentation_${industry}.pptx`;
  return pptx.writeFile({ fileName });
}
