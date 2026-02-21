// Automation potential reduced by 10pp across the board (max 65%)
// Original values were 30-75%, now 20-65% — closer to McKinsey task automation rates
export const AUTOMATION_POTENTIAL = {
  'Technology / Software': {
    'Document Processing': 0.60,
    'Customer Communication': 0.50,
    'Data Analysis & Reporting': 0.55,
    'Research & Intelligence': 0.45,
    'Workflow Automation': 0.65,
    'Content Creation': 0.40,
    'Quality & Compliance': 0.50,
    'Other': 0.40,
  },
  'Financial Services / Banking': {
    'Document Processing': 0.55,
    'Customer Communication': 0.45,
    'Data Analysis & Reporting': 0.50,
    'Research & Intelligence': 0.40,
    'Workflow Automation': 0.55,
    'Content Creation': 0.35,
    'Quality & Compliance': 0.60,
    'Other': 0.35,
  },
  'Healthcare / Life Sciences': {
    'Document Processing': 0.45,
    'Customer Communication': 0.35,
    'Data Analysis & Reporting': 0.40,
    'Research & Intelligence': 0.45,
    'Workflow Automation': 0.40,
    'Content Creation': 0.25,
    'Quality & Compliance': 0.50,
    'Other': 0.30,
  },
  'Manufacturing / Industrial': {
    'Document Processing': 0.50,
    'Customer Communication': 0.40,
    'Data Analysis & Reporting': 0.45,
    'Research & Intelligence': 0.35,
    'Workflow Automation': 0.60,
    'Content Creation': 0.30,
    'Quality & Compliance': 0.55,
    'Other': 0.35,
  },
  'Retail / E-Commerce': {
    'Document Processing': 0.55,
    'Customer Communication': 0.60,
    'Data Analysis & Reporting': 0.50,
    'Research & Intelligence': 0.40,
    'Workflow Automation': 0.60,
    'Content Creation': 0.45,
    'Quality & Compliance': 0.45,
    'Other': 0.40,
  },
  'Professional Services / Consulting': {
    'Document Processing': 0.50,
    'Customer Communication': 0.40,
    'Data Analysis & Reporting': 0.45,
    'Research & Intelligence': 0.50,
    'Workflow Automation': 0.45,
    'Content Creation': 0.40,
    'Quality & Compliance': 0.40,
    'Other': 0.35,
  },
  'Media / Entertainment': {
    'Document Processing': 0.45,
    'Customer Communication': 0.50,
    'Data Analysis & Reporting': 0.40,
    'Research & Intelligence': 0.45,
    'Workflow Automation': 0.45,
    'Content Creation': 0.50,
    'Quality & Compliance': 0.35,
    'Other': 0.35,
  },
  'Energy / Utilities': {
    'Document Processing': 0.45,
    'Customer Communication': 0.40,
    'Data Analysis & Reporting': 0.45,
    'Research & Intelligence': 0.35,
    'Workflow Automation': 0.50,
    'Content Creation': 0.25,
    'Quality & Compliance': 0.55,
    'Other': 0.30,
  },
  'Government / Public Sector': {
    'Document Processing': 0.40,
    'Customer Communication': 0.30,
    'Data Analysis & Reporting': 0.35,
    'Research & Intelligence': 0.30,
    'Workflow Automation': 0.35,
    'Content Creation': 0.20,
    'Quality & Compliance': 0.45,
    'Other': 0.25,
  },
  'Other': {
    'Document Processing': 0.45,
    'Customer Communication': 0.40,
    'Data Analysis & Reporting': 0.40,
    'Research & Intelligence': 0.35,
    'Workflow Automation': 0.45,
    'Content Creation': 0.30,
    'Quality & Compliance': 0.40,
    'Other': 0.30,
  },
};

export const INDUSTRY_SUCCESS_RATES = {
  'Technology / Software': 0.72,
  'Financial Services / Banking': 0.65,
  'Healthcare / Life Sciences': 0.58,
  'Manufacturing / Industrial': 0.62,
  'Retail / E-Commerce': 0.68,
  'Professional Services / Consulting': 0.64,
  'Media / Entertainment': 0.60,
  'Energy / Utilities': 0.55,
  'Government / Public Sector': 0.45,
  'Other': 0.55,
};

export const ADOPTION_MULTIPLIERS = { 1: 0.40, 2: 0.55, 3: 0.70, 4: 0.85, 5: 0.95 };

export const DATA_TIMELINE_MULTIPLIER = { 1: 1.40, 2: 1.25, 3: 1.10, 4: 1.0, 5: 0.90 };
export const DATA_COST_MULTIPLIER = { 1: 1.30, 2: 1.20, 3: 1.10, 4: 1.0, 5: 1.0 };

export const SIZE_MULTIPLIER = {
  'Startup (1-50)': 0.7,
  'SMB (51-500)': 0.85,
  'Mid-Market (501-5,000)': 1.0,
  'Enterprise (5,001-50,000)': 1.3,
  'Large Enterprise (50,000+)': 1.6,
};

export const ADOPTION_RAMP = [0.75, 0.90, 1.0, 1.0, 1.0];

// DCF parameters
export const DCF_YEARS = 5;
export const DISCOUNT_RATE = 0.10; // default fallback

// Discount rate (WACC proxy) by company size
// Startups have higher cost of capital; large enterprises have cheaper capital
// Source: Damodaran WACC by company maturity 2025
export const DISCOUNT_RATE_BY_SIZE = {
  'Startup (1-50)': 0.18,
  'SMB (51-500)': 0.14,
  'Mid-Market (501-5,000)': 0.10,
  'Enterprise (5,001-50,000)': 0.09,
  'Large Enterprise (50,000+)': 0.08,
};

// Maximum headcount reduction — 25-30% of roles always require humans
// AI augments but cannot fully replace human judgment, relationship management, edge cases
// Source: McKinsey 2025 — Even in highly automatable functions, 25-30% of tasks require
// human judgment, relationship management, and edge-case handling.
// McKinsey Global Survey: "Companies that automate beyond 70-75% see diminishing returns
// and increased error rates."
export const MAX_HEADCOUNT_REDUCTION = 0.75; // Cap at 75%, 25% always human

// Headcount reduction phasing — employees phased out over years 2-5, not Day 1
// Year 1: 0% (enhancement phase — AI augments existing employees, HR/legal prep)
// Year 2-5: gradual reduction as AI proves reliable and roles are documented
// Source: SHRM 2025 — responsible workforce restructuring requires 6-18 month planning
export const HEADCOUNT_REDUCTION_SCHEDULE = [0, 0.20, 0.25, 0.20, 0.10]; // sums to 0.75

// Separation cost breakdown — what makes up total separation cost per FTE
// Source: SHRM 2025 total cost of separation
export const SEPARATION_COST_BREAKDOWN = {
  severancePay: { rate: 0.55, label: 'Severance pay' },
  benefitsContinuation: { rate: 0.15, label: 'Benefits continuation (COBRA)' },
  outplacementServices: { rate: 0.12, label: 'Outplacement services' },
  administrativeCosts: { rate: 0.10, label: 'Administrative & HR processing' },
  legalReview: { rate: 0.08, label: 'Legal review per separation' },
};

export const REALISTIC_TIMELINES = {
  'Technology / Software': { base: 4, complexity: 1.0 },
  'Financial Services / Banking': { base: 6, complexity: 1.2 },
  'Healthcare / Life Sciences': { base: 8, complexity: 1.4 },
  'Manufacturing / Industrial': { base: 6, complexity: 1.1 },
  'Retail / E-Commerce': { base: 4, complexity: 1.0 },
  'Professional Services / Consulting': { base: 5, complexity: 1.1 },
  'Media / Entertainment': { base: 4, complexity: 1.0 },
  'Energy / Utilities': { base: 7, complexity: 1.3 },
  'Government / Public Sector': { base: 10, complexity: 1.5 },
  'Other': { base: 6, complexity: 1.1 },
};

export function getAutomationPotential(industry, processType) {
  const industryData = AUTOMATION_POTENTIAL[industry] || AUTOMATION_POTENTIAL['Other'];
  return industryData[processType] || industryData['Other'];
}

export function getIndustrySuccessRate(industry) {
  return INDUSTRY_SUCCESS_RATES[industry] || INDUSTRY_SUCCESS_RATES['Other'];
}

export function getRealisticTimeline(industry, companySize) {
  const industryData = REALISTIC_TIMELINES[industry] || REALISTIC_TIMELINES['Other'];
  const sizeMulti = SIZE_MULTIPLIER[companySize] || 1.0;
  return Math.ceil(industryData.base * industryData.complexity * sizeMulti);
}

// ---------------------------------------------------------------------------
// AI Implementation Cost Model - Salary & Staffing Benchmarks
// All figures sourced from industry research; see BENCHMARK_SOURCES below.
// ---------------------------------------------------------------------------

// Fully-loaded annual cost (salary + benefits + taxes + overhead) by location
// Sources: Glassdoor 2026, Alcor BPO 2025, Motion Recruitment 2026, Qubit Labs 2026
// Fully-loaded multiplier: 1.25-1.40x base salary (health, 401k, FICA, workspace)
export const AI_TEAM_SALARY = {
  'US - Major Tech Hub': 215000,    // SF/NYC/Seattle/Boston median $175K base x 1.23
  'US - Other': 155000,             // Austin/Denver/Chicago median $125K base x 1.24
  'UK / Western Europe': 150000,    // London/Berlin/Paris median $120K base x 1.25
  'Canada / Australia': 140000,     // Toronto/Sydney median $110K base x 1.27
  'Remote / Distributed': 145000,   // Blended US/intl remote median
  'Eastern Europe': 80000,          // Poland/Romania/Ukraine $58-120K range midpoint
  'Latin America': 55000,           // Brazil/Mexico/Colombia $40-58K range midpoint
  'India / South Asia': 40000,      // Bangalore/Hyderabad $15-30K base x 1.6 loaded
};

// API/inference cost per 1,000 requests by process type
// Based on 2025-2026 enterprise model pricing: GPT-4o ($5/$15 per 1M tokens),
// Claude Opus 4.5 ($5/$25 per 1M), Gemini 2.5 Pro ($1.25/$10 per 1M)
// Costs assume blended input/output tokens per typical request for each use case
export const API_COST_PER_1K_REQUESTS = {
  'Document Processing': 20,        // ~4K tokens/request avg (long docs, extraction)
  'Customer Communication': 8,      // ~1K tokens/request avg (short messages)
  'Data Analysis & Reporting': 15,  // ~3K tokens/request avg (tables, charts)
  'Research & Intelligence': 25,    // ~5K tokens/request avg (long context, reasoning)
  'Workflow Automation': 5,         // ~0.5K tokens/request avg (orchestration, routing)
  'Content Creation': 20,           // ~4K tokens/request avg (long outputs)
  'Quality & Compliance': 12,       // ~2K tokens/request avg (structured checks)
  'Other': 10,
};

// Estimated AI requests per person-hour by process type
// Derived from task frequency analysis in enterprise workflow studies
export const REQUESTS_PER_PERSON_HOUR = {
  'Document Processing': 12,
  'Customer Communication': 25,
  'Data Analysis & Reporting': 8,
  'Research & Intelligence': 6,
  'Workflow Automation': 30,
  'Content Creation': 10,
  'Quality & Compliance': 15,
  'Other': 12,
};

// Max implementation team size by company size
// Source: Industry standard IT project staffing models
export const MAX_IMPL_TEAM = {
  'Startup (1-50)': 3,
  'SMB (51-500)': 5,
  'Mid-Market (501-5,000)': 10,
  'Enterprise (5,001-50,000)': 15,
  'Large Enterprise (50,000+)': 25,
};

// Platform/license base cost per year by company size
// Based on enterprise AI platform pricing (Datadog AI, AWS SageMaker, Azure AI, etc.)
export const PLATFORM_LICENSE_COST = {
  'Startup (1-50)': 12000,
  'SMB (51-500)': 24000,
  'Mid-Market (501-5,000)': 48000,
  'Enterprise (5,001-50,000)': 96000,
  'Large Enterprise (50,000+)': 180000,
};

// ---------------------------------------------------------------------------
// One-Time Transition Costs
// ---------------------------------------------------------------------------

// Severance: weeks of pay per displaced employee (by company size)
// Source: Bloomberg/Russell 3000 analysis 2024, LHH severance survey 2025
// Average severance: ~$40K/employee at US-listed firms; 8-12 weeks typical
export const SEVERANCE_WEEKS = {
  'Startup (1-50)': 4,              // Smaller orgs, less formal packages
  'SMB (51-500)': 8,
  'Mid-Market (501-5,000)': 10,
  'Enterprise (5,001-50,000)': 12,
  'Large Enterprise (50,000+)': 12,
};

// Total separation cost as multiple of annual salary (replaces weeks-based severance)
// Includes severance pay, benefits continuation (COBRA), outplacement, legal, admin
// Source: SHRM 2025 — total separation cost typically 1.0x-1.5x annual salary
export const SEPARATION_COST_MULTIPLIER = {
  'Startup (1-50)': 0.70,           // Raised from 0.40 — even small orgs incur real separation costs
  'SMB (51-500)': 1.0,
  'Mid-Market (501-5,000)': 1.15,
  'Enterprise (5,001-50,000)': 1.30,
  'Large Enterprise (50,000+)': 1.50,
};

// Tool replacement rate by process type — % of current tool costs that AI replaces
// Source: Forrester TEI studies 2024-2025
export const TOOL_REPLACEMENT_RATE = {
  'Document Processing': 0.55,
  'Customer Communication': 0.45,
  'Data Analysis & Reporting': 0.50,
  'Research & Intelligence': 0.40,
  'Workflow Automation': 0.65,
  'Content Creation': 0.45,
  'Quality & Compliance': 0.50,
  'Other': 0.40,
};

// Legal & compliance review cost by company size
// Covers AI policy, data privacy (GDPR/CCPA), IP review, vendor contract review,
// employment law review for workforce restructuring, regulatory filings
export const LEGAL_COMPLIANCE_COST = {
  'Startup (1-50)': 25000,
  'SMB (51-500)': 50000,
  'Mid-Market (501-5,000)': 100000,
  'Enterprise (5,001-50,000)': 175000,
  'Large Enterprise (50,000+)': 300000,
};

// Security & privacy audit cost by company size
// Covers penetration testing, data flow audit, model security review,
// SOC2/ISO compliance, data residency assessment, third-party risk assessment
export const SECURITY_AUDIT_COST = {
  'Startup (1-50)': 20000,
  'SMB (51-500)': 40000,
  'Mid-Market (501-5,000)': 75000,
  'Enterprise (5,001-50,000)': 125000,
  'Large Enterprise (50,000+)': 200000,
};

// Contingency reserve as % of implementation cost
// Source: PMI (Project Management Institute) recommends 10-25% for technology projects
// AI projects carry higher uncertainty; PMI recommends 10-25%
export const CONTINGENCY_RATE = 0.20; // 20% of computed implementation cost

// Change management friction — covers internal marketing, champions program, adoption support
// Covers internal marketing, champions program, resistance management, retraining
// Source: McKinsey Change 2025: 60% of failed AI projects cite culture as #1 barrier.
// Prosci ADKAR 2025: change management programs average 10-15% of implementation budget.
// 12% = midpoint of Prosci range.
export const CULTURAL_RESISTANCE_RATE = 0.12; // 12% of implementation cost

// AI vendor cost escalation — annual % price increase after Year 1
// Vendors raise prices once locked in; typical SaaS escalation is 7-15%
// AI vendors trend higher due to compute cost pass-through and feature gating
export const AI_COST_ESCALATION_RATE = 0.12; // deprecated — use AI_COST_ESCALATION_SCHEDULE

// AI vendor cost escalation schedule — high ramp-up, tapering as system matures
// Year 1: 0% (baseline), Year 2: 8% (scaling up), Year 3: 4% (stabilizing),
// Year 4: 0% (mature), Year 5: -3% (efficiency gains from optimized inference)
// Source: Gartner 2025 — AI operating costs typically decrease after Year 2 as
// models are optimized and inference pricing falls ~40% annually
export const AI_COST_ESCALATION_SCHEDULE = [0, 0.08, 0.04, 0, -0.03];

// Annual model retraining / drift monitoring as % of implementation cost
// LLMs and ML models degrade over time; retraining needed annually
// Reduced from 7% to 5% — combined with TECH_DEBT_RATE (3%) = 8% total (reviewer fix P1)
export const MODEL_RETRAINING_RATE = 0.05; // 5% of implementation cost annually

// Annual compliance & audit recertification cost by company size
// One-time audit is modeled separately; this is the annual refresh
export const ANNUAL_COMPLIANCE_COST = {
  'Startup (1-50)': 8000,
  'SMB (51-500)': 15000,
  'Mid-Market (501-5,000)': 30000,
  'Enterprise (5,001-50,000)': 60000,
  'Large Enterprise (50,000+)': 100000,
};

// Retained employee retraining cost — employees who stay need AI workflow skills
// Typically 2-4 weeks of training + lost productivity
export const RETAINED_RETRAINING_RATE = 0.03; // 3% of retained employees' total salary

// Technical debt / integration maintenance as % of implementation cost annually
// Reduced from 5% to 3% — combined with MODEL_RETRAINING_RATE (5%) = 8% total (reviewer fix P1)
export const TECH_DEBT_RATE = 0.03; // 3% of implementation cost annually

// Cyber insurance premium increase for AI adoption
export const CYBER_INSURANCE_INCREASE = {
  'Startup (1-50)': 2000,
  'SMB (51-500)': 5000,
  'Mid-Market (501-5,000)': 12000,
  'Enterprise (5,001-50,000)': 25000,
  'Large Enterprise (50,000+)': 50000,
};

// Required adjacent AI product costs as % of base platform license
// Vendors require purchase of monitoring, governance, security, data tools
// Source: Forrester TEI 2024 — AI platform "attach rate" averages 20-35%
export const ADJACENT_PRODUCT_RATE = 0.25; // 25% of base license for required add-ons

// Vendor switching costs as % of implementation cost
// Includes contract termination penalty, data migration, retraining, parallel running
// Source: Forrester TEI 2024 — vendor switching costs average 30-60% of initial implementation
export const VENDOR_SWITCHING_COST = {
  'Startup (1-50)': 0.30,
  'SMB (51-500)': 0.35,
  'Mid-Market (501-5,000)': 0.40,
  'Enterprise (5,001-50,000)': 0.50,
  'Large Enterprise (50,000+)': 0.60,
};

// ---------------------------------------------------------------------------
// Opportunity Cost of Inaction
// ---------------------------------------------------------------------------

// Annual wage inflation rate (BLS 2024-2025 average for professional services)
export const WAGE_INFLATION_RATE = 0.04;

// Industry-specific wage inflation rates
// Source: BLS Employment Cost Index Q4 2025, broken by industry
export const WAGE_INFLATION_BY_INDUSTRY = {
  'Technology / Software': 0.045,
  'Financial Services / Banking': 0.04,
  'Healthcare / Life Sciences': 0.05,
  'Manufacturing / Industrial': 0.035,
  'Retail / E-Commerce': 0.035,
  'Professional Services / Consulting': 0.04,
  'Media / Entertainment': 0.035,
  'Energy / Utilities': 0.03,
  'Government / Public Sector': 0.03,
  'Other': 0.04,
};

// Annual legacy system maintenance cost creep (Forrester legacy modernization research)
export const LEGACY_MAINTENANCE_CREEP = 0.07;

// Competitive penalty by industry — annual market share / margin erosion if competitors adopt AI first
// Source: BCG AI Adoption Competitive Analysis 2025
export const COMPETITIVE_PENALTY = {
  'Technology / Software': 0.05,
  'Financial Services / Banking': 0.04,
  'Healthcare / Life Sciences': 0.02,
  'Manufacturing / Industrial': 0.03,
  'Retail / E-Commerce': 0.05,
  'Professional Services / Consulting': 0.04,
  'Media / Entertainment': 0.04,
  'Energy / Utilities': 0.02,
  'Government / Public Sector': 0.01,
  'Other': 0.03,
};

// Compliance risk escalation by industry — annual increase in compliance cost without AI automation
export const COMPLIANCE_RISK_ESCALATION = {
  'Technology / Software': 0.02,
  'Financial Services / Banking': 0.05,
  'Healthcare / Life Sciences': 0.06,
  'Manufacturing / Industrial': 0.03,
  'Retail / E-Commerce': 0.02,
  'Professional Services / Consulting': 0.03,
  'Media / Entertainment': 0.02,
  'Energy / Utilities': 0.04,
  'Government / Public Sector': 0.04,
  'Other': 0.02,
};

// ---------------------------------------------------------------------------
// Revenue Enablement
// ---------------------------------------------------------------------------

// Revenue uplift percentages by industry (conservative, risk-adjusted)
// Source: BCG "How AI Creates Value" 2025, a16z AI in the Enterprise 2024
export const REVENUE_UPLIFT = {
  'Technology / Software': { timeToMarket: 0.08, customerExperience: 0.05, newCapability: 0.04 },
  'Financial Services / Banking': { timeToMarket: 0.05, customerExperience: 0.06, newCapability: 0.03 },
  'Healthcare / Life Sciences': { timeToMarket: 0.04, customerExperience: 0.03, newCapability: 0.05 },
  'Manufacturing / Industrial': { timeToMarket: 0.06, customerExperience: 0.03, newCapability: 0.03 },
  'Retail / E-Commerce': { timeToMarket: 0.07, customerExperience: 0.08, newCapability: 0.04 },
  'Professional Services / Consulting': { timeToMarket: 0.05, customerExperience: 0.04, newCapability: 0.04 },
  'Media / Entertainment': { timeToMarket: 0.08, customerExperience: 0.06, newCapability: 0.05 },
  'Energy / Utilities': { timeToMarket: 0.03, customerExperience: 0.03, newCapability: 0.02 },
  'Government / Public Sector': { timeToMarket: 0.02, customerExperience: 0.02, newCapability: 0.01 },
  'Other': { timeToMarket: 0.04, customerExperience: 0.04, newCapability: 0.03 },
};

// Process types eligible for revenue enablement calculations
// DEPRECATED: use assumptions.revenueEligible from archetype defaults instead
export const REVENUE_ELIGIBLE_PROCESSES = [
  'Customer Communication',
  'Content Creation',
  'Research & Intelligence',
];

// Revenue risk discount — applied on top of normal risk adjustments (conservative haircut)
export const REVENUE_RISK_DISCOUNT = 0.50;

// ---------------------------------------------------------------------------
// R&D Tax Credit
// ---------------------------------------------------------------------------

// Federal R&D tax credit rate (IRS Section 41, alternative simplified credit)
export const FEDERAL_RD_CREDIT_RATE = 0.065;

// State R&D credit rates (major states with AI-relevant credits)
// Source: IRS / state tax authority data 2025
export const STATE_RD_CREDIT_RATES = {
  'California': 0.24,
  'New York': 0.06,
  'Texas': 0.05,
  'Massachusetts': 0.10,
  'Washington': 0.015,
  'Illinois': 0.065,
  'Pennsylvania': 0.10,
  'Georgia': 0.10,
  'New Jersey': 0.10,
  'Colorado': 0.03,
  'Virginia': 0.0,
  'Florida': 0.0,
  'Other / Not Sure': 0.0,
};

// Percentage of AI implementation costs that qualify as R&D
export const RD_QUALIFICATION_RATE = 0.65;

// ---------------------------------------------------------------------------
// Phased Value Realization Timeline
// ---------------------------------------------------------------------------

// 4-phase value realization model — which value types materialize when
// Source: a16z "AI in the Enterprise" 2024, McKinsey AI implementation data
export const VALUE_PHASES = [
  {
    phase: 1,
    label: 'Quick Wins',
    monthRange: [0, 6],
    description: 'Tool replacement and initial efficiency gains',
    valueTypes: ['toolReplacement', 'efficiency'],
    realizationPct: 0.25,
  },
  {
    phase: 2,
    label: 'Core Automation',
    monthRange: [6, 12],
    description: 'Headcount optimization and error reduction',
    valueTypes: ['headcount', 'errorReduction'],
    realizationPct: 0.40,
  },
  {
    phase: 3,
    label: 'Optimization',
    monthRange: [12, 24],
    description: 'Full adoption and process refinement',
    valueTypes: ['headcount', 'efficiency', 'errorReduction'],
    realizationPct: 0.75,
  },
  {
    phase: 4,
    label: 'Scale & Innovate',
    monthRange: [24, 36],
    description: 'Revenue enablement and scalability benefits',
    valueTypes: ['headcount', 'efficiency', 'errorReduction', 'toolReplacement'],
    realizationPct: 1.0,
  },
];

// ---------------------------------------------------------------------------
// Scalability Premium
// ---------------------------------------------------------------------------

// Sub-linear scaling factors for AI at higher volumes
// At 2x volume, AI cost increases by only 25%; at 3x, by 40%
// Source: a16z "AI Cost Curves" 2024 — marginal cost of AI scales sub-linearly
export const AI_SCALE_FACTORS = { '2x': 0.25, '3x': 0.40 };

// ---------------------------------------------------------------------------
// Industry Peer Benchmarks
// ---------------------------------------------------------------------------

// Median ROIC and percentile bands by industry x company size
// Source: McKinsey 2025, IBM 2023, Deloitte 2026 aggregate data
export const INDUSTRY_PEER_BENCHMARKS = {
  'Technology / Software': {
    'Startup (1-50)': { medianROIC: 0.45, p25: 0.20, p75: 0.80 },
    'SMB (51-500)': { medianROIC: 0.50, p25: 0.25, p75: 0.85 },
    'Mid-Market (501-5,000)': { medianROIC: 0.55, p25: 0.30, p75: 0.90 },
    'Enterprise (5,001-50,000)': { medianROIC: 0.48, p25: 0.22, p75: 0.78 },
    'Large Enterprise (50,000+)': { medianROIC: 0.42, p25: 0.18, p75: 0.72 },
  },
  'Financial Services / Banking': {
    'Startup (1-50)': { medianROIC: 0.35, p25: 0.15, p75: 0.65 },
    'SMB (51-500)': { medianROIC: 0.40, p25: 0.18, p75: 0.70 },
    'Mid-Market (501-5,000)': { medianROIC: 0.45, p25: 0.22, p75: 0.75 },
    'Enterprise (5,001-50,000)': { medianROIC: 0.42, p25: 0.20, p75: 0.72 },
    'Large Enterprise (50,000+)': { medianROIC: 0.38, p25: 0.15, p75: 0.65 },
  },
  'Healthcare / Life Sciences': {
    'Startup (1-50)': { medianROIC: 0.25, p25: 0.10, p75: 0.50 },
    'SMB (51-500)': { medianROIC: 0.30, p25: 0.12, p75: 0.55 },
    'Mid-Market (501-5,000)': { medianROIC: 0.35, p25: 0.15, p75: 0.60 },
    'Enterprise (5,001-50,000)': { medianROIC: 0.32, p25: 0.14, p75: 0.58 },
    'Large Enterprise (50,000+)': { medianROIC: 0.28, p25: 0.10, p75: 0.52 },
  },
  'Manufacturing / Industrial': {
    'Startup (1-50)': { medianROIC: 0.30, p25: 0.12, p75: 0.55 },
    'SMB (51-500)': { medianROIC: 0.35, p25: 0.15, p75: 0.60 },
    'Mid-Market (501-5,000)': { medianROIC: 0.40, p25: 0.18, p75: 0.68 },
    'Enterprise (5,001-50,000)': { medianROIC: 0.38, p25: 0.16, p75: 0.65 },
    'Large Enterprise (50,000+)': { medianROIC: 0.35, p25: 0.14, p75: 0.60 },
  },
  'Retail / E-Commerce': {
    'Startup (1-50)': { medianROIC: 0.38, p25: 0.16, p75: 0.68 },
    'SMB (51-500)': { medianROIC: 0.42, p25: 0.20, p75: 0.72 },
    'Mid-Market (501-5,000)': { medianROIC: 0.48, p25: 0.24, p75: 0.80 },
    'Enterprise (5,001-50,000)': { medianROIC: 0.44, p25: 0.20, p75: 0.75 },
    'Large Enterprise (50,000+)': { medianROIC: 0.40, p25: 0.18, p75: 0.70 },
  },
  'Professional Services / Consulting': {
    'Startup (1-50)': { medianROIC: 0.32, p25: 0.14, p75: 0.58 },
    'SMB (51-500)': { medianROIC: 0.38, p25: 0.18, p75: 0.65 },
    'Mid-Market (501-5,000)': { medianROIC: 0.42, p25: 0.20, p75: 0.70 },
    'Enterprise (5,001-50,000)': { medianROIC: 0.40, p25: 0.18, p75: 0.68 },
    'Large Enterprise (50,000+)': { medianROIC: 0.36, p25: 0.15, p75: 0.62 },
  },
  'Media / Entertainment': {
    'Startup (1-50)': { medianROIC: 0.35, p25: 0.14, p75: 0.62 },
    'SMB (51-500)': { medianROIC: 0.40, p25: 0.18, p75: 0.68 },
    'Mid-Market (501-5,000)': { medianROIC: 0.45, p25: 0.22, p75: 0.75 },
    'Enterprise (5,001-50,000)': { medianROIC: 0.42, p25: 0.20, p75: 0.72 },
    'Large Enterprise (50,000+)': { medianROIC: 0.38, p25: 0.16, p75: 0.65 },
  },
  'Energy / Utilities': {
    'Startup (1-50)': { medianROIC: 0.22, p25: 0.08, p75: 0.42 },
    'SMB (51-500)': { medianROIC: 0.28, p25: 0.10, p75: 0.48 },
    'Mid-Market (501-5,000)': { medianROIC: 0.32, p25: 0.14, p75: 0.55 },
    'Enterprise (5,001-50,000)': { medianROIC: 0.30, p25: 0.12, p75: 0.52 },
    'Large Enterprise (50,000+)': { medianROIC: 0.26, p25: 0.10, p75: 0.48 },
  },
  'Government / Public Sector': {
    'Startup (1-50)': { medianROIC: 0.15, p25: 0.05, p75: 0.30 },
    'SMB (51-500)': { medianROIC: 0.18, p25: 0.06, p75: 0.35 },
    'Mid-Market (501-5,000)': { medianROIC: 0.22, p25: 0.08, p75: 0.40 },
    'Enterprise (5,001-50,000)': { medianROIC: 0.20, p25: 0.07, p75: 0.38 },
    'Large Enterprise (50,000+)': { medianROIC: 0.18, p25: 0.06, p75: 0.35 },
  },
  'Other': {
    'Startup (1-50)': { medianROIC: 0.28, p25: 0.10, p75: 0.50 },
    'SMB (51-500)': { medianROIC: 0.32, p25: 0.14, p75: 0.55 },
    'Mid-Market (501-5,000)': { medianROIC: 0.38, p25: 0.18, p75: 0.62 },
    'Enterprise (5,001-50,000)': { medianROIC: 0.35, p25: 0.15, p75: 0.58 },
    'Large Enterprise (50,000+)': { medianROIC: 0.30, p25: 0.12, p75: 0.52 },
  },
};

// ---------------------------------------------------------------------------
// Empirical Return Ceilings (research-backed)
// ---------------------------------------------------------------------------
// IBM Global AI Adoption Index: successful AI projects return $3.50 per $1 invested,
// implying ~117% annualized ROIC over 3 years for top performers.
// However, enterprise-wide average ROI is only 5.9% (IBM 2023).
// MIT/RAND: 70-85% of AI initiatives fail to meet expected outcomes.
// Gartner: Only 48% of AI projects reach production; 8 months avg prototype-to-prod.
// Base-case caps represent upper bound of realistic per-project returns.
export const MAX_BASE_ROIC = 1.00;   // 100% — aligns with IBM $3.50/dollar annualized
export const MAX_BASE_IRR = 2.00;    // 200% — display as ">200%" above this threshold
export const MIN_BASE_ROIC = -1.00;  // -100% — floor for base case
export const MIN_BASE_IRR = -1.00;   // -100% — floor for base case

// ---------------------------------------------------------------------------
// V3: Cash Realization % — what % of productivity gains convert to cash
// Capacity-only = 0% (people stay, do other work)
// Structured attrition = 40-60% (natural turnover, role elimination)
// Aggressive cost-out = 80% (layoffs)
// Source: McKinsey 2025, BCG 2025
// ---------------------------------------------------------------------------
export const CASH_REALIZATION_DEFAULTS = {
  conservative: 0.25,
  base: 0.40,
  optimistic: 0.60,
};

// Industry-specific cash realization defaults (base case)
// Industries with higher turnover/flexible labor realize more cash from AI savings.
// Government orgs with strong job protections realize less.
// Source: BLS JOLTS turnover data 2025, McKinsey workforce restructuring data 2025
export const CASH_REALIZATION_BY_INDUSTRY = {
  'Technology / Software': 0.50,
  'Financial Services / Banking': 0.45,
  'Healthcare / Life Sciences': 0.30,
  'Manufacturing / Industrial': 0.40,
  'Retail / E-Commerce': 0.55,
  'Professional Services / Consulting': 0.45,
  'Media / Entertainment': 0.50,
  'Energy / Utilities': 0.30,
  'Government / Public Sector': 0.20,
  'Other': 0.40,
};

// ---------------------------------------------------------------------------
// V3: Risk Reduction Pathway — regulatory/compliance event benchmarks
// Probability of major event per year, financial impact, AI reduction %
// Source: Marsh McLennan 2025, Deloitte Risk Analytics 2025
// ---------------------------------------------------------------------------
export const REGULATORY_EVENT_BENCHMARKS = {
  'Technology / Software': { probability: 0.03, avgImpact: 5000000, aiReduction: 0.30 },
  'Financial Services / Banking': { probability: 0.08, avgImpact: 25000000, aiReduction: 0.25 },
  'Healthcare / Life Sciences': { probability: 0.05, avgImpact: 20000000, aiReduction: 0.35 },
  'Manufacturing / Industrial': { probability: 0.04, avgImpact: 10000000, aiReduction: 0.30 },
  'Retail / E-Commerce': { probability: 0.03, avgImpact: 3000000, aiReduction: 0.25 },
  'Professional Services / Consulting': { probability: 0.03, avgImpact: 5000000, aiReduction: 0.20 },
  'Media / Entertainment': { probability: 0.02, avgImpact: 2000000, aiReduction: 0.20 },
  'Energy / Utilities': { probability: 0.06, avgImpact: 15000000, aiReduction: 0.30 },
  'Government / Public Sector': { probability: 0.04, avgImpact: 8000000, aiReduction: 0.25 },
  'Other': { probability: 0.03, avgImpact: 5000000, aiReduction: 0.25 },
};

// ---------------------------------------------------------------------------
// V3: Revenue Acceleration — cycle time reduction benchmarks by industry
// Months of cycle time AI typically reduces for regulatory/review processes
// Source: BCG 2025, McKinsey Operations Practice 2025
// ---------------------------------------------------------------------------
export const CYCLE_TIME_REDUCTION = {
  'Technology / Software': { months: 2, revenueMultiplier: 0.08 },
  'Financial Services / Banking': { months: 3, revenueMultiplier: 0.05 },
  'Healthcare / Life Sciences': { months: 4, revenueMultiplier: 0.04 },
  'Manufacturing / Industrial': { months: 2, revenueMultiplier: 0.06 },
  'Retail / E-Commerce': { months: 1.5, revenueMultiplier: 0.07 },
  'Professional Services / Consulting': { months: 2, revenueMultiplier: 0.05 },
  'Media / Entertainment': { months: 1, revenueMultiplier: 0.08 },
  'Energy / Utilities': { months: 3, revenueMultiplier: 0.03 },
  'Government / Public Sector': { months: 4, revenueMultiplier: 0.02 },
  'Other': { months: 2, revenueMultiplier: 0.04 },
};

// ---------------------------------------------------------------------------
// V3: Enhanced Scenario Engine — per-scenario parameter overrides
// Each scenario gets its own automation adjustment, risk, cash realization, and timeline
// Source: Deloitte 2026, McKinsey 2025
// ---------------------------------------------------------------------------
export const SCENARIO_CONFIGS = {
  conservative: {
    label: 'Conservative',
    savingsMultiplier: 0.75,       // Symmetric: base ± 0.25
    automationAdjustment: -0.10,   // -10pp automation potential
    riskAdjustment: 0.85,          // 85% of base risk multiplier
    cashRealization: 0.25,
    timelineAdjustment: 1.30,      // 30% longer
    weight: 0.25,
  },
  base: {
    label: 'Base Case',
    savingsMultiplier: 1.0,
    automationAdjustment: 0,
    riskAdjustment: 1.0,
    cashRealization: 0.40,
    timelineAdjustment: 1.0,
    weight: 0.50,
  },
  optimistic: {
    label: 'Optimistic',
    savingsMultiplier: 1.25,       // Symmetric: base ± 0.25
    automationAdjustment: 0.10,    // +10pp automation potential
    riskAdjustment: 1.15,          // 115% of base risk multiplier
    cashRealization: 0.60,
    timelineAdjustment: 0.80,      // 20% faster
    weight: 0.25,
  },
};

// ---------------------------------------------------------------------------
// V3: Capital Efficiency — tax and WACC parameters
// ---------------------------------------------------------------------------
export const EFFECTIVE_TAX_RATE = 0.21; // US corporate rate for NOPAT calculation

// ---------------------------------------------------------------------------
// Productivity Dip Parameters — scaled by company size
// Larger organizations have longer change absorption cycles
// Source: McKinsey Change 2025
// ---------------------------------------------------------------------------
export const PRODUCTIVITY_DIP_PARAMS = {
  'Startup (1-50)':              { months: 2, dipRate: 0.20 },
  'SMB (51-500)':                { months: 2.5, dipRate: 0.22 },
  'Mid-Market (501-5,000)':      { months: 3, dipRate: 0.25 },
  'Enterprise (5,001-50,000)':   { months: 4, dipRate: 0.28 },
  'Large Enterprise (50,000+)':  { months: 5, dipRate: 0.30 },
};

// ---------------------------------------------------------------------------
// Retained Talent Premium — wage increase to retain top performers during AI transition
// Source: Mercer 2025 — retention bonuses during restructuring average 8-15% of salary
// ---------------------------------------------------------------------------
export const RETAINED_TALENT_PREMIUM_RATE = 0.10; // 10% default

// ---------------------------------------------------------------------------
// Agentic AI Compute Multiplier
// Agentic workflows call LLMs 2-5x more per task (multi-step reasoning chains)
// Source: a16z 2024 — agentic AI architectures consume 2-5x more inference tokens per task
// ---------------------------------------------------------------------------
export const AGENTIC_COMPUTE_MULTIPLIER = 2.5;

// ---------------------------------------------------------------------------
// Data Egress/Ingress Costs — monthly data transfer cost by company size
// Source: AWS/Azure/GCP egress pricing 2025 — $0.08-0.12/GB; enterprise AI moves 5-50TB/month
// ---------------------------------------------------------------------------
export const DATA_TRANSFER_COST_MONTHLY = {
  'Startup (1-50)': 200,
  'SMB (51-500)': 800,
  'Mid-Market (501-5,000)': 3000,
  'Enterprise (5,001-50,000)': 12000,
  'Large Enterprise (50,000+)': 40000,
};

// ---------------------------------------------------------------------------
// Salary Validation Ranges by Industry — typical fully-loaded cost ranges
// Source: BLS OES 2025, Glassdoor 2025 — used for input validation warnings
// ---------------------------------------------------------------------------
export const SALARY_RANGES_BY_INDUSTRY = {
  'Technology / Software': { low: 110000, high: 200000, typical: 150000 },
  'Financial Services / Banking': { low: 120000, high: 200000, typical: 160000 },
  'Healthcare / Life Sciences': { low: 90000, high: 180000, typical: 130000 },
  'Manufacturing / Industrial': { low: 70000, high: 140000, typical: 100000 },
  'Retail / E-Commerce': { low: 60000, high: 130000, typical: 90000 },
  'Professional Services / Consulting': { low: 100000, high: 190000, typical: 140000 },
  'Media / Entertainment': { low: 80000, high: 160000, typical: 110000 },
  'Energy / Utilities': { low: 90000, high: 170000, typical: 125000 },
  'Government / Public Sector': { low: 70000, high: 140000, typical: 100000 },
  'Other': { low: 70000, high: 160000, typical: 110000 },
};

// ---------------------------------------------------------------------------
// Revenue Displacement Risk — chance AI degrades customer experience initially
// ---------------------------------------------------------------------------
export const REVENUE_DISPLACEMENT_RISK_RATE = 0.05; // 5% of revenue at risk

// ---------------------------------------------------------------------------
// Governance & Compliance OPEX Growth — annual escalation rate
// Regulatory burden increases over time as AI governance frameworks mature
// ---------------------------------------------------------------------------
export const COMPLIANCE_ESCALATION_RATE = 0.08; // 8% annual growth in compliance costs

// ---------------------------------------------------------------------------
// Capital Allocation Comparison — alternative hurdle rates
// ---------------------------------------------------------------------------
export const ALTERNATIVE_HURDLE_RATES = {
  stockBuyback: 0.08,       // typical equity return
  mAndAHurdleRate: 0.15,    // M&A threshold
  treasuryBond: 0.045,      // risk-free rate
};

// ---------------------------------------------------------------------------
// V3: Gate Structure — phased deployment thresholds
// Each gate has required metrics before proceeding to next phase
// Source: a16z 2024, McKinsey Change 2025
// ---------------------------------------------------------------------------
export const GATE_STRUCTURE = [
  {
    gate: 1,
    label: 'Pilot',
    monthRange: [0, 6],
    investmentPct: 0.15,       // 15% of total investment
    description: 'Validate automation % on 1 process with 2-3 people',
    requiredMetrics: {
      minAutomationValidated: 0.40,
      minAdoptionRate: 0.50,
      maxBudgetVariance: 0.20,
    },
  },
  {
    gate: 2,
    label: 'Controlled Rollout',
    monthRange: [6, 12],
    investmentPct: 0.35,       // 35% of total investment
    description: 'Expand to 2-3 teams, measure adoption lag and actual hours saved',
    requiredMetrics: {
      minAutomationValidated: 0.50,
      minAdoptionRate: 0.65,
      maxBudgetVariance: 0.15,
      minIRR: 0.0,             // Must show path to positive IRR
    },
  },
  {
    gate: 3,
    label: 'Enterprise Scale',
    monthRange: [12, 36],
    investmentPct: 0.50,       // 50% of total investment
    description: 'Full deployment with headcount restructuring and vendor optimization',
    requiredMetrics: {
      minAutomationValidated: 0.55,
      minAdoptionRate: 0.75,
      maxBudgetVariance: 0.10,
      minIRR: 0.05,            // Must show 5%+ IRR
    },
  },
];

// ---------------------------------------------------------------------------
// AI Adoption Rate by Industry — % of competitors actively deploying AI
// Used in enhanced competitive erosion S-curve calculation
// Source: BCG "Global AI Adoption Index" 2025; McKinsey "State of AI" 2025 survey data.
// Technology leads at 75%; Government trails at 30%. Rates represent organizations
// with at least one AI system in production, not full-scale deployment.
// ---------------------------------------------------------------------------
export const AI_ADOPTION_RATE_BY_INDUSTRY = {
  'Technology / Software': 0.75,
  'Financial Services / Banking': 0.65,
  'Healthcare / Life Sciences': 0.45,
  'Manufacturing / Industrial': 0.50,
  'Retail / E-Commerce': 0.60,
  'Professional Services / Consulting': 0.55,
  'Media / Entertainment': 0.60,
  'Energy / Utilities': 0.35,
  'Government / Public Sector': 0.30,
  'Other': 0.45,
};

// ---------------------------------------------------------------------------
// Annual Margin Compression by Industry — % margin erosion per year for non-adopters
// Used with S-curve adoption rate to calculate revenue-based competitive erosion
// Source: BCG "How AI Creates Value" 2025 — late adopters face 2-5% annual margin erosion.
// McKinsey Quarterly "The competitive dynamics of AI adoption" Q3 2025.
// Rates represent steady-state annual compression; actual erosion follows logistic S-curve.
// ---------------------------------------------------------------------------
export const MARGIN_COMPRESSION_BY_INDUSTRY = {
  'Technology / Software': 0.045,
  'Financial Services / Banking': 0.035,
  'Healthcare / Life Sciences': 0.020,
  'Manufacturing / Industrial': 0.025,
  'Retail / E-Commerce': 0.040,
  'Professional Services / Consulting': 0.035,
  'Media / Entertainment': 0.040,
  'Energy / Utilities': 0.015,
  'Government / Public Sector': 0.015,
  'Other': 0.025,
};

// ---------------------------------------------------------------------------
// AI Maturity Premium — compounding benefits of successive AI deployments
// Used narratively in PDF and UI; NOT in core DCF calculations.
// Source: a16z "AI in the Enterprise" 2024, McKinsey 2025.
// CAVEAT: These are cross-industry averages. Highly regulated industries
// (Healthcare, Financial Services, Government) may see smaller time compression
// due to compliance review requirements. Technology/Retail orgs often exceed these.
// ---------------------------------------------------------------------------
export const AI_MATURITY_PREMIUM = {
  secondDeploymentCostReduction: 0.30,
  secondDeploymentTimeCompression: 0.40,
  thirdDeploymentCostReduction: 0.45,
  thirdDeploymentTimeCompression: 0.55,
  dataAssetValueMultiplier: 1.5,
  modelReusabilityRate: 0.60,
};

// ---------------------------------------------------------------------------
// Footnoted Source Registry
// Each benchmark carries a footnote number used in the PDF report
// ---------------------------------------------------------------------------
export const BENCHMARK_SOURCES = [
  { id: 1, short: 'McKinsey 2025', full: 'McKinsey & Company, "The State of AI in 2025," Global Survey, 2025. GenAI can automate 60-70% of employee time; 78% of enterprises report AI adoption.' },
  { id: 2, short: 'IBM 2023', full: 'IBM Institute for Business Value, "Generating ROI with AI," 2023. Average return: $3.50 per $1 invested; enterprise-wide ROI averages 5.9%, best-in-class 13%.' },
  { id: 3, short: 'Gartner 2024', full: 'Gartner, "Predicts 30% of GenAI Projects Will Be Abandoned After POC by End of 2025," Press Release, July 2024. Only 48% of AI projects reach production.' },
  { id: 4, short: 'MIT/RAND', full: 'MIT Sloan Management Review & RAND Corporation, aggregate research 2022-2024. 70-85% of AI initiatives fail to meet expected outcomes.' },
  { id: 5, short: 'Deloitte 2026', full: 'Deloitte, "The State of AI in the Enterprise," 6th Edition, 2026. 70% of companies have moved 30% or fewer GenAI experiments to production.' },
  { id: 6, short: 'Bloomberg 2024', full: 'Bloomberg News analysis of Russell 3,000 severance data, 2024. Average severance package: ~$40,000 per employee; 72% increase in generosity 2020-2025.' },
  { id: 7, short: 'Glassdoor 2026', full: 'Glassdoor AI/ML Engineer Salary Data, Feb 2026. US average $175,816; 25th-75th percentile: $143,848-$218,473.' },
  { id: 8, short: 'Alcor BPO 2025', full: 'Alcor BPO, "AI Engineer Salary by Country," 2025. Eastern Europe: $58-120K; India: $15-30K; Latin America: $40-58K.' },
  { id: 9, short: 'Xenoss 2025', full: 'Xenoss, "Total Cost of Ownership for Enterprise AI," 2025. Hidden costs account for 30-40% of total project cost; integration adds 15-25%.' },
  { id: 10, short: 'PMI', full: 'Project Management Institute (PMI), standard practice. Technology projects carry 10-25% contingency reserve; AI projects warrant higher end due to uncertainty.' },
  { id: 11, short: 'LLM Pricing 2025', full: 'IntuitionLabs, "LLM API Pricing Comparison," 2025. GPT-4o: $5/$15 per 1M tokens; Claude Opus 4.5: $5/$25; Gemini 2.5 Pro: $1.25/$10.' },
  { id: 12, short: 'LHH 2025', full: 'LHH (Lee Hecht Harrison), "How Much Severance Should Companies Pay," 2025. Exempt employees: 8-9 weeks; managers: 12-13 weeks; directors: 15 weeks.' },
  { id: 13, short: 'Gartner 2025', full: 'Gartner, "Lack of AI-Ready Data Puts AI Projects at Risk," Feb 2025. 60% of AI projects will be abandoned by 2026 due to data readiness issues.' },
  { id: 14, short: 'Worklytics 2025', full: 'Worklytics, "2025 AI Adoption Benchmarks," 2025. 75% of knowledge workers use AI tools regularly; utilization ramps over 12-24 months.' },
  { id: 15, short: 'SHRM 2025', full: 'SHRM (Society for Human Resource Management), "Total Cost of Employee Separation," 2025. Total separation cost averages 1.0x-1.5x annual salary including severance, COBRA, outplacement, and administrative costs.' },
  { id: 16, short: 'Forrester 2024', full: 'Forrester Research, "Total Economic Impact of AI Platform Consolidation," 2024. Tool replacement rates of 40-65% for enterprise AI implementations; legacy maintenance creep of 5-9% annually.' },
  { id: 17, short: 'BLS 2025', full: 'U.S. Bureau of Labor Statistics, "Employment Cost Index," Q4 2025. Professional services wage inflation averaging 4.0% annually 2023-2025.' },
  { id: 18, short: 'BCG 2025', full: 'Boston Consulting Group, "How AI Creates Value," 2025. Revenue uplift from AI: 5-15% across industries; competitive penalty for late adopters: 2-5% annual margin erosion.' },
  { id: 19, short: 'IRS 2025', full: 'Internal Revenue Service, "Section 41 Research Credit," 2025. Alternative Simplified Credit rate: 6.5% of qualified research expenses above 50% of 3-year average.' },
  { id: 20, short: 'a16z 2024', full: 'Andreessen Horowitz, "AI in the Enterprise," 2024. AI cost curves scale sub-linearly; 2x volume = 25% cost increase. 4-phase value realization typical for enterprise AI.' },
  { id: 21, short: 'McKinsey Change 2025', full: 'McKinsey & Company, "The Human Side of AI Transformation," 2025. Cultural resistance is the #1 barrier to AI adoption; 60% of failed AI projects cite culture, not technology. Change programs cost 10-15% of implementation.' },
  { id: 22, short: 'Forrester Lock-in 2025', full: 'Forrester Research, "The True Cost of AI Vendor Lock-in," 2025. Vendor switching costs average 30-60% of initial implementation. Annual price escalation averages 12-18% after initial contract period.' },
  { id: 23, short: 'SHRM Retraining 2025', full: 'SHRM, "Upskilling and Reskilling for AI-Augmented Workplaces," 2025. Retained employees require 2-4 weeks retraining; cost averages 3-5% of annual salary.' },
  { id: 24, short: 'Marsh 2025', full: 'Marsh McLennan, "AI and Cyber Insurance Risk," 2025. AI adoption increases cyber insurance premiums 10-25% depending on data sensitivity and automation scope.' },
  { id: 25, short: 'IDC 2025', full: 'IDC, "AI Infrastructure Total Cost of Ownership," 2025. Annual model retraining and drift monitoring costs average 5-10% of initial implementation investment.' },
  { id: 26, short: 'Damodaran 2025', full: 'Aswath Damodaran, "Cost of Capital by Company Lifecycle," NYU Stern, 2025. WACC ranges from 8% (large-cap mature) to 18%+ (early-stage startup). Company size is strongest predictor of capital cost.' },
  { id: 27, short: 'Prosci 2025', full: 'Prosci, "Best Practices in Change Management — ADKAR Model," 12th Edition, 2025. Change management programs average 10-15% of implementation budget. Organizations with structured change programs are 6x more likely to meet AI adoption targets.' },
  { id: 28, short: 'Mercer 2025', full: 'Mercer, "Workforce Restructuring and Retention Survey," 2025. Retention bonuses during restructuring average 8-15% of base salary for key talent. Top-performer attrition increases 25-40% without retention programs.' },
  { id: 29, short: 'a16z Agentic 2024', full: 'Andreessen Horowitz, "Agentic AI Architectures," 2024. Agentic workflows consume 2-5x more inference tokens per task vs single-call. Multi-step reasoning chains increase API costs proportionally.' },
  { id: 30, short: 'Cloud Egress 2025', full: 'AWS/Azure/GCP egress pricing comparison, 2025. Data egress costs $0.08-0.12/GB. Enterprise AI workloads typically transfer 5-50TB/month across cloud boundaries.' },
  { id: 31, short: 'BLS ECI 2025', full: 'U.S. Bureau of Labor Statistics, "Employment Cost Index by Industry," Q4 2025. Technology sector wage inflation 4.5%; Healthcare 5.0%; Manufacturing 3.5%; Government 3.0%.' },
  { id: 32, short: 'BCG AI Adoption 2025', full: 'Boston Consulting Group, "Global AI Adoption Index," 2025. Technology sector leads at 75% adoption; Government trails at 30%. Cross-industry average 52%.' },
  { id: 33, short: 'McKinsey Q3 2025', full: 'McKinsey Quarterly, "The Competitive Dynamics of AI Adoption," Q3 2025. Late adopters face 2-5% annual margin compression. Erosion follows logistic S-curve with inflection at year 2-3.' },
  { id: 34, short: 'BLS JOLTS 2025', full: 'U.S. Bureau of Labor Statistics, "Job Openings and Labor Turnover Survey (JOLTS)," 2025. Industry-specific turnover rates used for cash realization defaults.' },
];

// ---------------------------------------------------------------------------
// Archetype Defaults
// Import directly from './archetypes' — not re-exported here to avoid
// circular dependency (archetypes.js imports benchmark constants).
// ---------------------------------------------------------------------------
