import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatPercent, generateAssessmentId } from '../utils/formatters';
import {
  ADOPTION_RAMP,
  ADOPTION_MULTIPLIERS,
  DATA_TIMELINE_MULTIPLIER,
  DATA_COST_MULTIPLIER,
  SIZE_MULTIPLIER,
  AI_TEAM_SALARY,
  API_COST_PER_1K_REQUESTS,
  REQUESTS_PER_PERSON_HOUR,
  MAX_IMPL_TEAM,
  PLATFORM_LICENSE_COST,
  SEPARATION_COST_MULTIPLIER,
  LEGAL_COMPLIANCE_COST,
  SECURITY_AUDIT_COST,
  CONTINGENCY_RATE,
  MAX_BASE_ROIC,
  MAX_BASE_IRR,
  BENCHMARK_SOURCES,
  VALUE_PHASES,
  DCF_YEARS,
  DISCOUNT_RATE,
  AI_COST_ESCALATION_SCHEDULE,
  SEPARATION_COST_BREAKDOWN,
  MAX_HEADCOUNT_REDUCTION,
} from '../logic/benchmarks';
import { getRiskMitigations } from '../logic/recommendations';

// ---------------------------------------------------------------------------
// Brand constants
// ---------------------------------------------------------------------------
const NAVY = [26, 58, 107];
const GOLD = [201, 162, 39];
const WHITE = [255, 255, 255];
const LIGHT_GRAY = [240, 243, 248];
const MID_GRAY = [120, 130, 145];
const DARK_TEXT = [30, 35, 45];
const RED = [239, 68, 68];
const GREEN = [34, 197, 94];

const PAGE_W = 210; // A4 width mm
const PAGE_H = 297; // A4 height mm
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatCompactValue(value) {
  if (value == null || isNaN(value)) return '$0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return sign + '$' + (abs / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return sign + '$' + (abs / 1_000).toFixed(0) + 'K';
  return formatCurrency(value);
}

function safeIRR(val) {
  if (val == null || isNaN(val) || !isFinite(val)) return 'N/A';
  return formatPercent(val);
}

function safePayback(months) {
  const maxMonths = DCF_YEARS * 12;
  if (months == null || months > maxMonths) return `>${maxMonths} months`;
  return `Month ${months}`;
}

function addGoldTopLine(doc) {
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, 15, PAGE_W - MARGIN, 15);
}

function addPageFooter(doc, pageNum) {
  const footerY = PAGE_H - 12;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, footerY - 4, PAGE_W - MARGIN, footerY - 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MID_GRAY);
  doc.text('Confidential — For Directional Guidance Only — Not Financial or Investment Advice', MARGIN, footerY);
  doc.text(`p.${pageNum}`, PAGE_W - MARGIN, footerY, { align: 'right' });
}

let _autoPageNum = 0;

function addHeader(doc) {
  _autoPageNum++;
  addGoldTopLine(doc);
  addPageFooter(doc, _autoPageNum);
}

function sectionTitle(doc, text, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text(text, MARGIN, y);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y + 2, MARGIN + 40, y + 2);
  return y + 10;
}

function bodyText(doc, text, x, y, options = {}) {
  doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
  doc.setFontSize(options.size || 10);
  doc.setTextColor(...(options.color || DARK_TEXT));
  const maxWidth = options.maxWidth || CONTENT_W;
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * (options.lineHeight || 4.5);
}

function drawRoundedRect(doc, x, y, w, h, r, fillColor) {
  doc.setFillColor(...fillColor);
  doc.roundedRect(x, y, w, h, r, r, 'F');
}

function autoTableTheme() {
  return {
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: DARK_TEXT,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: LIGHT_GRAY,
    },
    styles: {
      lineColor: [220, 225, 230],
      lineWidth: 0.2,
    },
    margin: { left: MARGIN, right: MARGIN },
  };
}

// ---------------------------------------------------------------------------
// Page builders
// ---------------------------------------------------------------------------

function page1_ExecutiveSummary(doc, formData, results, recommendation) {
  addHeader(doc, 1);

  let y = 30;

  // Title block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...NAVY);
  doc.text('AI IMPLEMENTATION', MARGIN, y);
  y += 10;
  doc.text('ROI ANALYSIS', MARGIN, y);
  y += 8;

  // Gold accent bar
  doc.setFillColor(...GOLD);
  doc.rect(MARGIN, y, 50, 1.5, 'F');
  y += 10;

  // Meta info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...MID_GRAY);
  doc.text(`Prepared for: ${formData.industry || 'N/A'} Company`, MARGIN, y);
  y += 6;
  doc.text(`Date: ${formatDate()}`, MARGIN, y);
  y += 6;
  const assessmentId = generateAssessmentId();
  doc.text(`Assessment ID: ${assessmentId}`, MARGIN, y);
  y += 8;

  // Directional guidance disclaimer box
  drawRoundedRect(doc, MARGIN, y, CONTENT_W, 14, 2, [254, 249, 235]);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.roundedRect(MARGIN, y, CONTENT_W, 14, 2, 2, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...GOLD);
  doc.text('IMPORTANT NOTICE', MARGIN + 4, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MID_GRAY);
  const noticeText = 'This report is intended solely for directional guidance and informational purposes. It does not constitute financial, ' +
    'investment, legal, or professional advice and should not be solely relied upon for making business decisions. See Disclosures appendix.';
  const noticeLines = doc.splitTextToSize(noticeText, CONTENT_W - 8);
  doc.text(noticeLines, MARGIN + 4, y + 9);
  y += 18;

  // Executive summary paragraph
  y = sectionTitle(doc, 'Executive Summary', y);
  y += 2;
  const summaryText =
    'This analysis provides a comprehensive, risk-adjusted assessment of the proposed AI implementation. ' +
    'Unlike typical vendor ROI calculators, this model incorporates industry-specific adoption curves [1][5], ' +
    'transition and friction costs [9], organizational readiness factors, and multi-scenario projections to ' +
    'deliver a realistic view of expected returns. Empirical return ceilings are based on IBM [2] and MIT/RAND [4] research ' +
    'on actual AI project outcomes. All figures are adjusted for your industry, company size, and readiness posture. ' +
    'See Appendix B for full source references.';
  y = bodyText(doc, summaryText, MARGIN, y, { maxWidth: CONTENT_W });
  y += 6;

  // Key Metrics Box
  const base = results.scenarios.base;
  const lastProjection = base.projections[base.projections.length - 1];
  const fiveYearNet = lastProjection?.netCumulative || 0;

  const boxY = y;
  const boxH = 48;
  drawRoundedRect(doc, MARGIN, boxY, CONTENT_W, boxH, 3, [240, 244, 252]);
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.4);
  doc.roundedRect(MARGIN, boxY, CONTENT_W, boxH, 3, 3, 'S');

  // Box title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.text('KEY METRICS', MARGIN + 6, boxY + 8);

  const colW = CONTENT_W / 5;
  const metricValY = boxY + 28;
  const metricLabelY = boxY + 34;

  const roicDisplay = base.roicCapped
    ? formatPercent(base.roic) + '*'
    : formatPercent(base.roic);
  const irrDisplay = base.irrCapped
    ? safeIRR(base.irr) + '*'
    : safeIRR(base.irr);

  const metrics = [
    { label: `${DCF_YEARS}-Year Net Value (Base)`, value: formatCompactValue(fiveYearNet) },
    { label: 'Break-Even', value: safePayback(base.paybackMonths) },
    { label: 'ROIC (Base)', value: roicDisplay },
    { label: 'IRR (Base)', value: irrDisplay },
    { label: 'Confidence', value: results.confidenceLevel },
  ];

  metrics.forEach((m, i) => {
    const cx = MARGIN + 6 + i * colW;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...NAVY);
    doc.text(m.value, cx, metricValY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MID_GRAY);
    doc.text(m.label, cx, metricLabelY);
  });

  y = boxY + boxH + 4;

  // Hurdle rate indicator bar
  const baseIRR = base.irr;
  const hurdleRate = results.discountRate || 0.10;
  const clearsHurdle = !isNaN(baseIRR) && isFinite(baseIRR) && baseIRR > hurdleRate;
  drawRoundedRect(doc, MARGIN, y, CONTENT_W, 10, 1.5, clearsHurdle ? GREEN : RED);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...WHITE);
  const hurdleRateDisplay = formatPercent(hurdleRate);
  const hurdleStatus = clearsHurdle
    ? `Hurdle Rate: ${hurdleRateDisplay} WACC [26]  |  Base IRR: ${safeIRR(baseIRR)}  |  CLEARS HURDLE`
    : `Hurdle Rate: ${hurdleRateDisplay} WACC [26]  |  Base IRR: ${safeIRR(baseIRR)}  |  BELOW HURDLE`;
  doc.text(hurdleStatus, MARGIN + 6, y + 7);
  y += 14;

  // Expected NPV (probability-weighted)
  if (results.expectedNPV != null) {
    drawRoundedRect(doc, MARGIN, y, CONTENT_W, 10, 1.5, [240, 244, 252]);
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, CONTENT_W, 10, 1.5, 1.5, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...NAVY);
    doc.text(
      `Expected NPV: ${formatCompactValue(results.expectedNPV)}  |  Expected ROIC: ${formatPercent(results.expectedROIC)}  (probability-weighted 25/50/25)`,
      MARGIN + 6, y + 7
    );
    y += 14;
  }

  // Recommendation section
  y = sectionTitle(doc, 'Recommendation', y);
  y += 2;

  // Verdict badge
  const verdictColors = {
    STRONG: [34, 197, 94],
    MODERATE: [201, 162, 39],
    CAUTIOUS: [245, 158, 11],
    WEAK: [239, 68, 68],
  };
  const vColor = verdictColors[recommendation.verdict] || MID_GRAY;
  const badgeW = doc.getStringUnitWidth(recommendation.verdict) * 12 * 0.352778 + 12;
  drawRoundedRect(doc, MARGIN, y - 4, badgeW, 8, 2, vColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...WHITE);
  doc.text(recommendation.verdict, MARGIN + 6, y + 1.5);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(recommendation.headline, MARGIN, y);
  y += 6;

  y = bodyText(doc, recommendation.summary, MARGIN, y, { maxWidth: CONTENT_W });
}

function page2_TableOfContents(doc) {
  doc.addPage();
  addHeader(doc);

  let y = 30;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...NAVY);
  doc.text('Table of Contents', MARGIN, y);
  y += 4;

  doc.setFillColor(...GOLD);
  doc.rect(MARGIN, y, 50, 1.5, 'F');
  y += 16;

  const tocEntries = [
    { title: 'Executive Summary', page: 1 },
    { title: 'Current State Analysis', page: 3 },
    { title: 'Value Creation Breakdown', page: 4 },
    { title: 'Value Creation Pathways (V3)', page: 5 },
    { title: 'Capital Efficiency & Deployment Gates (V3)', page: 6 },
    { title: 'AI Investment Analysis & Cost Model', page: 7 },
    { title: 'Three-Scenario Projections & Hurdle Rate Analysis', page: 8 },
    { title: 'Risk Assessment', page: 9 },
    { title: 'Sensitivity Analysis', page: 10 },
    { title: 'Variable Sensitivity Analysis (Extended)', page: 11 },
    { title: 'Opportunity Cost & Scalability', page: 12 },
    { title: 'Industry Peer Comparison & Confidence Intervals', page: 13 },
    { title: 'Recommendations & Next Steps', page: 14 },
    { title: 'Qualitative Benefits', page: 15 },
    { title: 'Input Assumptions & Model Parameters', page: 16 },
    { title: 'Appendix A: Calculation Walkthrough & DCF Model', page: 17 },
    { title: 'Appendix B: Source References & Benchmarks', page: 19 },
    { title: 'Appendix C: Definitions, Assumptions & Disclosures', page: 21 },
  ];

  tocEntries.forEach((entry) => {
    const isAppendix = entry.title.startsWith('Appendix') || entry.title.startsWith('Input');

    // Section title
    doc.setFont('helvetica', isAppendix ? 'italic' : 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...DARK_TEXT);
    const xOffset = isAppendix ? 6 : 0;
    doc.text(entry.title, MARGIN + 4 + xOffset, y);

    // Dot leader
    const titleWidth = doc.getStringUnitWidth(entry.title) * 11 * 0.352778;
    const dotsStart = MARGIN + 4 + xOffset + titleWidth + 3;
    const dotsEnd = PAGE_W - MARGIN - 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MID_GRAY);
    for (let dotX = dotsStart; dotX < dotsEnd; dotX += 2.5) {
      doc.text('.', dotX, y);
    }

    // Page number
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(`${entry.page}`, PAGE_W - MARGIN - 4, y, { align: 'right' });

    y += isAppendix ? 7 : 8;
  });

  // Report info box
  y += 12;
  const infoBoxH = 32;
  drawRoundedRect(doc, MARGIN, y, CONTENT_W, infoBoxH, 2, [240, 244, 252]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text('About This Report', MARGIN + 6, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...MID_GRAY);
  const aboutText =
    'This report provides risk-adjusted projections, AI cost modeling, ROIC analysis, value creation ' +
    'breakdown, opportunity cost analysis, confidence intervals, industry peer ' +
    'comparison, sensitivity testing, DCF modeling, and P&L impact analysis. All figures are derived ' +
    'from your inputs and 26 cited sources. Bracketed numbers [1]-[26] reference Appendix B. ' +
    'See Appendix C for SEC-style definitions, material assumptions, limitations, and legal disclosures. ' +
    'This report is for directional guidance only and does not constitute professional advice.';
  const aboutLines = doc.splitTextToSize(aboutText, CONTENT_W - 12);
  doc.text(aboutLines, MARGIN + 6, y + 14);
}

function page2_CurrentState(doc, formData, results) {
  doc.addPage();
  addHeader(doc, 2);

  let y = 25;
  y = sectionTitle(doc, 'Current State Analysis', y);
  y += 4;

  // Current Annual Process Cost table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text('Current Annual Process Cost', MARGIN, y);
  y += 6;

  const errorRateDisplay =
    formData.errorRate != null ? `${(formData.errorRate * 100).toFixed(0)}%` : 'N/A';

  const costRows = [
    ['Annual Labor Cost', formatCurrency(results.currentState.annualLaborCost)],
    [
      `Annual Rework Cost (${errorRateDisplay} error rate)`,
      formatCurrency(results.currentState.annualReworkCost),
    ],
    ['Current Tool/Software Costs', formatCurrency(formData.currentToolCosts || 0)],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Line Item', 'Amount']],
    body: costRows,
    ...autoTableTheme(),
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.65 },
      1: { cellWidth: CONTENT_W * 0.35, halign: 'right' },
    },
  });

  y = doc.lastAutoTable.finalY + 2;

  // Total row drawn manually for emphasis
  drawRoundedRect(doc, MARGIN, y, CONTENT_W, 10, 1.5, NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...WHITE);
  doc.text('Total Annual Process Cost', MARGIN + 4, y + 7);
  doc.text(formatCurrency(results.currentState.totalCurrentCost), PAGE_W - MARGIN - 4, y + 7, {
    align: 'right',
  });
  y += 18;

  // Hours analysis
  y = sectionTitle(doc, 'Hours Analysis', y);
  y += 4;

  const teamSize = formData.teamSize || 0;
  const hoursPerWeek = formData.hoursPerWeek || 0;
  const weeklyHours = results.currentState.weeklyHours;
  const annualHours = results.currentState.annualHours;

  const hoursData = [
    ['Team Size', `${teamSize} people`],
    ['Hours per Person per Week', `${hoursPerWeek} hours`],
    ['Total Weekly Hours', `${weeklyHours.toLocaleString()} hours`],
    ['Total Annual Hours (52 weeks)', `${annualHours.toLocaleString()} hours`],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: hoursData,
    ...autoTableTheme(),
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.55 },
      1: { cellWidth: CONTENT_W * 0.45, halign: 'right' },
    },
  });

  y = doc.lastAutoTable.finalY + 14;

  // Process context
  y = sectionTitle(doc, 'Process Context', y);
  y += 4;

  const contextItems = [
    ['Industry', formData.industry || 'N/A'],
    ['Company Size', formData.companySize || 'N/A'],
    ['Process Type', formData.processType || 'N/A'],
    ['Automation Potential', formatPercent(results.benchmarks.automationPotential)],
    ['Industry Success Rate', formatPercent(results.benchmarks.industrySuccessRate)],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Parameter', 'Value']],
    body: contextItems,
    ...autoTableTheme(),
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.55 },
      1: { cellWidth: CONTENT_W * 0.45, halign: 'right' },
    },
  });
}

function page3_InvestmentAnalysis(doc, formData, results) {
  doc.addPage();
  addHeader(doc, 3);

  let y = 25;
  y = sectionTitle(doc, 'AI Investment Analysis', y);
  y += 4;

  const ai = results.aiCostModel;

  // AI Implementation Team Cost Breakdown
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text('AI Implementation Cost Model [7][8]', MARGIN, y);
  y += 2;
  y = bodyText(doc, `Based on ${formData.teamLocation || 'Remote'} salaries (${formatCurrency(ai.aiSalary)}/yr fully-loaded [7][8]) and ${results.riskAdjustments.adjustedTimeline}-month timeline.`, MARGIN, y, { size: 8, color: MID_GRAY });
  y += 2;

  const implRows = [
    [`AI/ML Engineers (${ai.implEngineers} FTE x ${ai.implTimelineYears.toFixed(1)} yr)`, formatCurrency(ai.implEngineeringCost)],
    [`Project Management (${ai.implPMs} FTE x ${ai.implTimelineYears.toFixed(1)} yr)`, formatCurrency(ai.implPMCost)],
    ['Infrastructure & Tooling (12%)', formatCurrency(ai.implInfraCost)],
    ['Training & Knowledge Transfer (8%)', formatCurrency(ai.implTrainingCost)],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Implementation Component', 'Cost']],
    body: implRows,
    ...autoTableTheme(),
    bodyStyles: { ...autoTableTheme().bodyStyles, fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { ...autoTableTheme().headStyles, fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.65 },
      1: { cellWidth: CONTENT_W * 0.35, halign: 'right' },
    },
  });

  y = doc.lastAutoTable.finalY + 2;

  // Budget gap warning or confirmation
  if (ai.budgetGap > 0) {
    drawRoundedRect(doc, MARGIN, y, CONTENT_W, 18, 1.5, RED);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...WHITE);
    doc.text(
      `Model Cost: ${formatCurrency(ai.computedImplCost)} | Your Budget: ${formatCurrency(formData.implementationBudget)} | Gap: ${formatCurrency(ai.budgetGap)}`,
      MARGIN + 4, y + 7
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(
      'Note: The computed implementation cost exceeds your stated budget. Consider phased rollout or scope reduction.',
      MARGIN + 4, y + 14
    );
    y += 8; // extra height for the note
  } else {
    drawRoundedRect(doc, MARGIN, y, CONTENT_W, 10, 1.5, GREEN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...WHITE);
    doc.text(
      `Budget appears sufficient: ${formatCurrency(formData.implementationBudget)} vs model estimate ${formatCurrency(ai.computedImplCost)}`,
      MARGIN + 4, y + 7
    );
  }
  y += 16;

  // Hidden costs table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text('Transition & Friction Costs [9]', MARGIN, y);
  y += 5;

  const hc = results.hiddenCosts;
  const hiddenRows = [
    ['Change Management (15%)', formatCurrency(hc.changeManagement)],
    ['Cultural Resistance & Adoption Friction (12%) [21]', formatCurrency(hc.culturalResistance)],
  ];
  if (hc.dataCleanup > 0) {
    hiddenRows.push(['Data Cleanup / Preparation', formatCurrency(hc.dataCleanup)]);
  }
  hiddenRows.push(
    ['Integration / Testing (10%)', formatCurrency(hc.integrationTesting)],
    ['Productivity Dip During Transition', formatCurrency(hc.productivityDip)],
  );

  autoTable(doc, {
    startY: y,
    head: [['Cost Category', 'Amount']],
    body: hiddenRows,
    ...autoTableTheme(),
    bodyStyles: { ...autoTableTheme().bodyStyles, fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { ...autoTableTheme().headStyles, fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.65 },
      1: { cellWidth: CONTENT_W * 0.35, halign: 'right' },
    },
  });

  y = doc.lastAutoTable.finalY + 6;

  // One-time transition costs
  const ot = results.oneTimeCosts;
  if (ot && ot.totalOneTimeCosts > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text('One-Time Transition Costs [6][12]', MARGIN, y);
    y += 5;

    const otRows = [
      ['Legal & Compliance Review', formatCurrency(ot.legalComplianceCost)],
      ['Security & Privacy Audit', formatCurrency(ot.securityAuditCost)],
      [`Contingency Reserve (${(CONTINGENCY_RATE * 100).toFixed(0)}%) [10]`, formatCurrency(ot.contingencyReserve)],
    ];
    if (ot.vendorTerminationCost > 0) {
      otRows.push([`Vendor Contract Termination (${ot.vendorsReplaced} vendor${ot.vendorsReplaced > 1 ? 's' : ''})`, formatCurrency(ot.vendorTerminationCost)]);
    }

    autoTable(doc, {
      startY: y,
      head: [['Transition Cost', 'Amount']],
      body: otRows,
      ...autoTableTheme(),
      bodyStyles: { ...autoTableTheme().bodyStyles, fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { ...autoTableTheme().headStyles, fontSize: 8.5, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: CONTENT_W * 0.65 },
        1: { cellWidth: CONTENT_W * 0.35, halign: 'right' },
      },
    });

    y = doc.lastAutoTable.finalY + 2;
  }

  drawRoundedRect(doc, MARGIN, y, CONTENT_W, 10, 1.5, GOLD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...WHITE);
  doc.text('Total Upfront Investment (excl. separation)', MARGIN + 4, y + 7);
  doc.text(formatCurrency(results.upfrontInvestment), PAGE_W - MARGIN - 4, y + 7, { align: 'right' });
  y += 16;

  // Phased Separation Costs
  if (ot.totalSeparationCost > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text('Workforce Separation Costs (Phased Years 2-5) [15][21]', MARGIN, y);
    y += 2;
    y = bodyText(doc, `${ot.displacedFTEs} of ${ot.displacedFTEs + ot.retainedFTEs} roles phased out over 4 years (${ot.retainedFTEs} retained — ${formatPercent(1 - MAX_HEADCOUNT_REDUCTION)} always human). Year 1 is enhancement only.`, MARGIN, y, { size: 8, color: MID_GRAY });
    y += 2;

    const sepRows = [];
    if (ot.separationBreakdown) {
      Object.entries(ot.separationBreakdown).forEach(([, item]) => {
        sepRows.push([item.label, formatCurrency(item.total)]);
      });
    }

    autoTable(doc, {
      startY: y,
      head: [['Separation Component', 'Cost']],
      body: sepRows,
      ...autoTableTheme(),
      bodyStyles: { ...autoTableTheme().bodyStyles, fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { ...autoTableTheme().headStyles, fontSize: 8.5, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: CONTENT_W * 0.65 },
        1: { cellWidth: CONTENT_W * 0.35, halign: 'right' },
      },
    });

    y = doc.lastAutoTable.finalY + 2;

    drawRoundedRect(doc, MARGIN, y, CONTENT_W, 10, 1.5, RED);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...WHITE);
    doc.text(`Total Separation (${formatCurrency(ot.separationCostPerFTE)}/FTE)`, MARGIN + 4, y + 7);
    doc.text(formatCurrency(ot.totalSeparationCost), PAGE_W - MARGIN - 4, y + 7, { align: 'right' });
    y += 16;
  }

  // Total Capital Deployed
  drawRoundedRect(doc, MARGIN, y, CONTENT_W, 10, 1.5, NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...WHITE);
  doc.text('Total Capital Deployed (Upfront + Separation)', MARGIN + 4, y + 7);
  doc.text(formatCurrency(results.totalInvestment), PAGE_W - MARGIN - 4, y + 7, { align: 'right' });
  y += 16;

  // Ongoing AI Operations Cost
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(`Ongoing AI Operations (${AI_COST_ESCALATION_SCHEDULE.filter(r => r > 0).map(r => formatPercent(r)).join('/')} tapered escalation) [22]`, MARGIN, y);
  y += 5;

  const ongoingRows = [
    [`AI Ops Team (${ai.ongoingAiHeadcount} FTE)`, formatCurrency(ai.ongoingAiLaborCost)],
    [`API / Inference (${Math.round(ai.monthlyApiVolume).toLocaleString()} req/mo)`, formatCurrency(ai.annualApiCost)],
    ['Platform & Licenses', formatCurrency(ai.annualLicenseCost)],
    ['Adjacent Product Costs (25% of license)', formatCurrency(ai.annualAdjacentCost)],
    ['Model Retraining / Drift Monitoring', formatCurrency(ai.modelRetrainingCost)],
    ['Annual Compliance Recertification', formatCurrency(ai.annualComplianceCost)],
    ['Retained Employee Retraining', formatCurrency(ai.retainedRetrainingCost)],
    ['Technical Debt / Integration Maintenance', formatCurrency(ai.techDebtCost)],
    ['Cyber Insurance Increase', formatCurrency(ai.cyberInsuranceCost)],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Ongoing Component', 'Annual Cost']],
    body: ongoingRows,
    ...autoTableTheme(),
    bodyStyles: { ...autoTableTheme().bodyStyles, fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { ...autoTableTheme().headStyles, fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.65 },
      1: { cellWidth: CONTENT_W * 0.35, halign: 'right' },
    },
  });

  y = doc.lastAutoTable.finalY + 2;

  // Year 1 and Year 5 ongoing costs
  const yr1Cost = ai.baseOngoingCost;
  const yr5Cost = ai.ongoingCostsByYear[4];
  drawRoundedRect(doc, MARGIN, y, CONTENT_W, 16, 1.5, NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text('Year 1 Ongoing Cost', MARGIN + 4, y + 6);
  doc.text(formatCurrency(yr1Cost), MARGIN + CONTENT_W * 0.35, y + 6, { align: 'right' });
  doc.text(`Year 5 Ongoing Cost (tapered escalation)`, MARGIN + CONTENT_W * 0.5, y + 6);
  doc.setTextColor(255, 150, 150);
  doc.text(formatCurrency(yr5Cost), PAGE_W - MARGIN - 4, y + 6, { align: 'right' });
  doc.setTextColor(...WHITE);
  doc.text(`Total ${DCF_YEARS}-Year Operating Cost`, MARGIN + 4, y + 13);
  doc.text(formatCurrency(ai.totalOngoing5Year), PAGE_W - MARGIN - 4, y + 13, { align: 'right' });
}

function page4_ScenarioProjections(doc, results) {
  doc.addPage();
  addHeader(doc, 4);

  let y = 25;
  y = sectionTitle(doc, `${DCF_YEARS}-Year Three-Scenario Projections`, y);
  y += 4;

  const cons = results.scenarios.conservative;
  const base = results.scenarios.base;
  const opt = results.scenarios.optimistic;

  // Projection table — all 5 years
  const projRows = [];
  for (let yr = 0; yr < DCF_YEARS; yr++) {
    projRows.push([
      `Year ${yr + 1} Savings`,
      formatCurrency(cons.projections[yr]?.grossSavings || 0),
      formatCurrency(base.projections[yr]?.grossSavings || 0),
      formatCurrency(opt.projections[yr]?.grossSavings || 0),
    ]);
  }
  const lastIdx = DCF_YEARS - 1;
  projRows.push(
    [
      `${DCF_YEARS}-Year Cumulative`,
      formatCurrency(cons.projections[lastIdx]?.netCumulative || 0),
      formatCurrency(base.projections[lastIdx]?.netCumulative || 0),
      formatCurrency(opt.projections[lastIdx]?.netCumulative || 0),
    ],
    [
      'Net Present Value (NPV)',
      formatCurrency(cons.npv),
      formatCurrency(base.npv),
      formatCurrency(opt.npv),
    ],
    [
      'Internal Rate of Return',
      safeIRR(cons.irr),
      safeIRR(base.irr),
      safeIRR(opt.irr),
    ],
    [
      'ROIC (Avg Annual)',
      formatPercent(cons.roic) + (cons.roicCapped ? '*' : ''),
      formatPercent(base.roic) + (base.roicCapped ? '*' : ''),
      formatPercent(opt.roic) + (opt.roicCapped ? '*' : ''),
    ],
    [
      'Payback Period',
      safePayback(cons.paybackMonths),
      safePayback(base.paybackMonths),
      safePayback(opt.paybackMonths),
    ],
  );

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Conservative', 'Base Case', 'Optimistic']],
    body: projRows,
    ...autoTableTheme(),
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.34, fontStyle: 'bold' },
      1: { cellWidth: CONTENT_W * 0.22, halign: 'right' },
      2: { cellWidth: CONTENT_W * 0.22, halign: 'right' },
      3: { cellWidth: CONTENT_W * 0.22, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'head' && data.column.index === 1) {
        data.cell.styles.fillColor = RED;
      }
      if (data.section === 'head' && data.column.index === 2) {
        data.cell.styles.fillColor = GOLD;
      }
      if (data.section === 'head' && data.column.index === 3) {
        data.cell.styles.fillColor = GREEN;
      }
    },
  });

  y = doc.lastAutoTable.finalY + 14;

  // Simple bar chart
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(`${DCF_YEARS}-Year Cumulative Net Value Comparison`, MARGIN, y);
  y += 8;

  const consVal = cons.projections[lastIdx]?.netCumulative || 0;
  const baseVal = base.projections[lastIdx]?.netCumulative || 0;
  const optVal = opt.projections[lastIdx]?.netCumulative || 0;

  const maxVal = Math.max(Math.abs(consVal), Math.abs(baseVal), Math.abs(optVal), 1);
  const chartX = MARGIN + 5;
  const barH = 18;
  const barGap = 8;

  const bars = [
    { label: 'Conservative', value: consVal, color: RED },
    { label: 'Base Case', value: baseVal, color: GOLD },
    { label: 'Optimistic', value: optVal, color: GREEN },
  ];

  // Chart background
  const chartAreaH = (barH + barGap) * 3 + 10;
  drawRoundedRect(doc, MARGIN, y - 2, CONTENT_W, chartAreaH, 2, LIGHT_GRAY);

  bars.forEach((bar, i) => {
    const barY = y + 4 + i * (barH + barGap);
    const barWidth = maxVal > 0 ? Math.abs(bar.value / maxVal) * (CONTENT_W * 0.55) : 0;
    const clampedWidth = Math.max(barWidth, 2);

    // Bar
    doc.setFillColor(...bar.color);
    doc.roundedRect(chartX, barY, clampedWidth, barH, 1.5, 1.5, 'F');

    // Label on bar
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    if (clampedWidth > 30) {
      doc.text(bar.label, chartX + 4, barY + barH / 2 + 1.5);
    }

    // Value to the right of bar
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...DARK_TEXT);
    doc.text(
      formatCompactValue(bar.value),
      chartX + clampedWidth + 4,
      barY + barH / 2 + 2,
    );

    // Label below value if bar is too small for label
    if (clampedWidth <= 30) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...MID_GRAY);
      doc.text(bar.label, chartX + clampedWidth + 4, barY + barH / 2 + 7);
    }
  });

  y += chartAreaH + 12;

  // --- HURDLE RATE ANALYSIS ---
  y = sectionTitle(doc, 'Internal Hurdle Rate Analysis', y);
  y += 2;

  const hurdleRateVal = results.discountRate || 0.10;
  const baseIRRVal = base.irr;
  const excessReturn = isFinite(baseIRRVal) ? baseIRRVal - hurdleRateVal : 0;
  const passesHurdle = isFinite(baseIRRVal) && baseIRRVal > hurdleRateVal;

  const hBoxH = 30;
  drawRoundedRect(doc, MARGIN, y - 2, CONTENT_W, hBoxH, 3, [240, 244, 252]);
  doc.setDrawColor(...(passesHurdle ? GREEN : RED));
  doc.setLineWidth(0.6);
  doc.roundedRect(MARGIN, y - 2, CONTENT_W, hBoxH, 3, 3, 'S');

  const hColW = CONTENT_W / 3;

  // Column 1: Hurdle Rate
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MID_GRAY);
  doc.text('Internal Hurdle Rate (WACC) [26]', MARGIN + 6, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text(formatPercent(hurdleRateVal), MARGIN + 6, y + 15);

  // Column 2: Base Case IRR
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MID_GRAY);
  doc.text('Base Case IRR', MARGIN + hColW + 6, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text(safeIRR(baseIRRVal), MARGIN + hColW + 6, y + 15);

  // Column 3: Excess Return
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MID_GRAY);
  doc.text('Excess Return', MARGIN + hColW * 2 + 6, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...(passesHurdle ? GREEN : RED));
  const excessText = passesHurdle
    ? `+${formatPercent(excessReturn)}`
    : formatPercent(excessReturn);
  doc.text(excessText, MARGIN + hColW * 2 + 6, y + 15);

  // Verdict line
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...(passesHurdle ? GREEN : RED));
  const hurdleVerdict = passesHurdle
    ? 'PROJECT CLEARS HURDLE RATE - Positive value creation expected'
    : 'PROJECT BELOW HURDLE RATE - Consider risk mitigations before proceeding';
  doc.text(hurdleVerdict, MARGIN + 6, y + hBoxH - 6);

  y += hBoxH + 10;

  // --- THRESHOLD / BREAKEVEN ANALYSIS ---
  const thresh = results.thresholdAnalysis;
  if (thresh) {
    y = sectionTitle(doc, 'Path to Positive NPV', y);
    y += 2;

    const tBoxH = 28;
    drawRoundedRect(doc, MARGIN, y - 2, CONTENT_W, tBoxH, 3, thresh.isViable ? [240, 253, 244] : [254, 242, 242]);
    doc.setDrawColor(...(thresh.isViable ? GREEN : RED));
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN, y - 2, CONTENT_W, tBoxH, 3, 3, 'S');

    const tColW = CONTENT_W / 4;

    // Column 1: Breakeven Risk Multiplier
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MID_GRAY);
    doc.text('Breakeven Risk Mult.', MARGIN + 4, y + 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...NAVY);
    doc.text(thresh.breakevenRiskMultiplier !== null ? formatPercent(thresh.breakevenRiskMultiplier) : 'N/A', MARGIN + 4, y + 14);

    // Column 2: Current Risk Multiplier
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MID_GRAY);
    doc.text('Current Risk Mult.', MARGIN + tColW + 4, y + 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...NAVY);
    doc.text(formatPercent(thresh.currentRiskMultiplier), MARGIN + tColW + 4, y + 14);

    // Column 3: Risk Margin
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MID_GRAY);
    doc.text('Risk Margin', MARGIN + tColW * 2 + 4, y + 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...(thresh.isViable ? GREEN : RED));
    doc.text(thresh.riskMargin !== null ? formatPercent(thresh.riskMargin) : 'N/A', MARGIN + tColW * 2 + 4, y + 14);

    // Column 4: Viable
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MID_GRAY);
    doc.text('Viable?', MARGIN + tColW * 3 + 4, y + 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...(thresh.isViable ? GREEN : RED));
    doc.text(thresh.isViable ? 'YES' : 'NO', MARGIN + tColW * 3 + 4, y + 14);

    // Explanation line
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MID_GRAY);
    const threshExplain = thresh.isViable
      ? `Risk multiplier can drop ${thresh.riskMargin !== null ? formatPercent(thresh.riskMargin) : '—'} before NPV turns negative.`
      : 'Current risk profile does not support a positive NPV — consider mitigations.';
    doc.text(threshExplain, MARGIN + 4, y + tBoxH - 4);
  }
}

function page5_RiskAssessment(doc, formData, results) {
  doc.addPage();
  addHeader(doc, 5);

  let y = 25;
  y = sectionTitle(doc, 'Risk Assessment', y);
  y += 4;

  // Risk factor table
  const changeReadiness = formData.changeReadiness || 0;
  const dataReadiness = formData.dataReadiness || 0;
  const execSponsor = formData.execSponsor;
  const industryRate = results.benchmarks.industrySuccessRate;

  function scoreImpact(score) {
    if (score >= 4) return 'Low risk';
    if (score >= 3) return 'Moderate risk';
    return 'High risk';
  }

  const riskRows = [
    ['Change Readiness', `${changeReadiness}/5`, scoreImpact(changeReadiness)],
    ['Data Readiness', `${dataReadiness}/5`, scoreImpact(dataReadiness)],
    [
      'Executive Sponsor',
      execSponsor ? 'Yes' : 'No',
      execSponsor ? 'Low risk' : 'Critical risk',
    ],
    [
      'Industry Success Rate',
      formatPercent(industryRate),
      industryRate >= 0.65 ? 'Favorable' : industryRate >= 0.55 ? 'Average' : 'Below average',
    ],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Risk Factor', 'Score', 'Impact Assessment']],
    body: riskRows,
    ...autoTableTheme(),
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.35 },
      1: { cellWidth: CONTENT_W * 0.20, halign: 'center' },
      2: { cellWidth: CONTENT_W * 0.45 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        const val = data.cell.raw;
        if (val.includes('High') || val.includes('Critical')) {
          data.cell.styles.textColor = RED;
          data.cell.styles.fontStyle = 'bold';
        } else if (
          val.includes('Moderate') ||
          val.includes('Average') ||
          val.includes('Below')
        ) {
          data.cell.styles.textColor = [245, 158, 11];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = GREEN;
        }
      }
    },
  });

  y = doc.lastAutoTable.finalY + 12;

  // Adoption curve
  y = sectionTitle(doc, 'Adoption Curve Assumptions', y);
  y += 4;

  const boxH = 20;
  drawRoundedRect(doc, MARGIN, y - 2, CONTENT_W, boxH, 2, [240, 244, 252]);

  // Draw three segments with arrow separators
  const segments = ADOPTION_RAMP.map((r, i) => ({
    label: `Year ${i + 1}`,
    pct: `${(r * 100).toFixed(0)}%`,
  }));

  const segW = CONTENT_W / 3;
  const centerY = y + boxH / 2 - 1;

  segments.forEach((seg, i) => {
    const cx = MARGIN + segW * i + segW / 2;

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MID_GRAY);
    doc.text(seg.label, cx, centerY - 2, { align: 'center' });

    // Percentage
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...NAVY);
    doc.text(seg.pct, cx, centerY + 6, { align: 'center' });

    // Draw arrow between segments
    if (i < segments.length - 1) {
      const arrowX = MARGIN + segW * (i + 1);
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.8);
      doc.line(arrowX - 6, centerY + 2, arrowX + 6, centerY + 2);
      // Arrowhead
      doc.line(arrowX + 6, centerY + 2, arrowX + 3, centerY);
      doc.line(arrowX + 6, centerY + 2, arrowX + 3, centerY + 4);
    }
  });

  y += boxH + 4;

  const rampNote =
    'Adoption ramp reflects the reality that AI tools are not utilized at full capacity from day one [14]. ' +
    'Teams require training, workflows need adjustment, and organizational habits take time to shift. ' +
    '75% of knowledge workers use AI tools regularly, but utilization ramps over 12-24 months (Worklytics [14]).';
  y = bodyText(doc, rampNote, MARGIN, y, { size: 9, color: MID_GRAY });
  y += 10;

  // Risk mitigations
  const mitigations = getRiskMitigations(formData);
  if (mitigations.length > 0) {
    y = sectionTitle(doc, 'Risk Mitigations', y);
    y += 4;

    const mitRows = mitigations.map((m) => [m.risk, m.impact, m.mitigation]);

    autoTable(doc, {
      startY: y,
      head: [['Risk', 'Impact', 'Recommended Mitigation']],
      body: mitRows,
      ...autoTableTheme(),
      columnStyles: {
        0: { cellWidth: CONTENT_W * 0.22, fontStyle: 'bold' },
        1: { cellWidth: CONTENT_W * 0.25 },
        2: { cellWidth: CONTENT_W * 0.53 },
      },
      styles: {
        ...autoTableTheme().styles,
        fontSize: 8.5,
        cellPadding: 3,
      },
    });
  }
}

function page6_SensitivityAnalysis(doc, results) {
  doc.addPage();
  addHeader(doc, 6);

  let y = 25;
  y = sectionTitle(doc, 'Sensitivity Analysis', y);
  y += 4;

  const sensitivity = results.sensitivity;

  // Use pre-computed deltas (computed against consistent quickNPV baseline)
  const lowerAdoptionDelta = sensitivity.lowerAdoptionDelta;
  const higherCostsDelta = sensitivity.higherCostsDelta;
  const doubleTimelineDelta = sensitivity.doubleTimelineDelta;

  function assessment(delta) {
    return delta >= 0 ? 'Positive' : 'Negative';
  }

  const sensRows = [
    [
      'Adoption 20% Lower',
      formatCurrency(lowerAdoptionDelta),
      assessment(lowerAdoptionDelta),
    ],
    [
      'Costs 30% Over Budget',
      formatCurrency(higherCostsDelta),
      assessment(higherCostsDelta),
    ],
    [
      'Timeline Doubles',
      formatCurrency(doubleTimelineDelta),
      assessment(doubleTimelineDelta),
    ],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Scenario', 'NPV Impact', 'Assessment']],
    body: sensRows,
    ...autoTableTheme(),
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.40 },
      1: { cellWidth: CONTENT_W * 0.30, halign: 'right' },
      2: { cellWidth: CONTENT_W * 0.30, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        const val = data.cell.raw;
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = val === 'Positive' ? GREEN : RED;
      }
    },
  });

  y = doc.lastAutoTable.finalY + 14;

  // Tornado chart
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text('NPV Sensitivity Tornado Chart', MARGIN, y);
  y += 8;

  const impacts = [
    { label: 'Adoption 20% Lower', delta: lowerAdoptionDelta },
    { label: 'Costs 30% Over Budget', delta: higherCostsDelta },
    { label: 'Timeline Doubles', delta: doubleTimelineDelta },
  ];

  // Sort by absolute impact descending
  impacts.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const maxDelta = Math.max(...impacts.map((i) => Math.abs(i.delta)), 1);
  const tornadoH = 16;
  const tornadoGap = 6;
  const labelWidth = 55;
  const barArea = CONTENT_W - labelWidth - 20;
  const centerX = MARGIN + labelWidth + barArea / 2;

  // Chart background
  const chartTotalH = impacts.length * (tornadoH + tornadoGap) + 10;
  drawRoundedRect(doc, MARGIN, y - 2, CONTENT_W, chartTotalH, 2, LIGHT_GRAY);

  // Center line (zero line)
  doc.setDrawColor(...MID_GRAY);
  doc.setLineWidth(0.3);
  doc.line(centerX, y, centerX, y + chartTotalH - 6);

  // Zero label
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MID_GRAY);
  doc.text('$0', centerX, y + chartTotalH - 2, { align: 'center' });

  impacts.forEach((item, i) => {
    const barY = y + 4 + i * (tornadoH + tornadoGap);
    const barLen = (Math.abs(item.delta) / maxDelta) * (barArea / 2 - 5);
    const isNegative = item.delta < 0;

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...DARK_TEXT);
    doc.text(item.label, MARGIN + 4, barY + tornadoH / 2 + 1.5);

    // Bar
    const barColor = isNegative ? RED : GREEN;
    doc.setFillColor(...barColor);
    if (isNegative) {
      doc.roundedRect(centerX - barLen, barY, barLen, tornadoH, 1.5, 1.5, 'F');
    } else {
      doc.roundedRect(centerX, barY, barLen, tornadoH, 1.5, 1.5, 'F');
    }

    // Value on bar
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const valText = formatCompactValue(item.delta);
    if (barLen > 25) {
      doc.setTextColor(...WHITE);
      if (isNegative) {
        doc.text(valText, centerX - barLen + 4, barY + tornadoH / 2 + 1.5);
      } else {
        doc.text(valText, centerX + 4, barY + tornadoH / 2 + 1.5);
      }
    } else {
      doc.setTextColor(...DARK_TEXT);
      const offset = isNegative ? centerX - barLen - 3 : centerX + barLen + 3;
      doc.text(valText, offset, barY + tornadoH / 2 + 1.5, {
        align: isNegative ? 'right' : 'left',
      });
    }
  });

  y += chartTotalH + 12;

  // Interpretation
  y = sectionTitle(doc, 'Interpretation', y);
  y += 2;

  const topImpact = impacts[0];
  const interpText =
    `The factor with the greatest impact on project NPV is "${topImpact.label}" ` +
    `(${formatCompactValue(topImpact.delta)} impact). ` +
    'This analysis helps prioritize risk mitigation efforts and identifies which assumptions ' +
    'most critically affect the business case. Focus governance and monitoring on the ' +
    'highest-sensitivity variables.';
  y = bodyText(doc, interpText, MARGIN, y, { size: 9, color: MID_GRAY });
}

function page7_Recommendations(doc, recommendation) {
  doc.addPage();
  addHeader(doc, 7);

  let y = 25;
  y = sectionTitle(doc, 'Recommendations & Next Steps', y);
  y += 6;

  // Verdict header bar
  const verdictColors = {
    STRONG: GREEN,
    MODERATE: GOLD,
    CAUTIOUS: [245, 158, 11],
    WEAK: RED,
  };
  const vColor = verdictColors[recommendation.verdict] || NAVY;
  drawRoundedRect(doc, MARGIN, y, CONTENT_W, 14, 2, vColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...WHITE);
  doc.text(`VERDICT: ${recommendation.verdict}`, MARGIN + 6, y + 10);
  y += 22;

  // Headline
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text(recommendation.headline, MARGIN, y);
  y += 8;

  // Summary paragraph
  y = bodyText(doc, recommendation.summary, MARGIN, y, { size: 10.5 });
  y += 10;

  // Numbered steps
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text('Recommended Next Steps', MARGIN, y);
  y += 8;

  if (recommendation.steps && recommendation.steps.length > 0) {
    recommendation.steps.forEach((step, i) => {
      // Number circle
      const circleX = MARGIN + 5;
      const circleY = y + 1;
      doc.setFillColor(...NAVY);
      doc.circle(circleX, circleY, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...WHITE);
      doc.text(`${i + 1}`, circleX, circleY + 1.5, { align: 'center' });

      // Step text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...DARK_TEXT);
      const stepLines = doc.splitTextToSize(step, CONTENT_W - 20);
      doc.text(stepLines, MARGIN + 14, y + 2);
      y += stepLines.length * 5 + 6;
    });
  }

  y += 10;

  // Advisory note box
  const noteBoxH = 38;
  drawRoundedRect(doc, MARGIN, y, CONTENT_W, noteBoxH, 2, [240, 244, 252]);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN, y, CONTENT_W, noteBoxH, 2, 2, 'S');
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text('IMPORTANT: DIRECTIONAL GUIDANCE ONLY', MARGIN + 6, y);
  y += 5;
  const advisoryText =
    'This analysis is intended for directional planning purposes and should not be solely relied upon ' +
    'for making investment, procurement, or workforce decisions. Projections are based on user-provided ' +
    'inputs and publicly available benchmarks; actual results will vary based on execution quality, ' +
    'vendor selection, organizational dynamics, regulatory changes, and market conditions. This report ' +
    'does not constitute financial or professional advice. Organizations should consult qualified ' +
    'professionals before committing capital. We recommend revisiting this analysis at 90-day intervals. ' +
    'See Appendix C for full disclosures.';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MID_GRAY);
  const advisoryLines = doc.splitTextToSize(advisoryText, CONTENT_W - 12);
  doc.text(advisoryLines, MARGIN + 6, y);
}

// ---------------------------------------------------------------------------
// Page 8: Input Assumptions & Model Parameters
// ---------------------------------------------------------------------------

function page8_InputAssumptions(doc, formData, results) {
  doc.addPage();
  addHeader(doc, 8);

  let y = 25;
  y = sectionTitle(doc, 'Input Assumptions & Model Parameters', y);
  y += 4;

  // --- Your Inputs ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text('Your Inputs', MARGIN, y);
  y += 6;

  const errorPct = formData.errorRate != null ? `${(formData.errorRate * 100).toFixed(0)}%` : 'N/A';

  const inputRows = [
    ['Industry', formData.industry || 'N/A'],
    ['Company Size', formData.companySize || 'N/A'],
    ['Role', formData.role || 'N/A'],
    ['AI Team Location', formData.teamLocation || 'N/A'],
    ['Process Type', formData.processType || 'N/A'],
    ['Team Size', `${formData.teamSize || 0} people`],
    ['Hours per Person per Week', `${formData.hoursPerWeek || 0} hours`],
    ['Avg Fully-Loaded Cost per Person', formatCurrency(formData.avgSalary || 0)],
    ['Error / Rework Rate', errorPct],
    ['Current Tool / Software Costs', formatCurrency(formData.currentToolCosts || 0)],
    ['Stated Implementation Budget', formatCurrency(formData.implementationBudget || 0)],
    ['Expected Timeline', `${formData.expectedTimeline || 'N/A'} months`],
    ['Stated Ongoing Annual AI Cost', formatCurrency(formData.ongoingAnnualCost || 0)],
    ['Change Readiness', `${formData.changeReadiness || 0} / 5`],
    ['Data Readiness', `${formData.dataReadiness || 0} / 5`],
    ['Executive Sponsor', formData.execSponsor ? 'Yes' : 'No'],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Parameter', 'Value']],
    body: inputRows,
    ...autoTableTheme(),
    bodyStyles: { ...autoTableTheme().bodyStyles, fontSize: 7.5, cellPadding: 1.5 },
    headStyles: { ...autoTableTheme().headStyles, fontSize: 7.5, cellPadding: 1.5 },
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.55 },
      1: { cellWidth: CONTENT_W * 0.45, halign: 'right' },
    },
  });

  y = doc.lastAutoTable.finalY + 6;

  // --- Derived Model Parameters ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text('Derived Model Parameters', MARGIN, y);
  y += 2;

  y = bodyText(
    doc,
    'Computed from your inputs using industry benchmarks and risk models.',
    MARGIN,
    y,
    { size: 8, color: MID_GRAY },
  );
  y += 2;

  const adoptionMult = ADOPTION_MULTIPLIERS[formData.changeReadiness] || 0.70;
  const dataTimeMult = DATA_TIMELINE_MULTIPLIER[formData.dataReadiness] || 1.10;
  const dataCostMult = DATA_COST_MULTIPLIER[formData.dataReadiness] || 1.10;
  const sizeMult = SIZE_MULTIPLIER[formData.companySize] || 1.0;

  const ai = results.aiCostModel;
  const derivedRows = [
    ['Automation Potential (industry x process benchmark)', formatPercent(results.benchmarks.automationPotential)],
    ['Industry Success Rate', formatPercent(results.benchmarks.industrySuccessRate)],
    [`Adoption Multiplier (change readiness = ${formData.changeReadiness})`, formatPercent(adoptionMult)],
    ['Executive Sponsor Adjustment', formatPercent(results.riskAdjustments.sponsorAdjustment)],
    [`Data Readiness Cost Multiplier (score = ${formData.dataReadiness})`, `${dataCostMult.toFixed(2)}x`],
    ['Data Readiness Timeline Multiplier', `${dataTimeMult.toFixed(2)}x`],
    ['Company Size Multiplier', `${sizeMult.toFixed(2)}x`],
    ['AI Engineer Salary (fully-loaded)', formatCurrency(ai.aiSalary)],
    ['Impl. Team: Engineers / PMs', `${ai.implEngineers} / ${ai.implPMs}`],
    ['Computed Implementation Cost', formatCurrency(ai.computedImplCost)],
    ['Realistic Implementation Cost (model-adjusted)', formatCurrency(ai.realisticImplCost)],
    ['Ongoing AI Ops Headcount', `${ai.ongoingAiHeadcount} FTE`],
    ['Computed Annual Ongoing Cost', formatCurrency(ai.computedOngoingCost)],
    ['Year 1 Ongoing Cost (model-adjusted)', formatCurrency(ai.baseOngoingCost)],
    ['Risk-Adjusted Timeline', `${results.riskAdjustments.adjustedTimeline} months`],
    ['Discount Rate (WACC proxy) [26]', formatPercent(results.discountRate || 0.10)],
    ['Adoption Ramp (Year 1-5)', ADOPTION_RAMP.map((r) => (r * 100).toFixed(0) + '%').join(' / ')],
    ['Scenario Multipliers (Cons / Base / Opt)', '0.70x / 1.00x / 1.20x'],
    ['Base Case ROIC Cap [2]', `${(MAX_BASE_ROIC * 100).toFixed(0)}% max`],
    ['Base Case IRR Cap [2][4]', `${(MAX_BASE_IRR * 100).toFixed(0)}% max`],
    ['Vendor Lock-In Risk', results.vendorLockIn.level],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Derived Parameter', 'Value']],
    body: derivedRows,
    ...autoTableTheme(),
    bodyStyles: { ...autoTableTheme().bodyStyles, fontSize: 7, cellPadding: 1.5 },
    headStyles: { ...autoTableTheme().headStyles, fontSize: 7, cellPadding: 1.5 },
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.65 },
      1: { cellWidth: CONTENT_W * 0.35, halign: 'right' },
    },
  });
}

// ---------------------------------------------------------------------------
// Page 9: Extended Sensitivity Analysis
// ---------------------------------------------------------------------------

function page9_ExtendedSensitivity(doc, results) {
  doc.addPage();
  addHeader(doc, 9);

  let y = 25;
  y = sectionTitle(doc, 'Variable Sensitivity Analysis', y);
  y += 2;

  y = bodyText(
    doc,
    'This table shows how the base-case NPV changes when each input variable is independently adjusted. ' +
      'All other variables are held constant. This identifies which assumptions most materially affect the business case.',
    MARGIN,
    y,
    { size: 9, color: MID_GRAY },
  );
  y += 4;

  const baseNPV = results.scenarios.base.npv;
  const ext = results.extendedSensitivity || [];

  const sensRows = ext.map((row) => [
    row.label,
    row.baseVal,
    row.lowLabel,
    formatCurrency(row.npvLow),
    row.highLabel,
    formatCurrency(row.npvHigh),
    formatCurrency(row.npvHigh - row.npvLow),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Variable', 'Base', 'Low Test', 'NPV (Low)', 'High Test', 'NPV (High)', 'Spread']],
    body: sensRows,
    ...autoTableTheme(),
    styles: { ...autoTableTheme().styles, fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { ...autoTableTheme().headStyles, fontSize: 7.5, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.15, fontStyle: 'bold' },
      1: { cellWidth: CONTENT_W * 0.11, halign: 'center' },
      2: { cellWidth: CONTENT_W * 0.14, halign: 'center' },
      3: { cellWidth: CONTENT_W * 0.15, halign: 'right' },
      4: { cellWidth: CONTENT_W * 0.14, halign: 'center' },
      5: { cellWidth: CONTENT_W * 0.15, halign: 'right' },
      6: { cellWidth: CONTENT_W * 0.16, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && (data.column.index === 3 || data.column.index === 5)) {
        const val = parseFloat(String(data.cell.raw).replace(/[^0-9.-]/g, ''));
        if (!isNaN(val) && val < 0) {
          data.cell.styles.textColor = RED;
        } else if (!isNaN(val) && val > 0) {
          data.cell.styles.textColor = GREEN;
        }
      }
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  // Sensitivity tornado chart (sorted by spread)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text('NPV Range by Variable (Tornado)', MARGIN, y);
  y += 8;

  const sorted = [...ext].sort((a, b) => Math.abs(b.npvHigh - b.npvLow) - Math.abs(a.npvHigh - a.npvLow));
  const maxSpread = Math.max(...sorted.map((r) => Math.abs(r.npvHigh - r.npvLow)), 1);

  const barH = 14;
  const barGap = 5;
  const labelWidth = 45;
  const barArea = CONTENT_W - labelWidth - 10;
  const chartTotalH = sorted.length * (barH + barGap) + 4;

  drawRoundedRect(doc, MARGIN, y - 2, CONTENT_W, chartTotalH, 2, LIGHT_GRAY);

  sorted.forEach((row, i) => {
    const barY = y + 2 + i * (barH + barGap);
    const spread = row.npvHigh - row.npvLow;
    const barWidth = (Math.abs(spread) / maxSpread) * barArea;

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...DARK_TEXT);
    doc.text(row.label, MARGIN + 4, barY + barH / 2 + 1.5);

    // Bar
    const barX = MARGIN + labelWidth;
    doc.setFillColor(...GOLD);
    doc.roundedRect(barX, barY, Math.max(barWidth, 2), barH, 1.5, 1.5, 'F');

    // Spread value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    doc.text(formatCompactValue(spread), barX + Math.max(barWidth, 2) + 3, barY + barH / 2 + 1.5);
  });

  y += chartTotalH + 10;

  // Base NPV reference
  drawRoundedRect(doc, MARGIN, y, CONTENT_W, 12, 2, [240, 244, 252]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(`Base Case NPV: ${formatCurrency(baseNPV)}`, MARGIN + 6, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MID_GRAY);
  doc.text('All sensitivity tests are measured against this baseline.', MARGIN + CONTENT_W * 0.45, y + 8);
}

// ---------------------------------------------------------------------------
// Page 10: Appendix A - Calculation Methodology & Definitions
// ---------------------------------------------------------------------------

function page10_AppendixMethodology(doc, formData, results) {
  doc.addPage();
  addHeader(doc, 10);

  let y = 25;
  y = sectionTitle(doc, 'Appendix A: Calculation Walkthrough', y);
  y += 2;

  y = bodyText(doc, 'Step-by-step calculation using your actual inputs. Every number in this report traces back to these steps.', MARGIN, y, { size: 9, color: MID_GRAY });
  y += 4;

  // Helper: calculation step with formula and result
  function calcStep(label, formula, result) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...NAVY);
    doc.text(label, MARGIN + 2, y);
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...DARK_TEXT);
    const formulaLines = doc.splitTextToSize(formula, CONTENT_W - 60);
    doc.text(formulaLines, MARGIN + 2, y + 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text(result, PAGE_W - MARGIN - 2, y + 4, { align: 'right' });
    y += formulaLines.length * 3.5 + 7;
  }

  const teamSize = formData.teamSize || 0;
  const avgSalary = formData.avgSalary || 0;
  const errorRate = formData.errorRate || 0;
  const toolCosts = formData.currentToolCosts || 0;
  const implBudget = results.aiCostModel.realisticImplCost;
  const ongoingCost = results.aiCostModel.baseOngoingCost;
  const baseSalary = Math.round(avgSalary / 1.3);

  // --- STEP 1: LABOR COST ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.text('STEP 1: Current Annual Process Cost', MARGIN, y);
  y += 6;

  calcStep(
    'Base salary (estimated)',
    `~${formatCurrency(baseSalary)}/person (before benefits/overhead)`,
    '',
  );
  calcStep(
    'Benefits & overhead markup',
    `${formatCurrency(baseSalary)} x 1.3 = ${formatCurrency(avgSalary)} fully-loaded`,
    'x 1.3',
  );
  calcStep(
    'Annual labor cost',
    `${teamSize} heads x ${formatCurrency(avgSalary)}/person`,
    formatCurrency(results.currentState.annualLaborCost),
  );
  calcStep(
    'Rework / error cost',
    `${formatCurrency(results.currentState.annualLaborCost)} x ${(errorRate * 100).toFixed(0)}% error rate`,
    formatCurrency(results.currentState.annualReworkCost),
  );
  calcStep(
    'Current tool/software costs',
    'User input (licenses, subscriptions, maintenance)',
    formatCurrency(toolCosts),
  );

  // Total bar
  drawRoundedRect(doc, MARGIN, y - 2, CONTENT_W, 9, 1.5, NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text('Total Current Annual Cost', MARGIN + 4, y + 4);
  doc.text(formatCurrency(results.currentState.totalCurrentCost), PAGE_W - MARGIN - 4, y + 4, { align: 'right' });
  y += 14;

  // --- STEP 2: SAVINGS ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.text('STEP 2: Risk-Adjusted Annual Savings', MARGIN, y);
  y += 6;

  const autoP = results.benchmarks.automationPotential;
  const successR = results.benchmarks.industrySuccessRate;
  const adoptR = results.riskAdjustments.adoptionRate;
  const sponsorA = results.riskAdjustments.sponsorAdjustment;

  calcStep(
    'Addressable savings (automation potential)',
    `${formatCurrency(results.currentState.totalCurrentCost)} x ${(autoP * 100).toFixed(0)}%`,
    formatCurrency(results.savings.grossAnnualSavings),
  );
  const orgReady = adoptR * sponsorA;
  const riskMult = results.riskAdjustments.riskMultiplier;
  calcStep(
    'Org readiness (adoption x sponsor)',
    `${(adoptR * 100).toFixed(0)}% x ${(sponsorA * 100).toFixed(0)}% = ${(orgReady * 100).toFixed(0)}%`,
    '',
  );
  calcStep(
    'Industry success rate',
    `${(successR * 100).toFixed(0)}% (${formData.industry} benchmark)`,
    '',
  );
  calcStep(
    'Blended risk multiplier',
    `(${(orgReady * 100).toFixed(0)}% + ${(successR * 100).toFixed(0)}%) / 2 = ${(riskMult * 100).toFixed(0)}%`,
    '',
  );
  calcStep(
    'Risk-adjusted gross savings',
    `${formatCurrency(results.savings.grossAnnualSavings)} x ${(riskMult * 100).toFixed(0)}%`,
    formatCurrency(results.savings.riskAdjustedSavings),
  );
  calcStep(
    'Less: ongoing AI costs',
    `Licenses, API/token costs, ops: -${formatCurrency(ongoingCost)}/yr`,
    `-${formatCurrency(ongoingCost)}`,
  );

  drawRoundedRect(doc, MARGIN, y - 2, CONTENT_W, 9, 1.5, NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text('Net Annual Savings (Base Case, Year 3)', MARGIN + 4, y + 4);
  doc.text(formatCurrency(results.savings.netAnnualSavings), PAGE_W - MARGIN - 4, y + 4, { align: 'right' });
  y += 14;

  // --- PAGE BREAK for Steps 3-5 ---
  doc.addPage();
  addHeader(doc, 11);
  y = 25;
  y = sectionTitle(doc, 'Appendix A: Calculation Walkthrough (cont.)', y);
  y += 4;

  // --- STEP 3: INVESTMENT (AI Cost Model) ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.text('STEP 3: AI Implementation Cost Model', MARGIN, y);
  y += 6;

  const ai = results.aiCostModel;

  calcStep(
    'AI engineering labor',
    `${ai.implEngineers} engineers x ${formatCurrency(ai.aiSalary)}/yr x ${ai.implTimelineYears.toFixed(1)} yr`,
    formatCurrency(ai.implEngineeringCost),
  );
  calcStep(
    'Project management labor',
    `${ai.implPMs} PMs x ${formatCurrency(Math.round(ai.aiSalary * 0.85))}/yr x ${ai.implTimelineYears.toFixed(1)} yr`,
    formatCurrency(ai.implPMCost),
  );
  calcStep(
    'Infrastructure & tooling (12%)',
    'Cloud, dev environments, CI/CD, monitoring',
    formatCurrency(ai.implInfraCost),
  );
  calcStep(
    'Training & knowledge transfer (8%)',
    'End-user training, documentation, handoff',
    formatCurrency(ai.implTrainingCost),
  );
  calcStep(
    'Realistic implementation cost',
    `max(user budget adjusted, computed cost)`,
    formatCurrency(implBudget),
  );
  calcStep(
    'Change management (15%)',
    `${formatCurrency(implBudget)} x 15%`,
    formatCurrency(results.hiddenCosts.changeManagement),
  );
  if (results.hiddenCosts.dataCleanup > 0) {
    calcStep(
      'Data cleanup',
      `${formatCurrency(implBudget)} x ${formData.dataReadiness <= 2 ? '25%' : '10%'}`,
      formatCurrency(results.hiddenCosts.dataCleanup),
    );
  }
  calcStep(
    'Integration & testing (10%)',
    `${formatCurrency(implBudget)} x 10%`,
    formatCurrency(results.hiddenCosts.integrationTesting),
  );
  calcStep(
    'Productivity dip (3 months at 25% reduced output)',
    `(${formatCurrency(results.currentState.annualLaborCost)} / 12) x 3 months x 25%`,
    formatCurrency(results.hiddenCosts.productivityDip),
  );

  drawRoundedRect(doc, MARGIN, y - 2, CONTENT_W, 9, 1.5, NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text('Total Upfront Investment', MARGIN + 4, y + 4);
  doc.text(formatCurrency(results.totalInvestment), PAGE_W - MARGIN - 4, y + 4, { align: 'right' });
  y += 14;

  // --- STEP 4: DCF MODEL ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.text('STEP 4: Discounted Cash Flow Model (Base Case)', MARGIN, y);
  y += 6;

  const base = results.scenarios.base;
  const netSavings = results.savings.netAnnualSavings;
  const grossSavings = results.savings.grossAnnualSavings;
  const riskAdj = results.savings.riskAdjustedSavings;
  const amortization = results.totalInvestment / DCF_YEARS;

  // Use the actual year-by-year cash flows from the base scenario
  const baseProjections = results.scenarios.base.projections;
  const dcfYears = baseProjections.map((flow, i) => {
    const yr = flow.year;
    const grossCF = flow.grossSavings;
    const sepCost = flow.separationCost || 0;
    const opsCost = flow.ongoingCost;
    const netCF = flow.netCashFlow;
    const discountFactor = 1 / Math.pow(1 + (results.discountRate || 0.10), yr);
    const pv = netCF * discountFactor;
    const enhancement = flow.enhancementSavings || 0;
    const headcount = flow.headcountSavings || 0;
    return { yr, ramp: ADOPTION_RAMP[i], grossCF, enhancement, headcount, sepCost, opsCost, netCF, discountFactor, pv };
  });

  let cumPV = -results.upfrontInvestment;
  const dcfRows = [
    // Year 0 — upfront investment only (separation is phased into Years 2-5)
    [
      { content: 'Year 0', styles: { fontStyle: 'bold' } },
      '', '', '',
      formatCurrency(-results.upfrontInvestment),
      '1.000',
      formatCurrency(-results.upfrontInvestment),
      formatCurrency(-results.upfrontInvestment),
    ],
  ];

  dcfYears.forEach((d) => {
    cumPV += d.pv;
    dcfRows.push([
      { content: `Year ${d.yr} (${(d.ramp * 100).toFixed(0)}%)`, styles: { fontStyle: 'bold' } },
      formatCurrency(d.grossCF),
      d.sepCost > 0 ? `(${formatCurrency(d.sepCost)})` : '—',
      `(${formatCurrency(d.opsCost)})`,
      formatCurrency(d.netCF),
      d.discountFactor.toFixed(3),
      formatCurrency(d.pv),
      formatCurrency(cumPV),
    ]);
  });

  autoTable(doc, {
    startY: y,
    head: [[
      'Period',
      'Gross\nSavings',
      'Separation\nCost',
      'AI Ops\nCost',
      'Net Cash\nFlow',
      'Discount\nFactor',
      'Present\nValue',
      'Cumulative\nPV',
    ]],
    body: dcfRows,
    ...autoTableTheme(),
    styles: { ...autoTableTheme().styles, fontSize: 7, cellPadding: 2 },
    headStyles: { ...autoTableTheme().headStyles, fontSize: 6.5, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.13 },
      1: { cellWidth: CONTENT_W * 0.12, halign: 'right' },
      2: { cellWidth: CONTENT_W * 0.12, halign: 'right' },
      3: { cellWidth: CONTENT_W * 0.11, halign: 'right' },
      4: { cellWidth: CONTENT_W * 0.13, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: CONTENT_W * 0.10, halign: 'center' },
      6: { cellWidth: CONTENT_W * 0.13, halign: 'right' },
      7: { cellWidth: CONTENT_W * 0.16, halign: 'right', fontStyle: 'bold' },
    },
  });

  y = doc.lastAutoTable.finalY + 3;

  // NPV / IRR / Payback summary bar
  drawRoundedRect(doc, MARGIN, y - 1, CONTENT_W, 12, 1.5, NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  const col3 = CONTENT_W / 3;
  doc.text(`NPV: ${formatCurrency(base.npv)}`, MARGIN + 6, y + 6);
  doc.text(`IRR: ${safeIRR(base.irr)}`, MARGIN + col3 + 6, y + 6);
  doc.text(`Payback: ${safePayback(base.paybackMonths)}`, MARGIN + col3 * 2 + 6, y + 6);
  y += 18;

  // --- STEP 5: P&L IMPACT STATEMENT ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.text('STEP 5: P&L Impact Statement (Base Case)', MARGIN, y);
  y += 2;
  y = bodyText(doc, 'How the AI implementation flows through the income statement each year.', MARGIN, y, { size: 8, color: MID_GRAY });
  y += 3;

  const plRows = [];

  // Operating cost reductions (savings) — uses enhancement/headcount from cash flows
  dcfYears.forEach((d) => {
    const totalSavings = d.headcount + d.enhancement;
    const amort = amortization;
    const netImpact = totalSavings - d.opsCost - amort;

    plRows.push([
      `Year ${d.yr}`,
      formatCurrency(d.headcount),
      formatCurrency(d.enhancement),
      `(${formatCurrency(d.opsCost)})`,
      `(${formatCurrency(amort)})`,
      formatCurrency(netImpact),
      formatPercent(netImpact / results.currentState.totalCurrentCost),
    ]);
  });

  // 5-year total
  const totHeadcount = dcfYears.reduce((s, d) => s + d.headcount, 0);
  const totEnhancement = dcfYears.reduce((s, d) => s + d.enhancement, 0);
  const totOps = results.aiCostModel.totalOngoing5Year;
  const totAmort = results.totalInvestment;
  const totNet = totHeadcount + totEnhancement - totOps - totAmort;

  plRows.push([
    { content: `${DCF_YEARS}-Year Total`, styles: { fontStyle: 'bold' } },
    { content: formatCurrency(totHeadcount), styles: { fontStyle: 'bold' } },
    { content: formatCurrency(totEnhancement), styles: { fontStyle: 'bold' } },
    { content: `(${formatCurrency(totOps)})`, styles: { fontStyle: 'bold' } },
    { content: `(${formatCurrency(totAmort)})`, styles: { fontStyle: 'bold' } },
    { content: formatCurrency(totNet), styles: { fontStyle: 'bold' } },
    '',
  ]);

  autoTable(doc, {
    startY: y,
    head: [[
      'Period',
      'Headcount\nSavings',
      'Enhancement\nSavings',
      'AI Operating\nCost',
      `Impl. Amort.\n(${DCF_YEARS}-yr SL)`,
      'Net P&L\nImpact',
      '% of Current\nProcess Cost',
    ]],
    body: plRows,
    ...autoTableTheme(),
    styles: { ...autoTableTheme().styles, fontSize: 7, cellPadding: 2 },
    headStyles: { ...autoTableTheme().headStyles, fontSize: 6.5, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.11, fontStyle: 'bold' },
      1: { cellWidth: CONTENT_W * 0.14, halign: 'right', textColor: GREEN },
      2: { cellWidth: CONTENT_W * 0.14, halign: 'right', textColor: GREEN },
      3: { cellWidth: CONTENT_W * 0.13, halign: 'right', textColor: RED },
      4: { cellWidth: CONTENT_W * 0.13, halign: 'right', textColor: RED },
      5: { cellWidth: CONTENT_W * 0.14, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: CONTENT_W * 0.14, halign: 'right' },
    },
    didParseCell: (data) => {
      // Color net P&L impact
      if (data.section === 'body' && data.column.index === 5) {
        const raw = String(data.cell.raw?.content || data.cell.raw || '');
        if (raw.startsWith('-') || raw.startsWith('(')) {
          data.cell.styles.textColor = RED;
        } else {
          data.cell.styles.textColor = GREEN;
        }
      }
    },
  });

  y = doc.lastAutoTable.finalY + 6;

  // Notes
  const plNotes = [
    'Headcount Savings: Phased reduction in fully-loaded labor costs from displaced FTEs (Years 2-5).',
    'Enhancement Savings: Efficiency, error reduction, and tool replacement gains (adoption-ramped).',
    'AI Operating Cost: Annual licenses, API/token costs, monitoring, and operational overhead.',
    `Impl. Amortization: Total upfront investment (incl. transition & friction costs) amortized straight-line over ${DCF_YEARS} years.`,
    'All savings are risk-adjusted using blended risk multiplier: (orgReadiness + industrySuccessRate) / 2.',
  ];
  plNotes.forEach((note) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MID_GRAY);
    doc.text('- ' + note, MARGIN + 2, y);
    y += 3.5;
  });
}

// ---------------------------------------------------------------------------
// Page 11: Appendix B - Benchmarks, Sources & Disclaimer
// ---------------------------------------------------------------------------

function page12_AppendixBenchmarks(doc, formData) {
  doc.addPage();
  addHeader(doc, 12);

  let y = 25;
  y = sectionTitle(doc, 'Appendix B: Source References & Benchmarks', y);
  y += 4;

  // --- Risk Multiplier Lookup Tables ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text('Adoption Rate by Change Readiness Score', MARGIN, y);
  y += 5;

  const adoptRows = Object.entries(ADOPTION_MULTIPLIERS).map(([score, mult]) => [
    `${score} / 5`,
    formatPercent(mult),
    score == formData.changeReadiness ? '<-- Your score' : '',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Score', 'Adoption Multiplier', '']],
    body: adoptRows,
    ...autoTableTheme(),
    styles: { ...autoTableTheme().styles, fontSize: 8, cellPadding: 2 },
    headStyles: { ...autoTableTheme().headStyles, fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.20, halign: 'center' },
      1: { cellWidth: CONTENT_W * 0.30, halign: 'center' },
      2: { cellWidth: CONTENT_W * 0.50, fontStyle: 'italic', textColor: GOLD },
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  // Data readiness multipliers
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text('Data Readiness Impact', MARGIN, y);
  y += 5;

  const dataRows = Object.keys(DATA_TIMELINE_MULTIPLIER).map((score) => [
    `${score} / 5`,
    `${DATA_COST_MULTIPLIER[score].toFixed(2)}x`,
    `${DATA_TIMELINE_MULTIPLIER[score].toFixed(2)}x`,
    score == formData.dataReadiness ? '<-- Your score' : '',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Score', 'Cost Multiplier', 'Timeline Multiplier', '']],
    body: dataRows,
    ...autoTableTheme(),
    styles: { ...autoTableTheme().styles, fontSize: 8, cellPadding: 2 },
    headStyles: { ...autoTableTheme().headStyles, fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.15, halign: 'center' },
      1: { cellWidth: CONTENT_W * 0.22, halign: 'center' },
      2: { cellWidth: CONTENT_W * 0.25, halign: 'center' },
      3: { cellWidth: CONTENT_W * 0.38, fontStyle: 'italic', textColor: GOLD },
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  // Company size multiplier
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text('Company Size Timeline Multiplier', MARGIN, y);
  y += 5;

  const sizeRows = Object.entries(SIZE_MULTIPLIER).map(([size, mult]) => [
    size,
    `${mult.toFixed(2)}x`,
    size === formData.companySize ? '<-- Your size' : '',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Company Size', 'Timeline Multiplier', '']],
    body: sizeRows,
    ...autoTableTheme(),
    styles: { ...autoTableTheme().styles, fontSize: 8, cellPadding: 2 },
    headStyles: { ...autoTableTheme().headStyles, fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.40 },
      1: { cellWidth: CONTENT_W * 0.25, halign: 'center' },
      2: { cellWidth: CONTENT_W * 0.35, fontStyle: 'italic', textColor: GOLD },
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  // --- Footnoted Source Registry ---
  y = sectionTitle(doc, 'Source References', y);
  y += 2;

  BENCHMARK_SOURCES.forEach((src) => {
    const note = `[${src.id}] ${src.full}`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MID_GRAY);
    const lines = doc.splitTextToSize(note, CONTENT_W - 4);
    doc.text(lines, MARGIN + 2, y);
    y += lines.length * 3 + 1.5;

    // Check if we're running out of page space
    if (y > PAGE_H - 40) {
      doc.addPage();
      addHeader(doc);
      y = 25;
      y = sectionTitle(doc, 'Source References (cont.)', y);
      y += 2;
    }
  });

  y += 6;

  // --- Brief Disclaimer (full disclosures in Appendix C) ---
  y = sectionTitle(doc, 'Disclaimer', y);
  y += 2;

  const disclaimer =
    'This report is provided for directional guidance and informational purposes only. It does not ' +
    'constitute financial, investment, legal, tax, or professional advice, and should not be solely ' +
    'relied upon for making business, procurement, or workforce decisions. All projections are based ' +
    'on mathematical models using user-provided inputs and publicly available industry benchmarks. ' +
    'Actual results may differ materially from projected figures due to factors including, but not ' +
    'limited to, execution quality, vendor performance, regulatory changes, market conditions, and ' +
    'accuracy of input assumptions. Past performance of AI implementations in any industry does not ' +
    'guarantee future results. Organizations should engage qualified professionals with direct knowledge ' +
    'of their specific circumstances before making significant technology investment decisions. ' +
    'See Appendix C for full definitions, assumptions, limitations, and legal disclosures.';
  y = bodyText(doc, disclaimer, MARGIN, y, { size: 8, color: MID_GRAY, lineHeight: 3.5 });
}

// ---------------------------------------------------------------------------
// Appendix C: AI Cost Assumptions & Definitions (SEC-quality)
// ---------------------------------------------------------------------------

function page13_AppendixCostAssumptions(doc, formData, results) {
  // =========================================================================
  // APPENDIX C: DEFINITIONS, ASSUMPTIONS & LEGAL DISCLOSURES
  // Written in the style of SEC filing disclosure schedules
  // =========================================================================
  doc.addPage();
  addHeader(doc);

  let y = 25;
  y = sectionTitle(doc, 'Appendix C: Definitions, Assumptions & Disclosures', y);
  y += 2;

  // Helper for page-break-safe section rendering
  function checkPageBreak(needed) {
    if (y > PAGE_H - needed) {
      doc.addPage();
      addHeader(doc);
      y = 25;
    }
  }

  // Helper for subsection headers
  function subSection(title) {
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(title, MARGIN, y);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y + 2, MARGIN + CONTENT_W, y + 2);
    y += 7;
  }

  // Helper for definition items
  function defItem(term, definition) {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    doc.text(term, MARGIN + 2, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...DARK_TEXT);
    const defLines = doc.splitTextToSize(definition, CONTENT_W - 4);
    doc.text(defLines, MARGIN + 2, y + 3.5);
    y += defLines.length * 3 + 5.5;
  }

  // Helper for paragraph text within sections
  function sectionPara(text) {
    checkPageBreak(16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...DARK_TEXT);
    const lines = doc.splitTextToSize(text, CONTENT_W - 4);
    doc.text(lines, MARGIN + 2, y);
    y += lines.length * 3.2 + 3;
  }

  // =====================================================================
  // I. BASIS OF PRESENTATION
  // =====================================================================
  subSection('I. Basis of Presentation');

  sectionPara(
    'This report presents a forward-looking financial assessment of a proposed artificial intelligence ' +
    'implementation. All projections are derived from a deterministic model using (a) user-provided ' +
    'inputs, (b) publicly available industry benchmarks sourced from 26 cited references (see Appendix B), ' +
    'and (c) standardized risk adjustment factors. The model does not use proprietary data, machine learning ' +
    'predictions, or Monte Carlo simulation.'
  );
  sectionPara(
    'All dollar amounts are expressed in nominal U.S. dollars unless otherwise noted. Present value ' +
    'calculations use a discount rate of ' + formatPercent(results.discountRate || 0.10) + ' (weighted average cost of capital ' +
    'proxy, varied by company size per Damodaran 2025 [26]) applied across all scenarios. The projection period is five (5) fiscal years from the ' +
    'assumed implementation start date. No terminal value is assigned beyond the projection period.'
  );
  sectionPara(
    'This analysis is intended solely for directional guidance and internal planning purposes. It is ' +
    'not intended to serve as, and should not be construed as, financial advice, an investment recommendation, ' +
    'a securities offering document, a fairness opinion, or a valuation report. Readers should not rely ' +
    'solely on this report when making investment or procurement decisions.'
  );

  // =====================================================================
  // II. FORWARD-LOOKING STATEMENTS
  // =====================================================================
  subSection('II. Forward-Looking Statements');

  sectionPara(
    'This report contains forward-looking statements within the meaning commonly applied in financial ' +
    'disclosures. These statements include, but are not limited to, projections of cost savings, net ' +
    'present value, internal rate of return, return on invested capital, payback period, ' +
    'enablement potential, scalability premiums, and opportunity cost estimates.'
  );
  sectionPara(
    'Forward-looking statements are based on current expectations and assumptions that are subject to ' +
    'risks and uncertainties that could cause actual results to differ materially. Key risk factors include, ' +
    'but are not limited to: (i) the pace and extent of organizational adoption of AI tools; ' +
    '(ii) vendor performance and technology reliability; (iii) changes in regulatory requirements; ' +
    '(iv) macroeconomic conditions affecting labor markets, technology pricing, and capital availability; ' +
    '(v) accuracy of user-provided input data; (vi) unforeseen implementation challenges; and ' +
    '(vii) competitive dynamics within the relevant industry.'
  );
  sectionPara(
    'No representation or warranty, express or implied, is made as to the accuracy or completeness ' +
    'of any forward-looking statement. The preparer of this report undertakes no obligation to update ' +
    'or revise any forward-looking statement. Past performance of AI implementations in any industry ' +
    'does not guarantee, and should not be taken as indicative of, future results.'
  );

  // =====================================================================
  // III. MATERIAL ASSUMPTIONS
  // =====================================================================
  subSection('III. Material Assumptions');

  sectionPara(
    'The following material assumptions underlie all projections in this report. A change in any ' +
    'single assumption may materially affect the projected outcomes. The Sensitivity Analysis section ' +
    'of this report quantifies the NPV impact of varying each assumption independently.'
  );

  defItem('A. Labor Cost Methodology',
    'Compensation figures represent fully-loaded annual costs, inclusive of base salary, employer-paid ' +
    'benefits (health insurance, retirement contributions), payroll taxes (FICA, FUTA, state unemployment), ' +
    'and allocated overhead (workspace, equipment, administrative support). The fully-loaded multiplier is ' +
    'approximately 1.25x-1.40x of base salary, consistent with SHRM and BLS benchmarks [7][8][15].'
  );
  defItem('B. Automation Potential',
    'The percentage of current process hours addressable by AI automation is derived from a cross-tabulation ' +
    'of industry and process type, based on McKinsey [1] and Deloitte [5] research indicating that generative ' +
    'AI can automate 60-70% of knowledge worker tasks. Individual results may vary significantly based on ' +
    'process complexity, data quality, and organizational factors not captured by this model.'
  );
  defItem('C. Adoption Ramp and Risk Adjustment',
    'Annual savings are adjusted using a blended risk multiplier: organizational readiness (adoption rate x sponsor ' +
    'adjustment) is averaged with the industry success rate — i.e., riskMultiplier = (orgReadiness + industrySuccessRate) / 2. ' +
    'Adoption rate is derived from the user-reported change readiness score (40%-95%); executive sponsorship adjustment is ' +
    '85% without or 100% with a sponsor, reflecting documented failure rates for unsponsored projects; and industry ' +
    'success rate (45%-72%) reflects the documented rate at which AI projects in each industry achieve target ' +
    'outcomes [3][4][5]. Additionally, a 5-year adoption ramp (60%, 85%, 100%, 100%, 100%) is applied [14]. ' +
    'Headcount reduction is phased over Years 2-5 (Year 1 is enhancement only) and capped at 75% — 25% of roles always require humans [21].'
  );
  defItem('D. Implementation Cost Model',
    'Implementation costs are estimated using a staffing model calibrated to industry salary data [7][8]. ' +
    'The model derives engineering headcount from team scope (1 engineer per ~12 end users), adjusts for ' +
    'timeline pressure and data readiness, and adds project management (1 PM per 4-5 engineers). ' +
    'Infrastructure (12%) and training (8%) allocations are applied. The higher of the user-stated budget ' +
    '(adjusted for data readiness risk) and the computed staffing cost is used, preventing underestimation.'
  );
  defItem('E. Ongoing Operational Costs',
    'Post-implementation costs include AI operations team labor (25% of implementation team, minimum 0.5 FTE), ' +
    'API/inference costs (derived from per-process-type token pricing [11] and estimated request volume), ' +
    'platform/license fees (by company size), adjacent product costs (25% of license, reflecting forced ' +
    'vendor cross-sells) [22], model retraining/drift monitoring, annual compliance recertification, ' +
    'retained employee retraining, technical debt/integration maintenance, and cyber insurance increases. ' +
    'Costs escalate on a tapered schedule (12%/12%/7%/7% in Years 2-5) reflecting aggressive vendor lock-in ' +
    'pricing early on that stabilizes over time. The higher of user-stated and model-computed ongoing costs is used.'
  );
  defItem('F. Separation and Transition Costs',
    'Total separation cost for displaced employees is modeled as a multiple of annual salary (0.80x-1.50x by ' +
    'company size), encompassing severance pay (55%), benefits continuation/COBRA (15%), outplacement services (12%), ' +
    'administrative processing (10%), and legal review (8%) [15]. Separation is phased over Years 2-5 following the ' +
    'headcount reduction schedule (0%, 20%, 25%, 20%, 10%), NOT charged as upfront costs. Year 1 is enhancement only — ' +
    'no employees are separated on Day 1 [21].'
  );
  defItem('G. Empirical Return Ceilings',
    'Base case ROIC is capped at ' + (MAX_BASE_ROIC * 100).toFixed(0) + '% and base case IRR at ' +
    (MAX_BASE_IRR * 100).toFixed(0) + '%. These ceilings are derived from IBM research [2] showing that the ' +
    'highest-performing AI projects return approximately $3.50 per $1 invested over five years, and from ' +
    'MIT/RAND findings [4] that 70-85% of AI initiatives fail to meet expected outcomes. The ceilings represent ' +
    'an upper bound of realistic per-project returns and are applied only to the base case scenario.'
  );
  defItem('H. R&D Tax Credit',
    'Potential R&D tax credit estimates (IRS Section 41, Alternative Simplified Credit) are shown for ' +
    'informational purposes only and are NOT incorporated into financial projections [19]. Actual eligibility ' +
    'depends on specific facts and circumstances. Organizations should consult qualified tax professionals ' +
    'to determine eligibility and optimal claiming strategies.'
  );
  defItem('I. Opportunity Cost',
    'The cost of delay (inaction) includes forgone risk-adjusted savings, wage inflation (4% annual [17]), ' +
    'legacy system maintenance creep (7% annual [16]), competitive penalty by industry [18], and compliance ' +
    'risk escalation. These projections assume continuation of current market trends and are inherently uncertain.'
  );

  // =====================================================================
  // IV. COST ASSUMPTION SCHEDULES
  // =====================================================================
  checkPageBreak(60);
  subSection('IV. Cost Assumption Schedules');

  sectionPara(
    'The following schedules disclose all material cost assumptions used in the model. All salary figures ' +
    'represent fully-loaded annual compensation. API cost data reflects 2025-2026 enterprise model pricing. ' +
    'Bracketed numbers reference sources listed in Appendix B.'
  );

  // Schedule 1: Salaries
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  checkPageBreak(45);
  doc.text('Schedule 1: AI/ML Engineer Compensation by Location [7][8]', MARGIN, y);
  y += 5;

  const salaryRows = Object.entries(AI_TEAM_SALARY).map(([loc, sal]) => [
    loc,
    formatCurrency(sal),
    loc === formData.teamLocation ? 'Selected' : '',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Location', 'Fully-Loaded Annual Cost', '']],
    body: salaryRows,
    ...autoTableTheme(),
    styles: { ...autoTableTheme().styles, fontSize: 7.5, cellPadding: 2 },
    headStyles: { ...autoTableTheme().headStyles, fontSize: 7.5, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.42 },
      1: { cellWidth: CONTENT_W * 0.30, halign: 'right' },
      2: { cellWidth: CONTENT_W * 0.28, fontStyle: 'italic', textColor: GOLD },
    },
  });

  y = doc.lastAutoTable.finalY + 6;

  // Schedule 2: API Costs
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  checkPageBreak(45);
  doc.text('Schedule 2: API/Inference Cost per 1,000 Requests [11]', MARGIN, y);
  y += 5;

  const apiRows = Object.entries(API_COST_PER_1K_REQUESTS).map(([proc, cost]) => {
    const reqPerHr = REQUESTS_PER_PERSON_HOUR[proc] || 12;
    return [proc, `$${cost.toFixed(2)}`, `${reqPerHr}`, proc === formData.processType ? 'Selected' : ''];
  });

  autoTable(doc, {
    startY: y,
    head: [['Process Type', 'Cost / 1K Req', 'Est. Req/Hr', '']],
    body: apiRows,
    ...autoTableTheme(),
    styles: { ...autoTableTheme().styles, fontSize: 7.5, cellPadding: 2 },
    headStyles: { ...autoTableTheme().headStyles, fontSize: 7.5, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.35 },
      1: { cellWidth: CONTENT_W * 0.18, halign: 'right' },
      2: { cellWidth: CONTENT_W * 0.18, halign: 'center' },
      3: { cellWidth: CONTENT_W * 0.29, fontStyle: 'italic', textColor: GOLD },
    },
  });

  y = doc.lastAutoTable.finalY + 6;

  // Schedule 3: Platform Costs
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  checkPageBreak(35);
  doc.text('Schedule 3: Platform & License Costs', MARGIN, y);
  y += 5;

  const licenseRows = Object.entries(PLATFORM_LICENSE_COST).map(([size, cost]) => [
    size, formatCurrency(cost), size === formData.companySize ? 'Selected' : '',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Company Size', 'Annual License Cost', '']],
    body: licenseRows,
    ...autoTableTheme(),
    styles: { ...autoTableTheme().styles, fontSize: 7.5, cellPadding: 2 },
    headStyles: { ...autoTableTheme().headStyles, fontSize: 7.5, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.42 },
      1: { cellWidth: CONTENT_W * 0.30, halign: 'right' },
      2: { cellWidth: CONTENT_W * 0.28, fontStyle: 'italic', textColor: GOLD },
    },
  });

  y = doc.lastAutoTable.finalY + 6;

  // Schedule 4: Separation Cost Multipliers
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  checkPageBreak(35);
  doc.text('Schedule 4: Total Separation Cost Multipliers [15]', MARGIN, y);
  y += 5;

  const sepRows = Object.entries(SEPARATION_COST_MULTIPLIER).map(([size, mult]) => [
    size,
    `${(mult * 100).toFixed(0)}% of annual salary`,
    size === formData.companySize ? 'Selected' : '',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Company Size', 'Separation Cost Multiple', '']],
    body: sepRows,
    ...autoTableTheme(),
    styles: { ...autoTableTheme().styles, fontSize: 7.5, cellPadding: 2 },
    headStyles: { ...autoTableTheme().headStyles, fontSize: 7.5, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.42 },
      1: { cellWidth: CONTENT_W * 0.30, halign: 'right' },
      2: { cellWidth: CONTENT_W * 0.28, fontStyle: 'italic', textColor: GOLD },
    },
  });

  y = doc.lastAutoTable.finalY + 6;

  // Schedule 5: Staffing Model
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  checkPageBreak(35);
  doc.text('Schedule 5: Maximum Implementation Team Size', MARGIN, y);
  y += 5;

  const staffRows = Object.entries(MAX_IMPL_TEAM).map(([size, max]) => [
    size, `${max} FTE`, size === formData.companySize ? 'Selected' : '',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Company Size', 'Max Team', '']],
    body: staffRows,
    ...autoTableTheme(),
    styles: { ...autoTableTheme().styles, fontSize: 7.5, cellPadding: 2 },
    headStyles: { ...autoTableTheme().headStyles, fontSize: 7.5, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.42 },
      1: { cellWidth: CONTENT_W * 0.30, halign: 'center' },
      2: { cellWidth: CONTENT_W * 0.28, fontStyle: 'italic', textColor: GOLD },
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  // =====================================================================
  // V. DEFINED TERMS
  // =====================================================================
  checkPageBreak(40);
  subSection('V. Defined Terms');

  sectionPara(
    'The following terms, as used throughout this report, have the meanings set forth below. ' +
    'Definitions are presented in plain language to ensure accessibility for all stakeholders.'
  );

  const definitions = [
    ['Adoption Ramp',
      'The phased utilization curve applied to projected savings. Reflects that enterprise tools are not utilized at full capacity from day one. This model uses 60% / 85% / 100% across Years 1-3, consistent with Worklytics enterprise adoption research [14].'],
    ['Automation Potential',
      'The estimated percentage of current process hours addressable by AI automation, derived from a cross-tabulation of industry and process type based on McKinsey [1] and Deloitte [5] research.'],
    ['Confidence Intervals',
      'The P25, P50, and P75 estimates represent the 25th, 50th, and 75th percentile projections derived from the three-scenario spread and 6-variable sensitivity analysis. They do not represent statistical confidence levels from sampling or simulation.'],
    ['Contingency Reserve',
      'A budget allocation (20% of implementation cost) reserved for unforeseen costs, consistent with Project Management Institute guidelines for technology projects [10].'],
    ['DCF (Discounted Cash Flow)',
      'A valuation methodology that discounts projected future cash flows to their present value using a specified discount rate (varies by company size per Damodaran 2025 [26]) to account for the time value of money.'],
    ['Fully-Loaded Cost',
      'Total employer cost per employee, including base salary, employer-paid benefits, payroll taxes, and allocated overhead (workspace, equipment, administrative). Typically 1.25x-1.40x of base salary [7][8].'],
    ['Transition & Friction Costs',
      'Implementation costs frequently omitted from initial estimates: change management (15%), data cleanup (10-25%), integration testing (10%), and productivity dip during transition. These add 30-40% to total project cost [9].'],
    ['IRR (Internal Rate of Return)',
      'The discount rate at which the NPV of all cash flows equals zero. Represents the annualized effective rate of return. Capped at ' + (MAX_BASE_IRR * 100).toFixed(0) + '% for the base case based on empirical research [2][4].'],
    ['NPV (Net Present Value)',
      'The sum of all discounted future cash flows minus the initial investment. A positive NPV indicates the project is expected to generate value above the required rate of return (discount rate varies by company size [26]).'],
    ['Payback Period',
      'The number of months required for cumulative net savings to offset the total upfront investment. Reported on a monthly basis up to 36 months.'],
    ['Peer Comparison',
      'Benchmarking of projected ROIC against aggregate industry/size cohort data from McKinsey [1], IBM [2], and Deloitte [5]. Percentile rankings are interpolated from P25/median/P75 peer distributions.'],
    ['ROIC (Return on Invested Capital)',
      `Average annual net return divided by total capital deployed (upfront + all separation costs). Capped at ${(MAX_BASE_ROIC * 100).toFixed(0)}% for the base case per IBM research [2].`],
    ['Empirical Return Ceiling',
      'An upper bound applied to projected returns to prevent unrealistic projections. Derived from IBM [2] ($3.50 per $1 invested for top performers) and MIT/RAND [4] (70-85% of AI projects fail to meet expectations).'],
    ['Sensitivity Analysis',
      'A deterministic analysis that varies each input variable independently while holding all others constant, measuring the resulting change in NPV. Identifies which assumptions most materially affect the business case.'],
    ['Total Separation Cost',
      'The fully burdened cost of separating a displaced employee, including severance pay, benefits continuation (COBRA), outplacement services, legal review, and administrative processing. Modeled as 0.80x-1.50x of annual salary by company size [15].'],
  ];

  definitions.forEach(([term, def]) => {
    defItem(term, def);
  });

  // =====================================================================
  // VI. LIMITATIONS AND QUALIFICATIONS
  // =====================================================================
  checkPageBreak(40);
  subSection('VI. Limitations and Qualifications');

  const limitations = [
    'This model employs deterministic calculations and does not incorporate stochastic analysis, Monte Carlo simulation, or Bayesian inference. Actual probability distributions of outcomes may differ from the scenarios presented.',
    'User-provided inputs have not been independently verified. The accuracy of projections is contingent upon the accuracy and completeness of these inputs.',
    'Industry benchmarks represent aggregate averages and medians. Individual organizational outcomes may deviate significantly from industry norms due to unique operational, cultural, or competitive factors.',
    'The model assumes a single implementation at a single point in time. It does not account for phased multi-project portfolios, organizational learning effects across sequential implementations, or interdependencies between concurrent AI initiatives.',
    'Technology pricing (API costs, platform licenses, infrastructure) is based on current market rates and is subject to change. Rapid shifts in AI model pricing could materially affect ongoing cost projections.',
    'The model does not account for regulatory changes that may affect AI implementation costs, timelines, or permissible use cases after the date of this report.',
    'R&D tax credit and opportunity cost projections are presented for informational context only and are explicitly excluded from all NPV, IRR, and payback calculations to maintain conservative financial projections.',
    'Generated using a deterministic financial model calibrated to 25 industry benchmarks and adjusted for organizational risk posture. This report has not been reviewed or endorsed by a licensed financial advisor, certified public accountant, investment banker, or legal counsel.',
  ];

  limitations.forEach((text, i) => {
    checkPageBreak(14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...DARK_TEXT);
    const bullet = `${i + 1}. ${text}`;
    const lines = doc.splitTextToSize(bullet, CONTENT_W - 6);
    doc.text(lines, MARGIN + 3, y);
    y += lines.length * 3 + 2;
  });

  // =====================================================================
  // VII. DISCLAIMER
  // =====================================================================
  checkPageBreak(50);
  subSection('VII. Disclaimer and Legal Notice');

  const disclaimerParagraphs = [
    'NO WARRANTY. This report is provided "as is" without warranty of any kind, express or implied, ' +
    'including but not limited to the warranties of merchantability, fitness for a particular purpose, ' +
    'accuracy, completeness, or non-infringement. The entire risk as to the quality and performance of ' +
    'the analysis rests with the user.',

    'LIMITATION OF LIABILITY. In no event shall Global Gauntlet AI, its principals, employees, or agents ' +
    'be liable for any direct, indirect, incidental, special, exemplary, or consequential damages ' +
    '(including, but not limited to, procurement of substitute goods or services, loss of use, data, or ' +
    'profits, or business interruption) arising in any way out of the use of this report, even if advised ' +
    'of the possibility of such damage.',

    'NOT PROFESSIONAL ADVICE. This report does not constitute, and should not be interpreted as, financial ' +
    'advice, investment advice, tax advice, legal advice, or any other form of professional counsel. ' +
    'Organizations should engage qualified professionals with direct knowledge of their specific circumstances ' +
    'before making technology investment, workforce, or procurement decisions.',

    'DIRECTIONAL GUIDANCE ONLY. All projections, estimates, and recommendations contained in this report ' +
    'are intended solely as directional guidance to inform internal planning discussions. They should not ' +
    'be the sole basis for any business decision, capital allocation, or contractual commitment. Decision-makers ' +
    'should independently verify assumptions and supplement this analysis with organization-specific due diligence.',
  ];

  disclaimerParagraphs.forEach((para) => {
    checkPageBreak(20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...DARK_TEXT);
    const lines = doc.splitTextToSize(para, CONTENT_W - 4);
    doc.text(lines, MARGIN + 2, y);
    y += lines.length * 3 + 4;
  });

  // Final credit line
  checkPageBreak(20);
  y += 4;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text('Global Gauntlet AI', MARGIN, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MID_GRAY);
  doc.text('Built by JJ Shay -- 15+ years M&A experience, 10+ production AI systems', MARGIN, y);
  y += 4;
  doc.text(`Report generated: ${formatDate()}`, MARGIN, y);
}

// ---------------------------------------------------------------------------
// NEW PAGE: Value Creation Breakdown
// ---------------------------------------------------------------------------

function pageN_ValueBreakdown(doc, results) {
  doc.addPage();
  addHeader(doc);

  let y = 25;
  y = sectionTitle(doc, 'Value Creation Breakdown', y);
  y += 4;

  y = bodyText(doc,
    'Gross annual savings are decomposed into four value categories, then risk-adjusted ' +
    'using a blended average of organizational readiness and industry success rate.',
    MARGIN, y, { size: 9, color: MID_GRAY });
  y += 6;

  const vb = results.valueBreakdown;
  const categories = [
    ['Headcount Optimization', vb.headcount.gross, vb.headcount.riskAdjusted],
    ['Efficiency Gains', vb.efficiency.gross, vb.efficiency.riskAdjusted],
    ['Error Reduction', vb.errorReduction.gross, vb.errorReduction.riskAdjusted],
    ['Tool Replacement [16]', vb.toolReplacement.gross, vb.toolReplacement.riskAdjusted],
  ];

  const vbRows = categories.map(([label, gross, adj]) => [
    label,
    formatCurrency(gross),
    formatCurrency(adj),
    vb.totalRiskAdjusted > 0 ? formatPercent(adj / vb.totalRiskAdjusted) : '0%',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Value Category', 'Gross Annual', 'Risk-Adjusted', '% of Total']],
    body: vbRows,
    ...autoTableTheme(),
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.35, fontStyle: 'bold' },
      1: { cellWidth: CONTENT_W * 0.22, halign: 'right' },
      2: { cellWidth: CONTENT_W * 0.22, halign: 'right' },
      3: { cellWidth: CONTENT_W * 0.21, halign: 'right' },
    },
  });

  y = doc.lastAutoTable.finalY + 2;

  // Total row
  drawRoundedRect(doc, MARGIN, y, CONTENT_W, 10, 1.5, NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text('Total', MARGIN + 4, y + 7);
  doc.text(formatCurrency(vb.totalGross), MARGIN + CONTENT_W * 0.35 + CONTENT_W * 0.22 - 4, y + 7, { align: 'right' });
  doc.text(formatCurrency(vb.totalRiskAdjusted), MARGIN + CONTENT_W * 0.35 + CONTENT_W * 0.44 - 4, y + 7, { align: 'right' });
  doc.text('100%', PAGE_W - MARGIN - 4, y + 7, { align: 'right' });
  y += 18;

  // Phased Timeline
  y = sectionTitle(doc, 'Phased Value Realization Timeline [20]', y);
  y += 4;

  const phaseRows = results.phasedTimeline.map(phase => [
    `Phase ${phase.phase}: ${phase.label}`,
    `Months ${phase.monthRange[0]}-${phase.monthRange[1]}`,
    phase.description,
    formatCurrency(phase.estimatedValue),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Phase', 'Period', 'Description', 'Est. Annual Value']],
    body: phaseRows,
    ...autoTableTheme(),
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.22, fontStyle: 'bold' },
      1: { cellWidth: CONTENT_W * 0.18, halign: 'center' },
      2: { cellWidth: CONTENT_W * 0.35 },
      3: { cellWidth: CONTENT_W * 0.25, halign: 'right' },
    },
  });
}

// ---------------------------------------------------------------------------
// NEW PAGE: V3 Value Creation Pathways
// ---------------------------------------------------------------------------

function pageN_ValuePathways(doc, results) {
  doc.addPage();
  addHeader(doc);

  let y = 25;
  y = sectionTitle(doc, 'Value Creation Pathways', y);
  y += 2;

  y = bodyText(doc,
    'AI value is measured through three complementary lenses: direct cost efficiency ' +
    '(cash savings from automation), capacity creation (freed hours and revenue acceleration), ' +
    'and risk reduction (regulatory/compliance protection). Each pathway has an independent ' +
    'NPV inclusion toggle — only pathways marked "Included in NPV" flow into the financial model.',
    MARGIN, y, { size: 9, color: MID_GRAY });
  y += 8;

  const vp = results.valuePathways;

  // Pathway A: Cost Efficiency
  const pathAH = 28;
  drawRoundedRect(doc, MARGIN, y, CONTENT_W, pathAH, 2, [240, 253, 244]);
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.4);
  doc.roundedRect(MARGIN, y, CONTENT_W, pathAH, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text('A. Cost Efficiency — Direct Cash Savings from Automation', MARGIN + 4, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...GREEN);
  doc.text(formatCompactValue(vp.costEfficiency.annualRiskAdjusted), PAGE_W - MARGIN - 4, y + 7, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MID_GRAY);
  doc.text(`Cash realization: ${formatPercent(vp.costEfficiency.cashRealizationPct)}  |  Annual cash realized: ${formatCompactValue(vp.costEfficiency.annualCashRealized)}`, MARGIN + 4, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...DARK_TEXT);
  doc.text('Included in NPV: Yes (always)', MARGIN + 4, y + 22);
  doc.text('/yr', PAGE_W - MARGIN - 4, y + 14, { align: 'right' });

  y += pathAH + 6;

  // Pathway B: Capacity Creation
  const pathBH = 28;
  drawRoundedRect(doc, MARGIN, y, CONTENT_W, pathBH, 2, [239, 246, 255]);
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.4);
  doc.roundedRect(MARGIN, y, CONTENT_W, pathBH, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text('B. Capacity Creation — Freed Hours + Revenue Acceleration', MARGIN + 4, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(59, 130, 246);
  doc.text(formatCompactValue(vp.capacityCreation.totalAnnualValue), PAGE_W - MARGIN - 4, y + 7, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MID_GRAY);
  const capDetails = `${Math.round(vp.capacityCreation.hoursFreed).toLocaleString()} hrs freed  |  ${vp.capacityCreation.fteEquivalent.toFixed(1)} FTE equiv` +
    (vp.capacityCreation.revenueAcceleration > 0 ? `  |  Rev accel: ${formatCompactValue(vp.capacityCreation.revenueAcceleration)}` : '');
  doc.text(capDetails, MARGIN + 4, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(vp.capacityCreation.includeInNPV ? GREEN : MID_GRAY);
  doc.text(`Included in NPV: ${vp.capacityCreation.includeInNPV ? 'Yes' : 'No'}`, MARGIN + 4, y + 22);
  doc.text('/yr', PAGE_W - MARGIN - 4, y + 14, { align: 'right' });

  y += pathBH + 6;

  // Pathway C: Risk Reduction
  const pathCH = 28;
  drawRoundedRect(doc, MARGIN, y, CONTENT_W, pathCH, 2, [245, 240, 255]);
  doc.setDrawColor(147, 51, 234);
  doc.setLineWidth(0.4);
  doc.roundedRect(MARGIN, y, CONTENT_W, pathCH, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text('C. Risk Reduction — Regulatory / Compliance Protection', MARGIN + 4, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(147, 51, 234);
  doc.text(formatCompactValue(vp.riskReduction.annualValueAvoided), PAGE_W - MARGIN - 4, y + 7, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MID_GRAY);
  doc.text(`Event prob: ${formatPercent(vp.riskReduction.eventProbability)}  |  Impact: ${formatCompactValue(vp.riskReduction.eventImpact)}  |  AI reduces: ${formatPercent(vp.riskReduction.aiReductionPct)}`, MARGIN + 4, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(vp.riskReduction.includeInNPV ? GREEN : MID_GRAY);
  doc.text(`Included in NPV: ${vp.riskReduction.includeInNPV ? 'Yes' : 'No'}`, MARGIN + 4, y + 22);
  doc.text('/yr', PAGE_W - MARGIN - 4, y + 14, { align: 'right' });

  y += pathCH + 10;

  // Total annual value
  drawRoundedRect(doc, MARGIN, y, CONTENT_W, 12, 1.5, NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...WHITE);
  doc.text('Total Annual Value (all pathways)', MARGIN + 4, y + 8);
  doc.text(formatCompactValue(vp.totalAnnualValue) + ' /yr', PAGE_W - MARGIN - 4, y + 8, { align: 'right' });
}

// ---------------------------------------------------------------------------
// NEW PAGE: V3 Capital Efficiency & Gate Structure
// ---------------------------------------------------------------------------

function pageN_CapitalEfficiencyGates(doc, results) {
  doc.addPage();
  addHeader(doc);

  let y = 25;
  y = sectionTitle(doc, 'Capital Efficiency Metrics', y);
  y += 2;

  y = bodyText(doc,
    'Capital efficiency measures how effectively the AI investment generates economic value ' +
    'beyond the cost of capital. EVA (Economic Value Added) captures true economic profit after ' +
    'charging for all capital used.',
    MARGIN, y, { size: 9, color: MID_GRAY });
  y += 6;

  const ce = results.capitalEfficiency;

  // 2x2 metrics grid
  const boxW = (CONTENT_W - 6) / 2;
  const boxH = 30;

  // EVA
  drawRoundedRect(doc, MARGIN, y, boxW, boxH, 2, LIGHT_GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MID_GRAY);
  doc.text('Economic Value Added (EVA)', MARGIN + 4, y + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...(ce.eva >= 0 ? GREEN : RED));
  doc.text(formatCompactValue(ce.eva), MARGIN + 4, y + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MID_GRAY);
  doc.text('Annual economic profit', MARGIN + 4, y + 26);

  // Cash-on-Cash
  drawRoundedRect(doc, MARGIN + boxW + 6, y, boxW, boxH, 2, LIGHT_GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MID_GRAY);
  doc.text('Cash-on-Cash Return', MARGIN + boxW + 10, y + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...(ce.cashOnCash >= 0 ? GREEN : RED));
  doc.text(formatPercent(ce.cashOnCash), MARGIN + boxW + 10, y + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MID_GRAY);
  doc.text('Year 3 return on capital', MARGIN + boxW + 10, y + 26);

  y += boxH + 6;

  // ROIC
  drawRoundedRect(doc, MARGIN, y, boxW, boxH, 2, LIGHT_GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MID_GRAY);
  doc.text('Return on Invested Capital (ROIC)', MARGIN + 4, y + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.text(formatPercent(ce.roic), MARGIN + 4, y + 20);

  // ROIC vs WACC
  drawRoundedRect(doc, MARGIN + boxW + 6, y, boxW, boxH, 2, LIGHT_GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MID_GRAY);
  doc.text('ROIC vs WACC Spread', MARGIN + boxW + 10, y + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...(ce.createsValue ? GREEN : RED));
  doc.text((ce.roicWaccSpread >= 0 ? '+' : '') + formatPercent(ce.roicWaccSpread), MARGIN + boxW + 10, y + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...(ce.createsValue ? GREEN : RED));
  doc.text(ce.createsValue ? 'Value creating' : 'Value destroying', MARGIN + boxW + 10, y + 26);

  y += boxH + 16;

  // Gate Structure
  y = sectionTitle(doc, 'Phased Deployment Gates', y);
  y += 2;

  y = bodyText(doc,
    'Go/no-go thresholds at each deployment stage. Gates provide structured decision points ' +
    'to limit downside risk by validating automation and adoption metrics before scaling.',
    MARGIN, y, { size: 9, color: MID_GRAY });
  y += 6;

  const gates = results.gateStructure;
  gates.forEach((gate) => {
    const allMet = Object.values(gate.meetsThresholds).every(Boolean);
    const gateH = 24;
    const fillColor = allMet ? [240, 253, 244] : [255, 251, 235];
    const borderColor = allMet ? GREEN : [245, 158, 11];

    drawRoundedRect(doc, MARGIN, y, CONTENT_W, gateH, 2, fillColor);
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.4);
    doc.roundedRect(MARGIN, y, CONTENT_W, gateH, 2, 2, 'S');

    // Gate badge
    doc.setFillColor(...(allMet ? GREEN : [245, 158, 11]));
    doc.circle(MARGIN + 8, y + 8, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    doc.text(`${gate.gate}`, MARGIN + 8, y + 9.5, { align: 'center' });

    // Label + time
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(gate.label, MARGIN + 16, y + 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MID_GRAY);
    doc.text(`Months ${gate.monthRange[0]}-${gate.monthRange[1]}`, MARGIN + 16 + doc.getStringUnitWidth(gate.label) * 10 * 0.352778 + 4, y + 9);

    // Investment
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(formatCompactValue(gate.investment), PAGE_W - MARGIN - 4, y + 9, { align: 'right' });

    // Threshold checks
    const autoColor = gate.meetsThresholds.automation ? GREEN : [245, 158, 11];
    const adoptColor = gate.meetsThresholds.adoption ? GREEN : [245, 158, 11];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...autoColor);
    doc.text(`${gate.meetsThresholds.automation ? '\u2713' : '\u2717'} Automation ${formatPercent(gate.requiredMetrics.minAutomationValidated)}`, MARGIN + 16, y + 18);
    doc.setTextColor(...adoptColor);
    doc.text(`${gate.meetsThresholds.adoption ? '\u2713' : '\u2717'} Adoption ${formatPercent(gate.requiredMetrics.minAdoptionRate)}`, MARGIN + 70, y + 18);

    y += gateH + 4;
  });
}

// ---------------------------------------------------------------------------
// NEW PAGE: Opportunity Cost & Scalability
// ---------------------------------------------------------------------------

function pageN_OpportunityCostRevenue(doc, results) {
  doc.addPage();
  addHeader(doc);

  let y = 25;
  y = sectionTitle(doc, 'Cost of Inaction', y);
  y += 4;

  y = bodyText(doc,
    'The total cost of delaying AI implementation includes forgone savings, wage inflation [17], ' +
    'legacy system maintenance creep [16], competitive penalty [18], and compliance risk escalation.',
    MARGIN, y, { size: 9, color: MID_GRAY });
  y += 4;

  const opp = results.opportunityCost;

  // Summary box
  const summBoxH = 20;
  drawRoundedRect(doc, MARGIN, y, CONTENT_W, summBoxH, 2, [254, 242, 242]);
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.4);
  doc.roundedRect(MARGIN, y, CONTENT_W, summBoxH, 2, 2, 'S');

  const colW = CONTENT_W / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...RED);
  doc.text(formatCompactValue(opp.costOfWaiting12Months), MARGIN + colW / 2, y + 12, { align: 'center' });
  doc.text(formatCompactValue(opp.costOfWaiting24Months), MARGIN + colW + colW / 2, y + 12, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MID_GRAY);
  doc.text('12-Month Delay Cost', MARGIN + colW / 2, y + 18, { align: 'center' });
  doc.text('24-Month Delay Cost', MARGIN + colW + colW / 2, y + 18, { align: 'center' });

  y += summBoxH + 8;

  // Breakdown table
  if (opp.yearlyBreakdown && opp.yearlyBreakdown.length > 0) {
    const yr1 = opp.yearlyBreakdown[0];
    const breakdownRows = [
      ['Forgone savings', formatCurrency(yr1.forgoneSavings)],
      ['Wage inflation (4% annual) [17]', formatCurrency(yr1.wageInflation)],
      ['Legacy system creep (7% annual) [16]', formatCurrency(yr1.legacyCreep)],
      ['Competitive penalty [18]', formatCurrency(yr1.competitiveLoss)],
      ['Compliance risk escalation', formatCurrency(yr1.complianceRisk)],
    ];

    autoTable(doc, {
      startY: y,
      head: [['Year 1 Cost Component', 'Amount']],
      body: breakdownRows,
      ...autoTableTheme(),
      columnStyles: {
        0: { cellWidth: CONTENT_W * 0.65 },
        1: { cellWidth: CONTENT_W * 0.35, halign: 'right' },
      },
    });

    y = doc.lastAutoTable.finalY + 12;
  }

  // Scalability Premium
  const scale = results.scalabilityPremium;
  if (scale) {
    y = sectionTitle(doc, 'Scalability Premium [20]', y);
    y += 4;

    y = bodyText(doc,
      'AI costs scale sub-linearly: doubling work volume does not double AI costs. ' +
      'Traditional staffing scales linearly.',
      MARGIN, y, { size: 9, color: MID_GRAY });
    y += 4;

    const scaleRows = scale.scenarios.map(s => [
      `${s.label} volume`,
      formatCurrency(s.traditionalCost),
      formatCurrency(s.aiCost),
      formatCurrency(s.savings),
      formatPercent(s.savingsPercent),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Volume', 'Traditional Cost', 'AI Cost', 'Savings', 'Savings %']],
      body: scaleRows,
      ...autoTableTheme(),
      columnStyles: {
        0: { cellWidth: CONTENT_W * 0.18 },
        1: { cellWidth: CONTENT_W * 0.22, halign: 'right' },
        2: { cellWidth: CONTENT_W * 0.20, halign: 'right' },
        3: { cellWidth: CONTENT_W * 0.22, halign: 'right' },
        4: { cellWidth: CONTENT_W * 0.18, halign: 'right' },
      },
    });
  }

  // Revenue Enablement (informational — not in NPV/ROIC)
  const revEn = results.revenueEnablement;
  if (revEn && revEn.eligible) {
    y += 12;
    y = sectionTitle(doc, 'Revenue Enablement Potential (Informational)', y);
    y += 4;

    y = bodyText(doc,
      'Estimated annual revenue uplift from AI-driven improvements. These figures are informational only ' +
      'and are NOT included in NPV or ROIC calculations. All values are risk-adjusted and discounted.',
      MARGIN, y, { size: 9, color: MID_GRAY });
    y += 4;

    const revRows = [
      ['Time-to-Market Acceleration', formatCurrency(revEn.timeToMarket)],
      ['Customer Experience Improvement', formatCurrency(revEn.customerExperience)],
      ['New Capability Enablement', formatCurrency(revEn.newCapability)],
    ];

    autoTable(doc, {
      startY: y,
      head: [['Revenue Driver', 'Annual Estimate']],
      body: revRows,
      ...autoTableTheme(),
      columnStyles: {
        0: { cellWidth: CONTENT_W * 0.65 },
        1: { cellWidth: CONTENT_W * 0.35, halign: 'right' },
      },
    });

    y = doc.lastAutoTable.finalY + 2;

    drawRoundedRect(doc, MARGIN, y, CONTENT_W, 10, 1.5, GREEN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.text('Total Potential Revenue Uplift (not in NPV)', MARGIN + 4, y + 7);
    doc.text(formatCurrency(revEn.totalAnnualRevenue), PAGE_W - MARGIN - 4, y + 7, { align: 'right' });
  }
}

// ---------------------------------------------------------------------------
// NEW PAGE: Peer Comparison & Confidence Intervals
// ---------------------------------------------------------------------------

function pageN_PeerComparison(doc, formData, results) {
  doc.addPage();
  addHeader(doc);

  let y = 25;
  y = sectionTitle(doc, 'Industry Peer Comparison', y);
  y += 4;

  const peer = results.peerComparison;

  y = bodyText(doc,
    `Your projected base case ROIC of ${formatPercent(peer.userROIC)} ranks in the ` +
    `${peer.percentileRank}th percentile compared to ${formData.industry} / ${formData.companySize} peers. ` +
    `Peer benchmarks are based on aggregate data from McKinsey [1], IBM [2], and Deloitte [5].`,
    MARGIN, y, { size: 10 });
  y += 6;

  // Percentile box
  const pBoxH = 28;
  const isAbove = peer.vsMedian >= 0;
  drawRoundedRect(doc, MARGIN, y, CONTENT_W, pBoxH, 3, isAbove ? [240, 253, 244] : [254, 249, 235]);
  doc.setDrawColor(...(isAbove ? GREEN : GOLD));
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN, y, CONTENT_W, pBoxH, 3, 3, 'S');

  const pColW = CONTENT_W / 4;
  const items = [
    { label: 'Your ROIC', value: formatPercent(peer.userROIC) },
    { label: 'Peer Median', value: formatPercent(peer.peerMedian) },
    { label: 'vs. Median', value: (isAbove ? '+' : '') + formatPercent(peer.vsMedian) },
    { label: 'Percentile', value: `P${peer.percentileRank}` },
  ];

  items.forEach((item, i) => {
    const cx = MARGIN + 6 + i * pColW;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MID_GRAY);
    doc.text(item.label, cx, y + 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...NAVY);
    doc.text(item.value, cx, y + 18);
  });

  y += pBoxH + 8;

  // Peer range table
  const peerRows = [
    ['Peer 25th Percentile', formatPercent(peer.peerP25)],
    ['Peer Median (50th)', formatPercent(peer.peerMedian)],
    ['Peer 75th Percentile', formatPercent(peer.peerP75)],
    ['Your Projected ROIC', formatPercent(peer.userROIC)],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Benchmark', 'ROIC']],
    body: peerRows,
    ...autoTableTheme(),
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.65 },
      1: { cellWidth: CONTENT_W * 0.35, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === 3) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = isAbove ? GREEN : GOLD;
      }
    },
  });

  y = doc.lastAutoTable.finalY + 14;

  // Confidence Intervals
  y = sectionTitle(doc, 'Confidence Intervals', y);
  y += 4;

  y = bodyText(doc,
    'Confidence intervals are derived from the three-scenario spread (conservative/base/optimistic) ' +
    'and 6-variable extended sensitivity analysis.',
    MARGIN, y, { size: 9, color: MID_GRAY });
  y += 4;

  const ci = results.confidenceIntervals;
  const ciRows = [
    ['Net Present Value (NPV)', formatCurrency(ci.npv.p25), formatCurrency(ci.npv.p50), formatCurrency(ci.npv.p75)],
    ['Payback Period', ci.payback.p25 > DCF_YEARS * 12 ? `>${DCF_YEARS * 12} mo` : `${ci.payback.p25} mo`, ci.payback.p50 > DCF_YEARS * 12 ? `>${DCF_YEARS * 12} mo` : `${ci.payback.p50} mo`, ci.payback.p75 > DCF_YEARS * 12 ? `>${DCF_YEARS * 12} mo` : `${ci.payback.p75} mo`],
    ['ROIC', formatPercent(ci.roic.p25), formatPercent(ci.roic.p50), formatPercent(ci.roic.p75)],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'P25 (Downside)', 'P50 (Base)', 'P75 (Upside)']],
    body: ciRows,
    ...autoTableTheme(),
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.34, fontStyle: 'bold' },
      1: { cellWidth: CONTENT_W * 0.22, halign: 'right' },
      2: { cellWidth: CONTENT_W * 0.22, halign: 'right' },
      3: { cellWidth: CONTENT_W * 0.22, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'head' && data.column.index === 1) data.cell.styles.fillColor = RED;
      if (data.section === 'head' && data.column.index === 2) data.cell.styles.fillColor = GOLD;
      if (data.section === 'head' && data.column.index === 3) data.cell.styles.fillColor = GREEN;
    },
  });

  y = doc.lastAutoTable.finalY + 6;

  // R&D Tax Credit
  const rd = results.rdTaxCredit;
  if (rd && rd.eligible && rd.totalCredit > 0) {
    y = sectionTitle(doc, 'R&D Tax Credit Potential (Informational) [19]', y);
    y += 4;

    y = bodyText(doc,
      'Not included in NPV/IRR calculations to maintain conservative projections. ' +
      'Consult a tax professional to determine eligibility.',
      MARGIN, y, { size: 9, color: MID_GRAY });
    y += 4;

    const rdRows = [
      ['Qualified R&D Expenses (65% of impl cost)', formatCurrency(rd.qualifiedExpenses)],
      [`Federal Credit (${formatPercent(rd.federalRate)})`, formatCurrency(rd.federalCredit)],
    ];
    if (rd.stateRate > 0) {
      rdRows.push([`${rd.companyState} State Credit (${formatPercent(rd.stateRate)})`, formatCurrency(rd.stateCredit)]);
    }

    autoTable(doc, {
      startY: y,
      head: [['Credit Component', 'Amount']],
      body: rdRows,
      ...autoTableTheme(),
      columnStyles: {
        0: { cellWidth: CONTENT_W * 0.65 },
        1: { cellWidth: CONTENT_W * 0.35, halign: 'right' },
      },
    });

    y = doc.lastAutoTable.finalY + 2;

    drawRoundedRect(doc, MARGIN, y, CONTENT_W, 10, 1.5, GREEN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.text('Potential Total R&D Credit (not in NPV)', MARGIN + 4, y + 7);
    doc.text(formatCurrency(rd.totalCredit), PAGE_W - MARGIN - 4, y + 7, { align: 'right' });
  }
}

// ---------------------------------------------------------------------------
// Qualitative Benefits
// ---------------------------------------------------------------------------

function pageN_QualitativeBenefits(doc) {
  doc.addPage();
  addHeader(doc);

  let y = 25;
  y = sectionTitle(doc, 'Qualitative Benefits of AI Implementation', y);
  y += 4;

  y = bodyText(doc,
    'Beyond the quantitative ROI metrics presented in this report, AI implementations deliver ' +
    'strategic advantages that are difficult to capture in a DCF model but are frequently cited ' +
    'as deciding factors in executive decision-making.',
    MARGIN, y, { size: 9.5, color: MID_GRAY });
  y += 6;

  const benefits = [
    {
      title: 'Decision Speed',
      desc: 'AI-augmented analysis accelerates decisions from days to hours, enabling faster response ' +
        'to market changes, competitive moves, and customer needs.',
    },
    {
      title: 'Employee Experience',
      desc: 'Teams shift from repetitive tasks to higher-value strategic work, improving engagement, ' +
        'retention, and the ability to attract top talent.',
    },
    {
      title: 'Institutional Knowledge',
      desc: 'AI captures and scales tribal knowledge that otherwise leaves with attrition, reducing ' +
        'key-person risk and preserving organizational expertise.',
    },
    {
      title: 'Consistency & Quality',
      desc: 'Standardized outputs reduce variation and improve client-facing deliverables, lowering ' +
        'rework rates and enhancing brand credibility.',
    },
    {
      title: '24/7 Availability',
      desc: 'AI processes continue outside business hours with no overtime cost, increasing throughput ' +
        'without proportional headcount increases.',
    },
    {
      title: 'Competitive Positioning',
      desc: 'Early AI adoption signals innovation to clients, partners, and talent, strengthening ' +
        'market position and differentiation.',
    },
  ];

  benefits.forEach((b) => {
    drawRoundedRect(doc, MARGIN, y - 2, CONTENT_W, 18, 2, [240, 244, 252]);
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.2);
    doc.roundedRect(MARGIN, y - 2, CONTENT_W, 18, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...NAVY);
    doc.text(b.title, MARGIN + 5, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...DARK_TEXT);
    const descLines = doc.splitTextToSize(b.desc, CONTENT_W - 12);
    doc.text(descLines, MARGIN + 5, y + 9);
    y += 22;
  });

  y += 4;
  drawRoundedRect(doc, MARGIN, y - 2, CONTENT_W, 12, 2, [254, 249, 235]);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.roundedRect(MARGIN, y - 2, CONTENT_W, 12, 2, 2, 'S');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(...MID_GRAY);
  const noteText = 'These benefits are not included in NPV calculations but are frequently cited in executive decision-making.';
  doc.text(noteText, MARGIN + 5, y + 5);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function generateReport(formData, results, recommendation) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  doc.setProperties({
    title: 'AI Implementation ROI Analysis',
    subject: 'Risk-Adjusted ROI Assessment',
    author: 'Global Gauntlet AI',
    creator: 'AI ROI Modeler',
  });

  // Reset page counter
  _autoPageNum = 0;

  // Build all pages
  page1_ExecutiveSummary(doc, formData, results, recommendation);  // p1
  page2_TableOfContents(doc);                                      // p2
  page2_CurrentState(doc, formData, results);                      // p3
  pageN_ValueBreakdown(doc, results);                              // p4
  pageN_ValuePathways(doc, results);                               // p5
  pageN_CapitalEfficiencyGates(doc, results);                      // p6
  page3_InvestmentAnalysis(doc, formData, results);                // p7
  page4_ScenarioProjections(doc, results);                         // p8
  page5_RiskAssessment(doc, formData, results);                    // p9
  page6_SensitivityAnalysis(doc, results);                         // p10
  page9_ExtendedSensitivity(doc, results);                         // p11
  pageN_OpportunityCostRevenue(doc, results);                      // p12
  pageN_PeerComparison(doc, formData, results);                    // p13
  page7_Recommendations(doc, recommendation);                      // p14
  pageN_QualitativeBenefits(doc);                                   // p15
  page8_InputAssumptions(doc, formData, results);                  // p16
  page10_AppendixMethodology(doc, formData, results);              // p17-18
  page12_AppendixBenchmarks(doc, formData);                        // p19
  page13_AppendixCostAssumptions(doc, formData, results);          // p20-21

  // Use blob URL + <a> click to ensure download works
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'AI-ROI-Analysis.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
