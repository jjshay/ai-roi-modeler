// ---------------------------------------------------------------------------
// Archetype-Specific Inputs — Detailed operational inputs for each archetype
// Shared schema used by both Excel spreadsheet and web app.
// Each archetype defines a short set of operating inputs that directly refine
// the base model. There are no decorative or unused case inputs.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Input type helpers for consistent schema definitions
// ---------------------------------------------------------------------------
function numInput(key, label, defaults) {
  return {
    key,
    label,
    type: 'number',
    default: defaults.default,
    min: defaults.min ?? 0,
    max: defaults.max ?? 10000000,
    // The schema owns input precision so the UI and Excel keep the same
    // valid values. A range control must never coerce its displayed default.
    step: defaults.step ?? 1,
    format: defaults.format || '#,##0',
    note: defaults.note || '',
  };
}

function pctInput(key, label, defaults) {
  return {
    key,
    label,
    type: 'percent',
    default: defaults.default,
    min: defaults.min ?? 0,
    max: defaults.max ?? 1,
    format: '0.0%',
    note: defaults.note || '',
  };
}

function scaleInput(key, label, defaults) {
  return {
    key,
    label,
    type: 'scale',
    default: defaults.default ?? 3,
    min: 1,
    max: 5,
    format: '0',
    note: defaults.note || '1=Low, 5=High',
  };
}

// ---------------------------------------------------------------------------
// ARCHETYPE INPUT SCHEMAS — four archetypes with case-specific operating
// levers. These inputs establish the workload and technical ceiling; they do
// not turn time saved into cash without an explicit workforce/contract/rework
// action elsewhere in the model.
// ---------------------------------------------------------------------------
export const ARCHETYPE_INPUT_SCHEMAS = [
  // =========================================================================
  // 1. Internal Process Automation
  // =========================================================================
  {
    id: 'internal-process-automation',
    caseGuide: {
      calculation: 'Monthly process volume × minutes per process = workload. The workforce mix converts that workload into current cost per process.',
      assumption: 'Efficiency is capped by the share of steps that can be automated after required human review and integration complexity.',
      footnote: 'Cash savings require a declared workforce, contract, or rework action; saved time alone is capacity.',
    },
    inputs: [
      numInput('processVolume', 'Process volume (transactions/month)', {
        default: 5000, max: 1000000, step: 100, note: 'Monthly volume of transactions processed',
      }),
      numInput('handlingTimeMin', 'Average time per process (minutes)', {
        default: 15, min: 1, max: 480, note: 'Hands-on minutes required to complete one process today',
      }),
      pctInput('pctAutomatable', '% of steps automatable', {
        default: 0.65, note: 'Fraction of process steps AI can handle',
      }),
      scaleInput('integrationComplexity', 'Integration complexity (1-5)', {
        default: 3, note: '1=Single system, 5=Many legacy integrations',
      }),
      pctInput('humanInLoopPct', 'Human-in-the-loop %', {
        default: 0.20, note: 'Fraction of cases requiring human review',
      }),
    ],
    computedMappings: [
      {
        mapsTo: 'automationPotential',
        jsMap: (i) => Math.min(0.85, i.pctAutomatable * (1 - i.humanInLoopPct) * (1 - (i.integrationComplexity - 1) * 0.05)),
        excelFormula: 'MIN(0.85, {pctAutomatable} * (1 - {humanInLoopPct}) * (1 - ({integrationComplexity} - 1) * 0.05))',
      },
      {
        mapsTo: 'caseWorkloadHoursPerWeek',
        // Keep the measured workload precise. Rounding here can turn a real,
        // low-volume process into zero hours and bypass the coverage bumper.
        // Presentation layers round only when they display the value.
        jsMap: (i) => i.processVolume * i.handlingTimeMin / 60 / 4.33,
        excelFormula: '{processVolume} * {handlingTimeMin} / 60 / 4.33',
      },
      {
        mapsTo: 'caseBuildComplexityMultiplier',
        jsMap: (i) => 1 + (i.integrationComplexity - 3) * 0.08,
        excelFormula: '1 + ({integrationComplexity} - 3) * 0.08',
        note: 'Connected-system complexity affects build effort, not the benefit calculation.',
      },
    ],
    keyDrivers: ['processVolume', 'handlingTimeMin', 'pctAutomatable', 'humanInLoopPct', 'integrationComplexity'],
  },

  // =========================================================================
  // 2. Customer Service
  // =========================================================================
  {
    id: 'customer-facing-ai',
    caseGuide: {
      calculation: 'Tickets × resolution time = workload. Eligible contacts × containment rate × fully loaded cost per contact = potential direct cost avoidance.',
      assumption: 'The customer-service cost baseline must be validated, and avoided contacts must reduce spend—not only free time—before direct savings enter the DCF.',
      footnote: 'The human escalation floor is a safety cap. It changes savings only when it is stricter than the remaining human share implied by your containment rate.',
    },
    inputs: [
      numInput('ticketsPerMonth', 'Support tickets/month', {
        default: 3000, max: 5000000, step: 100, note: 'Total inbound support volume',
      }),
      numInput('resolutionTimeMin', 'Avg resolution time (minutes)', {
        default: 25, min: 1, max: 120, note: 'Hands-on minutes to resolve one human-handled contact',
      }),
      pctInput('eligibleIntentPct', 'Contacts eligible for AI containment', {
        default: 0.75, max: 0.95, note: 'Share of contacts that are repeatable, low-risk intents—not escalations or sensitive cases',
      }),
      pctInput('deflectionTarget', 'AI containment rate', {
        default: 0.35, max: 0.60, note: 'Share of eligible contacts fully resolved by AI. Above 60% needs pilot evidence.',
      }),
      numInput('costPerResolvedTicket', 'Fully loaded cost per human-resolved contact ($)', {
        default: 12, max: 5000, step: 1, format: '$#,##0', note: 'Measured support cost per resolved contact; use capacity only until Operations validates this value',
      }),
      pctInput('humanEscalationPct', 'Human escalation floor', {
        default: 0.20, min: 0.10, note: 'Minimum share of contacts that must remain with a human. It only limits the model when it is stricter than the remaining human share implied by the AI-containment rate.',
      }),
    ],
    computedMappings: [
      {
        mapsTo: 'automationPotential',
        jsMap: (i) => Math.min(0.60, i.eligibleIntentPct * Math.min(i.deflectionTarget, 1 - i.humanEscalationPct)),
        excelFormula: 'MIN(0.60, {eligibleIntentPct} * MIN({deflectionTarget}, 1 - {humanEscalationPct}))',
      },
      {
        mapsTo: 'caseWorkloadHoursPerWeek',
        jsMap: (i) => i.ticketsPerMonth * i.resolutionTimeMin / 60 / 4.33,
        excelFormula: '{ticketsPerMonth} * {resolutionTimeMin} / 60 / 4.33',
      },
      {
        mapsTo: 'caseDirectSavings',
        jsMap: (i) => Math.round(i.ticketsPerMonth * 12 * i.eligibleIntentPct * Math.min(i.deflectionTarget, 1 - i.humanEscalationPct) * i.costPerResolvedTicket),
        excelFormula: 'ROUND({ticketsPerMonth} * 12 * {eligibleIntentPct} * MIN({deflectionTarget}, 1 - {humanEscalationPct}) * {costPerResolvedTicket}, 0)',
        note: 'Measured support-cost avoidance before adoption/risk factors; use in cash flow only after Operations validates cost per contact.',
      },
    ],
    keyDrivers: ['ticketsPerMonth', 'resolutionTimeMin', 'eligibleIntentPct', 'deflectionTarget', 'humanEscalationPct', 'costPerResolvedTicket'],
  },

  // =========================================================================
  // 3. Data & Analytics Automation
  // =========================================================================
  {
    id: 'data-analytics-automation',
    caseGuide: {
      calculation: 'Reports × hours per report × analyst allocation = workload. Manual data preparation and accuracy set the automation ceiling; data sources affect build effort.',
      assumption: 'Time saved is capacity until an approved workforce or third-party-spend action makes it cash-realizable.',
      footnote: 'No revenue forecast is created from reporting or forecasting speed.',
    },
    inputs: [
      numInput('reportsPerMonth', 'Reports generated/month', {
        default: 40, max: 10000, note: 'Number of reports produced monthly',
      }),
      numInput('hoursPerReport', 'Hours per report', {
        default: 6, min: 0.5, max: 200, step: 0.5, format: '0.0', note: 'Analyst hours to produce one report',
      }),
      numInput('dataSources', 'Number of data sources', {
        default: 8, min: 1, max: 500, format: '0', note: 'Distinct data feeds/systems',
      }),
      pctInput('accuracyRate', 'Current accuracy rate', {
        default: 0.92, min: 0.50, note: 'Fraction of reports without material errors',
      }),
      pctInput('manualDataPrepPct', 'Manual data prep %', {
        default: 0.55, note: 'Fraction of time spent on data wrangling vs. analysis',
      }),
      pctInput('analystUtilization', 'Analyst utilization rate', {
        default: 0.85, note: 'Fraction of analyst time on this process',
      }),
    ],
    computedMappings: [
      {
        mapsTo: 'automationPotential',
        jsMap: (i) => Math.min(0.75, i.manualDataPrepPct * 0.85 + (1 - i.accuracyRate) * 0.5),
        excelFormula: 'MIN(0.75, {manualDataPrepPct} * 0.85 + (1 - {accuracyRate}) * 0.5)',
      },
      {
        mapsTo: 'caseWorkloadHoursPerWeek',
        jsMap: (i) => i.reportsPerMonth * i.hoursPerReport * i.analystUtilization / 4.33,
        excelFormula: '{reportsPerMonth} * {hoursPerReport} * {analystUtilization} / 4.33',
      },
      {
        mapsTo: 'errorRate',
        jsMap: (i) => 1 - i.accuracyRate,
        excelFormula: '1 - {accuracyRate}',
      },
      {
        mapsTo: 'caseBuildComplexityMultiplier',
        jsMap: (i) => Math.min(1.50, Math.max(0.90, 0.90 + i.dataSources * 0.02)),
        excelFormula: 'MIN(1.50, MAX(0.90, 0.90 + {dataSources} * 0.02))',
        note: 'Data sources increase build and integration effort, not the projected benefit.',
      },
    ],
    keyDrivers: ['reportsPerMonth', 'hoursPerReport', 'analystUtilization', 'manualDataPrepPct', 'dataSources', 'accuracyRate'],
  },

  // =========================================================================
  // 4. Risk, Compliance & Legal AI
  // =========================================================================
  {
    id: 'risk-compliance-legal-ai',
    caseGuide: {
      calculation: 'Reviews × hours per review = workload. Automatable review work sets the efficiency ceiling. Findings × realized loss × preventable share is shown separately as risk context.',
      assumption: 'Historical-loss avoidance is excluded from NPV, IRR, and payback until Finance validates the evidence.',
      footnote: 'The core ROI reflects operating workload only; it does not assume avoided fines.',
    },
    inputs: [
      numInput('reviewsPerMonth', 'Reviews/audits per month', {
        default: 200, max: 100000, note: 'Monthly compliance review volume',
      }),
      numInput('hoursPerReview', 'Hours per review', {
        default: 4, min: 0.25, max: 100, step: 0.25, format: '0.0', note: 'Staff hours per review/audit',
      }),
      pctInput('pctAutomatable', 'Share of review work automatable', {
        default: 0.35, max: 0.75, note: 'Share of review steps that can be automated while required human oversight remains in place',
      }),
      numInput('findingsPerYear', 'Annual findings/violations', {
        default: 15, max: 10000, format: '0', note: 'Number of compliance findings per year',
      }),
      numInput('fineExposure', 'Historical remediation / loss per material finding ($)', {
        default: 250000, max: 100000000, step: 100, format: '$#,##0', note: 'Use realized remediation, settlement, service-credit, or loss data—not the statutory maximum fine',
      }),
      pctInput('preventableFindingPct', 'Evidence-backed preventable finding share', {
        default: 0.20, max: 0.50, note: 'Share of realized findings a tested control could prevent. Above 50% requires pilot evidence.',
      }),
    ],
    computedMappings: [
      {
        mapsTo: 'automationPotential',
        jsMap: (i) => i.pctAutomatable,
        excelFormula: '{pctAutomatable}',
      },
      {
        mapsTo: 'caseWorkloadHoursPerWeek',
        jsMap: (i) => i.reviewsPerMonth * i.hoursPerReview / 4.33,
        excelFormula: '{reviewsPerMonth} * {hoursPerReview} / 4.33',
      },
      {
        mapsTo: 'caseRiskAvoidance',
        jsMap: (i) => Math.round(i.findingsPerYear * i.fineExposure * i.preventableFindingPct),
        excelFormula: 'ROUND({findingsPerYear} * {fineExposure} * {preventableFindingPct}, 0)',
        note: 'Historical-loss avoidance context; excluded from NPV until Finance validates evidence.',
      },
    ],
    keyDrivers: ['reviewsPerMonth', 'hoursPerReview', 'pctAutomatable', 'findingsPerYear', 'fineExposure', 'preventableFindingPct'],
  },

];

// ---------------------------------------------------------------------------
// Lookup map: archetypeId → schema
// ---------------------------------------------------------------------------
export const ARCHETYPE_INPUT_MAP = Object.fromEntries(
  ARCHETYPE_INPUT_SCHEMAS.map(s => [s.id, s])
);

// ---------------------------------------------------------------------------
// Classification Scoring Matrix
// 6 questions, each scored 1-5 per archetype. Used to auto-recommend archetype.
// ---------------------------------------------------------------------------
export const CLASSIFICATION_QUESTIONS = [
  { key: 'primaryGoal', label: 'Primary goal', options: ['Cut costs', 'Improve quality', 'Grow revenue', 'Reduce risk', 'Accelerate speed'] },
  { key: 'customerFacing', label: 'Customer-facing?', options: ['Fully internal', 'Mostly internal', 'Mixed', 'Mostly external', 'Fully external'] },
  { key: 'dataComplexity', label: 'Data complexity', options: ['Simple/structured', 'Mostly structured', 'Mixed', 'Mostly unstructured', 'Complex/multi-modal'] },
  { key: 'processVolume', label: 'Transaction volume', options: ['Very low', 'Low', 'Moderate', 'High', 'Very high'] },
  { key: 'regulatoryBurden', label: 'Regulatory burden', options: ['Minimal', 'Light', 'Moderate', 'Heavy', 'Extreme'] },
  { key: 'technicalTeam', label: 'Technical sophistication', options: ['Non-technical', 'Basic', 'Moderate', 'Advanced', 'Expert'] },
];

// Scores: each archetype's profile across the 6 questions (1-5 scale)
// [primaryGoal, customerFacing, dataComplexity, processVolume, regulatoryBurden, technicalTeam]
export const CLASSIFICATION_PROFILES = {
  'internal-process-automation':  [1, 1, 2, 5, 2, 2],
  'customer-facing-ai':          [3, 5, 3, 4, 2, 3],
  'data-analytics-automation':   [2, 2, 5, 3, 2, 4],
  'risk-compliance-legal-ai':    [4, 1, 3, 4, 5, 3],
};

// ---------------------------------------------------------------------------
// Auto-classify: score user answers against profiles, return ranked archetypes
// ---------------------------------------------------------------------------
export function classifyArchetype(answers) {
  // answers = { primaryGoal: 3, customerFacing: 5, ... } (1-5 values)
  const keys = CLASSIFICATION_QUESTIONS.map(q => q.key);
  const scores = {};

  for (const [archetypeId, profile] of Object.entries(CLASSIFICATION_PROFILES)) {
    let totalScore = 0;
    for (let i = 0; i < keys.length; i++) {
      const userVal = answers[keys[i]] || 3;
      const archetypeVal = profile[i];
      // Score: 5 minus absolute distance (max score 5 = perfect match)
      totalScore += 5 - Math.abs(userVal - archetypeVal);
    }
    scores[archetypeId] = totalScore;
  }

  // Sort descending by score, return top 3
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, score]) => ({ id, score, maxScore: 30 }));
}

// ---------------------------------------------------------------------------
// Normalize archetype inputs before they can influence the model. This is a
// deliberate model guardrail: URLs, saved scenarios, and API payloads can all
// bypass the browser controls. We preserve the raw values in UI state, but the
// calculation engine only receives the bounded values and reports corrections.
// ---------------------------------------------------------------------------
export function sanitizeArchetypeInputs(archetypeId, inputValues = {}) {
  const schema = ARCHETYPE_INPUT_MAP[archetypeId];
  if (!schema) return { values: {}, corrections: [] };

  const values = {};
  const corrections = [];
  for (const input of schema.inputs) {
    const rawValue = inputValues?.[input.key];
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      values[input.key] = input.default;
      continue;
    }

    const numeric = typeof rawValue === 'number' ? rawValue : Number(rawValue);
    if (!Number.isFinite(numeric)) {
      values[input.key] = input.default;
      corrections.push({
        key: input.key,
        label: input.label,
        from: rawValue,
        to: input.default,
        reason: 'was not a usable number, so the model used the case default',
      });
      continue;
    }

    const bounded = Math.max(input.min, Math.min(input.max, numeric));
    values[input.key] = bounded;
    if (bounded !== numeric) {
      corrections.push({
        key: input.key,
        label: input.label,
        from: numeric,
        to: bounded,
        reason: `is outside the supported ${input.min}–${input.max} range`,
      });
    }
  }

  return { values, corrections };
}

// ---------------------------------------------------------------------------
// Map archetype inputs → base DCF variables
// Takes raw archetype input values and returns bounded overrides for
// calculations.js. Use sanitizeArchetypeInputs directly when correction
// messages are also needed.
// ---------------------------------------------------------------------------
export function mapArchetypeInputs(archetypeId, inputValues) {
  const schema = ARCHETYPE_INPUT_MAP[archetypeId];
  if (!schema) return {};

  const { values } = sanitizeArchetypeInputs(archetypeId, inputValues);

  const overrides = {};
  for (const mapping of schema.computedMappings) {
    try {
      const value = mapping.jsMap(values);
      if (value !== undefined && value !== null && !isNaN(value)) {
        overrides[mapping.mapsTo] = value;
      }
    } catch {
      // Skip failed mappings — DCF uses generic defaults as fallback
    }
  }
  return overrides;
}

// ---------------------------------------------------------------------------
// Get default values for an archetype's inputs
// ---------------------------------------------------------------------------
export function getArchetypeInputDefaults(archetypeId) {
  const schema = ARCHETYPE_INPUT_MAP[archetypeId];
  if (!schema) return {};

  const defaults = {};
  for (const input of schema.inputs) {
    defaults[input.key] = input.default;
  }
  return defaults;
}

// ---------------------------------------------------------------------------
// Validate archetype input values against schema constraints
// Returns array of { key, message } for any invalid values
// ---------------------------------------------------------------------------
export function validateArchetypeInputs(archetypeId, inputValues) {
  const schema = ARCHETYPE_INPUT_MAP[archetypeId];
  if (!schema) return [{ key: '_schema', message: `Unknown archetype: ${archetypeId}` }];

  const errors = [];
  for (const input of schema.inputs) {
    const val = inputValues[input.key];
    if (val === undefined || val === null) continue; // use default
    if (typeof val !== 'number' || isNaN(val)) {
      errors.push({ key: input.key, message: `${input.label}: must be a number` });
      continue;
    }
    if (val < input.min) {
      errors.push({ key: input.key, message: `${input.label}: minimum is ${input.min}` });
    }
    if (val > input.max) {
      errors.push({ key: input.key, message: `${input.label}: maximum is ${input.max}` });
    }
  }
  return errors;
}
