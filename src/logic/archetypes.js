// ---------------------------------------------------------------------------
// Project Archetypes — categorize AI projects by business purpose
// Replaces the flat "process type" selector with four strategic archetypes.
// Each archetype carries editable default assumptions keyed by industry.
// ---------------------------------------------------------------------------

import {
  AUTOMATION_POTENTIAL,
  API_COST_PER_1K_REQUESTS,
  REQUESTS_PER_PERSON_HOUR,
  TOOL_REPLACEMENT_RATE,
  ADOPTION_MULTIPLIERS,
} from './benchmarks';

// ---------------------------------------------------------------------------
// Archetype Definitions
// ---------------------------------------------------------------------------
export const PROJECT_ARCHETYPES = [
  {
    id: 'internal-process-automation',
    label: 'Internal Process Automation',
    icon: '\u2699\ufe0f',
    description: 'Automate internal workflows, document handling, and back-office operations',
    example: 'e.g. A bank automated loan document processing, cutting review time from 360,000 hours to seconds (JPMorgan COiN)',
    tags: ['Internal', 'Operations', 'Data'],
    sourceProcessTypes: ['Workflow Automation', 'Document Processing'],
  },
  {
    id: 'customer-facing-ai',
    label: 'Customer Service',
    icon: '\ud83d\udcac',
    description: 'Automate routine customer service, support, and self-service interactions',
    example: 'e.g. Klarna\'s AI assistant handles 2/3 of customer chats, resolving issues in 2 min vs. 11 min with human agents',
    tags: ['External', 'Customer Service'],
    sourceProcessTypes: ['Customer Communication'],
  },
  {
    id: 'data-analytics-automation',
    label: 'Data, Analytics & FP&A',
    icon: '\ud83d\udcca',
    description: 'Automate reporting, forecasting, financial close, reconciliation, and data-driven decision making',
    example: 'e.g. Siemens uses AI to auto-generate financial forecasts, reducing close cycle from 10 days to 3',
    tags: ['Internal', 'Data'],
    sourceProcessTypes: ['Data Analysis & Reporting', 'Research & Intelligence', 'Document Processing'],
  },
  {
    id: 'risk-compliance-legal-ai',
    label: 'Risk, Compliance & Legal AI',
    icon: '\ud83d\udee1\ufe0f',
    description: 'Reduce compliance risk, automate contract review, improve audit quality, and streamline regulatory and legal processes',
    example: 'e.g. HSBC\'s AI monitoring system reduced false positive alerts by 20%, saving thousands of analyst hours annually',
    tags: ['Internal', 'Operations', 'Data'],
    sourceProcessTypes: ['Quality & Compliance', 'Document Processing', 'Research & Intelligence'],
  },
];

// Lookup map for quick access
export const ARCHETYPE_MAP = Object.fromEntries(
  PROJECT_ARCHETYPES.map(a => [a.id, a])
);

// Old share links may still carry these IDs. They are intentionally not mapped
// to current cases because their historical inputs are not comparable to the
// supported operating models.
export const RETIRED_ARCHETYPE_IDS = new Set([
  'revenue-growth-ai',
  'knowledge-management-ai',
]);

export const RETIRED_ARCHETYPE_LABELS = {
  'revenue-growth-ai': 'Revenue & Growth AI',
  'knowledge-management-ai': 'Knowledge Management AI',
};

export function isRetiredArchetype(archetypeId) {
  return RETIRED_ARCHETYPE_IDS.has(archetypeId);
}

export function getRetiredArchetypeLabel(archetypeId) {
  return RETIRED_ARCHETYPE_LABELS[archetypeId] || 'This AI use case';
}

// ---------------------------------------------------------------------------
// Helper: average a numeric property across multiple processType lookups
// ---------------------------------------------------------------------------
function avgFromProcessTypes(lookupTable, processTypes, fallback) {
  const vals = processTypes
    .map(pt => lookupTable[pt])
    .filter(v => v !== undefined);
  return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : fallback;
}

function avgAutomationForIndustry(industry, processTypes) {
  const industryData = AUTOMATION_POTENTIAL[industry] || AUTOMATION_POTENTIAL['Other'];
  const vals = processTypes.map(pt => industryData[pt] || industryData['Other']);
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

// ---------------------------------------------------------------------------
// Build default assumptions for an archetype + industry pair
// ---------------------------------------------------------------------------
function buildDefaults(archetype, industry) {
  const pts = archetype.sourceProcessTypes;

  const automationPotential = parseFloat(avgAutomationForIndustry(industry, pts).toFixed(2));
  const apiCostPer1kRequests = Math.round(avgFromProcessTypes(API_COST_PER_1K_REQUESTS, pts, 10));
  const requestsPerPersonHour = Math.round(avgFromProcessTypes(REQUESTS_PER_PERSON_HOUR, pts, 12));
  const toolReplacementRate = parseFloat(avgFromProcessTypes(TOOL_REPLACEMENT_RATE, pts, 0.40).toFixed(2));

  // Adoption rate defaults to 0.70 (changeReadiness=3); user overrides via wizard
  const adoptionRate = 0.70;

  // Revenue projections are not a selectable AI ROI value stream. Customer
  // support can still show validated operating-cost avoidance separately.
  const revenueEligible = false;

  const defaults = {
    automationPotential,
    adoptionRate,
    apiCostPer1kRequests,
    requestsPerPersonHour,
    toolReplacementRate,
    revenueEligible,
  };

  // Risk & Compliance gets an extra field
  if (archetype.id === 'risk-compliance-legal-ai') {
    defaults.errorReductionPotential = parseFloat(
      Math.min(automationPotential + 0.10, 0.75).toFixed(2)
    );
  }

  return defaults;
}

// ---------------------------------------------------------------------------
// All 10 industries used in the model
// ---------------------------------------------------------------------------
const INDUSTRIES = [
  'Technology / Software',
  'Financial Services / Banking',
  'Healthcare / Life Sciences',
  'Manufacturing / Industrial',
  'Retail / E-Commerce',
  'Professional Services / Consulting',
  'Media / Entertainment',
  'Energy / Utilities',
  'Government / Public Sector',
  'Other',
];

// ---------------------------------------------------------------------------
// Pre-computed defaults: ARCHETYPE_DEFAULTS[archetypeId][industry]
// ---------------------------------------------------------------------------
export const ARCHETYPE_DEFAULTS = {};

for (const archetype of PROJECT_ARCHETYPES) {
  ARCHETYPE_DEFAULTS[archetype.id] = {};
  for (const industry of INDUSTRIES) {
    ARCHETYPE_DEFAULTS[archetype.id][industry] = buildDefaults(archetype, industry);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get default assumptions for a given archetype + industry.
 * Returns a plain object the user can edit in the Review Assumptions step.
 */
export function getArchetypeDefaults(archetypeId, industry) {
  const byIndustry = ARCHETYPE_DEFAULTS[archetypeId];
  if (!byIndustry) return null;
  return { ...(byIndustry[industry] || byIndustry['Other']) };
}

/**
 * Get archetype metadata by id.
 */
export function getArchetypeById(archetypeId) {
  return ARCHETYPE_MAP[archetypeId] || null;
}
