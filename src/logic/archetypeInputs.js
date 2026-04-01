// ---------------------------------------------------------------------------
// Archetype-Specific Inputs — Detailed operational inputs for each archetype
// Shared schema used by both Excel spreadsheet and web app.
// Each archetype defines 8 high-impact inputs that refine the base DCF model.
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
// ARCHETYPE INPUT SCHEMAS — 6 archetypes × 8 inputs each
// ---------------------------------------------------------------------------
export const ARCHETYPE_INPUT_SCHEMAS = [
  // =========================================================================
  // 1. Internal Process Automation
  // =========================================================================
  {
    id: 'internal-process-automation',
    // Top 3-5 inputs shown prominently; remaining are collapsible "advanced"
    primaryKeys: ['processVolume', 'handlingTimeMin', 'errorRate', 'pctAutomatable'],
    inputs: [
      numInput('processVolume', 'Process volume (transactions/month)', {
        default: 5000, max: 1000000, note: 'Monthly volume of transactions processed',
      }),
      numInput('handlingTimeMin', 'Avg handling time (minutes)', {
        default: 15, min: 1, max: 480, note: 'Minutes per transaction currently',
      }),
      pctInput('errorRate', 'Current error/rework rate', {
        default: 0.08, note: 'Fraction requiring rework or correction',
      }),
      numInput('costPerError', 'Cost per error ($)', {
        default: 150, max: 50000, format: '$#,##0', note: 'Avg cost to fix one error',
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
      scaleInput('processCriticality', 'Process criticality (1-5)', {
        default: 3, note: '1=Nice-to-have, 5=Mission-critical',
      }),
    ],
    computedMappings: [
      {
        mapsTo: 'automationPotential',
        jsMap: (i) => Math.min(0.85, i.pctAutomatable * (1 - i.humanInLoopPct) * (1 - (i.integrationComplexity - 1) * 0.05)),
        excelFormula: 'MIN(0.85, {pctAutomatable} * (1 - {humanInLoopPct}) * (1 - ({integrationComplexity} - 1) * 0.05))',
      },
      {
        mapsTo: 'errorRate',
        jsMap: (i) => i.errorRate,
        excelFormula: '{errorRate}',
      },
      {
        mapsTo: 'hoursPerWeek',
        jsMap: (i) => Math.round(i.processVolume * i.handlingTimeMin / 60 / 4.33),
        excelFormula: 'ROUND({processVolume} * {handlingTimeMin} / 60 / 4.33, 0)',
      },
    ],
  },

  // =========================================================================
  // 2. Customer-Facing AI
  // =========================================================================
  {
    id: 'customer-facing-ai',
    primaryKeys: ['ticketsPerMonth', 'resolutionTimeMin', 'churnRate', 'revenuePerUser', 'deflectionTarget'],
    inputs: [
      numInput('ticketsPerMonth', 'Support tickets/month', {
        default: 8000, max: 5000000, note: 'Total inbound support volume',
      }),
      numInput('resolutionTimeMin', 'Avg resolution time (minutes)', {
        default: 25, min: 1, max: 480, note: 'Time to resolve a ticket',
      }),
      numInput('csatScore', 'Current CSAT (1-100)', {
        default: 72, min: 1, max: 100, format: '0', note: 'Customer satisfaction score',
      }),
      pctInput('churnRate', 'Annual churn rate', {
        default: 0.12, note: 'Customer attrition rate',
      }),
      numInput('revenuePerUser', 'Revenue per user/month ($)', {
        default: 150, max: 100000, format: '$#,##0', note: 'Monthly ARPU',
      }),
      pctInput('deflectionTarget', 'AI deflection rate target', {
        default: 0.40, note: 'Target % of tickets fully handled by AI',
      }),
      pctInput('responseTimeImprovement', 'Response time improvement %', {
        default: 0.60, note: 'Expected reduction in first-response time',
      }),
      scaleInput('brandRisk', 'Brand risk sensitivity (1-5)', {
        default: 3, note: '1=Low-stakes, 5=High-profile brand',
      }),
    ],
    computedMappings: [
      {
        mapsTo: 'automationPotential',
        jsMap: (i) => Math.min(0.80, i.deflectionTarget * (1 - (i.brandRisk - 1) * 0.05)),
        excelFormula: 'MIN(0.80, {deflectionTarget} * (1 - ({brandRisk} - 1) * 0.05))',
      },
      {
        mapsTo: 'hoursPerWeek',
        jsMap: (i) => Math.round(i.ticketsPerMonth * i.resolutionTimeMin / 60 / 4.33),
        excelFormula: 'ROUND({ticketsPerMonth} * {resolutionTimeMin} / 60 / 4.33, 0)',
      },
      {
        mapsTo: 'revenueImpact',
        jsMap: (i) => Math.round(i.ticketsPerMonth * 12 * i.revenuePerUser * i.churnRate * i.responseTimeImprovement * 0.10),
        excelFormula: 'ROUND({ticketsPerMonth} * 12 * {revenuePerUser} * {churnRate} * {responseTimeImprovement} * 0.10, 0)',
        note: 'Annual churn-reduction revenue from faster resolution',
      },
    ],
  },

  // =========================================================================
  // 3. Data & Analytics Automation
  // =========================================================================
  {
    id: 'data-analytics-automation',
    primaryKeys: ['reportsPerMonth', 'hoursPerReport', 'dataSources', 'manualDataPrepPct'],
    inputs: [
      numInput('reportsPerMonth', 'Reports generated/month', {
        default: 40, max: 10000, note: 'Number of reports produced monthly',
      }),
      numInput('hoursPerReport', 'Hours per report', {
        default: 6, min: 0.5, max: 200, format: '0.0', note: 'Analyst hours to produce one report',
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
      numInput('forecastFrequency', 'Forecast frequency (per month)', {
        default: 4, min: 1, max: 365, format: '0', note: 'How often forecasts are updated',
      }),
      pctInput('analystUtilization', 'Analyst utilization rate', {
        default: 0.85, note: 'Fraction of analyst time on this process',
      }),
      numInput('reportConsumers', 'Report consumers (people)', {
        default: 25, min: 1, max: 100000, format: '0', note: 'Number of stakeholders consuming reports',
      }),
    ],
    computedMappings: [
      {
        mapsTo: 'automationPotential',
        jsMap: (i) => Math.min(0.80, i.manualDataPrepPct * 0.85 + (1 - i.accuracyRate) * 0.5),
        excelFormula: 'MIN(0.80, {manualDataPrepPct} * 0.85 + (1 - {accuracyRate}) * 0.5)',
      },
      {
        mapsTo: 'hoursPerWeek',
        jsMap: (i) => Math.round(i.reportsPerMonth * i.hoursPerReport * i.analystUtilization / 4.33),
        excelFormula: 'ROUND({reportsPerMonth} * {hoursPerReport} * {analystUtilization} / 4.33, 0)',
      },
      {
        mapsTo: 'errorRate',
        jsMap: (i) => 1 - i.accuracyRate,
        excelFormula: '1 - {accuracyRate}',
      },
    ],
  },

  // =========================================================================
  // 4. Revenue & Growth AI
  // =========================================================================
  {
    id: 'revenue-growth-ai',
    primaryKeys: ['pipelineVolume', 'closeRate', 'avgDealSize', 'leadQualRate', 'closeRateImprovementTarget'],
    inputs: [
      numInput('pipelineVolume', 'Monthly pipeline volume ($)', {
        default: 2000000, max: 1000000000, format: '$#,##0', note: 'Total monthly pipeline value',
      }),
      pctInput('closeRate', 'Current close rate', {
        default: 0.22, note: 'Win rate on qualified pipeline',
      }),
      numInput('avgDealSize', 'Average deal size ($)', {
        default: 45000, max: 50000000, format: '$#,##0', note: 'Revenue per closed deal',
      }),
      numInput('marketingSpendMonthly', 'Monthly marketing spend ($)', {
        default: 50000, max: 10000000, format: '$#,##0', note: 'Total monthly marketing budget',
      }),
      pctInput('leadQualRate', 'Lead qualification rate', {
        default: 0.15, note: 'Fraction of leads that become qualified opportunities',
      }),
      pctInput('closeRateImprovementTarget', 'Close rate improvement target', {
        default: 0.15, note: 'Expected % increase in close rate from AI',
      }),
      numInput('cac', 'Customer acquisition cost ($)', {
        default: 8000, max: 500000, format: '$#,##0', note: 'Cost to acquire one customer',
      }),
      numInput('timeToImpactMonths', 'Time to revenue impact (months)', {
        default: 6, min: 1, max: 36, format: '0', note: 'Months before AI drives measurable revenue',
      }),
    ],
    computedMappings: [
      {
        mapsTo: 'automationPotential',
        jsMap: (i) => Math.min(0.70, i.leadQualRate * 2 + i.closeRateImprovementTarget),
        excelFormula: 'MIN(0.70, {leadQualRate} * 2 + {closeRateImprovementTarget})',
      },
      {
        mapsTo: 'revenueImpact',
        jsMap: (i) => Math.round(i.pipelineVolume * 12 * i.closeRate * i.closeRateImprovementTarget),
        excelFormula: 'ROUND({pipelineVolume} * 12 * {closeRate} * {closeRateImprovementTarget}, 0)',
        note: 'Incremental annual revenue from improved close rate',
      },
      {
        mapsTo: 'hoursPerWeek',
        jsMap: (i) => Math.round(i.pipelineVolume / i.avgDealSize * 2 / 4.33),
        excelFormula: 'ROUND({pipelineVolume} / {avgDealSize} * 2 / 4.33, 0)',
        note: 'Estimated hours spent on pipeline management per week',
      },
    ],
  },

  // =========================================================================
  // 5. Risk, Compliance & Legal AI
  // =========================================================================
  {
    id: 'risk-compliance-legal-ai',
    primaryKeys: ['reviewsPerMonth', 'hoursPerReview', 'findingsPerYear', 'fineExposure', 'falsePositiveRate'],
    inputs: [
      numInput('reviewsPerMonth', 'Reviews/audits per month', {
        default: 200, max: 100000, note: 'Monthly compliance review volume',
      }),
      numInput('hoursPerReview', 'Hours per review', {
        default: 4, min: 0.25, max: 100, format: '0.0', note: 'Staff hours per review/audit',
      }),
      numInput('findingsPerYear', 'Annual findings/violations', {
        default: 15, max: 10000, format: '0', note: 'Number of compliance findings per year',
      }),
      numInput('fineExposure', 'Avg fine exposure per finding ($)', {
        default: 250000, max: 100000000, format: '$#,##0', note: 'Potential penalty per finding',
      }),
      pctInput('falsePositiveRate', 'False positive rate', {
        default: 0.30, note: 'Fraction of flagged items that are false alarms',
      }),
      numInput('auditPrepHoursPerYear', 'Audit prep hours/year', {
        default: 800, max: 50000, note: 'Total staff hours for annual audit preparation',
      }),
      numInput('regulatoryBodies', 'Number of regulatory bodies', {
        default: 3, min: 1, max: 50, format: '0', note: 'Distinct regulators with oversight',
      }),
      pctInput('monitoringCoverage', 'Current monitoring coverage', {
        default: 0.65, note: 'Fraction of transactions/activities monitored',
      }),
    ],
    computedMappings: [
      {
        mapsTo: 'automationPotential',
        jsMap: (i) => Math.min(0.75, (1 - i.monitoringCoverage) * 0.5 + i.falsePositiveRate * 0.4 + 0.15),
        excelFormula: 'MIN(0.75, (1 - {monitoringCoverage}) * 0.5 + {falsePositiveRate} * 0.4 + 0.15)',
      },
      {
        mapsTo: 'errorRate',
        jsMap: (i) => i.falsePositiveRate * 0.5,
        excelFormula: '{falsePositiveRate} * 0.5',
        note: 'False positives translate to wasted review effort',
      },
      {
        mapsTo: 'hoursPerWeek',
        jsMap: (i) => Math.round(i.reviewsPerMonth * i.hoursPerReview / 4.33),
        excelFormula: 'ROUND({reviewsPerMonth} * {hoursPerReview} / 4.33, 0)',
      },
      {
        mapsTo: 'riskReduction',
        jsMap: (i) => Math.round(i.findingsPerYear * i.fineExposure * 0.40),
        excelFormula: 'ROUND({findingsPerYear} * {fineExposure} * 0.40, 0)',
        note: 'Estimated annual risk reduction (40% finding prevention)',
      },
    ],
  },

  // =========================================================================
  // 6. Knowledge Management AI
  // =========================================================================
  {
    id: 'knowledge-management-ai',
    primaryKeys: ['searchQueriesPerDay', 'timeToFindMin', 'searchSuccessRate', 'duplicateWorkRate'],
    inputs: [
      numInput('articleCount', 'Knowledge articles', {
        default: 2000, max: 10000000, format: '#,##0', note: 'Total articles/docs in knowledge base',
      }),
      numInput('searchQueriesPerDay', 'Search queries per day', {
        default: 500, max: 1000000, format: '#,##0', note: 'Daily internal search volume',
      }),
      numInput('timeToFindMin', 'Avg time to find info (min)', {
        default: 12, min: 1, max: 120, format: '0', note: 'Minutes to find the right document',
      }),
      numInput('docCreationHoursPerMonth', 'Doc creation hours/month', {
        default: 80, max: 10000, note: 'Monthly hours spent creating/updating docs',
      }),
      pctInput('knowledgeReuseRate', 'Knowledge reuse rate', {
        default: 0.25, note: 'Fraction of knowledge that gets reused vs. recreated',
      }),
      numInput('onboardingTimeDays', 'New hire onboarding (days)', {
        default: 30, min: 1, max: 180, format: '0', note: 'Days for new hire to reach productivity',
      }),
      pctInput('searchSuccessRate', 'Search success rate', {
        default: 0.55, note: 'Fraction of searches that return useful results',
      }),
      pctInput('duplicateWorkRate', 'Duplicate work rate', {
        default: 0.15, note: 'Fraction of work unknowingly duplicated',
      }),
    ],
    computedMappings: [
      {
        mapsTo: 'automationPotential',
        jsMap: (i) => Math.min(0.75, (1 - i.searchSuccessRate) * 0.6 + i.duplicateWorkRate * 1.0 + (1 - i.knowledgeReuseRate) * 0.15),
        excelFormula: 'MIN(0.75, (1 - {searchSuccessRate}) * 0.6 + {duplicateWorkRate} * 1.0 + (1 - {knowledgeReuseRate}) * 0.15)',
      },
      {
        mapsTo: 'hoursPerWeek',
        jsMap: (i) => Math.round(i.searchQueriesPerDay * 5 * i.timeToFindMin / 60 + i.docCreationHoursPerMonth / 4.33),
        excelFormula: 'ROUND({searchQueriesPerDay} * 5 * {timeToFindMin} / 60 + {docCreationHoursPerMonth} / 4.33, 0)',
      },
      {
        mapsTo: 'errorRate',
        jsMap: (i) => i.duplicateWorkRate,
        excelFormula: '{duplicateWorkRate}',
      },
    ],
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
  'revenue-growth-ai':           [3, 4, 3, 3, 1, 3],
  'risk-compliance-legal-ai':    [4, 1, 3, 4, 5, 3],
  'knowledge-management-ai':     [2, 2, 5, 3, 1, 3],
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
// Map archetype inputs → base DCF variables
// Takes raw archetype input values and returns overrides for calculations.js
// ---------------------------------------------------------------------------
export function mapArchetypeInputs(archetypeId, inputValues) {
  const schema = ARCHETYPE_INPUT_MAP[archetypeId];
  if (!schema) return {};

  const overrides = {};
  for (const mapping of schema.computedMappings) {
    try {
      const value = mapping.jsMap(inputValues);
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
