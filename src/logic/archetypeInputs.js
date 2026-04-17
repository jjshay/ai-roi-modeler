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
    primaryKeys: ['processVolume', 'handlingTimeMin', 'costPerError', 'slaComplianceRate', 'cycleTimeDays'],
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
        default: 150, max: 50000, format: '$#,##0', note: 'Fully loaded cost to investigate + fix one error',
      }),
      pctInput('slaComplianceRate', 'SLA compliance rate', {
        default: 0.92, min: 0.50, note: 'Fraction of transactions meeting SLA — misses = penalties + rework',
      }),
      numInput('cycleTimeDays', 'End-to-end cycle time (days)', {
        default: 5, min: 0.5, max: 90, format: '0.0', note: 'Days from request to completion — longer = higher working capital cost',
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
      {
        mapsTo: 'slaPenaltyCost',
        jsMap: (i) => Math.round(i.processVolume * 12 * (1 - i.slaComplianceRate) * i.costPerError),
        excelFormula: 'ROUND({processVolume} * 12 * (1 - {slaComplianceRate}) * {costPerError}, 0)',
        note: 'Annual cost of SLA misses (volume × miss rate × cost per miss)',
      },
    ],
  },

  // =========================================================================
  // 2. Customer-Facing AI
  // =========================================================================
  {
    id: 'customer-facing-ai',
    primaryKeys: ['ticketsPerMonth', 'avgHoldTimeMin', 'costPerContact', 'firstCallResolutionRate', 'churnRate'],
    inputs: [
      numInput('ticketsPerMonth', 'Support tickets/month', {
        default: 8000, max: 5000000, note: 'Total inbound support volume across all channels',
      }),
      numInput('avgHoldTimeMin', 'Avg customer hold time (minutes)', {
        default: 8, min: 0, max: 60, format: '0', note: 'Average wait before reaching an agent — the #1 CX metric CEOs track',
      }),
      numInput('costPerContact', 'Cost per customer contact ($)', {
        default: 12, min: 1, max: 200, format: '$#,##0', note: 'Fully loaded cost per interaction (labor + systems + overhead)',
      }),
      pctInput('firstCallResolutionRate', 'First call resolution rate', {
        default: 0.68, min: 0.20, note: 'Fraction resolved on first contact — low FCR = repeat contacts at 2x cost',
      }),
      numInput('resolutionTimeMin', 'Avg resolution time (minutes)', {
        default: 25, min: 1, max: 480, note: 'Time to resolve a ticket end-to-end',
      }),
      pctInput('churnRate', 'Annual churn rate', {
        default: 0.12, note: 'Customer attrition rate — poor CX is the #1 driver',
      }),
      numInput('revenuePerUser', 'Revenue per user/month ($)', {
        default: 150, max: 100000, format: '$#,##0', note: 'Monthly ARPU — used to quantify churn-reduction revenue',
      }),
      pctInput('deflectionTarget', 'AI deflection rate target', {
        default: 0.40, note: 'Target % of tickets fully handled by AI without human escalation',
      }),
      pctInput('responseTimeImprovement', 'Response time improvement %', {
        default: 0.60, note: 'Expected reduction in first-response time from AI',
      }),
      scaleInput('brandRisk', 'Brand risk sensitivity (1-5)', {
        default: 3, note: '1=Low-stakes internal, 5=Premium consumer brand',
      }),
      pctInput('aiAttributionPct', 'AI attribution share', {
        default: 0.40, min: 0.10, max: 0.80, note: 'What % of improvement is attributable to AI vs. team quality, product, pricing? Conservative = 25%, moderate = 40%',
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
        jsMap: (i) => Math.round(i.ticketsPerMonth * 12 * i.revenuePerUser * i.churnRate * i.responseTimeImprovement * 0.10 * i.aiAttributionPct),
        excelFormula: 'ROUND({ticketsPerMonth} * 12 * {revenuePerUser} * {churnRate} * {responseTimeImprovement} * 0.10 * {aiAttributionPct}, 0)',
        note: 'Annual churn-reduction revenue (discounted by AI attribution share)',
      },
      {
        mapsTo: 'repeatContactCost',
        jsMap: (i) => Math.round(i.ticketsPerMonth * 12 * (1 - i.firstCallResolutionRate) * i.costPerContact * i.aiAttributionPct),
        excelFormula: 'ROUND({ticketsPerMonth} * 12 * (1 - {firstCallResolutionRate}) * {costPerContact} * {aiAttributionPct}, 0)',
        note: 'Annual repeat contact savings (discounted by AI attribution share)',
      },
    ],
  },

  // =========================================================================
  // 3. Data & Analytics Automation
  // =========================================================================
  {
    id: 'data-analytics-automation',
    primaryKeys: ['reportsPerMonth', 'hoursPerReport', 'daysToCloseBooks', 'forecastAccuracyPct', 'manualDataPrepPct'],
    inputs: [
      numInput('reportsPerMonth', 'Reports generated/month', {
        default: 40, max: 10000, note: 'Number of reports produced monthly',
      }),
      numInput('hoursPerReport', 'Hours per report', {
        default: 6, min: 0.5, max: 200, format: '0.0', note: 'Analyst hours to produce one report',
      }),
      numInput('daysToCloseBooks', 'Days to close the books', {
        default: 10, min: 1, max: 45, format: '0', note: 'Calendar days for monthly/quarterly financial close — the CFO\'s #1 metric',
      }),
      pctInput('forecastAccuracyPct', 'Forecast accuracy', {
        default: 0.75, min: 0.30, note: 'How close forecasts are to actuals — poor accuracy = bad capital allocation decisions',
      }),
      numInput('dataSources', 'Number of data sources', {
        default: 8, min: 1, max: 500, format: '0', note: 'Distinct data feeds/systems requiring integration',
      }),
      pctInput('accuracyRate', 'Report accuracy rate', {
        default: 0.92, min: 0.50, note: 'Fraction of reports without material errors',
      }),
      pctInput('manualDataPrepPct', 'Manual data prep %', {
        default: 0.55, note: 'Fraction of analyst time on data wrangling vs. actual analysis',
      }),
      numInput('forecastFrequency', 'Forecast frequency (per month)', {
        default: 4, min: 1, max: 365, format: '0', note: 'How often forecasts are updated',
      }),
      pctInput('analystUtilization', 'Analyst utilization rate', {
        default: 0.85, note: 'Fraction of analyst time on this process',
      }),
      numInput('reportConsumers', 'Report consumers (people)', {
        default: 25, min: 1, max: 100000, format: '0', note: 'Stakeholders waiting for these reports to make decisions',
      }),
      numInput('annualDecisionBudget', 'Annual budget influenced by these reports ($)', {
        default: 5000000, max: 1000000000, format: '$#,##0', note: 'Total annual spend that depends on this data (capex + opex decisions informed by these reports)',
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
      {
        mapsTo: 'closeTimeSavings',
        jsMap: (i) => Math.round(i.daysToCloseBooks * 0.50 * i.reportConsumers * 8 * 75),
        excelFormula: 'ROUND({daysToCloseBooks} * 0.50 * {reportConsumers} * 8 * 75, 0)',
        note: 'Annual value of halving close cycle (days saved × stakeholders × hrs/day × avg hourly rate)',
      },
      {
        mapsTo: 'decisionQualityValue',
        jsMap: (i) => Math.round(i.annualDecisionBudget * (1 - i.forecastAccuracyPct) * 0.05),
        excelFormula: 'ROUND({annualDecisionBudget} * (1 - {forecastAccuracyPct}) * 0.05, 0)',
        note: 'Value of better decisions: 5% of mis-allocated budget recovered through improved forecast accuracy',
      },
    ],
  },

  // =========================================================================
  // 4. Revenue & Growth AI
  // =========================================================================
  {
    id: 'revenue-growth-ai',
    primaryKeys: ['pipelineVolume', 'salesCycleDays', 'closeRate', 'leadResponseTimeHrs', 'avgDealSize'],
    inputs: [
      numInput('pipelineVolume', 'Monthly pipeline volume ($)', {
        default: 2000000, max: 1000000000, format: '$#,##0', note: 'Total monthly pipeline value across all stages',
      }),
      numInput('salesCycleDays', 'Average sales cycle (days)', {
        default: 45, min: 5, max: 365, format: '0', note: 'Days from qualified lead to closed deal — AI compresses this 20-40%',
      }),
      pctInput('closeRate', 'Current close rate', {
        default: 0.22, note: 'Win rate on qualified pipeline',
      }),
      numInput('leadResponseTimeHrs', 'Lead response time (hours)', {
        default: 24, min: 0.5, max: 168, format: '0.0', note: 'Hours to first meaningful response — Harvard: 5 min vs 30 min = 100x conversion difference',
      }),
      numInput('avgDealSize', 'Average deal size ($)', {
        default: 45000, max: 50000000, format: '$#,##0', note: 'Revenue per closed deal',
      }),
      numInput('marketingSpendMonthly', 'Monthly marketing spend ($)', {
        default: 50000, max: 10000000, format: '$#,##0', note: 'Total monthly marketing budget',
      }),
      pctInput('leadQualRate', 'Lead qualification rate', {
        default: 0.15, note: 'Fraction of raw leads that become qualified opportunities',
      }),
      pctInput('closeRateImprovementTarget', 'Close rate improvement target', {
        default: 0.15, note: 'Expected % increase in close rate from AI',
      }),
      numInput('cac', 'Customer acquisition cost ($)', {
        default: 8000, max: 500000, format: '$#,##0', note: 'Cost to acquire one customer (marketing + sales)',
      }),
      numInput('timeToImpactMonths', 'Time to revenue impact (months)', {
        default: 6, min: 1, max: 36, format: '0', note: 'Months before AI drives measurable revenue',
      }),
      pctInput('aiAttributionPct', 'AI attribution share', {
        default: 0.35, min: 0.10, max: 0.80, note: 'What % of revenue improvement is AI vs. rep quality, product, pricing? Be conservative.',
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
        jsMap: (i) => Math.round(i.pipelineVolume * 12 * i.closeRate * i.closeRateImprovementTarget * i.aiAttributionPct),
        excelFormula: 'ROUND({pipelineVolume} * 12 * {closeRate} * {closeRateImprovementTarget} * {aiAttributionPct}, 0)',
        note: 'Incremental annual revenue (discounted by AI attribution share)',
      },
      {
        mapsTo: 'hoursPerWeek',
        jsMap: (i) => Math.round(i.pipelineVolume / i.avgDealSize * 2 / 4.33),
        excelFormula: 'ROUND({pipelineVolume} / {avgDealSize} * 2 / 4.33, 0)',
        note: 'Estimated hours spent on pipeline management per week',
      },
      {
        mapsTo: 'cycleCompressionRevenue',
        jsMap: (i) => Math.round(i.pipelineVolume * 12 * i.closeRate * 0.30 * (i.salesCycleDays > 30 ? 0.15 : 0.05) * i.aiAttributionPct),
        excelFormula: 'ROUND({pipelineVolume} * 12 * {closeRate} * 0.30 * IF({salesCycleDays} > 30, 0.15, 0.05) * {aiAttributionPct}, 0)',
        note: 'Revenue from faster deal velocity (30% cycle compression × pipeline)',
      },
    ],
  },

  // =========================================================================
  // 5. Risk, Compliance & Legal AI
  // =========================================================================
  {
    id: 'risk-compliance-legal-ai',
    primaryKeys: ['findingsPerYear', 'fineExposure', 'remediationCostPerFinding', 'regulatoryResponseDays', 'falsePositiveRate'],
    inputs: [
      numInput('reviewsPerMonth', 'Reviews/audits per month', {
        default: 200, max: 100000, note: 'Monthly compliance review volume',
      }),
      numInput('hoursPerReview', 'Hours per review', {
        default: 4, min: 0.25, max: 100, format: '0.0', note: 'Staff hours per review/audit',
      }),
      numInput('findingsPerYear', 'Annual findings/violations', {
        default: 15, max: 10000, format: '0', note: 'Number of compliance findings reported to the board annually',
      }),
      numInput('fineExposure', 'Avg fine exposure per finding ($)', {
        default: 250000, max: 100000000, format: '$#,##0', note: 'Potential regulatory penalty per finding — the number the GC reports',
      }),
      numInput('remediationCostPerFinding', 'Remediation cost per finding ($)', {
        default: 75000, max: 10000000, format: '$#,##0', note: 'Internal cost to investigate + fix + document each finding (labor + external counsel)',
      }),
      numInput('regulatoryResponseDays', 'Regulatory response time (days)', {
        default: 14, min: 1, max: 180, format: '0', note: 'Days to respond to a regulatory inquiry — faster = lower penalty risk',
      }),
      pctInput('falsePositiveRate', 'False positive rate', {
        default: 0.30, note: 'Fraction of flagged items that are false alarms — each costs hours to investigate',
      }),
      numInput('auditPrepHoursPerYear', 'Audit prep hours/year', {
        default: 800, max: 50000, note: 'Total staff hours for annual audit preparation',
      }),
      numInput('regulatoryBodies', 'Number of regulatory bodies', {
        default: 3, min: 1, max: 50, format: '0', note: 'Distinct regulators with oversight',
      }),
      pctInput('monitoringCoverage', 'Current monitoring coverage', {
        default: 0.65, note: 'Fraction of transactions/activities currently monitored',
      }),
      pctInput('falseNegativeRate', 'Estimated false negative rate', {
        default: 0.05, min: 0.01, max: 0.30, note: 'Fraction of real violations AI might miss — even 2% × $250K avg fine = significant tail risk',
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
      {
        mapsTo: 'remediationSavings',
        jsMap: (i) => Math.round(i.findingsPerYear * i.remediationCostPerFinding * 0.40),
        excelFormula: 'ROUND({findingsPerYear} * {remediationCostPerFinding} * 0.40, 0)',
        note: 'Annual remediation cost savings from 40% fewer findings',
      },
      {
        mapsTo: 'falseNegativeRiskCost',
        jsMap: (i) => Math.round(i.findingsPerYear * i.falseNegativeRate * i.fineExposure * -1),
        excelFormula: 'ROUND({findingsPerYear} * {falseNegativeRate} * {fineExposure} * -1, 0)',
        note: 'Annual expected loss from AI-missed violations (negative = cost offset against savings)',
      },
    ],
  },

  // =========================================================================
  // 6. Knowledge Management AI
  // =========================================================================
  {
    id: 'knowledge-management-ai',
    primaryKeys: ['newHireRampDays', 'newHiresPerYear', 'repeatTicketRate', 'searchSuccessRate', 'duplicateWorkRate'],
    inputs: [
      numInput('newHireRampDays', 'New hire time-to-productivity (days)', {
        default: 45, min: 5, max: 180, format: '0', note: 'Days before a new hire is fully productive — AI knowledge bases cut this 30-50%',
      }),
      numInput('newHiresPerYear', 'New hires per year', {
        default: 20, min: 1, max: 10000, format: '0', note: 'Annual hiring volume — each hire\'s ramp time is a quantifiable cost',
      }),
      pctInput('repeatTicketRate', 'Repeat/redundant ticket rate', {
        default: 0.20, min: 0, note: 'Fraction of support tickets that are repeat questions with known answers',
      }),
      numInput('searchQueriesPerDay', 'Search queries per day', {
        default: 500, max: 1000000, format: '#,##0', note: 'Daily internal search volume',
      }),
      numInput('timeToFindMin', 'Avg time to find info (min)', {
        default: 12, min: 1, max: 120, format: '0', note: 'Minutes to find the right document',
      }),
      numInput('articleCount', 'Knowledge articles', {
        default: 2000, max: 10000000, format: '#,##0', note: 'Total articles/docs in knowledge base',
      }),
      numInput('docCreationHoursPerMonth', 'Doc creation hours/month', {
        default: 80, max: 10000, note: 'Monthly hours spent creating/updating docs',
      }),
      pctInput('knowledgeReuseRate', 'Knowledge reuse rate', {
        default: 0.25, note: 'Fraction of knowledge that gets reused vs. recreated',
      }),
      pctInput('searchSuccessRate', 'Search success rate', {
        default: 0.55, note: 'Fraction of searches that return useful results',
      }),
      pctInput('duplicateWorkRate', 'Duplicate work rate', {
        default: 0.15, note: 'Fraction of work unknowingly duplicated across the org',
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
      {
        mapsTo: 'onboardingSavings',
        jsMap: (i) => Math.round(i.newHiresPerYear * i.newHireRampDays * 0.40 * 8 * 65),
        excelFormula: 'ROUND({newHiresPerYear} * {newHireRampDays} * 0.40 * 8 * 65, 0)',
        note: 'Annual savings from 40% faster onboarding (hires × days saved × hrs/day × avg rate)',
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
