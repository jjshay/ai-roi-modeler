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
 * Get the output tier for a given role string.
 * Falls back to 'detailed' if the role is unrecognized.
 */
export function getOutputTier(role) {
  if (!role) return 'detailed';
  return ROLE_TIER_MAP[role] || 'detailed';
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
    phasedDeploymentGates: true,
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
    quickFacts:           true,
    valueCreationPathways: true,
    capitalEfficiency:    true,
    peerComparison:       true,
    aiMaturityPremium:    true,
    phasedDeploymentGates: true,
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
  executive: [
    'executiveSummary',
    'tableOfContents',
    'recommendations',
  ],
  financial: [
    'executiveSummary',
    'tableOfContents',
    'currentState',
    'investmentAnalysis',
    'scenarioProjections',
    'riskAssessment',
    'sensitivityAnalysis',
    'valueBreakdown',
    'capitalEfficiencyGates',
    'opportunityCost',
    'peerComparison',
    'recommendations',
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
export const EXCEL_TABS = {
  executive: ['Summary'],
  financial: ['Summary', 'Inputs', 'P&L & Cash Flow', 'Sensitivity'],
  detailed:  ['Summary', 'Inputs', 'P&L & Cash Flow', 'Sensitivity', 'Key Formulas', 'Lookups'],
};
