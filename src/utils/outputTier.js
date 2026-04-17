/**
 * Output Tier Utility
 * Maps user role → output tier and controls section visibility across the app.
 */

const ROLE_TIER_MAP = {
  'CEO / President':              'executive',
  'Board Member / Advisor':       'executive',
  'COO / Chief of Staff':         'executive',
  'CFO / Finance Executive':      'financial',
  'CTO / CIO':                    'financial',
  'VP / SVP':                     'financial',
  'Director':                     'financial',
  'Head of Department':           'financial',
  'Finance / FP&A Team':          'detailed',
  'Manager':                      'detailed',
  'Analyst / IC':                 'detailed',
  'Other':                        'detailed',
  // Legacy fallback
  'C-Suite (CEO, CFO, COO, CTO, CIO)': 'financial',
};

/**
 * Get the output tier. Always returns 'financial' — role-based tiers removed.
 */
export function getOutputTier(_role) {
  return 'financial';
}

/**
 * Section visibility rules per tier.
 * true = visible, false = hidden.
 */
export const TIER_SECTIONS = {
  executive: {
    heroVerdict:          true,
    scenarioToggle:       true,
    executiveScorecard:   true,
    yearByYear:           'totals-only',  // special: only show totals row
    topLevers:            1,              // show only top 1
    keyAssumptions:       false,
    whatWouldMakeItWork:  true,
    ctaButtons:           true,
    financialDetail:      false,
    investmentOverview:   false,
    sensitivityAnalysis:  false,
    monteCarloAnalysis:   false,
    quickFacts:           false,
    valueCreationPathways: false,
    capitalEfficiency:    false,
    peerComparison:       true,
    aiMaturityPremium:    false,
    phasedDeploymentGates: false,
    workforceAlternatives: false,
    breakEvenUnits:       false,
    consultingAssumptions: false,
    // V6: C-suite decision tools
    quarterlyCashFlow:    true,
    riskRegister:         true,
    boardActions:         true,
    actualsTracker:       true,
    unitEconomics:        true,
  },
  financial: {
    heroVerdict:          true,
    scenarioToggle:       true,
    executiveScorecard:   true,
    yearByYear:           true,
    topLevers:            3,
    keyAssumptions:       true,
    whatWouldMakeItWork:  true,
    ctaButtons:           true,
    financialDetail:      true,
    investmentOverview:   true,
    sensitivityAnalysis:  true,
    monteCarloAnalysis:   true,
    quickFacts:           false,
    valueCreationPathways: true,
    capitalEfficiency:    true,
    peerComparison:       true,
    aiMaturityPremium:    false,
    phasedDeploymentGates: false,
    workforceAlternatives: true,
    breakEvenUnits:       false,
    consultingAssumptions: false,
    // V6: C-suite decision tools
    quarterlyCashFlow:    true,
    riskRegister:         true,
    boardActions:         true,
  },
  detailed: {
    heroVerdict:          true,
    scenarioToggle:       true,
    executiveScorecard:   true,
    yearByYear:           true,
    topLevers:            3,
    keyAssumptions:       true,
    whatWouldMakeItWork:  true,
    ctaButtons:           true,
    financialDetail:      true,
    investmentOverview:   true,
    sensitivityAnalysis:  true,
    monteCarloAnalysis:   true,
    quickFacts:           false,
    valueCreationPathways: true,
    capitalEfficiency:    true,
    peerComparison:       true,
    aiMaturityPremium:    false,
    phasedDeploymentGates: true,
    workforceAlternatives: true,
    breakEvenUnits:       true,
    consultingAssumptions: true,
    // V6: C-suite decision tools
    quarterlyCashFlow:    true,
    riskRegister:         true,
    boardActions:         true,
  },
};

/**
 * Check if a section should be visible for a given tier.
 * Returns the section value (true, false, number, or string).
 */
export function tierShows(tier, section) {
  const t = TIER_SECTIONS[tier] || TIER_SECTIONS.detailed;
  const val = t[section];
  // For boolean checks: anything truthy except explicit false
  return val !== undefined ? val : true;
}

/**
 * Sections that should auto-expand (defaultOpen=true) per tier.
 */
export const AUTO_EXPAND = {
  executive: [],
  financial: ['financialDetail', 'investmentOverview', 'sensitivityAnalysis'],
  detailed:  [],
};

/**
 * PDF page inclusion by tier.
 */
export const PDF_PAGES = {
  // Executive deck: 5-7 pages, BCG-quality, answer-first
  executive: [
    'executiveSummary',          // P1: Verdict + ROIC + NPV + Top 3 Levers
    'scenarioProjections',       // P2: 3 scenarios + 5-year cash flow table
    'recommendations',           // P3: Next steps + risk mitigations
  ],
  // Financial deck: 5-7 pages, CFO-ready
  financial: [
    'executiveSummary',          // P1: Verdict + ROIC + key metrics
    'investmentAnalysis',        // P2: What it costs + hidden costs
    'scenarioProjections',       // P3: 3 scenarios + cash flows
    'sensitivityAnalysis',       // P4: What moves the needle
    'recommendations',           // P5: Next steps
    'opportunityCost',           // P6: Cost of inaction
    'inputAssumptions',          // P7: Assumptions + sources
  ],
  detailed: [
    'executiveSummary',
    'tableOfContents',
    'currentState',
    'valueBreakdown',
    'valuePathways',
    'capitalEfficiencyGates',
    'investmentAnalysis',
    'scenarioProjections',
    'riskAssessment',
    'sensitivityAnalysis',
    'extendedSensitivity',
    'monteCarlo',
    'opportunityCost',
    'peerComparison',
    'workforceAlternatives',
    'breakEvenUnits',
    'consultingAssumptions',
    'recommendations',
    'qualitativeBenefits',
    'caseStudy',
    'maturityPremium',
    'inputAssumptions',
    'appendixMethodology',
    'appendixBenchmarks',
    'appendixCostAssumptions',
  ],
};

/**
 * Excel tab inclusion by tier.
 */
// Per-archetype assumption tab names (must match generateExcelModel.js)
const ASSUMPTION_TABS = [
  'Assumptions: Process', 'Assumptions: Customer', 'Assumptions: Analytics',
  'Assumptions: Revenue', 'Assumptions: Compliance', 'Assumptions: Knowledge',
];

export const EXCEL_TABS = {
  executive: ['Summary', 'P&L & Cash Flow', 'Cost of Inaction', 'Stranded Costs', 'Model Audit', 'Assumption Definitions', ...ASSUMPTION_TABS],
  financial: ['Summary', 'Inputs', 'P&L & Cash Flow', 'Sensitivity', 'Cost of Inaction', 'Stranded Costs', 'V5 Analysis', 'Model Audit', 'Assumption Definitions', ...ASSUMPTION_TABS],
  detailed:  ['Summary', 'Inputs', 'P&L & Cash Flow', 'Sensitivity', 'Cost of Inaction', 'Stranded Costs', 'V5 Analysis', 'Key Formulas', 'Lookups', 'Model Audit', 'Assumption Definitions', ...ASSUMPTION_TABS],
};
