import {
  ADJACENT_PRODUCT_RATE,
  ANNUAL_COMPLIANCE_COST,
  CYBER_INSURANCE_INCREASE,
  PLATFORM_LICENSE_COST,
} from './benchmarks';

/**
 * Planning multipliers are deliberately modest and visible. They express the
 * additional delivery, governance, and control work common in regulated
 * industries; they are not vendor pricing or a market-rate claim.
 */
export const INDUSTRY_COST_MULTIPLIERS = Object.freeze({
  'Financial Services / Banking': 1.30,
  'Healthcare / Life Sciences': 1.35,
  'Government / Public Sector': 1.40,
  'Energy / Utilities': 1.20,
  'Manufacturing / Industrial': 1.15,
  'Professional Services / Consulting': 1.10,
  'Technology / Software': 1.00,
  'Retail / E-Commerce': 1.00,
  'Media / Entertainment': 1.00,
  Other: 1.05,
});

export const ANNUAL_AI_COST_QUESTION = 'How much do you expect to pay per year for AI?';

export const AI_COST_BUCKET_EXPLANATIONS = Object.freeze({
  build: 'One-time implementation, data preparation, integration, testing, and rollout.',
  access: 'Annual platform contract, governed seats, and required AI product add-ons.',
  consumption: 'Variable model calls, tokens, compute, agent runs, and document processing.',
  run: 'Ongoing support, monitoring, governance, security, and continuous improvement.',
});

const DEFAULT_COMPANY_SIZE = 'Mid-Market (501-5,000)';

function asNonNegative(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : fallback;
}

function normalizeCompanySize(companySize) {
  return PLATFORM_LICENSE_COST[companySize]
    ? companySize
    : DEFAULT_COMPANY_SIZE;
}

export function getIndustryCostMultiplier(industry) {
  return INDUSTRY_COST_MULTIPLIERS[industry] ?? INDUSTRY_COST_MULTIPLIERS.Other;
}

function category(key, label, amount) {
  return {
    key,
    label,
    amount: asNonNegative(amount),
    explanation: AI_COST_BUCKET_EXPLANATIONS[key],
  };
}

/**
 * Returns a transparent annual planning envelope for the annual-AI-cost
 * question. Passing live `modeledBuckets` makes the model's active cost total
 * the median/typical point; without it, the helper uses only company size,
 * industry, seats, and measured request volume as a deliberately limited
 * preliminary estimate.
 *
 * Lower/typical/higher are 75% / 100% / 125% planning points. They are not
 * market percentiles and must not be represented as a vendor quote.
 */
export function getAnnualAiCostSuggestion({
  companySize,
  industry,
  licensedUsers = 10,
  monthlyRequests = 0,
  apiCostPer1kRequests = 10,
  modeledBuckets = null,
  buildIntegrationOneTime = null,
} = {}) {
  const normalizedCompanySize = normalizeCompanySize(companySize);
  const industryCostMultiplier = getIndustryCostMultiplier(industry);
  const platformLicense = (PLATFORM_LICENSE_COST[normalizedCompanySize] || 0)
    * industryCostMultiplier;
  const accessPreliminary = platformLicense * (1 + ADJACENT_PRODUCT_RATE)
    + Math.max(1, asNonNegative(licensedUsers, 10)) * 360 * industryCostMultiplier;
  const consumptionPreliminary = (asNonNegative(monthlyRequests) / 1000)
    * asNonNegative(apiCostPer1kRequests, 10)
    * 12;
  const runPreliminary = ((ANNUAL_COMPLIANCE_COST[normalizedCompanySize] || 0)
    + (CYBER_INSURANCE_INCREASE[normalizedCompanySize] || 0))
    * industryCostMultiplier;

  const hasLiveModel = modeledBuckets
    && Number.isFinite(Number(modeledBuckets.modeledAnnualTotal));
  const access = hasLiveModel
    ? asNonNegative(modeledBuckets.accessAnnual)
    : accessPreliminary;
  const consumption = hasLiveModel
    ? asNonNegative(modeledBuckets.consumptionAnnual)
    : consumptionPreliminary;
  const run = hasLiveModel
    ? asNonNegative(modeledBuckets.runAnnual)
    : runPreliminary;
  const modeledAnnualTotal = hasLiveModel
    ? asNonNegative(modeledBuckets.modeledAnnualTotal)
    : access + consumption + run;
  const annualTotal = hasLiveModel
    ? asNonNegative(modeledBuckets.annualTotal, modeledAnnualTotal)
    : modeledAnnualTotal;
  const isManualOverride = Boolean(modeledBuckets?.source === 'user-entered-total'
    || modeledBuckets?.allocationIsEstimated);
  const oneTimeBuild = buildIntegrationOneTime == null
    ? asNonNegative(modeledBuckets?.buildIntegrationOneTime)
    : asNonNegative(buildIntegrationOneTime);
  // Planning options must stay anchored to the model-derived total. If a user
  // enters a custom all-in number, rebasing the lower/typical/higher choices
  // on that custom number would make the selector drift on every render.
  const planningCenter = modeledAnnualTotal;

  return {
    question: ANNUAL_AI_COST_QUESTION,
    companySize: normalizedCompanySize,
    industry: industry || 'Other',
    industryCostMultiplier,
    source: hasLiveModel ? 'live-model' : 'preliminary-planning-envelope',
    isManualOverride,
    annual: {
      lowerPlanning: planningCenter * 0.75,
      typical: planningCenter,
      higherPlanning: planningCenter * 1.25,
      modeledAnnualTotal,
      annualTotal,
      annualOverrideDelta: annualTotal - modeledAnnualTotal,
      note: 'Lower / typical / higher use 75% / 100% / 125% planning points. They are model scenarios, not price quotes or market percentiles.',
    },
    buckets: [
      {
        ...category('build', 'Build & integration', oneTimeBuild),
        period: 'one-time',
      },
      {
        ...category('access', 'Access & licensing', access),
        period: 'annual',
      },
      {
        ...category('consumption', 'Consumption', consumption),
        period: 'annual',
      },
      {
        ...category('run', 'Operations & governance', run),
        period: 'annual',
      },
    ],
    explanation: hasLiveModel
      ? 'The planning options use the model-derived annual total. A manual annual total is allocated across the model buckets for disclosure only.'
      : 'This preliminary view uses size, industry, seats, and measured request volume. It does not assume support staffing, data-transfer volume, or delivery complexity until the project inputs are known.',
  };
}
