// ---------------------------------------------------------------------------
// System Review Deck (internal / one-off)
// Documents every user screen and data input per archetype.
// NOT user-facing — this is for your own review.
// ---------------------------------------------------------------------------
import PptxGenJS from 'pptxgenjs';
import { PROJECT_ARCHETYPES, getArchetypeDefaults } from '../logic/archetypes';
import {
  ARCHETYPE_INPUT_MAP,
  getArchetypeInputDefaults,
  mapArchetypeInputs,
} from '../logic/archetypeInputs';

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------
const C = {
  navy:      '1B2A4A',
  blue:      '2563EB',
  lightBlue: 'DBEAFE',
  teal:      '0D9488',
  green:     '059669',
  red:       'DC2626',
  orange:    'EA580C',
  amber:     'D97706',
  white:     'FFFFFF',
  gray50:    'F8FAFC',
  gray100:   'F1F5F9',
  gray200:   'E2E8F0',
  gray400:   '94A3B8',
  gray600:   '475569',
  gray800:   '1E293B',
};

// Module-level ShapeType reference — set in generateSystemReview()
let ST;

// ---------------------------------------------------------------------------
// Reusable helpers
// ---------------------------------------------------------------------------
const hdr = (slide, title) => {
  slide.addShape(ST.rect, { x: 0, y: 0, w: 13.33, h: 0.75, fill: { color: C.navy } });
  slide.addText(title, {
    x: 0.4, y: 0.05, w: 12.5, h: 0.65,
    fontSize: 22, fontFace: 'Arial', bold: true, color: C.white,
  });
};

const sectionTitle = (slide, text, y) => {
  slide.addText(text, {
    x: 0.4, y, w: 5.0, h: 0.35,
    fontSize: 14, fontFace: 'Arial', bold: true, color: C.navy,
  });
  slide.addShape(ST.line, {
    x: 0.4, y: y + 0.32, w: 12.5, h: 0,
    line: { color: C.gray200, width: 1 },
  });
};

function fmtDefault(input) {
  const v = input.default;
  if (input.type === 'percent') return `${(v * 100).toFixed(1)}%`;
  if (input.format?.startsWith('$')) return `$${v.toLocaleString()}`;
  return v.toLocaleString();
}

function fmtRange(input) {
  const mn = input.min ?? 0;
  const mx = input.max ?? '...';
  if (input.type === 'percent') return `${(mn * 100).toFixed(0)}% - ${((input.max ?? 1) * 100).toFixed(0)}%`;
  if (input.type === 'scale') return `${mn} - ${mx}`;
  if (input.format?.startsWith('$')) return `$${mn.toLocaleString()} - $${typeof mx === 'number' ? mx.toLocaleString() : mx}`;
  return `${mn.toLocaleString()} - ${typeof mx === 'number' ? mx.toLocaleString() : mx}`;
}

// Table helper - header row style
const thOpts = (align = 'left') => ({
  bold: true, fontSize: 8, color: C.white, fill: { color: C.navy },
  align, valign: 'middle',
});

// Table helper - data row style
const tdOpts = (i, align = 'left', bold = false, color = C.gray800) => ({
  fontSize: 8, color, fill: { color: i % 2 === 0 ? C.gray100 : C.white },
  align, bold, valign: 'middle',
});

// ---------------------------------------------------------------------------
// SLIDE 1: Title
// ---------------------------------------------------------------------------
function addTitle(pptx) {
  const s = pptx.addSlide();
  s.background = { color: C.navy };
  s.addText('AI ROI Modeler', {
    x: 0.6, y: 1.5, w: 12, h: 1.0,
    fontSize: 44, fontFace: 'Arial', bold: true, color: C.white,
  });
  s.addText('System Review: Screens, Inputs & Data Flow', {
    x: 0.6, y: 2.5, w: 12, h: 0.6,
    fontSize: 22, fontFace: 'Arial', color: C.lightBlue,
  });
  s.addShape(ST.line, {
    x: 0.6, y: 3.3, w: 4.0, h: 0,
    line: { color: C.blue, width: 2 },
  });
  s.addText('Internal document — not for distribution', {
    x: 0.6, y: 3.6, w: 12, h: 0.4,
    fontSize: 14, fontFace: 'Arial', color: C.gray400, italic: true,
  });
  s.addText(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, {
    x: 0.6, y: 4.2, w: 12, h: 0.35,
    fontSize: 12, fontFace: 'Arial', color: C.gray400,
  });
}

// ---------------------------------------------------------------------------
// SLIDE 2: Wizard Flow Overview
// ---------------------------------------------------------------------------
function addWizardFlow(pptx) {
  const s = pptx.addSlide();
  s.background = { color: C.white };
  hdr(s, 'Wizard Flow Overview');

  s.addText('Two Modes:  Quick (~2 min)  |  Detailed (~5 min)', {
    x: 0.4, y: 0.9, w: 12.5, h: 0.35,
    fontSize: 12, fontFace: 'Arial', bold: true, color: C.blue,
  });

  const steps = [
    {
      num: '1', label: 'Context & Readiness', color: C.blue,
      subs: [
        'Industry (dropdown, 10 options)',
        'Company Size (segmented, 5 tiers)',
        'Role (dropdown, 12 options)',
        'Team Location (segmented, 8 regions)',
        'Change Readiness (1-5 stars)',
        'Data Readiness (1-5 stars)',
        'Executive Sponsor (yes/no toggle)',
      ],
    },
    {
      num: '2', label: 'Project & Costs', color: C.teal,
      subs: [
        'Archetype Selection (6 card grid)',
        'Team Size (slider, 1-500)',
        '8 archetype-specific inputs + computed summary card',
        '[Detailed] Fine-tune assumptions (adoption rate, tool replacement, agentic toggle)',
        'Avg Salary (currency input w/ presets)',
        'Current Tool Costs (currency input)',
        '[Detailed] Vendors Replaced, Termination Cost',
      ],
    },
    {
      num: '3', label: 'AI Investment', color: C.green,
      subs: [
        'Budget (segmented, 5 tiers: $25K-$1M+)',
        '"What This Gets You" scope preview (engineers, PMs, timeline)',
        'Timeline (4 options: 1-18 months)',
        'Reality Check (industry benchmark vs selected)',
        'Ongoing Annual Cost (currency)',
        'Advanced: Cash Realization %, Annual Revenue, Contribution Margin',
        'Value Toggles: Capacity Creation, Risk Reduction, Revenue Acceleration',
      ],
    },
  ];

  steps.forEach((step, si) => {
    const colX = 0.4 + si * 4.2;
    s.addShape(ST.roundRect, {
      x: colX, y: 1.4, w: 3.9, h: 0.5,
      fill: { color: step.color }, rectRadius: 0.08,
    });
    s.addText(`Step ${step.num}: ${step.label}`, {
      x: colX, y: 1.4, w: 3.9, h: 0.5,
      fontSize: 13, fontFace: 'Arial', bold: true, color: C.white, align: 'center', valign: 'middle',
    });
    step.subs.forEach((sub, i) => {
      const isDetailed = sub.startsWith('[Detailed]');
      const text = isDetailed ? sub.replace('[Detailed] ', '') : sub;
      const y = 2.05 + i * 0.37;
      s.addText(text, {
        x: colX + 0.15, y, w: 3.6, h: 0.33,
        fontSize: 8.5, fontFace: 'Arial',
        color: isDetailed ? C.amber : C.gray800,
        italic: isDetailed,
        bullet: { code: '2022', color: isDetailed ? C.amber : step.color },
      });
    });
  });

  s.addText('Orange italic = Detailed mode only (skipped in Quick mode)', {
    x: 0.4, y: 5.0, w: 12, h: 0.3,
    fontSize: 9, fontFace: 'Arial', color: C.amber, italic: true,
  });
}

// ---------------------------------------------------------------------------
// SLIDE 3: Common Inputs (shared across all archetypes)
// ---------------------------------------------------------------------------
function addCommonInputs(pptx) {
  const s = pptx.addSlide();
  s.background = { color: C.white };
  hdr(s, 'Common Inputs (All Archetypes)');

  sectionTitle(s, 'Step 1: Context & Readiness', 0.9);

  const ctx = [
    ['Industry', 'Dropdown', '10 industries', 'Sets automation potential, benchmark timelines, discount rate, peer data'],
    ['Company Size', 'Segmented', '5 tiers', 'Drives team defaults, implementation cost multipliers, compliance costs'],
    ['Role', 'Dropdown', '12 roles', 'Controls output tier (executive/financial/detailed) for UI, PDF, Excel'],
    ['Team Location', 'Segmented', '8 regions', 'Sets AI engineer salary rates for implementation cost model'],
    ['Change Readiness', '1-5 Stars', 'Default: 3', 'Multiplier on adoption rate, hidden cost for change management'],
    ['Data Readiness', '1-5 Stars', 'Default: 3', 'Timeline multiplier, data cleanup hidden cost, cost multiplier'],
    ['Executive Sponsor', 'Yes/No', 'Default: Yes', 'Failure rate multiplier (2x without sponsor)'],
  ];

  s.addTable([
    [
      { text: 'Input', options: thOpts() },
      { text: 'Control', options: thOpts() },
      { text: 'Options', options: thOpts() },
      { text: 'What It Drives in the Model', options: thOpts() },
    ],
    ...ctx.map((r, i) => [
      { text: r[0], options: tdOpts(i, 'left', true) },
      { text: r[1], options: tdOpts(i) },
      { text: r[2], options: tdOpts(i) },
      { text: r[3], options: tdOpts(i) },
    ]),
  ], {
    x: 0.4, y: 1.3, w: 12.5,
    colW: [1.8, 1.2, 1.5, 8.0],
    rowH: 0.3,
    border: { type: 'solid', pt: 0.5, color: C.gray200 },
  });

  sectionTitle(s, 'Step 3: AI Investment (same for all archetypes)', 3.8);

  const inv = [
    ['Implementation Budget', 'Segmented', '$25K-$50K / $50K-$150K / $150K-$500K / $500K-$1M / $1M+', 'Auto-computed from benchmarks; drives upfront investment in DCF'],
    ['Timeline', '4 Buttons', '1-3mo / 3-6mo / 6-12mo / 12-18mo', 'Blended with industry benchmark; affects ramp curve and hidden costs'],
    ['Ongoing Annual Cost', 'Currency', 'Pre-filled from benchmarks', 'API, licenses, support staff; deducted from gross savings each year'],
    ['Cash Realization %', '3 Buttons', '25% / 40% / 60%', 'Converts efficiency gains to actual cash savings vs. redeployed capacity'],
    ['Annual Revenue', 'Currency', 'Optional', 'Enables revenue acceleration + competitive erosion calculations'],
    ['Value Toggles', 'Checkboxes', 'Capacity / Risk / Revenue', 'Adds non-cost pathways to NPV when checked'],
  ];

  s.addTable([
    [
      { text: 'Input', options: thOpts() },
      { text: 'Control', options: thOpts() },
      { text: 'Options/Default', options: thOpts() },
      { text: 'What It Drives', options: thOpts() },
    ],
    ...inv.map((r, i) => [
      { text: r[0], options: tdOpts(i, 'left', true) },
      { text: r[1], options: tdOpts(i) },
      { text: r[2], options: tdOpts(i) },
      { text: r[3], options: tdOpts(i) },
    ]),
  ], {
    x: 0.4, y: 4.2, w: 12.5,
    colW: [2.0, 1.2, 3.8, 5.5],
    rowH: 0.3,
    border: { type: 'solid', pt: 0.5, color: C.gray200 },
  });
}

// ---------------------------------------------------------------------------
// SLIDE 4: Archetype Selection Screen
// ---------------------------------------------------------------------------
function addArchetypeGrid(pptx) {
  const s = pptx.addSlide();
  s.background = { color: C.white };
  hdr(s, 'Step 2 — Archetype Selection (Card Grid)');

  s.addText('User sees 15 cards. Selecting one auto-loads archetype-specific inputs + industry defaults.', {
    x: 0.4, y: 0.85, w: 12.5, h: 0.3,
    fontSize: 11, fontFace: 'Arial', color: C.gray600, italic: true,
  });

  const colW = 4.0;
  const rowH = 0.85;

  PROJECT_ARCHETYPES.forEach((arch, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.4 + col * (colW + 0.25);
    const y = 1.3 + row * (rowH + 0.1);

    const defaults = getArchetypeDefaults(arch.id, 'Technology / Software');
    const schema = ARCHETYPE_INPUT_MAP[arch.id];
    const inputCount = schema?.inputs?.length || 0;
    const mappingCount = schema?.computedMappings?.length || 0;

    s.addShape(ST.roundRect, {
      x, y, w: colW, h: rowH,
      fill: { color: C.gray50 },
      rectRadius: 0.06,
      line: { color: C.gray200, width: 0.5 },
    });

    s.addText(`${arch.icon}  ${arch.label}`, {
      x: x + 0.1, y, w: colW - 0.2, h: 0.3,
      fontSize: 10, fontFace: 'Arial', bold: true, color: C.navy,
    });

    const tags = arch.tags || [];
    const isRevenue = defaults?.revenueEligible;
    const tagLine = tags.join(', ') + (isRevenue ? ' | Revenue Eligible' : '');
    s.addText(tagLine, {
      x: x + 0.1, y: y + 0.27, w: colW - 0.2, h: 0.2,
      fontSize: 7, fontFace: 'Arial', color: isRevenue ? C.green : C.gray400,
    });

    s.addText(`${inputCount} inputs | ${mappingCount} computed | Auto%: ${defaults ? Math.round(defaults.automationPotential * 100) : '?'}%`, {
      x: x + 0.1, y: y + 0.5, w: colW - 0.2, h: 0.25,
      fontSize: 7.5, fontFace: 'Arial', color: C.blue,
    });
  });
}

// ---------------------------------------------------------------------------
// PER-ARCHETYPE SLIDES (2 slides each: inputs + data flow)
// ---------------------------------------------------------------------------
function addArchetypeInputSlide(pptx, arch, slideIdx) {
  const s = pptx.addSlide();
  s.background = { color: C.white };
  hdr(s, `${slideIdx}/15  ${arch.icon}  ${arch.label}`);

  const schema = ARCHETYPE_INPUT_MAP[arch.id];
  if (!schema) {
    s.addText('No archetype-specific inputs defined.', {
      x: 0.4, y: 1.2, w: 12, h: 0.5,
      fontSize: 14, fontFace: 'Arial', color: C.red,
    });
    return;
  }

  s.addText(arch.description, {
    x: 0.4, y: 0.85, w: 8, h: 0.3,
    fontSize: 11, fontFace: 'Arial', color: C.gray600, italic: true,
  });

  s.addText(`Tags: ${(arch.tags || []).join(', ')}  |  Source Process Types: ${arch.sourceProcessTypes.join(', ')}`, {
    x: 0.4, y: 1.15, w: 12.5, h: 0.25,
    fontSize: 8, fontFace: 'Arial', color: C.gray400,
  });

  sectionTitle(s, 'User Inputs (Step 2, Detailed Mode)', 1.5);

  s.addTable([
    [
      { text: '#', options: thOpts('center') },
      { text: 'Input Label', options: thOpts() },
      { text: 'Type', options: thOpts('center') },
      { text: 'Default', options: thOpts('right') },
      { text: 'Range', options: thOpts('center') },
      { text: 'Description', options: thOpts() },
    ],
    ...schema.inputs.map((inp, i) => [
      { text: `${i + 1}`, options: tdOpts(i, 'center') },
      { text: inp.label, options: tdOpts(i, 'left', true) },
      { text: inp.type, options: tdOpts(i, 'center') },
      { text: fmtDefault(inp), options: tdOpts(i, 'right', true, C.blue) },
      { text: fmtRange(inp), options: tdOpts(i, 'center') },
      { text: inp.note || '', options: tdOpts(i) },
    ]),
  ], {
    x: 0.4, y: 1.9, w: 12.5,
    colW: [0.4, 2.8, 0.8, 1.2, 1.8, 5.5],
    rowH: 0.27,
    border: { type: 'solid', pt: 0.5, color: C.gray200 },
  });

  const mapY = 1.9 + (schema.inputs.length + 1) * 0.27 + 0.25;
  sectionTitle(s, 'Computed Mappings (auto-calculated from inputs above)', mapY);

  s.addTable([
    [
      { text: 'Maps To', options: thOpts() },
      { text: 'JS Formula', options: thOpts() },
      { text: 'Excel Formula', options: thOpts() },
      { text: 'Note', options: thOpts() },
    ],
    ...schema.computedMappings.map((m, i) => [
      { text: m.mapsTo, options: tdOpts(i, 'left', true, C.teal) },
      { text: m.jsMap.toString().replace(/^\(i\)\s*=>\s*/, '').replace(/^\(\)\s*=>\s*/, '').slice(0, 60), options: tdOpts(i) },
      { text: (m.excelFormula || '').slice(0, 50), options: tdOpts(i) },
      { text: m.note || '', options: tdOpts(i) },
    ]),
  ], {
    x: 0.4, y: mapY + 0.4, w: 12.5,
    colW: [1.8, 4.0, 4.0, 2.7],
    rowH: 0.27,
    border: { type: 'solid', pt: 0.5, color: C.gray200 },
  });

  const defaults = getArchetypeDefaults(arch.id, 'Technology / Software');
  const defY = mapY + 0.4 + (schema.computedMappings.length + 1) * 0.27 + 0.25;

  if (defaults && defY < 6.5) {
    sectionTitle(s, 'Base Assumptions (Technology / Software defaults)', defY);

    const defText = Object.entries(defaults).map(([k, v]) => {
      if (typeof v === 'boolean') return `${k}: ${v ? 'Yes' : 'No'}`;
      if (typeof v === 'number' && v < 1) return `${k}: ${(v * 100).toFixed(0)}%`;
      return `${k}: ${v}`;
    }).join('   |   ');

    s.addText(defText, {
      x: 0.5, y: defY + 0.35, w: 12.3, h: 0.3,
      fontSize: 8.5, fontFace: 'Arial', color: C.gray600,
    });
  }
}

function addArchetypeDataSlide(pptx, arch, slideIdx) {
  const s = pptx.addSlide();
  s.background = { color: C.white };
  hdr(s, `${slideIdx}/15  ${arch.icon}  ${arch.label} — Sample Data Flow`);

  const schema = ARCHETYPE_INPUT_MAP[arch.id];
  if (!schema) return;

  const inputDefaults = getArchetypeInputDefaults(arch.id);
  const computed = mapArchetypeInputs(arch.id, inputDefaults);
  const baseDefaults = getArchetypeDefaults(arch.id, 'Technology / Software');

  sectionTitle(s, 'Default Input Values → Computed Outputs', 0.9);

  s.addTable([
    [
      { text: 'Input', options: thOpts() },
      { text: 'Default Value', options: thOpts('right') },
    ],
    ...schema.inputs.map((inp, i) => [
      { text: inp.label, options: tdOpts(i, 'left', false) },
      { text: fmtDefault(inp), options: tdOpts(i, 'right', true, C.blue) },
    ]),
  ], {
    x: 0.4, y: 1.3, w: 5.5,
    colW: [3.8, 1.7],
    rowH: 0.25,
    border: { type: 'solid', pt: 0.5, color: C.gray200 },
  });

  const arrowY = 1.3 + (schema.inputs.length + 1) * 0.25 / 2;
  s.addText('>>>', {
    x: 5.9, y: arrowY, w: 0.6, h: 0.4,
    fontSize: 20, fontFace: 'Arial', color: C.blue, align: 'center',
  });

  const computedEntries = Object.entries(computed);
  s.addTable([
    [
      { text: 'Computed Variable', options: thOpts() },
      { text: 'Value', options: thOpts('right') },
    ],
    ...computedEntries.map(([k, v], i) => {
      let formatted;
      if (k.includes('Rate') || k.includes('Potential') || k === 'errorRate') formatted = `${(v * 100).toFixed(1)}%`;
      else if (k.includes('revenue') || k.includes('Revenue') || k.includes('risk') || k.includes('Risk')) formatted = `$${v.toLocaleString()}`;
      else if (k === 'hoursPerWeek') formatted = `${v} hrs/wk`;
      else formatted = String(v);

      return [
        { text: k, options: tdOpts(i, 'left', true, C.teal) },
        { text: formatted, options: tdOpts(i, 'right', true, C.navy) },
      ];
    }),
  ], {
    x: 6.6, y: 1.3, w: 6.3,
    colW: [3.5, 2.8],
    rowH: 0.3,
    border: { type: 'solid', pt: 0.5, color: C.gray200 },
  });

  const narrativeY = Math.max(
    1.3 + (schema.inputs.length + 1) * 0.25 + 0.3,
    1.3 + (computedEntries.length + 1) * 0.3 + 0.3,
  );

  sectionTitle(s, 'How This Flows Into the DCF Engine', narrativeY);

  const flows = [
    ['automationPotential', 'Sets the % of labor hours that AI can handle. Directly caps gross savings.'],
    ['hoursPerWeek', 'Overrides the base hoursPerWeek input. Multiplied by teamSize to get total weekly hours.'],
    ['errorRate', 'Drives rework cost savings = annualLaborCost x errorRate x automationPotential.'],
    ['revenueImpact', 'Added to gross savings when includeRevenueAcceleration is checked. FY 1 only at 50%, then full.'],
    ['riskReduction', 'Added to gross savings when includeRiskReduction is checked. Regulatory/compliance value.'],
    ['toolReplacementRate', 'Controls how much of currentToolCosts are recaptured (saved tool licenses).'],
  ];

  const activeFlows = flows.filter(f => computed[f[0]] !== undefined);

  activeFlows.forEach((flow, i) => {
    const y = narrativeY + 0.4 + i * 0.35;
    s.addText(flow[0], {
      x: 0.5, y, w: 2.2, h: 0.3,
      fontSize: 9, fontFace: 'Courier New', bold: true, color: C.teal,
    });
    s.addText(flow[1], {
      x: 2.8, y, w: 10.0, h: 0.3,
      fontSize: 9, fontFace: 'Arial', color: C.gray600,
    });
  });

  if (baseDefaults) {
    const baseY = narrativeY + 0.4 + activeFlows.length * 0.35 + 0.3;
    if (baseY < 6.8) {
      s.addText(
        `Base Assumptions (Tech/Software): automationPotential=${(baseDefaults.automationPotential * 100).toFixed(0)}%  |  ` +
        `adoptionRate=${(baseDefaults.adoptionRate * 100).toFixed(0)}%  |  ` +
        `toolReplacementRate=${(baseDefaults.toolReplacementRate * 100).toFixed(0)}%  |  ` +
        `revenueEligible=${baseDefaults.revenueEligible ? 'Yes' : 'No'}`,
        {
          x: 0.4, y: baseY, w: 12.5, h: 0.25,
          fontSize: 8, fontFace: 'Arial', color: C.gray400, italic: true,
        }
      );
    }
  }
}

// ---------------------------------------------------------------------------
// SLIDE: Output Tiers
// ---------------------------------------------------------------------------
function addOutputTiers(pptx) {
  const s = pptx.addSlide();
  s.background = { color: C.white };
  hdr(s, 'Output Tier System');

  s.addText('User role maps to an output tier that controls UI sections, PDF pages, and Excel tabs.', {
    x: 0.4, y: 0.9, w: 12.5, h: 0.3,
    fontSize: 11, fontFace: 'Arial', color: C.gray600, italic: true,
  });

  sectionTitle(s, 'Role → Tier Mapping', 1.3);

  const roleMappings = [
    ['CEO / President, Board Member, COO', 'Executive', 'Minimal detail. Hero verdict, scorecard, top 1 lever, CTA.'],
    ['CFO, CTO/CIO, VP/SVP, Director, Head of Dept', 'Financial', 'Full financials. Year-by-year, sensitivity, Monte Carlo, peer comparison.'],
    ['Finance/FP&A, Manager, Analyst/IC, Other', 'Detailed', 'Everything. All sections, break-even units, consulting assumptions, phased gates.'],
  ];

  s.addTable([
    [
      { text: 'Roles', options: thOpts() },
      { text: 'Tier', options: thOpts('center') },
      { text: 'What They See', options: thOpts() },
    ],
    ...roleMappings.map((r, i) => [
      { text: r[0], options: tdOpts(i) },
      { text: r[1], options: tdOpts(i, 'center', true, C.blue) },
      { text: r[2], options: tdOpts(i) },
    ]),
  ], {
    x: 0.4, y: 1.7, w: 12.5,
    colW: [4.5, 1.5, 6.5],
    rowH: 0.35,
    border: { type: 'solid', pt: 0.5, color: C.gray200 },
  });

  sectionTitle(s, 'Key Section Visibility', 3.0);

  const sections = [
    'heroVerdict', 'executiveScorecard', 'yearByYear', 'topLevers',
    'keyAssumptions', 'financialDetail', 'investmentOverview',
    'sensitivityAnalysis', 'monteCarloAnalysis', 'valueCreationPathways',
    'capitalEfficiency', 'peerComparison', 'phasedDeploymentGates',
    'workforceAlternatives', 'breakEvenUnits', 'consultingAssumptions',
  ];

  const tierVals = {
    executive: {
      heroVerdict: 'Y', executiveScorecard: 'Y', yearByYear: 'Totals', topLevers: '1',
      keyAssumptions: '-', financialDetail: '-', investmentOverview: '-',
      sensitivityAnalysis: '-', monteCarloAnalysis: '-', valueCreationPathways: '-',
      capitalEfficiency: '-', peerComparison: 'Y', phasedDeploymentGates: '-',
      workforceAlternatives: '-', breakEvenUnits: '-', consultingAssumptions: '-',
    },
    financial: {
      heroVerdict: 'Y', executiveScorecard: 'Y', yearByYear: 'Y', topLevers: '3',
      keyAssumptions: 'Y', financialDetail: 'Y', investmentOverview: 'Y',
      sensitivityAnalysis: 'Y', monteCarloAnalysis: 'Y', valueCreationPathways: 'Y',
      capitalEfficiency: 'Y', peerComparison: 'Y', phasedDeploymentGates: '-',
      workforceAlternatives: 'Y', breakEvenUnits: '-', consultingAssumptions: '-',
    },
    detailed: {
      heroVerdict: 'Y', executiveScorecard: 'Y', yearByYear: 'Y', topLevers: '3',
      keyAssumptions: 'Y', financialDetail: 'Y', investmentOverview: 'Y',
      sensitivityAnalysis: 'Y', monteCarloAnalysis: 'Y', valueCreationPathways: 'Y',
      capitalEfficiency: 'Y', peerComparison: 'Y', phasedDeploymentGates: 'Y',
      workforceAlternatives: 'Y', breakEvenUnits: 'Y', consultingAssumptions: 'Y',
    },
  };

  s.addTable([
    [
      { text: 'Section', options: thOpts() },
      { text: 'Executive', options: thOpts('center') },
      { text: 'Financial', options: thOpts('center') },
      { text: 'Detailed', options: thOpts('center') },
    ],
    ...sections.map((sec, i) => [
      { text: sec, options: tdOpts(i, 'left', false, C.gray800) },
      {
        text: tierVals.executive[sec] || '-',
        options: tdOpts(i, 'center', false, tierVals.executive[sec] === 'Y' ? C.green : tierVals.executive[sec] === '-' ? C.gray400 : C.blue),
      },
      {
        text: tierVals.financial[sec] || '-',
        options: tdOpts(i, 'center', false, tierVals.financial[sec] === 'Y' ? C.green : tierVals.financial[sec] === '-' ? C.gray400 : C.blue),
      },
      {
        text: tierVals.detailed[sec] || '-',
        options: tdOpts(i, 'center', false, tierVals.detailed[sec] === 'Y' ? C.green : tierVals.detailed[sec] === '-' ? C.gray400 : C.blue),
      },
    ]),
  ], {
    x: 0.4, y: 3.4, w: 12.5,
    colW: [4.0, 2.8, 2.8, 2.9],
    rowH: 0.2,
    border: { type: 'solid', pt: 0.5, color: C.gray200 },
  });

  s.addText('Y = visible  |  - = hidden  |  Totals = year-by-year shows only totals row  |  1/3 = number of top levers shown', {
    x: 0.4, y: 6.85, w: 12.5, h: 0.25,
    fontSize: 7.5, fontFace: 'Arial', color: C.gray400, italic: true,
  });
}

// ---------------------------------------------------------------------------
// SLIDE: Outputs Overview
// ---------------------------------------------------------------------------
function addOutputsOverview(pptx) {
  const s = pptx.addSlide();
  s.background = { color: C.white };
  hdr(s, 'Output Deliverables');

  const outputs = [
    {
      label: 'Interactive Dashboard', desc: 'LiveCalculation.jsx (~1500 lines)',
      items: [
        'Hero verdict (go/proceed with caution/not recommended)',
        'Executive scorecard (3 cards: NPV, ROIC, Payback)',
        'What Drives This Result (top 3 levers with user input values)',
        'Year-by-year projection table (5 years)',
        'Scenario toggle (conservative/base/optimistic)',
        'Collapsible sections: Financial Detail, Investment Overview, Sensitivity, Monte Carlo, etc.',
        'Download buttons: PDF Report, Excel Model, Overview Deck',
      ],
    },
    {
      label: 'PDF Report', desc: 'generateReport.js (~3700 lines, 24 pages)',
      items: [
        'Branded cover + table of contents',
        'Executive summary, current state, investment analysis',
        'Scenario projections, risk assessment, sensitivity tornado',
        'Value breakdown, capital efficiency, peer comparison',
        'Workforce alternatives, break-even, methodology appendix',
      ],
    },
    {
      label: 'Excel Model', desc: 'generateExcelModel.js (~1400 lines, 8 tabs)',
      items: [
        'Summary — one-page scorecard',
        'Inputs — all user inputs with numbered IDs, key driver highlighting',
        'P&L & Cash Flow — 5-year projections with DCF',
        'Sensitivity — tornado chart data + scenario comparison',
        'V5 Analysis — value pathways, capital efficiency',
        'Key Formulas — all intermediate calculations',
        'Lookups — benchmark tables and constants',
        'Model Audit — 70+ formula-based checks with ok/ERROR/— status',
      ],
    },
    {
      label: 'PowerPoint Deck', desc: 'generatePresentation.js (~22 slides)',
      items: [
        'Architecture overview, key levers, archetype grid',
        'Per-archetype slides with sample inputs + ROI results',
        'Summary comparison table, next steps CTA',
      ],
    },
  ];

  outputs.forEach((out, oi) => {
    const y = 0.9 + oi * 1.55;
    s.addShape(ST.roundRect, {
      x: 0.4, y, w: 12.5, h: 1.4,
      fill: { color: C.gray50 },
      rectRadius: 0.08,
      line: { color: C.gray200, width: 0.5 },
    });

    s.addText(`${out.label}`, {
      x: 0.6, y: y + 0.05, w: 3.0, h: 0.3,
      fontSize: 13, fontFace: 'Arial', bold: true, color: C.navy,
    });
    s.addText(out.desc, {
      x: 3.6, y: y + 0.05, w: 5.0, h: 0.3,
      fontSize: 9, fontFace: 'Arial', color: C.gray400, italic: true,
    });

    out.items.forEach((item, ii) => {
      s.addText(item, {
        x: 0.8, y: y + 0.35 + ii * 0.16, w: 11.8, h: 0.16,
        fontSize: 7.5, fontFace: 'Arial', color: C.gray600,
        bullet: { code: '2022', color: C.blue },
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export async function generateSystemReview() {
  const pptx = new PptxGenJS();
  ST = pptx.ShapeType; // Store ShapeType reference for all helpers

  pptx.title = 'AI ROI Modeler — System Review';
  pptx.subject = 'Internal System Documentation';
  pptx.layout = 'LAYOUT_WIDE'; // 13.33" x 7.5"

  // Static slides
  addTitle(pptx);           // 1
  addWizardFlow(pptx);      // 2
  addCommonInputs(pptx);    // 3
  addArchetypeGrid(pptx);   // 4

  // Per-archetype: 2 slides each (inputs + data flow) = 30 slides
  PROJECT_ARCHETYPES.forEach((arch, i) => {
    addArchetypeInputSlide(pptx, arch, i + 1);
    addArchetypeDataSlide(pptx, arch, i + 1);
  });

  // System slides
  addOutputTiers(pptx);     // 35
  addOutputsOverview(pptx);  // 36

  await pptx.writeFile({ fileName: 'AI_ROI_Modeler_System_Review.pptx' });
}
