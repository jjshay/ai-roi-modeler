// ---------------------------------------------------------------------------
// PowerPoint Presentation Generator
// Architecture overview + sample ROI for all 15 archetypes
// ---------------------------------------------------------------------------
import PptxGenJS from 'pptxgenjs';
import { runCalculations } from '../logic/calculations';
import { PROJECT_ARCHETYPES, getArchetypeDefaults } from '../logic/archetypes';
import { getArchetypeInputDefaults, mapArchetypeInputs, ARCHETYPE_INPUT_MAP } from '../logic/archetypeInputs';

// ---------------------------------------------------------------------------
// App URL — set to your deployed URL; falls back to localhost
// ---------------------------------------------------------------------------
const APP_URL = typeof window !== 'undefined' && window.location?.origin
  ? window.location.origin
  : 'https://ai-roi-modeler.vercel.app';

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------
const C = {
  navy:      '1B2A4A',
  gold:      'C9A227',
  blue:      '2563EB',
  lightBlue: 'DBEAFE',
  teal:      '0D9488',
  green:     '059669',
  red:       'DC2626',
  orange:    'F59E0B',
  white:     'FFFFFF',
  offWhite:  'F8FAFC',
  gray100:   'F1F5F9',
  gray200:   'E2E8F0',
  gray400:   '94A3B8',
  gray600:   '475569',
  gray800:   '1E293B',
  black:     '000000',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmt$(v) {
  if (v == null || isNaN(v)) return '$0';
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function fmtPct(v) {
  if (v == null || isNaN(v)) return '0%';
  return `${(v * 100).toFixed(0)}%`;
}

function fmtMo(v) {
  if (!v || v > 60) return '60+ mo';
  return `${v} mo`;
}

// Reusable base inputs for running archetypes through the DCF
const BASE_INPUTS = {
  industry: 'Technology / Software',
  companySize: 'Mid-Market (501-5,000)',
  role: 'Director',
  teamLocation: 'US - Major Tech Hub',
  changeReadiness: 3,
  dataReadiness: 3,
  execSponsor: true,
  teamSize: 25,
  avgSalary: 120000,
  hoursPerWeek: 30,
  errorRate: 0.12,
  currentToolCosts: 75000,
  vendorsReplaced: 1,
  vendorTerminationCost: 15000,
  implementationBudget: 250000,
  expectedTimeline: 6,
  ongoingAnnualCost: 60000,
  companyState: 'California',
  cashRealizationPct: 0.40,
  annualRevenue: 50000000,
  contributionMargin: 0.35,
  includeCapacityValue: false,
  includeRiskReduction: false,
  includeRevenueAcceleration: false,
  retainedTalentPremiumRate: 0.10,
  isAgenticWorkflow: false,
};

function makeInputs(archetypeId) {
  const archDefaults = getArchetypeDefaults(archetypeId, 'Technology / Software');
  const archetypeInputs = getArchetypeInputDefaults(archetypeId);
  const mapped = mapArchetypeInputs(archetypeId, archetypeInputs);
  const isRevenue = archDefaults?.revenueEligible;

  return {
    ...BASE_INPUTS,
    projectArchetype: archetypeId,
    processType: PROJECT_ARCHETYPES.find(a => a.id === archetypeId)?.sourceProcessTypes[0] || 'Other',
    assumptions: archDefaults || {},
    archetypeInputs,
    hoursPerWeek: mapped.hoursPerWeek ?? BASE_INPUTS.hoursPerWeek,
    errorRate: mapped.errorRate ?? BASE_INPUTS.errorRate,
    includeRevenueAcceleration: isRevenue,
  };
}

// ---------------------------------------------------------------------------
// Slide builders
// ---------------------------------------------------------------------------

function addTitleSlide(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: C.navy };

  slide.addText('GAUNTLET GALLERY', {
    x: 0.8, y: 0.8, w: 8.4, h: 0.6,
    fontSize: 18, fontFace: 'Arial', bold: true,
    color: C.gold || 'C9A227', align: 'center',
  });

  slide.addText('AI ROI Modeler', {
    x: 0.8, y: 1.5, w: 8.4, h: 1.2,
    fontSize: 42, fontFace: 'Arial', bold: true,
    color: C.white, align: 'center',
  });

  slide.addText('Architecture & Sample ROI Scenarios', {
    x: 0.8, y: 2.7, w: 8.4, h: 0.7,
    fontSize: 22, fontFace: 'Arial',
    color: C.lightBlue, align: 'center',
  });

  slide.addShape(pptx.ShapeType.line, {
    x: 3.0, y: 3.3, w: 4.0, h: 0,
    line: { color: C.blue, width: 2 },
  });

  slide.addText('5-Year Discounted Cash Flow Model\n15 AI Project Archetypes | 3 Scenarios per Project', {
    x: 0.8, y: 3.6, w: 8.4, h: 0.9,
    fontSize: 14, fontFace: 'Arial',
    color: C.gray400, align: 'center', lineSpacingMultiple: 1.4,
  });

  slide.addText('Mid-Market Sample: 25-person team | $120K avg salary | Technology / Software', {
    x: 0.8, y: 4.7, w: 8.4, h: 0.4,
    fontSize: 11, fontFace: 'Arial',
    color: C.gray400, align: 'center', italic: true,
  });

  slide.addText([{ text: 'Launch the AI ROI Modeler', options: { hyperlink: { url: APP_URL } } }], {
    x: 0.8, y: 5.3, w: 8.4, h: 0.4,
    fontSize: 12, fontFace: 'Arial', bold: true,
    color: C.blue, align: 'center', underline: true,
  });
}

function addOverviewSlide(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: C.white };

  slide.addText('What Is the AI ROI Modeler?', {
    x: 0.5, y: 0.3, w: 9.0, h: 0.6,
    fontSize: 26, fontFace: 'Arial', bold: true, color: C.navy,
  });

  slide.addShape(pptx.ShapeType.line, {
    x: 0.5, y: 0.9, w: 2.5, h: 0,
    line: { color: C.blue, width: 3 },
  });

  const bullets = [
    'A rigorous 5-year Discounted Cash Flow (DCF) model purpose-built for AI investment decisions',
    'Calculates NPV, IRR, ROIC, and payback period with risk-adjusted projections',
    'Runs 3 scenarios (Conservative / Base / Optimistic) with sensitivity and Monte Carlo analysis',
    'Supports 15 AI project archetypes across 10 industries',
    'Outputs include interactive dashboard, branded PDF report, and auditable Excel model',
  ];

  bullets.forEach((text, i) => {
    slide.addText(text, {
      x: 0.8, y: 1.3 + i * 0.7, w: 8.4, h: 0.6,
      fontSize: 15, fontFace: 'Arial', color: C.gray800,
      bullet: { type: 'number', numberStartAt: i + 1, color: C.blue },
      lineSpacingMultiple: 1.2,
    });
  });

  // Who it's for
  slide.addText('Built for:', {
    x: 0.5, y: 4.8, w: 2.0, h: 0.35,
    fontSize: 13, fontFace: 'Arial', bold: true, color: C.navy,
  });
  const roles = ['CEOs & Board Members', 'CFOs & Finance Leaders', 'CTOs & IT Directors', 'Department Heads & Analysts'];
  roles.forEach((role, i) => {
    const col = i % 4;
    slide.addText(role, {
      x: 2.2 + col * 1.85, w: 1.8, y: 4.8, h: 0.35,
      fontSize: 10, fontFace: 'Arial', color: C.blue,
      align: 'center',
      fill: { color: C.lightBlue },
      shape: pptx.ShapeType.roundRect, rectRadius: 0.1,
    });
  });
}

function addArchitectureSlide(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: C.white };

  slide.addText('How It Works: Architecture', {
    x: 0.5, y: 0.3, w: 9.0, h: 0.6,
    fontSize: 26, fontFace: 'Arial', bold: true, color: C.navy,
  });

  slide.addShape(pptx.ShapeType.line, {
    x: 0.5, y: 0.9, w: 2.5, h: 0,
    line: { color: C.blue, width: 3 },
  });

  // Flow boxes
  const boxes = [
    { label: 'User Inputs', sub: 'Company, Team,\nProject, Costs', color: C.blue },
    { label: 'Archetype Engine', sub: '15 AI archetypes\nwith industry defaults', color: C.teal },
    { label: 'DCF Engine', sub: '5-year cash flows\nrisk-adjusted', color: C.navy },
    { label: '3 Scenarios', sub: 'Conservative\nBase | Optimistic', color: C.green },
    { label: 'Outputs', sub: 'Dashboard, PDF,\nExcel, PPTX', color: C.blue },
  ];

  const boxW = 1.6;
  const startX = 0.5;
  const gap = 0.3;
  const arrowW = gap;

  boxes.forEach((box, i) => {
    const x = startX + i * (boxW + gap + arrowW * 0.5);
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y: 1.3, w: boxW, h: 1.4,
      fill: { color: box.color },
      rectRadius: 0.15,
      shadow: { type: 'outer', blur: 4, offset: 2, color: '000000', opacity: 0.15 },
    });
    slide.addText(box.label, {
      x, y: 1.35, w: boxW, h: 0.45,
      fontSize: 12, fontFace: 'Arial', bold: true, color: C.white, align: 'center',
    });
    slide.addText(box.sub, {
      x, y: 1.8, w: boxW, h: 0.8,
      fontSize: 9, fontFace: 'Arial', color: C.white, align: 'center',
      lineSpacingMultiple: 1.2,
    });

    // Arrow between boxes
    if (i < boxes.length - 1) {
      const arrowX = x + boxW + 0.05;
      slide.addText('\u25B6', {
        x: arrowX, y: 1.7, w: 0.4, h: 0.4,
        fontSize: 18, fontFace: 'Arial', color: C.gray400, align: 'center',
      });
    }
  });

  // Detail rows below
  const details = [
    ['User Inputs', 'Company size, industry, team size, avg salary, implementation budget, timeline, ongoing costs, archetype-specific operational inputs'],
    ['Archetype Engine', 'Maps 8 operational inputs per archetype to automation potential, hours/week, error rate, and revenue impact via computed formulas'],
    ['DCF Engine', 'Calculates gross savings, hidden costs, risk adjustments, adoption curves, 5-year projections with NPV/IRR/ROIC/payback'],
    ['3 Scenarios', 'Conservative (0.7x), Base (1.0x), Optimistic (1.3x) multipliers on savings with corresponding risk adjustments'],
    ['Outputs', 'Interactive dashboard, 24-page branded PDF, 8-tab auditable Excel model with formula-based validation'],
  ];

  details.forEach((row, i) => {
    slide.addText(row[0], {
      x: 0.5, y: 3.0 + i * 0.42, w: 1.8, h: 0.38,
      fontSize: 10, fontFace: 'Arial', bold: true, color: C.navy,
    });
    slide.addText(row[1], {
      x: 2.3, y: 3.0 + i * 0.42, w: 7.2, h: 0.38,
      fontSize: 9.5, fontFace: 'Arial', color: C.gray600,
    });
  });

  // Divider lines
  details.forEach((_, i) => {
    if (i > 0) {
      slide.addShape(pptx.ShapeType.line, {
        x: 0.5, y: 3.0 + i * 0.42, w: 9.0, h: 0,
        line: { color: C.gray200, width: 0.5 },
      });
    }
  });
}

function addKeyLeversSlide(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: C.white };

  slide.addText('The 3 Key Value Levers', {
    x: 0.5, y: 0.3, w: 9.0, h: 0.6,
    fontSize: 26, fontFace: 'Arial', bold: true, color: C.navy,
  });

  slide.addShape(pptx.ShapeType.line, {
    x: 0.5, y: 0.9, w: 2.5, h: 0,
    line: { color: C.blue, width: 3 },
  });

  slide.addText(
    'Sensitivity analysis across all archetypes consistently identifies these three inputs as the largest swing factors on NPV:',
    {
      x: 0.5, y: 1.1, w: 9.0, h: 0.5,
      fontSize: 13, fontFace: 'Arial', color: C.gray600, italic: true,
    }
  );

  const levers = [
    {
      num: '#1', label: 'Team Size',
      desc: 'Number of people on the process being automated. More people = more labor to offset.',
      why: 'Directly multiplies every hour saved. A 50-person team sees 2x the savings of a 25-person team.',
      icon: '\uD83D\uDC65',
    },
    {
      num: '#2', label: 'Avg Cost per Person',
      desc: 'Fully loaded salary (base + benefits + overhead at 1.3-1.5x). Higher-cost teams = bigger dollar savings.',
      why: 'Converts hours saved into dollars. A $180K employee generates 50% more value per hour saved than $120K.',
      icon: '\uD83D\uDCB0',
    },
    {
      num: '#3', label: 'Automation Potential',
      desc: 'Percentage of the process that AI can handle. Driven by archetype-specific operational inputs.',
      why: 'Caps the upside. At 40% automation, you save 40% of labor hours; at 65%, you save 65%.',
      icon: '\u2699\uFE0F',
    },
  ];

  levers.forEach((lever, i) => {
    const y = 1.8 + i * 1.25;

    // Number badge
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.5, y, w: 0.7, h: 0.7,
      fill: { color: C.blue },
      rectRadius: 0.1,
    });
    slide.addText(lever.num, {
      x: 0.5, y, w: 0.7, h: 0.7,
      fontSize: 20, fontFace: 'Arial', bold: true, color: C.white, align: 'center',
      valign: 'middle',
    });

    // Label + description
    slide.addText(`${lever.icon}  ${lever.label}`, {
      x: 1.4, y, w: 3.5, h: 0.35,
      fontSize: 16, fontFace: 'Arial', bold: true, color: C.navy,
    });
    slide.addText(lever.desc, {
      x: 1.4, y: y + 0.35, w: 3.5, h: 0.8,
      fontSize: 10, fontFace: 'Arial', color: C.gray600, lineSpacingMultiple: 1.3,
    });

    // Why it matters box
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 5.2, y, w: 4.5, h: 1.1,
      fill: { color: C.lightBlue },
      rectRadius: 0.1,
    });
    slide.addText('Why it matters', {
      x: 5.4, y, w: 4.1, h: 0.3,
      fontSize: 9, fontFace: 'Arial', bold: true, color: C.blue,
    });
    slide.addText(lever.why, {
      x: 5.4, y: y + 0.3, w: 4.1, h: 0.75,
      fontSize: 10, fontFace: 'Arial', color: C.gray800, lineSpacingMultiple: 1.3,
    });
  });
}

function addArchetypeOverviewSlide(pptx, archetypeSlideNums) {
  const slide = pptx.addSlide();
  slide.background = { color: C.white };

  slide.addText('15 AI Project Archetypes', {
    x: 0.5, y: 0.3, w: 9.0, h: 0.6,
    fontSize: 26, fontFace: 'Arial', bold: true, color: C.navy,
  });

  slide.addShape(pptx.ShapeType.line, {
    x: 0.5, y: 0.9, w: 2.5, h: 0,
    line: { color: C.blue, width: 3 },
  });

  slide.addText('Click any archetype to jump to its detail slide', {
    x: 0.5, y: 0.95, w: 9.0, h: 0.25,
    fontSize: 9, fontFace: 'Arial', color: C.gray400, italic: true,
  });

  // 3 columns x 5 rows
  const colW = 3.0;
  const rowH = 0.8;

  PROJECT_ARCHETYPES.forEach((arch, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * (colW + 0.2);
    const y = 1.25 + row * (rowH + 0.1);

    slide.addShape(pptx.ShapeType.roundRect, {
      x, y, w: colW, h: rowH,
      fill: { color: C.gray100 },
      rectRadius: 0.08,
      line: { color: C.gray200, width: 0.5 },
    });

    // Clickable label linking to the archetype's detail slide
    const slideNum = archetypeSlideNums[i];
    slide.addText([{
      text: `${arch.icon}  ${arch.label}`,
      options: { hyperlink: { slide: slideNum } },
    }], {
      x: x + 0.1, y, w: colW - 0.2, h: 0.35,
      fontSize: 10.5, fontFace: 'Arial', bold: true, color: C.navy,
    });
    slide.addText(arch.description, {
      x: x + 0.1, y: y + 0.32, w: colW - 0.2, h: 0.42,
      fontSize: 7.5, fontFace: 'Arial', color: C.gray600,
      lineSpacingMultiple: 1.15,
    });
  });
}

function addArchetypeSlide(pptx, archetype, inputs, results, overviewSlideNum) {
  const slide = pptx.addSlide();
  slide.background = { color: C.white };

  // Header
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 1.0,
    fill: { color: C.navy },
  });

  slide.addText(`${archetype.icon}  ${archetype.label}`, {
    x: 0.5, y: 0.05, w: 7.5, h: 0.55,
    fontSize: 22, fontFace: 'Arial', bold: true, color: C.white,
  });

  // Back to overview link (top-right of header)
  slide.addText([{
    text: 'All Archetypes',
    options: { hyperlink: { slide: overviewSlideNum } },
  }], {
    x: 7.8, y: 0.1, w: 1.8, h: 0.4,
    fontSize: 9, fontFace: 'Arial', color: C.lightBlue, align: 'right',
    underline: true,
  });

  slide.addText(archetype.description, {
    x: 0.5, y: 0.55, w: 9.0, h: 0.35,
    fontSize: 11, fontFace: 'Arial', color: C.lightBlue, italic: true,
  });

  // Tags
  const tags = archetype.tags || [];
  tags.forEach((tag, i) => {
    slide.addText(tag, {
      x: 0.5 + i * 1.1, y: 1.1, w: 1.0, h: 0.28,
      fontSize: 8, fontFace: 'Arial', color: C.blue, align: 'center',
      fill: { color: C.lightBlue },
      shape: pptx.ShapeType.roundRect, rectRadius: 0.05,
    });
  });

  // LEFT: Key Inputs
  slide.addText('Sample Inputs', {
    x: 0.5, y: 1.55, w: 4.3, h: 0.35,
    fontSize: 14, fontFace: 'Arial', bold: true, color: C.navy,
  });

  const schema = ARCHETYPE_INPUT_MAP[archetype.id];
  const archetypeInputValues = getArchetypeInputDefaults(archetype.id);

  if (schema) {
    const inputRows = schema.inputs.slice(0, 8).map(inp => {
      const val = archetypeInputValues[inp.key];
      let formatted;
      if (inp.type === 'percent') formatted = fmtPct(val);
      else if (inp.format?.startsWith('$')) formatted = fmt$(val);
      else if (typeof val === 'number') formatted = val.toLocaleString();
      else formatted = String(val);
      return [inp.label, formatted];
    });

    // Add base assumptions
    inputRows.push(['Team Size', '25 people']);
    inputRows.push(['Avg Salary', '$120,000']);

    const tableRows = [
      [
        { text: 'Input', options: { bold: true, fontSize: 8, color: C.white, fill: { color: C.blue } } },
        { text: 'Value', options: { bold: true, fontSize: 8, color: C.white, fill: { color: C.blue }, align: 'right' } },
      ],
      ...inputRows.map((r, i) => [
        { text: r[0], options: { fontSize: 8, color: C.gray800, fill: { color: i % 2 === 0 ? C.gray100 : C.white } } },
        { text: r[1], options: { fontSize: 8, color: C.blue, bold: true, align: 'right', fill: { color: i % 2 === 0 ? C.gray100 : C.white } } },
      ]),
    ];

    slide.addTable(tableRows, {
      x: 0.5, y: 1.95, w: 4.3,
      colW: [3.0, 1.3],
      rowH: 0.22,
      border: { type: 'solid', pt: 0.5, color: C.gray200 },
    });
  }

  // RIGHT: Results
  const base = results.scenarios.base;
  const cons = results.scenarios.conservative;
  const opt = results.scenarios.optimistic;

  slide.addText('Sample ROI Results', {
    x: 5.2, y: 1.55, w: 4.3, h: 0.35,
    fontSize: 14, fontFace: 'Arial', bold: true, color: C.navy,
  });

  // Key metrics cards
  const metrics = [
    { label: 'Base NPV', value: fmt$(base.npv), color: base.npv >= 0 ? C.green : C.red },
    { label: 'ROIC', value: fmtPct(base.roic), color: base.roic >= 0 ? C.green : C.red },
    { label: 'IRR', value: fmtPct(base.irr), color: base.irr >= 0.10 ? C.green : C.orange },
    { label: 'Payback', value: fmtMo(base.paybackMonths), color: base.paybackMonths <= 24 ? C.green : C.orange },
  ];

  metrics.forEach((m, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 5.2 + col * 2.2;
    const y = 2.0 + row * 0.95;

    slide.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 2.0, h: 0.85,
      fill: { color: C.gray100 },
      rectRadius: 0.08,
      line: { color: C.gray200, width: 0.5 },
    });
    slide.addText(m.label, {
      x, y, w: 2.0, h: 0.3,
      fontSize: 9, fontFace: 'Arial', color: C.gray600, align: 'center',
    });
    slide.addText(m.value, {
      x, y: y + 0.25, w: 2.0, h: 0.5,
      fontSize: 18, fontFace: 'Arial', bold: true, color: m.color, align: 'center',
    });
  });

  // Scenario comparison table
  slide.addText('Scenario Comparison', {
    x: 5.2, y: 4.0, w: 4.3, h: 0.3,
    fontSize: 11, fontFace: 'Arial', bold: true, color: C.navy,
  });

  const scenarioRows = [
    [
      { text: '', options: { bold: true, fontSize: 8, fill: { color: C.navy }, color: C.white } },
      { text: 'Conservative', options: { bold: true, fontSize: 8, fill: { color: C.navy }, color: C.white, align: 'right' } },
      { text: 'Base', options: { bold: true, fontSize: 8, fill: { color: C.navy }, color: C.white, align: 'right' } },
      { text: 'Optimistic', options: { bold: true, fontSize: 8, fill: { color: C.navy }, color: C.white, align: 'right' } },
    ],
    ...['npv', 'roic', 'paybackMonths'].map((key, i) => {
      const labels = { npv: 'NPV', roic: 'ROIC', paybackMonths: 'Payback' };
      const fmtFn = key === 'npv' ? fmt$ : key === 'roic' ? fmtPct : fmtMo;
      const bg = i % 2 === 0 ? C.gray100 : C.white;
      return [
        { text: labels[key], options: { fontSize: 8, bold: true, color: C.gray800, fill: { color: bg } } },
        { text: fmtFn(cons[key]), options: { fontSize: 8, color: C.gray800, align: 'right', fill: { color: bg } } },
        { text: fmtFn(base[key]), options: { fontSize: 8, color: C.blue, bold: true, align: 'right', fill: { color: bg } } },
        { text: fmtFn(opt[key]), options: { fontSize: 8, color: C.gray800, align: 'right', fill: { color: bg } } },
      ];
    }),
  ];

  slide.addTable(scenarioRows, {
    x: 5.2, y: 4.3, w: 4.3,
    colW: [0.8, 1.15, 1.15, 1.2],
    rowH: 0.24,
    border: { type: 'solid', pt: 0.5, color: C.gray200 },
  });

  // Footer with key driver
  const topLever = results.executiveSummary?.topLevers?.[0];
  if (topLever) {
    slide.addText(`Key Value Driver: ${topLever.label} (NPV swing: ${fmt$(topLever.npvLow)} to ${fmt$(topLever.npvHigh)})`, {
      x: 0.5, y: 5.1, w: 6.0, h: 0.3,
      fontSize: 9, fontFace: 'Arial', color: C.blue, italic: true,
    });
  }

  // CTA link
  slide.addText([{
    text: 'Try it with your numbers',
    options: { hyperlink: { url: APP_URL } },
  }], {
    x: 7.0, y: 5.1, w: 2.5, h: 0.3,
    fontSize: 9, fontFace: 'Arial', bold: true, color: C.blue,
    align: 'right', underline: true,
  });
}

function addSummaryTableSlide(pptx, allResults) {
  const slide = pptx.addSlide();
  slide.background = { color: C.white };

  slide.addText('All Archetypes: ROI Summary', {
    x: 0.5, y: 0.2, w: 9.0, h: 0.5,
    fontSize: 22, fontFace: 'Arial', bold: true, color: C.navy,
  });

  slide.addShape(pptx.ShapeType.line, {
    x: 0.5, y: 0.7, w: 2.5, h: 0,
    line: { color: C.blue, width: 3 },
  });

  const header = [
    { text: 'Archetype', options: { bold: true, fontSize: 7, color: C.white, fill: { color: C.navy } } },
    { text: 'Base NPV', options: { bold: true, fontSize: 7, color: C.white, fill: { color: C.navy }, align: 'right' } },
    { text: 'ROIC', options: { bold: true, fontSize: 7, color: C.white, fill: { color: C.navy }, align: 'right' } },
    { text: 'IRR', options: { bold: true, fontSize: 7, color: C.white, fill: { color: C.navy }, align: 'right' } },
    { text: 'Payback', options: { bold: true, fontSize: 7, color: C.white, fill: { color: C.navy }, align: 'right' } },
    { text: 'Upfront', options: { bold: true, fontSize: 7, color: C.white, fill: { color: C.navy }, align: 'right' } },
    { text: 'Gross Savings', options: { bold: true, fontSize: 7, color: C.white, fill: { color: C.navy }, align: 'right' } },
  ];

  const dataRows = allResults.map(({ archetype, results: r }, i) => {
    const base = r.scenarios.base;
    const bg = i % 2 === 0 ? C.gray100 : C.white;
    const opts = (align = 'left') => ({ fontSize: 7, color: C.gray800, fill: { color: bg }, align });

    return [
      { text: `${archetype.icon} ${archetype.label}`, options: { ...opts(), bold: true } },
      { text: fmt$(base.npv), options: { ...opts('right'), color: base.npv >= 0 ? C.green : C.red } },
      { text: fmtPct(base.roic), options: opts('right') },
      { text: fmtPct(base.irr), options: opts('right') },
      { text: fmtMo(base.paybackMonths), options: opts('right') },
      { text: fmt$(r.upfrontInvestment), options: opts('right') },
      { text: fmt$(r.savings.grossAnnualSavings), options: opts('right') },
    ];
  });

  slide.addTable([header, ...dataRows], {
    x: 0.3, y: 0.9, w: 9.4,
    colW: [2.8, 1.1, 0.8, 0.8, 0.9, 1.1, 1.1],
    rowH: 0.26,
    border: { type: 'solid', pt: 0.5, color: C.gray200 },
  });

  slide.addText('All values based on mid-market sample: 25-person team, $120K avg salary, Technology / Software industry, $250K implementation budget', {
    x: 0.5, y: 5.1, w: 9.0, h: 0.3,
    fontSize: 8, fontFace: 'Arial', color: C.gray400, italic: true,
  });
}

function addClosingSlide(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: C.navy };

  slide.addText('Next Steps', {
    x: 0.8, y: 1.0, w: 8.4, h: 0.8,
    fontSize: 36, fontFace: 'Arial', bold: true, color: C.white, align: 'center',
  });

  const steps = [
    'Select the archetype that matches your AI initiative',
    'Enter your organization-specific inputs (team size, costs, operational metrics)',
    'Review risk-adjusted 5-year projections across 3 scenarios',
    'Download the PDF report and auditable Excel model for stakeholders',
  ];

  steps.forEach((step, i) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 1.5, y: 2.1 + i * 0.65, w: 7.0, h: 0.55,
      fill: { color: i === 0 ? C.blue : '243B5E' },
      rectRadius: 0.1,
    });
    slide.addText(`${i + 1}.  ${step}`, {
      x: 1.7, y: 2.1 + i * 0.65, w: 6.6, h: 0.55,
      fontSize: 14, fontFace: 'Arial', color: C.white, valign: 'middle',
    });
  });

  slide.addText('AI ROI Modeler  |  Rigorous. Risk-adjusted. Ready for the boardroom.', {
    x: 0.8, y: 4.6, w: 8.4, h: 0.4,
    fontSize: 12, fontFace: 'Arial', color: C.gray400, align: 'center', italic: true,
  });

  slide.addText([{
    text: 'Launch the AI ROI Modeler',
    options: { hyperlink: { url: APP_URL } },
  }], {
    x: 2.5, y: 5.2, w: 5.0, h: 0.55,
    fontSize: 16, fontFace: 'Arial', bold: true,
    color: C.white, align: 'center',
    fill: { color: C.blue },
    shape: pptx.ShapeType.roundRect, rectRadius: 0.15,
  });
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------
export async function generatePresentation() {
  const pptx = new PptxGenJS();
  pptx.title = 'AI ROI Modeler - Architecture & Sample Scenarios';
  pptx.subject = 'AI Investment Analysis';
  pptx.layout = 'LAYOUT_WIDE'; // 13.33" x 7.5"

  // Slide numbering (1-based for PptxGenJS hyperlink.slide):
  // 1=Title, 2=Overview, 3=Architecture, 4=Key Levers, 5=Archetype Grid
  // 6..20=Individual archetypes (15), 21=Summary, 22=Closing
  const OVERVIEW_SLIDE = 5;
  const FIRST_ARCHETYPE_SLIDE = 6;
  const archetypeSlideNums = PROJECT_ARCHETYPES.map((_, i) => FIRST_ARCHETYPE_SLIDE + i);

  // -- Static slides --
  addTitleSlide(pptx);
  addOverviewSlide(pptx);
  addArchitectureSlide(pptx);
  addKeyLeversSlide(pptx);
  addArchetypeOverviewSlide(pptx, archetypeSlideNums);

  // -- Per-archetype slides --
  const allResults = [];

  for (const archetype of PROJECT_ARCHETYPES) {
    const inputs = makeInputs(archetype.id);
    const results = runCalculations(inputs);
    allResults.push({ archetype, inputs, results });
    addArchetypeSlide(pptx, archetype, inputs, results, OVERVIEW_SLIDE);
  }

  // -- Summary + closing --
  addSummaryTableSlide(pptx, allResults);
  addClosingSlide(pptx);

  // -- Download --
  await pptx.writeFile({ fileName: 'AI_ROI_Modeler_Overview.pptx' });
}
