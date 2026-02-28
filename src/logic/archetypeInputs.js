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
// ARCHETYPE INPUT SCHEMAS — 12 archetypes × 8 inputs each
// ---------------------------------------------------------------------------
export const ARCHETYPE_INPUT_SCHEMAS = [
  // =========================================================================
  // 1. Internal Process Automation
  // =========================================================================
  {
    id: 'internal-process-automation',
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
  // 5. Risk & Compliance AI
  // =========================================================================
  {
    id: 'risk-compliance-ai',
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
  // 6. Software & Engineering AI
  // =========================================================================
  {
    id: 'software-engineering-ai',
    inputs: [
      numInput('prsPerWeek', 'Pull requests per week', {
        default: 40, max: 5000, format: '0', note: 'Team-wide PRs merged weekly',
      }),
      numInput('reviewTimeHours', 'Avg review time (hours)', {
        default: 2, min: 0.25, max: 40, format: '0.0', note: 'Hours per code review',
      }),
      pctInput('bugRate', 'Bug escape rate', {
        default: 0.08, note: 'Fraction of releases with production bugs',
      }),
      pctInput('testCoverage', 'Current test coverage', {
        default: 0.65, note: 'Automated test coverage percentage',
      }),
      numInput('deployFrequency', 'Deployments per week', {
        default: 3, min: 0.1, max: 100, format: '0.0', note: 'DORA deployment frequency',
      }),
      pctInput('codeAssistTarget', 'Code assist adoption target', {
        default: 0.70, note: 'Target % of devs using AI coding tools',
      }),
      numInput('techDebtHoursPerSprint', 'Tech debt hours/sprint', {
        default: 20, max: 500, note: 'Sprint hours spent on tech debt',
      }),
      numInput('releaseCycleDays', 'Release cycle (days)', {
        default: 14, min: 1, max: 180, format: '0', note: 'Days between releases',
      }),
    ],
    computedMappings: [
      {
        mapsTo: 'automationPotential',
        jsMap: (i) => Math.min(0.75, i.codeAssistTarget * 0.6 + (1 - i.testCoverage) * 0.3),
        excelFormula: 'MIN(0.75, {codeAssistTarget} * 0.6 + (1 - {testCoverage}) * 0.3)',
      },
      {
        mapsTo: 'errorRate',
        jsMap: (i) => i.bugRate,
        excelFormula: '{bugRate}',
      },
      {
        mapsTo: 'hoursPerWeek',
        jsMap: (i) => Math.round(i.prsPerWeek * i.reviewTimeHours + i.techDebtHoursPerSprint / 2),
        excelFormula: 'ROUND({prsPerWeek} * {reviewTimeHours} + {techDebtHoursPerSprint} / 2, 0)',
      },
    ],
  },

  // =========================================================================
  // 7. HR & Talent AI
  // =========================================================================
  {
    id: 'hr-talent-ai',
    inputs: [
      numInput('hiresPerYear', 'Hires per year', {
        default: 150, max: 100000, format: '0', note: 'Annual new hires',
      }),
      numInput('timeToFillDays', 'Time-to-fill (days)', {
        default: 45, min: 1, max: 365, format: '0', note: 'Average days to fill a position',
      }),
      numInput('appsPerRole', 'Applications per role', {
        default: 200, max: 10000, format: '0', note: 'Applications received per open position',
      }),
      numInput('screeningHoursPerRole', 'Screening hours per role', {
        default: 12, min: 1, max: 200, format: '0', note: 'HR hours to screen candidates per role',
      }),
      numInput('onboardingHours', 'Onboarding hours per hire', {
        default: 40, max: 500, note: 'Total hours for onboarding process',
      }),
      pctInput('turnoverRate', 'Annual turnover rate', {
        default: 0.18, note: 'Voluntary + involuntary turnover',
      }),
      numInput('costPerHire', 'Cost per hire ($)', {
        default: 5000, max: 100000, format: '$#,##0', note: 'Direct recruiting cost per hire',
      }),
      pctInput('internalMobilityRate', 'Internal mobility rate', {
        default: 0.15, note: 'Fraction of roles filled internally',
      }),
    ],
    computedMappings: [
      {
        mapsTo: 'automationPotential',
        jsMap: (i) => Math.min(0.70, 0.30 + (i.appsPerRole / 500) * 0.2 + (1 - i.internalMobilityRate) * 0.15),
        excelFormula: 'MIN(0.70, 0.30 + ({appsPerRole} / 500) * 0.2 + (1 - {internalMobilityRate}) * 0.15)',
      },
      {
        mapsTo: 'hoursPerWeek',
        jsMap: (i) => Math.round((i.hiresPerYear * (i.screeningHoursPerRole + i.onboardingHours)) / 52),
        excelFormula: 'ROUND(({hiresPerYear} * ({screeningHoursPerRole} + {onboardingHours})) / 52, 0)',
      },
      {
        mapsTo: 'errorRate',
        jsMap: (i) => Math.min(0.30, i.turnoverRate * 0.5),
        excelFormula: 'MIN(0.30, {turnoverRate} * 0.5)',
        note: 'High turnover suggests poor hiring quality',
      },
    ],
  },

  // =========================================================================
  // 8. Supply Chain & Logistics AI
  // =========================================================================
  {
    id: 'supply-chain-ai',
    inputs: [
      numInput('skuCount', 'Active SKUs', {
        default: 5000, max: 10000000, format: '#,##0', note: 'Number of active products/SKUs',
      }),
      pctInput('forecastAccuracy', 'Current forecast accuracy', {
        default: 0.72, min: 0.20, note: 'MAPE-based accuracy rate',
      }),
      pctInput('stockoutRate', 'Stockout rate', {
        default: 0.05, note: 'Fraction of orders affected by stockouts',
      }),
      numInput('avgLeadTimeDays', 'Avg lead time (days)', {
        default: 21, min: 1, max: 365, format: '0', note: 'Average supplier lead time',
      }),
      pctInput('demandVariability', 'Demand variability (CV)', {
        default: 0.35, min: 0.05, max: 2.0, note: 'Coefficient of variation of demand',
      }),
      numInput('supplierCount', 'Active suppliers', {
        default: 120, max: 100000, format: '0', note: 'Number of active suppliers',
      }),
      numInput('warehouseCostMonthly', 'Warehouse cost/month ($)', {
        default: 150000, max: 50000000, format: '$#,##0', note: 'Monthly warehousing/logistics cost',
      }),
      pctInput('onTimeDelivery', 'On-time delivery %', {
        default: 0.88, min: 0.50, note: 'Fraction of orders delivered on time',
      }),
    ],
    computedMappings: [
      {
        mapsTo: 'automationPotential',
        jsMap: (i) => Math.min(0.70, (1 - i.forecastAccuracy) * 1.5 + i.stockoutRate * 2),
        excelFormula: 'MIN(0.70, (1 - {forecastAccuracy}) * 1.5 + {stockoutRate} * 2)',
      },
      {
        mapsTo: 'errorRate',
        jsMap: (i) => i.stockoutRate + (1 - i.onTimeDelivery) * 0.5,
        excelFormula: '{stockoutRate} + (1 - {onTimeDelivery}) * 0.5',
      },
      {
        mapsTo: 'hoursPerWeek',
        jsMap: (i) => Math.round(i.skuCount * 0.02 + i.supplierCount * 0.5),
        excelFormula: 'ROUND({skuCount} * 0.02 + {supplierCount} * 0.5, 0)',
        note: 'Estimated weekly planning/coordination hours',
      },
      {
        mapsTo: 'revenueImpact',
        jsMap: (i) => Math.round(i.warehouseCostMonthly * 12 * i.stockoutRate * 3),
        excelFormula: 'ROUND({warehouseCostMonthly} * 12 * {stockoutRate} * 3, 0)',
        note: 'Annual lost revenue from stockouts (3x carrying cost)',
      },
    ],
  },

  // =========================================================================
  // 9. Knowledge Management AI
  // =========================================================================
  {
    id: 'knowledge-management-ai',
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

  // =========================================================================
  // 10. Finance & Accounting AI
  // =========================================================================
  {
    id: 'finance-accounting-ai',
    inputs: [
      numInput('invoicesPerMonth', 'Invoices per month', {
        default: 3000, max: 5000000, note: 'AP + AR invoices processed monthly',
      }),
      numInput('reconciliationItems', 'Reconciliation items/month', {
        default: 1500, max: 1000000, note: 'Monthly line items requiring reconciliation',
      }),
      numInput('closeCycleDays', 'Close cycle (days)', {
        default: 12, min: 1, max: 60, format: '0', note: 'Days to complete monthly/quarterly close',
      }),
      pctInput('errorRateFinance', 'Transaction error rate', {
        default: 0.04, note: 'Fraction of transactions with errors',
      }),
      numInput('manualJournalsPerMonth', 'Manual journal entries/month', {
        default: 200, max: 50000, format: '0', note: 'Number of manual journal entries',
      }),
      numInput('apArAgingDays', 'AP/AR aging (days)', {
        default: 45, min: 1, max: 180, format: '0', note: 'Average days outstanding',
      }),
      numInput('auditPrepHours', 'Audit prep hours/year', {
        default: 600, max: 20000, note: 'Staff hours for annual audit preparation',
      }),
      pctInput('exceptionRate', 'Exception/escalation rate', {
        default: 0.12, note: 'Fraction of transactions requiring manual exception handling',
      }),
    ],
    computedMappings: [
      {
        mapsTo: 'automationPotential',
        jsMap: (i) => Math.min(0.75, 0.25 + i.exceptionRate * 1.5 + i.errorRateFinance * 2),
        excelFormula: 'MIN(0.75, 0.25 + {exceptionRate} * 1.5 + {errorRateFinance} * 2)',
      },
      {
        mapsTo: 'errorRate',
        jsMap: (i) => i.errorRateFinance,
        excelFormula: '{errorRateFinance}',
      },
      {
        mapsTo: 'hoursPerWeek',
        jsMap: (i) => Math.round((i.invoicesPerMonth * 0.1 + i.reconciliationItems * 0.15 + i.manualJournalsPerMonth * 0.25) / 4.33),
        excelFormula: 'ROUND(({invoicesPerMonth} * 0.1 + {reconciliationItems} * 0.15 + {manualJournalsPerMonth} * 0.25) / 4.33, 0)',
      },
    ],
  },

  // =========================================================================
  // 11. Legal & Contract AI
  // =========================================================================
  {
    id: 'legal-contract-ai',
    inputs: [
      numInput('contractsPerMonth', 'Contracts per month', {
        default: 80, max: 50000, format: '0', note: 'Monthly contract volume (new + amendments)',
      }),
      numInput('hoursPerContract', 'Hours per contract', {
        default: 6, min: 0.5, max: 100, format: '0.0', note: 'Attorney/paralegal hours per contract',
      }),
      numInput('clauseTypes', 'Unique clause types tracked', {
        default: 25, min: 5, max: 500, format: '0', note: 'Clause taxonomy size',
      }),
      pctInput('amendmentRate', 'Amendment/redline rate', {
        default: 0.35, note: 'Fraction of contracts requiring amendments',
      }),
      numInput('outsideCounselSpend', 'Annual outside counsel spend ($)', {
        default: 500000, max: 100000000, format: '$#,##0', note: 'Annual external legal spend',
      }),
      pctInput('renewalLeakage', 'Renewal leakage %', {
        default: 0.08, note: 'Revenue lost from missed renewals/unfavorable auto-renewals',
      }),
      numInput('approvalChainSteps', 'Approval chain steps', {
        default: 4, min: 1, max: 20, format: '0', note: 'Number of approval steps per contract',
      }),
      numInput('riskClausesPerContract', 'Risk clauses per contract', {
        default: 6, min: 0, max: 100, format: '0', note: 'Avg high-risk clauses requiring review',
      }),
    ],
    computedMappings: [
      {
        mapsTo: 'automationPotential',
        jsMap: (i) => Math.min(0.70, 0.20 + i.amendmentRate * 0.5 + (i.riskClausesPerContract / 20) * 0.3),
        excelFormula: 'MIN(0.70, 0.20 + {amendmentRate} * 0.5 + ({riskClausesPerContract} / 20) * 0.3)',
      },
      {
        mapsTo: 'hoursPerWeek',
        jsMap: (i) => Math.round(i.contractsPerMonth * i.hoursPerContract / 4.33),
        excelFormula: 'ROUND({contractsPerMonth} * {hoursPerContract} / 4.33, 0)',
      },
      {
        mapsTo: 'toolReplacementRate',
        jsMap: (i) => Math.min(0.60, i.outsideCounselSpend > 200000 ? 0.30 : 0.15),
        excelFormula: 'MIN(0.60, IF({outsideCounselSpend} > 200000, 0.30, 0.15))',
        note: 'Outside counsel replaced by AI contract review',
      },
    ],
  },

  // =========================================================================
  // 12. IT Operations & AIOps
  // =========================================================================
  {
    id: 'it-operations-aiops',
    inputs: [
      numInput('incidentsPerMonth', 'Incidents per month', {
        default: 400, max: 100000, format: '0', note: 'Total IT incidents/alerts per month',
      }),
      numInput('mttrMinutes', 'MTTR (minutes)', {
        default: 45, min: 1, max: 1440, format: '0', note: 'Mean time to resolve in minutes',
      }),
      numInput('changeRequestsPerMonth', 'Change requests/month', {
        default: 150, max: 50000, format: '0', note: 'Monthly change/deployment requests',
      }),
      numInput('falseAlertsPerDay', 'False alerts per day', {
        default: 30, max: 10000, format: '0', note: 'Daily false positive alerts',
      }),
      numInput('infraNodes', 'Infrastructure nodes', {
        default: 500, max: 1000000, format: '#,##0', note: 'Servers, containers, endpoints managed',
      }),
      pctInput('uptimeTarget', 'Uptime target %', {
        default: 0.999, min: 0.90, max: 0.99999, format: '0.000%', note: 'SLA uptime target',
      }),
      pctInput('automatedRemediationPct', 'Auto-remediation %', {
        default: 0.15, note: 'Fraction of incidents auto-remediated today',
      }),
      numInput('alertToTicketRatio', 'Alert-to-ticket ratio', {
        default: 5, min: 1, max: 100, format: '0.0', note: 'Alerts generated per actionable ticket',
      }),
    ],
    computedMappings: [
      {
        mapsTo: 'automationPotential',
        jsMap: (i) => Math.min(0.80, (1 - i.automatedRemediationPct) * 0.5 + (1 - 1 / i.alertToTicketRatio) * 0.3),
        excelFormula: 'MIN(0.80, (1 - {automatedRemediationPct}) * 0.5 + (1 - 1 / {alertToTicketRatio}) * 0.3)',
      },
      {
        mapsTo: 'errorRate',
        jsMap: (i) => Math.min(0.40, i.falseAlertsPerDay / (i.incidentsPerMonth / 30 + i.falseAlertsPerDay)),
        excelFormula: 'MIN(0.40, {falseAlertsPerDay} / ({incidentsPerMonth} / 30 + {falseAlertsPerDay}))',
      },
      {
        mapsTo: 'hoursPerWeek',
        jsMap: (i) => Math.round(i.incidentsPerMonth * i.mttrMinutes / 60 / 4.33 + i.changeRequestsPerMonth * 0.5 / 4.33),
        excelFormula: 'ROUND({incidentsPerMonth} * {mttrMinutes} / 60 / 4.33 + {changeRequestsPerMonth} * 0.5 / 4.33, 0)',
      },
      {
        mapsTo: 'riskReduction',
        jsMap: (i) => {
          const downtimeHoursPerYear = (1 - i.uptimeTarget) * 8760;
          const costPerHour = i.infraNodes * 50;
          return Math.round(downtimeHoursPerYear * costPerHour * 0.40);
        },
        excelFormula: 'ROUND((1 - {uptimeTarget}) * 8760 * {infraNodes} * 50 * 0.40, 0)',
        note: 'Risk reduction from improved MTTR and auto-remediation',
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
  'risk-compliance-ai':          [4, 1, 3, 4, 5, 3],
  'software-engineering-ai':     [5, 1, 4, 3, 1, 5],
  'hr-talent-ai':                [1, 2, 2, 3, 3, 2],
  'supply-chain-ai':             [1, 2, 4, 5, 2, 3],
  'knowledge-management-ai':     [2, 2, 5, 3, 1, 3],
  'finance-accounting-ai':       [1, 1, 3, 5, 4, 2],
  'legal-contract-ai':           [4, 2, 4, 3, 5, 3],
  'it-operations-aiops':         [5, 1, 4, 5, 2, 5],
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
