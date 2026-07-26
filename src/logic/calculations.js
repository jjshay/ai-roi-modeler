import {
  getAutomationPotential,
  getIndustrySuccessRate,
  ADOPTION_MULTIPLIERS,
  DATA_TIMELINE_MULTIPLIER,
  DATA_COST_MULTIPLIER,
  SIZE_MULTIPLIER,
  ADOPTION_RAMP,
  DCF_YEARS,
  DISCOUNT_RATE,
  DISCOUNT_RATE_BY_SIZE,
  MAX_HEADCOUNT_REDUCTION,
  HEADCOUNT_REDUCTION_SCHEDULE,
  SEPARATION_COST_BREAKDOWN,
  API_COST_PER_1K_REQUESTS,
  REQUESTS_PER_PERSON_HOUR,
  MAX_IMPL_TEAM,
  PLATFORM_LICENSE_COST,
  SEVERANCE_WEEKS,
  SEPARATION_COST_MULTIPLIER,
  TOOL_REPLACEMENT_RATE,
  LEGAL_COMPLIANCE_COST,
  SECURITY_AUDIT_COST,
  CONTINGENCY_RATE,
  CULTURAL_RESISTANCE_RATE,
  AI_COST_ESCALATION_RATE,
  ADJACENT_PRODUCT_RATE,
  VENDOR_SWITCHING_COST,
  MAX_BASE_ROIC,
  MAX_BASE_IRR,
  MIN_BASE_ROIC,
  MIN_BASE_IRR,
  AI_COST_ESCALATION_SCHEDULE,
  MODEL_RETRAINING_RATE,
  ANNUAL_COMPLIANCE_COST,
  RETAINED_RETRAINING_RATE,
  TECH_DEBT_RATE,
  CYBER_INSURANCE_INCREASE,
  WAGE_INFLATION_RATE,
  WAGE_INFLATION_BY_INDUSTRY,
  LEGACY_MAINTENANCE_CREEP,
  COMPETITIVE_PENALTY,
  COMPLIANCE_RISK_ESCALATION,
  FEDERAL_RD_CREDIT_RATE,
  STATE_RD_CREDIT_RATES,
  RD_QUALIFICATION_RATE,
  VALUE_PHASES,
  AI_SCALE_FACTORS,
  INDUSTRY_PEER_BENCHMARKS,
  // V3 imports
  CASH_REALIZATION_DEFAULTS,
  REGULATORY_EVENT_BENCHMARKS,

  EFFECTIVE_TAX_RATE,
  GATE_STRUCTURE,
  // V4: Reviewer feedback additions
  PRODUCTIVITY_DIP_PARAMS,
  RETAINED_TALENT_PREMIUM_RATE,
  AGENTIC_COMPUTE_MULTIPLIER,
  DATA_TRANSFER_COST_MONTHLY,
  COMPLIANCE_ESCALATION_RATE,
  ALTERNATIVE_HURDLE_RATES,
  AI_ADOPTION_RATE_BY_INDUSTRY,
  MARGIN_COMPRESSION_BY_INDUSTRY,
  SALARY_RANGES_BY_INDUSTRY,
  // V5: Consulting-grade additions
  TOKEN_PROFILES,
  MODEL_TIERS,
  PROMPT_CACHING_RATE,
  CACHED_INPUT_DISCOUNT,
  AGENT_COST_PROFILES,
  AGENT_INFRASTRUCTURE_MONTHLY,
  MODEL_DRIFT_RATE,
  CAPITAL_ALLOCATION,
  BENCHMARK_SOURCES,
} from './benchmarks';
import {
  mapArchetypeInputs,
  sanitizeArchetypeInputs,
  ARCHETYPE_INPUT_MAP,
} from './archetypeInputs';
import { getRetiredArchetypeLabel, isRetiredArchetype } from './archetypes';
import {
  calculateContractExitCost,
  calculateDeploymentPlan,
  calculateProcessCost,
  calculateReworkCost,
  calculateWorkforceMix,
  calculateWorkforceTransitionPlan,
  normalizePercent,
} from './workforceMix';

export function runCalculations(inputs) {
  // =====================================================================
  // ARCHETYPE INPUT OVERRIDES (optional — refines base variables)
  // =====================================================================
  const rawArchetypeInputs = inputs.projectArchetype
    && inputs.archetypeInputs?.[inputs.projectArchetype]
    && typeof inputs.archetypeInputs[inputs.projectArchetype] === 'object'
    ? inputs.archetypeInputs[inputs.projectArchetype]
    : (inputs.archetypeInputs || {});
  const hasSupportedArchetype = Boolean(ARCHETYPE_INPUT_MAP[inputs.projectArchetype]);
  const hasCaseInputs = hasSupportedArchetype
    && inputs.archetypeInputs
    && Object.keys(rawArchetypeInputs).length > 0;
  const archetypeInputSanitization = hasCaseInputs
    ? sanitizeArchetypeInputs(inputs.projectArchetype, rawArchetypeInputs)
    : { values: rawArchetypeInputs, corrections: [] };
  const normalizedArchetypeInputs = archetypeInputSanitization.values;
  let _archetypeOverrides = {};
  if (hasCaseInputs) {
    _archetypeOverrides = mapArchetypeInputs(inputs.projectArchetype, normalizedArchetypeInputs) || {};
  }

  // =====================================================================
  // CONTEXT-AWARE DEFAULTS (for null/undefined values)
  // Explicit wizard inputs win; archetype-derived values are the next fallback.
  // =====================================================================
  const assumptions = inputs.assumptions || {};
  const industry = inputs.industry || 'Other';
  const processType = inputs.processType || 'Other';
  // Regulated or safety-critical industries need more integration, governance,
  // and access controls. This multiplier is a planning envelope, not a quote.
  const INDUSTRY_COST_MULTIPLIER = {
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
  };
  const industryCostMultiplier = INDUSTRY_COST_MULTIPLIER[industry]
    ?? INDUSTRY_COST_MULTIPLIER.Other;
  const workforceMix = calculateWorkforceMix(inputs);
  const teamSize = workforceMix.hasWorkforceMix
    ? workforceMix.totalHeadcount
    : Math.max(1, Math.min(inputs.teamSize || 10, 100000));
  const avgSalary = workforceMix.hasWorkforceMix
    ? workforceMix.blendedFullyBurdenedCost
    : Math.max(10000, Math.min(inputs.avgSalary || 100000, 10000000));
  const hoursPerWeek = Math.max(
    1,
    Math.min(inputs.hoursPerWeek ?? _archetypeOverrides.hoursPerWeek ?? assumptions.hoursPerWeek ?? 40, 10000)
  );
  const rawCurrentToolCosts = Math.max(0, Number(inputs.currentToolCosts) || 0);
  const maximumCurrentToolCosts = 100000000;
  const currentToolCosts = Math.min(rawCurrentToolCosts, maximumCurrentToolCosts);
  // Normalize companySize — handles truncated values from legacy share links
  const VALID_SIZES = ['Startup (1-50)', 'SMB (51-500)', 'Mid-Market (501-5,000)', 'Enterprise (5,001-50,000)', 'Large Enterprise (50,000+)'];
  const rawSize = inputs.companySize || 'Mid-Market (501-5,000)';
  const companySize = VALID_SIZES.includes(rawSize)
    ? rawSize
    : VALID_SIZES.find(s => s.startsWith(rawSize)) || 'Mid-Market (501-5,000)';
  const dataReadiness = inputs.dataReadiness ?? 3;
  const changeReadiness = inputs.changeReadiness ?? 3;

  // -------------------------------------------------------------------
  // CASE WORKLOAD + EVIDENCE GUARDRAILS
  // -------------------------------------------------------------------
  // Case inputs establish the workload the team actually performs. This
  // deliberately wins over a generic 40-hour workweek when calculating
  // capacity, so a small workflow cannot create a whole-team savings claim.
  const isRetiredCase = isRetiredArchetype(inputs.projectArchetype);
  const rawAutomationPotential = _archetypeOverrides.automationPotential
    ?? inputs.automationPotential
    ?? assumptions.automationPotential
    ?? getAutomationPotential(industry, processType);
  const automationPotential = isRetiredCase
    ? 0
    : Math.max(0, Math.min(0.85, Number(rawAutomationPotential) || 0));
  const workforceAnnualHours = teamSize * hoursPerWeek * 52;
  const caseWorkloadHoursPerWeek = hasCaseInputs
    ? Math.max(0, Number(_archetypeOverrides.caseWorkloadHoursPerWeek) || 0)
    : 0;
  const availableProcessHoursPerWeek = teamSize * hoursPerWeek;
  const workloadRatio = availableProcessHoursPerWeek > 0
    ? caseWorkloadHoursPerWeek / availableProcessHoursPerWeek
    : 0;
  const workloadExceedsCapacity = hasCaseInputs && workloadRatio > 1.25;
  const workloadTooSmallForRedundancy = hasCaseInputs && workloadRatio > 0 && workloadRatio < 0.10;
  const caseEfficiencyCeilingPct = workloadExceedsCapacity ? 0 : automationPotential;
  const requestedEfficiencyGainPct = inputs.totalEfficiencyGainPct == null
    ? caseEfficiencyCeilingPct
    : normalizePercent(inputs.totalEfficiencyGainPct, caseEfficiencyCeilingPct);
  const effectiveEfficiencyGainPct = workloadExceedsCapacity
    ? 0
    : Math.min(requestedEfficiencyGainPct, caseEfficiencyCeilingPct);
  const eligibleAnnualHours = hasCaseInputs
    ? Math.min(workforceAnnualHours, caseWorkloadHoursPerWeek * 52)
    : workforceAnnualHours;
  const supportCostValidated = rawArchetypeInputs?.supportCostValidated === true;
  const supportCostCashRealizable = rawArchetypeInputs?.supportCostCashRealizable === true;
  const candidateCaseDirectSavings = Math.max(0, Number(_archetypeOverrides.caseDirectSavings) || 0);
  const caseHourlyCost = workforceMix.hasWorkforceMix
    ? workforceMix.weightedHourlyCost
    : avgSalary / 2080;
  const maximumCaseDirectSavings = eligibleAnnualHours * caseHourlyCost;
  const boundedCaseDirectSavings = Math.min(candidateCaseDirectSavings, maximumCaseDirectSavings);
  const caseDirectSavingsEnabled = inputs.projectArchetype === 'customer-facing-ai'
    && supportCostValidated
    && supportCostCashRealizable
    && !workloadExceedsCapacity;
  const caseDirectSavingsGross = caseDirectSavingsEnabled ? boundedCaseDirectSavings : 0;
  const caseRiskAvoidance = Math.max(0, Number(_archetypeOverrides.caseRiskAvoidance) || 0);
  const caseBuildComplexityMultiplier = Math.max(
    0.80,
    Math.min(1.50, Number(_archetypeOverrides.caseBuildComplexityMultiplier) || 1)
  );
  const caseBumpers = [];

  if (rawCurrentToolCosts > maximumCurrentToolCosts) {
    caseBumpers.push({
      field: 'currentToolCosts',
      severity: 'warning',
      message: `Current tool costs were capped at $${maximumCurrentToolCosts.toLocaleString()} for this model. Validate a separately documented tool-retirement portfolio before using a higher amount.`,
    });
  }

  archetypeInputSanitization.corrections.forEach((correction) => {
    caseBumpers.push({
      field: correction.key,
      severity: 'warning',
      message: `${correction.label} ${correction.reason}; the model used ${correction.to}.`,
    });
  });
  if (workloadExceedsCapacity) {
    caseBumpers.push({
      field: 'caseWorkloadHoursPerWeek',
      severity: 'blocking',
      message: `Case workload is ${Math.round(workloadRatio * 100)}% of the entered workforce capacity. Savings and workforce actions are turned off until volume, handling time, or staffing is reconciled (supported maximum: 125%).`,
    });
  } else if (workloadTooSmallForRedundancy) {
    caseBumpers.push({
      field: 'caseWorkloadHoursPerWeek',
      severity: 'warning',
      message: `This case represents only ${Math.round(workloadRatio * 100)}% of the entered workforce capacity. The model permits capacity planning but does not support a redundancy claim below 10% coverage.`,
    });
  }
  if (inputs.totalEfficiencyGainPct != null && requestedEfficiencyGainPct > effectiveEfficiencyGainPct) {
    caseBumpers.push({
      field: 'totalEfficiencyGainPct',
      severity: 'warning',
      message: `Requested efficiency of ${Math.round(requestedEfficiencyGainPct * 100)}% is capped at ${Math.round(effectiveEfficiencyGainPct * 100)}% by the selected case's eligible workload and automation ceiling.`,
    });
  }
  if (inputs.projectArchetype === 'customer-facing-ai' && !supportCostValidated) {
    caseBumpers.push({
      field: 'supportCostValidated',
      severity: 'info',
      message: 'Customer support cost avoidance is shown as planning context only and excluded from NPV, IRR, and payback until Operations validates the fully loaded cost per resolved contact.',
    });
  }
  if (inputs.projectArchetype === 'customer-facing-ai' && supportCostValidated && !supportCostCashRealizable) {
    caseBumpers.push({
      field: 'supportCostCashRealizable',
      severity: 'info',
      message: 'Validated contact cost is treated as capacity only until the organization confirms it will remove external support spend or an equivalent cash cost; it is excluded from NPV, IRR, and payback.',
    });
  }
  if (candidateCaseDirectSavings > maximumCaseDirectSavings) {
    caseBumpers.push({
      field: 'costPerResolvedTicket',
      severity: 'warning',
      message: `Customer contact-cost avoidance is capped at $${Math.round(maximumCaseDirectSavings).toLocaleString()} because it cannot exceed the measured labor cost of the modeled workload.`,
    });
  }
  if (inputs.projectArchetype === 'risk-compliance-legal-ai' && caseRiskAvoidance > 0) {
    caseBumpers.push({
      field: 'caseRiskAvoidance',
      severity: 'info',
      message: 'Historical-loss avoidance is planning context only and is excluded from NPV, IRR, and payback until Finance validates evidence.',
    });
  }
  if (inputs.includeRiskReduction && !inputs.riskValueEvidenceValidated) {
    caseBumpers.push({
      field: 'includeRiskReduction',
      severity: 'warning',
      message: 'Risk avoidance remains outside model value until Finance validates realized-loss evidence; the NPV option is turned off.',
    });
  }
  if (inputs.includeRevenueAcceleration) {
    caseBumpers.push({
      field: 'includeRevenueAcceleration',
      severity: 'info',
      message: 'Revenue acceleration is not a supported AI ROI value stream in this model and is excluded from NPV, IRR, and payback.',
    });
  }
  if (isRetiredCase) {
    caseBumpers.push({
      field: 'projectArchetype',
      severity: 'blocking',
      message: `${getRetiredArchetypeLabel(inputs.projectArchetype)} is no longer supported. Select one of the four supported use cases before relying on this model.`,
    });
  }

  // Auto-calculate implementation budget from the workforce mix that the
  // user entered for this process. This deliberately replaces the retired
  // location-based implementation-team salary assumption.
  const deploymentRateForCalc = workforceMix.hasWorkforceMix
    ? workforceMix.blendedFullyBurdenedCost
    : avgSalary;
  const maxTeamForCalc = MAX_IMPL_TEAM[companySize] || 10;
  const sizeMultForCalc = SIZE_MULTIPLIER[companySize] || 1.0;
  const dataTimeMultForCalc = DATA_TIMELINE_MULTIPLIER[dataReadiness] || 1.10;
  const autoTimelineMonths = Math.ceil(6 * dataTimeMultForCalc * sizeMultForCalc);
  const scopeMinEng = Math.max(1, Math.ceil(teamSize / 12));
  const dataHeadcountMultForCalc = dataReadiness <= 2 ? 1.3 : dataReadiness === 3 ? 1.1 : 1.0;
  const rawEng = Math.ceil(scopeMinEng * dataHeadcountMultForCalc);
  const engForCalc = Math.min(rawEng, maxTeamForCalc);
  const pmForCalc = Math.max(0.5, Math.ceil(engForCalc / 5));
  const deploymentPlan = calculateDeploymentPlan(inputs, {
    workforceMix,
    baselineTimelineMonths: autoTimelineMonths,
    baselineImplementationHeadcount: engForCalc + pmForCalc,
    fallbackAnnualCost: deploymentRateForCalc,
  });
  const autoImplLaborCost = deploymentPlan.estimatedDeploymentLaborCost;
  const autoImplCost = Math.round(
    autoImplLaborCost * 1.20 * industryCostMultiplier * caseBuildComplexityMultiplier / 5000
  ) * 5000;

  // Use provided values or auto-calculated defaults
  const implementationBudget = inputs.implementationBudget != null
    ? inputs.implementationBudget * caseBuildComplexityMultiplier
    : autoImplCost;
  const expectedTimeline = inputs.expectedTimeline
    ?? deploymentPlan.estimatedDurationMonths;

  // Auto-calculate ongoing cost if not provided
  const licenseCostForCalc = PLATFORM_LICENSE_COST[companySize] || 48000;
  const autoOngoing = Math.round((licenseCostForCalc + (engForCalc * deploymentRateForCalc * 0.15)) / 5000) * 5000;
  const ongoingAnnualCost = inputs.ongoingAnnualCost ?? autoOngoing;

  // =====================================================================
  // CURRENT STATE
  // =====================================================================
  const hourlyRate = avgSalary / 2080;
  const annualLaborCost = workforceMix.hasWorkforceMix
    ? workforceMix.totalAnnualHeadcountCost
    : teamSize * avgSalary;
  const weeklyHours = teamSize * hoursPerWeek;
  const annualHours = weeklyHours * 52;
  const rework = calculateReworkCost(inputs);
  const annualReworkCost = rework.annualReworkCost;
  const contractExit = calculateContractExitCost(inputs);
  const annualContractSpend = contractExit.annualExistingContractCost;
  const processCost = calculateProcessCost({
    ...inputs,
    teamSize,
    avgSalary,
    hoursPerWeek,
    processVolume: inputs.processVolume ?? normalizedArchetypeInputs.processVolume,
    handlingTimeMin: inputs.handlingTimeMin ?? normalizedArchetypeInputs.handlingTimeMin,
  });
  const workforceTransition = calculateWorkforceTransitionPlan(
    {
      ...inputs,
      teamSize,
      avgSalary,
      hoursPerWeek,
      totalEfficiencyGainPct: effectiveEfficiencyGainPct,
    },
    workforceMix,
    {
      eligibleAnnualHours,
      allowRedundancies: !workloadExceedsCapacity && !workloadTooSmallForRedundancy,
    }
  );
  const hasExplicitWorkforcePlan = workforceMix.hasWorkforceMix
    || inputs.totalEfficiencyGainPct != null
    || inputs.employeesToMakeRedundant != null
    || inputs.employeesToRetrain != null;
  const totalCurrentCost = annualLaborCost + annualReworkCost + currentToolCosts + annualContractSpend;

  // =====================================================================
  // INDUSTRY BENCHMARKS
  // =====================================================================
  const industrySuccessRate = getIndustrySuccessRate(industry);

  // Custom adoption ramp: user can override default ADOPTION_RAMP per year
  // Array of 5 values (Year 1-5) between 0 and 1, representing % of steady-state
  const adoptionRamp = (
    Array.isArray(inputs.customAdoptionRamp) && inputs.customAdoptionRamp.length === DCF_YEARS
  ) ? inputs.customAdoptionRamp.map(v => Math.max(0, Math.min(v, 1)))
    : ADOPTION_RAMP;

  // =====================================================================
  // RISK ADJUSTMENTS
  // =====================================================================
  const adoptionRate = ADOPTION_MULTIPLIERS[changeReadiness] || 0.70;
  const sponsorAdjustment = inputs.execSponsor ? 1.0 : 0.85;
  // Blended risk: average of org readiness and industry success rate
  // MODELING ASSUMPTION: Averaging (vs multiplicative) produces ~30-40% higher
  // savings estimates. Multiplicative (orgReadiness × industrySuccessRate) treats
  // factors as independent probabilities, which over-penalizes because high-success
  // industries tend to correlate with better org readiness. The average is a
  // pragmatic compromise, sourced from Deloitte 2025 meta-analysis methodology.
  const orgReadiness = adoptionRate * sponsorAdjustment;
  const riskMultiplier = (orgReadiness + industrySuccessRate) / 2;

  // =====================================================================
  // DISCOUNT RATE (WACC proxy, varies by company size)
  // =====================================================================
  const discountRate = DISCOUNT_RATE_BY_SIZE[companySize] || DISCOUNT_RATE;

  // =====================================================================
  // INDUSTRY-SPECIFIC WAGE INFLATION (BLS ECI Q4 2025)
  // =====================================================================
  const wageInflationRate = WAGE_INFLATION_BY_INDUSTRY[industry] || WAGE_INFLATION_RATE;

  // =====================================================================
  // DISPLACED / RETAINED FTEs (needed for ongoing cost model)
  // Explicit redundancy plans replace inferred layoffs. The legacy approach
  // remains for older saved models without workforce-mix inputs.
  // =====================================================================
  const processAllocation = hasCaseInputs
    ? Math.min(1, workloadRatio)
    : hoursPerWeek / 40; // fraction of the entered workforce actually covered by this case
  const legacyHeadcountFeasible = processAllocation >= 0.50 && !workloadExceedsCapacity;
  const rawDisplacedFTEs = legacyHeadcountFeasible
    ? Math.round((eligibleAnnualHours / 2080) * automationPotential * adoptionRate)
    : 0; // no headcount reduction when <50% allocation
  const maxDisplaced = Math.floor(Math.min(
    teamSize * MAX_HEADCOUNT_REDUCTION,
    eligibleAnnualHours / 2080,
  ));
  const usesExplicitRedundancyPlan = hasExplicitWorkforcePlan;
  const totalEfficiencyGainPct = workloadExceedsCapacity
    ? 0
    : (usesExplicitRedundancyPlan
      ? workforceTransition.totalEfficiencyGainPct
      : automationPotential);
  const displacedFTEs = usesExplicitRedundancyPlan
    ? workforceTransition.employeesToMakeRedundant
    : Math.min(rawDisplacedFTEs, maxDisplaced);
  const headcountReductionSchedule = usesExplicitRedundancyPlan
    ? workforceTransition.redundancySchedule
    : HEADCOUNT_REDUCTION_SCHEDULE;
  const headcountFeasible = usesExplicitRedundancyPlan
    ? workforceTransition.freedCapacityFTEs >= 0.5
    : legacyHeadcountFeasible;
  const retainedFTEs = teamSize - displacedFTEs;

  // =====================================================================
  // ADJUSTED TIMELINE
  // =====================================================================
  const dataTimeMult = DATA_TIMELINE_MULTIPLIER[dataReadiness] || 1.10;
  const sizeMult = SIZE_MULTIPLIER[companySize] || 1.0;
  const sponsorTimeMult = inputs.execSponsor ? 1.0 : 1.25;
  const adjustedTimeline = Math.ceil(
    expectedTimeline * dataTimeMult * sizeMult * sponsorTimeMult
  );

  // =====================================================================
  // ADJUSTED COSTS (user-stated)
  // =====================================================================
  const dataCostMult = DATA_COST_MULTIPLIER[dataReadiness] || 1.10;
  const userAdjustedImplCost = implementationBudget * dataCostMult;

  // =====================================================================
  // AI IMPLEMENTATION COST MODEL
  // Derives realistic staffing, labor, and operational costs from inputs
  // =====================================================================
  const deploymentFullyBurdenedRate = deploymentPlan.annualFullyBurdenedCost;
  const implTimelineYears = adjustedTimeline / 12;

  // Implementation engineering headcount
  const scopeMinEngineers = Math.max(1, Math.ceil(teamSize / 12));
  const timelinePressure = expectedTimeline <= 3 ? 1.5
    : expectedTimeline <= 6 ? 1.2
    : 1.0;
  const dataHeadcountMult = dataReadiness <= 2 ? 1.3
    : dataReadiness === 3 ? 1.1
    : 1.0;
  const maxTeam = MAX_IMPL_TEAM[companySize] || 10;
  const rawEngineers = Math.ceil(scopeMinEngineers * timelinePressure * dataHeadcountMult);
  const aiImplEngineers = Math.min(rawEngineers, maxTeam);
  const aiImplPMs = Math.max(0.5, Math.ceil(aiImplEngineers / 5));

  // The deployment plan owns both staffing and the fully burdened rate. This
  // is the same workforce mix shown in the wizard; no location salary table
  // can override it through an old link or hidden model default.
  const pacedDeploymentLaborCost = deploymentPlan.estimatedDeploymentLaborCost * industryCostMultiplier;
  const implementationStaffingTotal = Math.max(1, aiImplEngineers + aiImplPMs);
  const implEngineeringCost = pacedDeploymentLaborCost * (aiImplEngineers / implementationStaffingTotal);
  const implPMCost = pacedDeploymentLaborCost * (aiImplPMs / implementationStaffingTotal);
  const implInfraCost = (implEngineeringCost + implPMCost) * 0.12;
  const implTrainingCost = (implEngineeringCost + implPMCost) * 0.08;
  const computedImplCost = (implEngineeringCost + implPMCost + implInfraCost + implTrainingCost)
    * caseBuildComplexityMultiplier;
  const realisticImplCost = Math.max(userAdjustedImplCost, computedImplCost);

  // Ongoing AI operations team — 15% of impl engineers (fractional support post-launch)
  const ongoingAiHeadcount = Math.max(0.5, Math.round(aiImplEngineers * 0.15 * 2) / 2);
  const ongoingAiLaborCost = ongoingAiHeadcount * deploymentFullyBurdenedRate;

  // AI cost meters. Explicit inputs override a process-volume estimate, so the
  // model never treats workforce headcount itself as consumption volume.
  const asNonNegative = (value, fallback = 0) => {
    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) ? Math.max(0, numeric) : fallback;
  };
  const archetypeInputValues = normalizedArchetypeInputs;
  const monthlyArchetypeVolume = [
    inputs.processVolume,
    archetypeInputValues.processVolume,
    archetypeInputValues.ticketsPerMonth,
    archetypeInputValues.reportsPerMonth,
    archetypeInputValues.reviewsPerMonth,
    archetypeInputValues.queriesPerMonth,
    archetypeInputValues.documentsPerMonth,
    asNonNegative(inputs.searchQueriesPerDay) * 30,
    asNonNegative(archetypeInputValues.searchQueriesPerDay) * 30,
  ].map(value => asNonNegative(value)).find(value => value > 0) || 0;
  const isAgenticWorkflow = inputs.isAgenticWorkflow ?? assumptions.isAgenticWorkflow ?? false;
  const requestsPerHour = assumptions.requestsPerPersonHour
    ?? REQUESTS_PER_PERSON_HOUR[processType]
    ?? 12;
  const modeledMonthlyAiRequests = monthlyArchetypeVolume > 0
    ? monthlyArchetypeVolume
    : teamSize * hoursPerWeek * 4.33 * requestsPerHour;
  const aiLicensedUsers = Math.max(1, asNonNegative(
    inputs.aiLicensedUsers ?? assumptions.aiLicensedUsers,
    teamSize
  ));
  const monthlyAiRequests = asNonNegative(
    inputs.monthlyAiRequests ?? assumptions.monthlyAiRequests,
    modeledMonthlyAiRequests
  );
  const monthlyAgentWorkflows = asNonNegative(
    inputs.monthlyAgentWorkflows ?? assumptions.monthlyAgentWorkflows,
    isAgenticWorkflow ? monthlyAiRequests : 0
  );
  const documentsPerMonth = asNonNegative(
    inputs.documentsPerMonth ?? assumptions.documentsPerMonth,
    processType === 'Document Processing' ? monthlyArchetypeVolume : 0
  );
  const dataStoredGb = asNonNegative(inputs.dataStoredGb ?? assumptions.dataStoredGb, 0);
  const connectedApplications = asNonNegative(
    inputs.connectedApplications ?? assumptions.connectedApplications,
    0
  );
  const monthlyTaskVolume = monthlyAiRequests;

  // Token-based cost model (activates when user provides token-level inputs or model tier)
  const explicitUseTokenModel = inputs.useTokenModel ?? assumptions.useTokenModel;
  const useTokenModel = explicitUseTokenModel ?? (
    inputs.modelTier != null
    || assumptions.modelTier != null
    || inputs.avgInputTokensPerRequest != null
    || assumptions.avgInputTokensPerRequest != null
  );

  const tokenProfile = TOKEN_PROFILES[processType] || TOKEN_PROFILES['Other'];
  const modelTier = inputs.modelTier ?? assumptions.modelTier ?? 'standard';
  const modelPricing = MODEL_TIERS[modelTier] || MODEL_TIERS['standard'];
  const avgInputTokens = inputs.avgInputTokensPerRequest
    ?? assumptions.avgInputTokensPerRequest
    ?? tokenProfile.avgInput;
  const avgOutputTokens = inputs.avgOutputTokensPerRequest
    ?? assumptions.avgOutputTokensPerRequest
    ?? tokenProfile.avgOutput;
  const inputCostPer1M = inputs.inputTokenCostPer1M
    ?? assumptions.inputTokenCostPer1M
    ?? modelPricing.inputPer1M;
  const outputCostPer1M = inputs.outputTokenCostPer1M
    ?? assumptions.outputTokenCostPer1M
    ?? modelPricing.outputPer1M;

  // Prompt caching — reduces effective input token cost
  const promptCachingRate = inputs.promptCachingRate ?? assumptions.promptCachingRate ?? PROMPT_CACHING_RATE;
  const effectiveInputCostPer1M = inputCostPer1M * (1 - promptCachingRate * CACHED_INPUT_DISCOUNT);

  // Agent complexity — multiple LLM calls per task for agentic workflows
  const agentComplexity = inputs.agentComplexity ?? assumptions.agentComplexity ?? 'moderate';
  const agentProfile = isAgenticWorkflow
    ? (AGENT_COST_PROFILES[agentComplexity] || AGENT_COST_PROFILES['moderate'])
    : AGENT_COST_PROFILES['simple'];
  const llmCallsPerTask = agentProfile.llmCallsPerTask;
  const monthlyLLMCalls = monthlyAiRequests * llmCallsPerTask;

  // Token costs
  const monthlyInputTokens = monthlyLLMCalls * avgInputTokens;
  const monthlyOutputTokens = monthlyLLMCalls * avgOutputTokens;
  const monthlyInputCost = (monthlyInputTokens / 1_000_000) * effectiveInputCostPer1M;
  const monthlyOutputCost = (monthlyOutputTokens / 1_000_000) * outputCostPer1M;
  const monthlyTokenCost = monthlyInputCost + monthlyOutputCost;

  // Agent infrastructure costs (orchestration, vector DB, eval, guardrails)
  const agentInfraDefaults = AGENT_INFRASTRUCTURE_MONTHLY[companySize]
    || AGENT_INFRASTRUCTURE_MONTHLY['Mid-Market (501-5,000)'];
  const monthlyAgentInfraCost = isAgenticWorkflow
    ? (inputs.orchestrationPlatformCost ?? assumptions.orchestrationPlatformCost ?? agentInfraDefaults.orchestration)
      + (inputs.vectorDatabaseCost ?? assumptions.vectorDatabaseCost ?? agentInfraDefaults.vectorDb)
      + (inputs.evalMonitoringCost ?? assumptions.evalMonitoringCost ?? agentInfraDefaults.evalMonitoring)
      + (inputs.guardrailsCost ?? assumptions.guardrailsCost ?? agentInfraDefaults.guardrails)
    : 0;

  // Consumption is genuinely volume-based: model calls, agent runs, and
  // document processing. Orchestration/monitoring remains in Run costs.
  const apiCostPerK = inputs.apiCostPer1kRequests
    ?? assumptions.apiCostPer1kRequests
    ?? API_COST_PER_1K_REQUESTS[processType]
    ?? 10;
  const monthlyInferenceCost = useTokenModel
    ? monthlyTokenCost
    : (monthlyAiRequests / 1000) * apiCostPerK;
  const monthlyAgentWorkflowComputeCost = monthlyAgentWorkflows
    * agentProfile.toolCallsPerTask
    * 0.01
    * industryCostMultiplier;
  const monthlyDocumentProcessingCost = documentsPerMonth * 0.002;
  const monthlyApiVolume = monthlyAiRequests;
  const monthlyApiCost = monthlyInferenceCost + monthlyAgentWorkflowComputeCost + monthlyDocumentProcessingCost;
  const annualApiCost = monthlyApiCost * 12;

  // Access is the fixed platform/user licensing planning envelope.
  const annualBasePlatformLicense = (PLATFORM_LICENSE_COST[companySize] || 48000) * industryCostMultiplier;
  const annualUserLicenseCost = aiLicensedUsers * 360 * industryCostMultiplier;
  const annualLicenseCost = annualBasePlatformLicense + annualUserLicenseCost;
  const annualAdjacentCost = annualBasePlatformLicense * ADJACENT_PRODUCT_RATE;

  // Run costs cover support, monitoring, governance, continuous improvement,
  // data transfer/storage, and connected-system upkeep.
  const modelRetrainingCost = realisticImplCost * MODEL_RETRAINING_RATE;
  const annualComplianceCostVal = (ANNUAL_COMPLIANCE_COST[companySize] || 30000) * industryCostMultiplier;
  const retrainedEmployees = usesExplicitRedundancyPlan
    ? workforceTransition.employeesToRetrain
    : retainedFTEs;
  const retrainingCostPerEmployee = workforceMix.hasWorkforceMix
    ? workforceMix.employeeFullyBurdenedCost
    : avgSalary;
  const retainedRetrainingCost = retrainedEmployees * retrainingCostPerEmployee * RETAINED_RETRAINING_RATE;
  const techDebtCost = realisticImplCost * TECH_DEBT_RATE;
  const cyberInsuranceCost = (CYBER_INSURANCE_INCREASE[companySize] || 12000) * industryCostMultiplier;

  // Retained talent premium — wage increase to keep top performers during AI transition
  const retainedTalentPremiumRate = inputs.retainedTalentPremiumRate ?? RETAINED_TALENT_PREMIUM_RATE;
  const retainedTalentPremium = retainedFTEs * avgSalary * retainedTalentPremiumRate;

  // Data egress, stored data, and connected applications are Run costs rather
  // than token consumption. They scale with the fixed company envelope and
  // optional real meters.
  const dataTransferBaselineMonthly = (DATA_TRANSFER_COST_MONTHLY[companySize] || 3000)
    * industryCostMultiplier;
  const dataStorageCostMonthly = dataStoredGb * 0.12;
  const connectedApplicationCostMonthly = connectedApplications * 100 * industryCostMultiplier;
  const dataTransferCostMonthly = dataTransferBaselineMonthly
    + dataStorageCostMonthly
    + connectedApplicationCostMonthly;
  const dataTransferCostAnnual = dataTransferCostMonthly * 12;
  const annualAgentInfrastructureCost = monthlyAgentInfraCost * 12;

  // Four executive buckets: Build is one-time; Access, Consumption, and Run
  // are annual. Retained talent premium stays outside operating buckets.
  const accessAnnual = annualLicenseCost + annualAdjacentCost;
  const consumptionAnnual = annualApiCost;
  const runAnnual = ongoingAiLaborCost + annualAgentInfrastructureCost + modelRetrainingCost
    + annualComplianceCostVal + retainedRetrainingCost + techDebtCost + cyberInsuranceCost
    + dataTransferCostAnnual;
  const coreOngoingCost = accessAnnual + consumptionAnnual + ongoingAiLaborCost
    + annualAgentInfrastructureCost;
  const computedOngoingCost = accessAnnual + consumptionAnnual + runAnnual;
  // Use computed ongoing if user didn't provide a value; never silently override user input
  const userProvidedOngoing = inputs.ongoingAnnualCost != null;
  const baseOngoingCost = userProvidedOngoing ? ongoingAnnualCost : computedOngoingCost;
  const ongoingCostOverridden = !userProvidedOngoing && computedOngoingCost > ongoingAnnualCost;
  const modeledAnnualBucketTotal = accessAnnual + consumptionAnnual + runAnnual;
  const costAllocationShares = modeledAnnualBucketTotal > 0
    ? {
      access: accessAnnual / modeledAnnualBucketTotal,
      consumption: consumptionAnnual / modeledAnnualBucketTotal,
      run: runAnnual / modeledAnnualBucketTotal,
    }
    : { access: 0, consumption: 0, run: 0 };
  const planningHorizonYears = Math.max(
    1,
    Math.min(DCF_YEARS, Math.round(asNonNegative(inputs.costPlanningHorizonYears, DCF_YEARS)))
  );
  const programAllocationTotal = realisticImplCost + (modeledAnnualBucketTotal * planningHorizonYears);
  const programAllocationShares = programAllocationTotal > 0
    ? {
      build: realisticImplCost / programAllocationTotal,
      access: (accessAnnual * planningHorizonYears) / programAllocationTotal,
      consumption: (consumptionAnnual * planningHorizonYears) / programAllocationTotal,
      run: (runAnnual * planningHorizonYears) / programAllocationTotal,
    }
    : { build: 0, access: 0, consumption: 0, run: 0 };
  const planningRanges = {
    build: { min: 0.30, max: 0.45 },
    access: { min: 0.20, max: 0.30 },
    consumption: { min: 0.10, max: 0.25 },
    run: { min: 0.15, max: 0.25 },
  };
  const sourceFootnotes = (ids) => BENCHMARK_SOURCES
    .filter(source => ids.includes(source.id))
    .map(({ id, short, full }) => ({ id, short, full }));
  const benchmarkMetadata = {
    industryCostMultiplier: {
      type: 'model-planning-assumption',
      note: 'The exact industry multipliers are editable model planning guidance for regulated or safety-critical delivery; they are not a quoted market price. The cited sources provide context on integration complexity and delivery timelines, not proof of these exact multipliers.',
      sources: sourceFootnotes([9, 43]),
    },
    planningRanges: {
      type: 'user-planning-guidance',
      note: 'Build 30–45%, Access 20–30%, Consumption 10–25%, and Run 15–25% are directional planning ranges supplied for this model, not an external benchmark.',
      sources: [],
    },
    deliveryPace: {
      type: 'model-user-scenario',
      note: 'Accelerated (+20% staffing/cost) and extended (-20% staffing/cost) are editable user/model scenarios, not externally benchmarked commitments. The cited PMI material gives only general contingency context.',
      sources: sourceFootnotes([10]),
    },
    usageMeters: {
      type: 'user-entered-or-model-workload-proxy',
      note: 'Users, requests, tokens, agent workflows, documents, stored data, and connected applications should be measured company inputs. Defaults are model workload proxies, not market benchmarks; cited sources provide pricing and architecture context only.',
      sources: sourceFootnotes([11, 29, 30, 36]),
    },
  };
  const costBuckets = {
    buildIntegrationOneTime: realisticImplCost,
    accessAnnual,
    consumptionAnnual,
    runAnnual,
    modeledAnnualTotal: modeledAnnualBucketTotal,
    annualTotal: baseOngoingCost,
    costAllocationShares,
    planningHorizonYears,
    programAllocationShares,
    planningRanges,
    benchmarkMetadata,
  };

  // 5-year ongoing costs with tapered vendor escalation + compliance escalation
  // Years 1-2: 12% increase, Years 3-4: 7% (stabilized)
  // Compliance portion escalates separately at 8% annually (growing regulatory burden)
  const baseOngoingExCompliance = baseOngoingCost - annualComplianceCostVal;
  const ongoingCostsByYear = [];
  let cumulativeEscalation = 1.0;
  for (let yr = 0; yr < DCF_YEARS; yr++) {
    cumulativeEscalation *= (1 + (AI_COST_ESCALATION_SCHEDULE[yr] || 0));
    const complianceCostThisYear = annualComplianceCostVal * Math.pow(1 + COMPLIANCE_ESCALATION_RATE, yr);
    ongoingCostsByYear.push(baseOngoingExCompliance * cumulativeEscalation + complianceCostThisYear);
  }
  const totalOngoing5Year = ongoingCostsByYear.reduce((sum, c) => sum + c, 0);

  const aiCostModel = {
    // `aiSalary` is retained as a compatibility alias for older report
    // templates. It now always equals the entered blended workforce rate.
    aiSalary: deploymentFullyBurdenedRate,
    deploymentFullyBurdenedRate,
    industryCostMultiplier,
    deploymentPlan: {
      ...deploymentPlan,
      adjustedTimelineMonths: adjustedTimeline,
      estimatedBuildIntegrationCost: realisticImplCost,
    },
    implEngineers: aiImplEngineers,
    implPMs: aiImplPMs,
    implTimelineYears,
    implEngineeringCost,
    implPMCost,
    implInfraCost,
    implTrainingCost,
    computedImplCost,
    realisticImplCost,
    budgetGap: computedImplCost - userAdjustedImplCost,
    ongoingAiHeadcount,
    ongoingAiLaborCost,
    monthlyApiVolume,
    monthlyApiCost,
    annualApiCost,
    annualBasePlatformLicense,
    annualUserLicenseCost,
    annualLicenseCost,
    annualAdjacentCost,
    costBuckets,
    costAllocationShares,
    usageMeters: {
      aiLicensedUsers,
      monthlyAiRequests,
      avgInputTokensPerRequest: avgInputTokens,
      avgOutputTokensPerRequest: avgOutputTokens,
      monthlyAgentWorkflows,
      documentsPerMonth,
      dataStoredGb,
      connectedApplications,
      monthlyArchetypeVolume,
      monthlyLLMCalls,
    },
    coreOngoingCost,
    modelRetrainingCost,
    annualComplianceCost: annualComplianceCostVal,
    retainedRetrainingCost,
    techDebtCost,
    cyberInsuranceCost,
    retainedTalentPremium,
    retainedTalentPremiumRate,
    retainedTalentPremiumNote: 'Workforce planning cost — not included in AI ongoing costs',
    dataTransferCostAnnual,
    dataTransferBaselineMonthly,
    dataStorageCostMonthly,
    connectedApplicationCostMonthly,
    annualAgentInfrastructureCost,
    isAgenticWorkflow,
    computedOngoingCost,
    userProvidedOngoing,
    ongoingCostOverridden,
    baseOngoingCost,
    ongoingCostsByYear,
    totalOngoing5Year,
    escalationSchedule: AI_COST_ESCALATION_SCHEDULE,
    // V5: Token-based cost model
    tokenCostModel: {
      useTokenModel,
      modelTier,
      modelTierLabel: modelPricing.label,
      avgInputTokensPerRequest: avgInputTokens,
      avgOutputTokensPerRequest: avgOutputTokens,
      inputCostPer1M,
      outputCostPer1M,
      effectiveInputCostPer1M,
      promptCachingRate,
      monthlyTaskVolume,
      monthlyLLMCalls,
      monthlyInputTokens,
      monthlyOutputTokens,
      monthlyInputCost,
      monthlyOutputCost,
      monthlyTokenCost,
      annualTokenCost: monthlyTokenCost * 12,
      costPerRequest: monthlyLLMCalls > 0 ? monthlyTokenCost / monthlyLLMCalls : 0,
      costPer1kRequests: monthlyLLMCalls > 0 ? (monthlyTokenCost / monthlyLLMCalls) * 1000 : 0,
    },
    // V5: Agent infrastructure
    agentInfrastructure: {
      isAgentic: isAgenticWorkflow,
      agentComplexity,
      agentProfileLabel: agentProfile.label,
      llmCallsPerTask,
      toolCallsPerTask: agentProfile.toolCallsPerTask,
      monthlyAgentInfraCost,
      annualAgentInfraCost: monthlyAgentInfraCost * 12,
    },
  };

  // =====================================================================
  // ONE-TIME TRANSITION COSTS
  // Separation costs are calculated here but NOT in upfront investment —
  // they are phased over Years 2-5 as cash outflows
  // =====================================================================

  // Explicit redundancy plans use the requested 1.5× fully burdened employee
  // cost. Legacy saved models retain the existing company-size benchmark.
  const separationMultiplier = usesExplicitRedundancyPlan
    ? 1.5
    : (SEPARATION_COST_MULTIPLIER[companySize] || 1.0);
  const separationCostPerFTE = usesExplicitRedundancyPlan
    ? workforceTransition.oneTimeRedundancyCost / Math.max(displacedFTEs, 1)
    : avgSalary * separationMultiplier;
  const totalSeparationCost = usesExplicitRedundancyPlan
    ? workforceTransition.oneTimeRedundancyCost
    : displacedFTEs * separationCostPerFTE;

  // Itemized separation breakdown
  const separationBreakdown = {};
  for (const [key, { rate, label }] of Object.entries(SEPARATION_COST_BREAKDOWN)) {
    separationBreakdown[key] = {
      label,
      perFTE: separationCostPerFTE * rate,
      total: totalSeparationCost * rate,
    };
  }

  // Explicit plans phase severance 50% / 30% / 20% across Years 1–3.
  const separationByYear = usesExplicitRedundancyPlan
    ? workforceTransition.redundancyCostByYear
    : HEADCOUNT_REDUCTION_SCHEDULE.map(pct => totalSeparationCost * pct);

  const severanceWeeks = SEVERANCE_WEEKS[companySize] || 8;

  // Legal & compliance (increased to include employment law, regulatory filings)
  const legalComplianceCost = LEGAL_COMPLIANCE_COST[companySize] || 50000;

  // Security & privacy audit (increased to include SOC2/ISO, third-party risk)
  const securityAuditCost = SECURITY_AUDIT_COST[companySize] || 40000;

  // Contingency reserve
  const contingencyReserve = realisticImplCost * CONTINGENCY_RATE;

  // Vendor switching cost (actual dollar amount — cost to switch AWAY from AI vendor later)
  const vendorSwitchingRate = VENDOR_SWITCHING_COST[companySize] || 0.35;
  const vendorSwitchingCost = realisticImplCost * vendorSwitchingRate;

  // Legacy vendor termination is retained for existing saved models. New
  // contract inputs use an auditable notice-period formula.
  const vendorsReplaced = inputs.vendorsReplaced || 0;
  const legacyVendorTerminationCost = inputs.vendorTerminationCost || 0;
  const contractExitCost = contractExit.contractExitCost;
  // New contract inputs replace the legacy flat vendor-exit field. A legacy
  // saved model may have only the flat field, so preserve it as the fallback.
  // Never add both or the cancellation cost is counted twice.
  const effectiveContractExitCost = contractExit.annualExistingContractCost > 0
    ? contractExitCost
    : legacyVendorTerminationCost;

  // One-time costs that are truly upfront (NO separation — it's phased)
  const totalOneTimeCosts = legalComplianceCost + securityAuditCost + contingencyReserve
    + effectiveContractExitCost;

  const oneTimeCosts = {
    displacedFTEs,
    retainedFTEs,
    maxHeadcountReduction: MAX_HEADCOUNT_REDUCTION,
    processAllocation,
    headcountFeasible,
    separationMultiplier,
    separationCostPerFTE,
    totalSeparationCost,
    separationBreakdown,
    separationByYear,
    separationPhasing: headcountReductionSchedule,
    severanceWeeks,
    legalComplianceCost,
    securityAuditCost,
    contingencyReserve,
    vendorSwitchingCost,
    vendorSwitchingRate,
    vendorsReplaced,
    vendorTerminationCost: legacyVendorTerminationCost,
    existingContractCount: contractExit.existingContractCount,
    annualCostPerContract: contractExit.annualCostPerContract,
    contractNoticePeriodMonths: contractExit.contractNoticePeriodMonths,
    annualContractSpend,
    contractExitCost,
    effectiveContractExitCost,
    benchmarkMetadata: {
      redundancyCost: {
        type: 'model-assumption-with-context',
        note: 'The explicit 1.5× fully burdened cost is a conservative editable model assumption. The cited SHRM range is 1.0–1.5× annual salary, so it provides context rather than direct support for a fully burdened-cost multiplier.',
        sources: sourceFootnotes([15]),
      },
      redundancySchedule: {
        type: 'user-planning-schedule',
        note: 'The 50% / 30% / 20% Year 1–3 timing is the model’s stated transition plan, not an external benchmark.',
        sources: [],
      },
      contractExit: {
        type: 'user-entered-contract-term',
        note: 'Notice-period months and annual contract cost are user-entered contract terms.',
        sources: [],
      },
    },
    workforceTransition,
    totalOneTimeCosts,
  };

  // =====================================================================
  // HIDDEN COSTS (based on realistic implementation cost)
  // =====================================================================
  const changeManagement = realisticImplCost * 0.08;
  const culturalResistance = realisticImplCost * CULTURAL_RESISTANCE_RATE;
  const dataCleanup =
    realisticImplCost *
    (dataReadiness <= 2 ? 0.15 : dataReadiness === 3 ? 0.05 : 0);
  const integrationTesting = realisticImplCost * 0.05;
  // Productivity dip scaled by company size (McKinsey Change 2025)
  const dipParams = PRODUCTIVITY_DIP_PARAMS[companySize] || { months: 3, dipRate: 0.25 };
  const productivityDip = (annualLaborCost / 12) * dipParams.months * dipParams.dipRate;
  const totalHidden = changeManagement + culturalResistance + dataCleanup + integrationTesting + productivityDip;

  const hiddenCosts = {
    changeManagement,
    culturalResistance,
    dataCleanup,
    integrationTesting,
    productivityDip,
    totalHidden,
  };

  // =====================================================================
  // UPFRONT INVESTMENT (no separation costs — those are phased)
  // =====================================================================
  const upfrontInvestment = realisticImplCost + totalHidden + totalOneTimeCosts;

  // Total investment = upfront + all phased separation (for total picture)
  const totalInvestment = upfrontInvestment + totalSeparationCost;

  // =====================================================================
  // VALUE CREATION BREAKDOWN
  // 4 categories, with per-employee gain and enhancement vs headcount phases
  // =====================================================================
  const toolReplacementRate = assumptions.toolReplacementRate ?? TOOL_REPLACEMENT_RATE[inputs.processType] ?? 0.40;

  const headcountSavingsGross = usesExplicitRedundancyPlan
    ? workforceTransition.annualHeadcountSavings
    : displacedFTEs * avgSalary;
  // Explicit efficiency plans describe capacity created. Only declared direct
  // employee redundancies become hard cash savings; the remaining capacity is
  // returned separately so it is never counted twice in the DCF.
  const eligibleLaborCost = workforceAnnualHours > 0
    ? annualLaborCost * Math.min(1, eligibleAnnualHours / workforceAnnualHours)
    : 0;
  const efficiencySavingsGross = usesExplicitRedundancyPlan
    ? 0
    : Math.max(0, (eligibleLaborCost * totalEfficiencyGainPct) - headcountSavingsGross);
  const capacityOnlyEfficiencyValue = usesExplicitRedundancyPlan
    ? workforceTransition.annualCapacityOnlyValue
    : 0;
  // In the new explicit plan, total efficiency gain is the final operating
  // assumption. Do not let the broader automation-potential benchmark imply a
  // larger rework reduction than the user entered.
  const reworkReductionRate = usesExplicitRedundancyPlan
    ? totalEfficiencyGainPct
    : automationPotential;
  const coreBenefitsEnabled = !isRetiredCase && !workloadExceedsCapacity;
  const errorReductionGross = coreBenefitsEnabled
    ? annualReworkCost * reworkReductionRate
    : 0;
  const toolReplacementGross = coreBenefitsEnabled
    ? currentToolCosts * toolReplacementRate
    : 0;
  const contractSavingsGross = coreBenefitsEnabled
    ? annualContractSpend
    : 0;
  // This is a measured customer-support cost claim, not a revenue forecast.
  // It is only allowed into the core DCF after the Operations validation gate.
  const directCaseSavingsGross = caseDirectSavingsGross;

  // Enhancement savings = what you get Year 1 (no headcount reduction yet)
  const enhancementGross = efficiencySavingsGross + errorReductionGross + toolReplacementGross
    + contractSavingsGross + directCaseSavingsGross;
  const enhancementRiskAdjusted = enhancementGross * riskMultiplier;

  // =====================================================================
  // ANNUAL SAVINGS (gross metrics for reference)
  // Uses decomposed value breakdown to avoid applying automation % to tool costs
  // =====================================================================
  const grossAnnualSavings = headcountSavingsGross + efficiencySavingsGross + errorReductionGross
    + toolReplacementGross + contractSavingsGross + directCaseSavingsGross;
  // Risk multiplier applies only to enhancement savings, not headcount (reviewer fix P1)
  const riskAdjustedSavings = headcountSavingsGross + enhancementRiskAdjusted;
  const netAnnualSavings = riskAdjustedSavings - baseOngoingCost;

  // De-duplicated risk architecture (reviewer fix P1):
  // - Enhancement savings (efficiency + error + tool): apply riskMultiplier + adoption ramp
  // - Headcount savings: apply ONLY the HR phasing schedule (it already gates realization)
  //   Risk multiplier is NOT applied to headcount because the phasing schedule IS the
  //   operational reality of adoption friction for headcount changes.
  const valueBreakdown = {
    headcount: {
      gross: headcountSavingsGross,
      riskAdjusted: headcountSavingsGross, // no risk multiplier — gated by HR schedule
    },
    efficiency: {
      gross: efficiencySavingsGross,
      riskAdjusted: efficiencySavingsGross * riskMultiplier,
      capacityOnly: capacityOnlyEfficiencyValue,
      freedUpAnnualHours: usesExplicitRedundancyPlan ? workforceTransition.freedUpAnnualHours : 0,
    },
    errorReduction: {
      gross: errorReductionGross,
      riskAdjusted: errorReductionGross * riskMultiplier,
    },
    toolReplacement: {
      gross: toolReplacementGross,
      riskAdjusted: toolReplacementGross * riskMultiplier,
    },
    contractExit: {
      gross: contractSavingsGross,
      riskAdjusted: contractSavingsGross * riskMultiplier,
      annualContractSpend,
      oneTimeExitCost: contractExitCost,
    },
    caseDirectSavings: {
      gross: directCaseSavingsGross,
      riskAdjusted: directCaseSavingsGross * riskMultiplier,
      validated: caseDirectSavingsEnabled,
      label: 'Verified customer support cost avoidance',
    },
    // Kept at zero for older renderers that expect this property. Revenue
    // forecasts are not a supported core-Dcf value stream.
    archetypeRevenue: {
      gross: 0,
      riskAdjusted: 0,
    },
    totalGross: headcountSavingsGross + efficiencySavingsGross + errorReductionGross
      + toolReplacementGross + contractSavingsGross + directCaseSavingsGross,
    totalRiskAdjusted: headcountSavingsGross + (efficiencySavingsGross + errorReductionGross
      + toolReplacementGross + contractSavingsGross + directCaseSavingsGross) * riskMultiplier,
    // Per-employee productivity gain in Year 1 (enhancement phase, before any layoffs)
    perEmployeeGain: teamSize > 0
      ? enhancementRiskAdjusted / teamSize
      : 0,
    // Enhancement phase: Year 1 savings (efficiency + error + tool, NO headcount)
    enhancementPhaseAnnual: enhancementRiskAdjusted,
    // Headcount phase: additional annual savings when fully phased out
    headcountPhaseAnnual: headcountSavingsGross * riskMultiplier,
    // Ongoing AI cost (so UI can show net)
    ongoingAiCostYear1: baseOngoingCost,
  };

  // =====================================================================
  // 5-YEAR CASH FLOW MODEL
  // Year 1: Enhancement only (AI augments people, no layoffs)
  // Years 2-5: Phased headcount reduction with separation costs
  // Ongoing AI costs escalate 12%/year after Year 1
  // Model drift degrades benefits 3%/year (partially offset by retraining budget)
  // =====================================================================
  const modelDriftRate = assumptions.modelDriftRate ?? MODEL_DRIFT_RATE;

  function buildYearCashFlows(scenarioMultiplier) {
    const flows = [];
    let cumulativeReduction = 0;
    let cumulativeNet = -upfrontInvestment;

    for (let yr = 0; yr < DCF_YEARS; yr++) {
      // Savings inflate with wage growth (the labor costs being avoided grow annually)
      const wageGrowth = Math.pow(1 + wageInflationRate, yr);

      // Model drift — AI benefit degradation from data/model staleness
      // Year 0 = no drift; subsequent years degrade unless maintained
      const driftFactor = Math.pow(1 - modelDriftRate, yr);

      // Enhancement savings (efficiency + error + tool + revenue) — adoption ramp + drift
      const enhancementSavings = enhancementRiskAdjusted * adoptionRamp[yr] * scenarioMultiplier * wageGrowth * driftFactor;

      // Headcount savings — phased reduction (cumulative), also subject to drift
      cumulativeReduction += headcountReductionSchedule[yr];
      const headcountSavings = valueBreakdown.headcount.riskAdjusted * cumulativeReduction * scenarioMultiplier * wageGrowth * driftFactor;

      // Total gross savings this year
      const grossSavings = enhancementSavings + headcountSavings;

      // Separation costs incurred this year (people let go this year)
      const separationCost = separationByYear[yr];

      // Ongoing AI costs (escalating)
      const ongoingCost = ongoingCostsByYear[yr];

      // Net cash flow
      const netCashFlow = grossSavings - separationCost - ongoingCost;
      cumulativeNet += netCashFlow;

      flows.push({
        year: yr + 1,
        enhancementSavings,
        headcountSavings,
        grossSavings,
        separationCost,
        ongoingCost,
        netCashFlow,
        cumulativeReduction,
        netCumulative: cumulativeNet,
      });
    }
    return flows;
  }

  // =====================================================================
  // FINANCIAL METRICS (5-year DCF)
  // =====================================================================
  function calculateNPV(yearFlows) {
    let npv = -upfrontInvestment;
    for (let yr = 0; yr < yearFlows.length; yr++) {
      npv += yearFlows[yr].netCashFlow / Math.pow(1 + discountRate, yr + 1);
    }
    return npv;
  }

  function calculateIRR(yearFlows, maxIterations = 200) {
    const cashFlows = [-upfrontInvestment, ...yearFlows.map(f => f.netCashFlow)];

    // Check if IRR is solvable — need at least one sign change
    const hasPositive = cashFlows.some(cf => cf > 0);
    const hasNegative = cashFlows.some(cf => cf < 0);
    if (!hasPositive || !hasNegative) return NaN;

    // Newton-Raphson with dampening and bounds
    let rate = 0.10;
    for (let i = 0; i < maxIterations; i++) {
      if (!isFinite(rate) || rate <= -0.99 || rate > 100) return NaN;

      let npv = 0;
      let dnpv = 0;
      for (let t = 0; t < cashFlows.length; t++) {
        const denom = Math.pow(1 + rate, t);
        if (!isFinite(denom) || denom === 0) return NaN;
        npv += cashFlows[t] / denom;
        dnpv -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
      }
      if (Math.abs(dnpv) < 1e-10) break;
      let step = npv / dnpv;
      // Dampen large steps to prevent divergence
      if (Math.abs(step) > 1) step = Math.sign(step) * 1;
      const newRate = rate - step;
      if (!isFinite(newRate)) return NaN;
      if (Math.abs(newRate - rate) < 0.0001) {
        // Converged — sanity check result
        if (newRate < -1 || newRate > 10) return NaN; // >1000% is not credible
        return newRate;
      }
      rate = newRate;
    }
    // Solver didn't converge or result is absurd
    if (rate < -1 || rate > 10 || !isFinite(rate)) return NaN;
    return rate;
  }

  function calculatePayback(yearFlows) {
    let cumulative = -upfrontInvestment;
    const maxMonths = DCF_YEARS * 12;
    for (let month = 1; month <= maxMonths; month++) {
      const yearIndex = Math.floor((month - 1) / 12);
      if (yearIndex >= yearFlows.length) break;
      const monthlyNet = yearFlows[yearIndex].netCashFlow / 12;
      cumulative += monthlyNet;
      if (cumulative >= 0) return month;
    }
    return maxMonths + 1; // >60 months
  }

  // ROIC = net profit / total capital deployed
  // Net profit = sum of all net cash flows - upfront investment
  // Total capital = upfront investment + all separation costs (phased)
  // Note: separation costs are already deducted from netCashFlow, so we only
  // subtract upfrontInvestment to get true net profit (avoids double-counting)
  function calculateROIC(yearFlows) {
    const totalNetReturn = yearFlows.reduce((sum, f) => sum + f.netCashFlow, 0);
    const netProfit = totalNetReturn - upfrontInvestment;
    return totalInvestment > 0 ? netProfit / totalInvestment : 0;
  }

  // =====================================================================
  // SCENARIOS (build year-by-year flows for each)
  // =====================================================================
  const scenarioConfigs = {
    conservative: { label: 'Conservative', multiplier: 0.75 },
    base: { label: 'Base Case', multiplier: 1.0 },
    optimistic: { label: 'Optimistic', multiplier: 1.25 },
  };

  const scenarioResults = {};
  for (const [key, config] of Object.entries(scenarioConfigs)) {
    const yearFlows = buildYearCashFlows(config.multiplier);
    const rawIRR = calculateIRR(yearFlows);
    const rawROIC = calculateROIC(yearFlows);

    const safeIRR = isFinite(rawIRR) ? rawIRR : NaN;
    const irrCapped = isFinite(safeIRR) ? Math.min(Math.max(safeIRR, MIN_BASE_IRR), MAX_BASE_IRR) : NaN;
    const roicCapped = Math.min(Math.max(rawROIC, MIN_BASE_ROIC), MAX_BASE_ROIC);

    // Average annual net for backward compat
    const avgNetSavings = yearFlows.reduce((sum, f) => sum + f.netCashFlow, 0) / DCF_YEARS;

    scenarioResults[key] = {
      ...config,
      savings: avgNetSavings,
      timeline: Math.ceil(adjustedTimeline * (key === 'conservative' ? 1.30 : key === 'optimistic' ? 0.80 : 1.0)),
      projections: yearFlows,
      npv: calculateNPV(yearFlows),
      irr: irrCapped,
      rawIrr: rawIRR,
      irrCapped: isFinite(safeIRR) && safeIRR > MAX_BASE_IRR,
      roic: roicCapped,
      rawRoic: rawROIC,
      roicCapped: rawROIC > MAX_BASE_ROIC,
      paybackMonths: calculatePayback(yearFlows),
    };
  }

  // Fast mode: Monte Carlo iterations only need scenario results — skip everything else
  if (inputs._mcMode === 'fast') {
    return { scenarios: scenarioResults, upfrontInvestment, totalInvestment, discountRate };
  }

  // Probability-weighted expected value across scenarios
  const scenarioWeights = { conservative: 0.25, base: 0.50, optimistic: 0.25 };
  const expectedNPV = Object.entries(scenarioWeights).reduce(
    (sum, [key, weight]) => sum + scenarioResults[key].npv * weight, 0
  );
  const expectedROIC = Object.entries(scenarioWeights).reduce(
    (sum, [key, weight]) => sum + scenarioResults[key].roic * weight, 0
  );

  // =====================================================================
  // VENDOR LOCK-IN (quantified as dollar amount)
  // =====================================================================
  function assessVendorLockIn() {
    let level;
    if (realisticImplCost > 500000 && (inputs.projectArchetype === 'internal-process-automation' || processType === 'Workflow Automation'))
      level = 'High';
    else if (realisticImplCost > 250000) level = 'Medium';
    else level = 'Low';

    return {
      level,
      switchingCost: vendorSwitchingCost,
      switchingRate: vendorSwitchingRate,
      escalationSchedule: AI_COST_ESCALATION_SCHEDULE,
      year5OngoingCost: ongoingCostsByYear[4],
      totalOngoing5Year: totalOngoing5Year,
      vendorsReplaced,
      vendorTerminationCost: effectiveContractExitCost,
      legacyVendorTerminationCost,
    };
  }

  // =====================================================================
  // SENSITIVITY ANALYSIS — Full DCF-based (BUG FIX #2: replaces simplified NPV)
  // Each sensitivity recalculates the complete 5-year DCF with modified parameters
  // =====================================================================
  const baseFlows = buildYearCashFlows(1.0);
  const baseNPV = calculateNPV(baseFlows);

  // Full DCF sensitivity: rebuilds year-by-year flows with modified savings/costs
  function sensitivityNPV(modEnhancementRA, modHeadcountRA, modOngoingByYear, modUpfront) {
    const flows = [];
    let cumulativeReduction = 0;
    for (let yr = 0; yr < DCF_YEARS; yr++) {
      const wageGrowth = Math.pow(1 + wageInflationRate, yr);
      const driftFactor = Math.pow(1 - modelDriftRate, yr);
      const eSavings = modEnhancementRA * adoptionRamp[yr] * wageGrowth * driftFactor;
      cumulativeReduction += headcountReductionSchedule[yr];
      const hSavings = modHeadcountRA * cumulativeReduction * wageGrowth * driftFactor;
      const sepCost = separationByYear[yr];
      const ongCost = modOngoingByYear[yr];
      const net = eSavings + hSavings - sepCost - ongCost;
      flows.push({ netCashFlow: net });
    }
    let npv = -modUpfront;
    for (let yr = 0; yr < flows.length; yr++) {
      npv += flows[yr].netCashFlow / Math.pow(1 + discountRate, yr + 1);
    }
    return npv;
  }

  // Helper: recompute investment from modified impl cost
  function investmentFromImplCost(modImplCost) {
    const modHidden =
      modImplCost * 0.15 +
      modImplCost * CULTURAL_RESISTANCE_RATE +
      modImplCost * (dataReadiness <= 2 ? 0.25 : dataReadiness === 3 ? 0.10 : 0) +
      modImplCost * 0.10 +
      productivityDip;
    return modImplCost + modHidden + totalOneTimeCosts;
  }

  // Helper: recompute enhancement/headcount RA from modified current cost
  // Recalculates displaced FTEs when team size or automation changes
  function valueFromCurrentCost(modCurrentCost, modAutomation, modTeamSize, modAnnualReworkCost = annualReworkCost) {
    const ap = modAutomation ?? automationPotential;
    const ts = modTeamSize ?? teamSize;
    const modLaborCost = Math.max(
      0,
      modCurrentCost - currentToolCosts - annualContractSpend - modAnnualReworkCost
    );
    const modAvgSalary = ts > 0 ? modLaborCost / ts : avgSalary;
    // Recalculate displaced FTEs for the modified scenario
    const modRawDisplaced = Math.round(ts * ap * adoptionRate);
    const modMaxDisplaced = Math.floor(ts * MAX_HEADCOUNT_REDUCTION);
    const modDisplacedFTEs = usesExplicitRedundancyPlan
      ? displacedFTEs
      : Math.min(modRawDisplaced, modMaxDisplaced);
    const modHeadGross = usesExplicitRedundancyPlan
      ? headcountSavingsGross
      : modDisplacedFTEs * modAvgSalary;
    const modEffGross = usesExplicitRedundancyPlan
      ? 0
      : Math.max(0, (ts * modAvgSalary) * ap - modHeadGross);
    const modErrGross = modAnnualReworkCost * (usesExplicitRedundancyPlan
      ? totalEfficiencyGainPct
      : ap);
    const modToolGross = currentToolCosts * (assumptions.toolReplacementRate ?? TOOL_REPLACEMENT_RATE[processType] ?? 0.40);
    const modEnhRA = (modEffGross + modErrGross + modToolGross + contractSavingsGross + directCaseSavingsGross) * riskMultiplier;
    const modHeadRA = modHeadGross;
    return { enhancementRA: modEnhRA, headcountRA: modHeadRA };
  }

  function sensitivityRow(label, baseVal, lowLabel, highLabel, npvLow, npvHigh) {
    return { label, baseVal, lowLabel, highLabel, npvLow, npvHigh, baseNPV };
  }

  // --- Team Size sensitivity (full DCF) ---
  const teamLow = Math.max(1, Math.round(teamSize * 0.80));
  const teamHigh = Math.round(teamSize * 1.20);
  function costForTeam(t) {
    const lab = t * avgSalary;
    return lab + annualReworkCost + currentToolCosts + annualContractSpend;
  }
  const teamLowVal = valueFromCurrentCost(costForTeam(teamLow), undefined, teamLow);
  const teamHighVal = valueFromCurrentCost(costForTeam(teamHigh), undefined, teamHigh);

  // --- Salary sensitivity ---
  const salLow = avgSalary * 0.80;
  const salHigh = avgSalary * 1.20;
  function costForSalary(s) {
    const lab = teamSize * s;
    return lab + annualReworkCost + currentToolCosts + annualContractSpend;
  }
  const salLowVal = valueFromCurrentCost(costForSalary(salLow));
  const salHighVal = valueFromCurrentCost(costForSalary(salHigh));

  // --- Measured rework cost sensitivity ---
  const reworkLow = annualReworkCost * 0.50;
  const reworkHigh = annualReworkCost * 1.50;
  function costForRework(reworkCost) {
    return teamSize * avgSalary + reworkCost + currentToolCosts + annualContractSpend;
  }
  const reworkLowVal = valueFromCurrentCost(costForRework(reworkLow), undefined, undefined, reworkLow);
  const reworkHighVal = valueFromCurrentCost(costForRework(reworkHigh), undefined, undefined, reworkHigh);

  // --- Automation potential sensitivity ---
  const autLow = Math.max(0.10, automationPotential - 0.15);
  const autHigh = Math.min(0.95, automationPotential + 0.15);
  const autLowVal = valueFromCurrentCost(totalCurrentCost, autLow);
  const autHighVal = valueFromCurrentCost(totalCurrentCost, autHigh);

  // --- Implementation cost sensitivity ---
  const budgetLow = 0.80;
  const budgetHigh = 1.50;
  const implLowInv = investmentFromImplCost(realisticImplCost * budgetLow);
  const implHighInv = investmentFromImplCost(realisticImplCost * budgetHigh);

  // --- Ongoing cost sensitivity ---
  const ongLow = baseOngoingCost * 0.50;
  const ongHigh = baseOngoingCost * 2.0;
  function ongoingByYearScaled(scale) {
    return ongoingCostsByYear.map(c => c * scale);
  }

  // Discount rate sensitivity helper — runs full NPV with a different discount rate
  function sensitivityNPVWithDiscount(discountRateOverride) {
    const flows = [];
    let cumulativeReduction = 0;
    for (let yr = 0; yr < DCF_YEARS; yr++) {
      const wageGrowth = Math.pow(1 + wageInflationRate, yr);
      const driftFactor = Math.pow(1 - modelDriftRate, yr);
      const eSavings = enhancementRiskAdjusted * adoptionRamp[yr] * wageGrowth * driftFactor;
      cumulativeReduction += headcountReductionSchedule[yr];
      const hSavings = valueBreakdown.headcount.riskAdjusted * cumulativeReduction * wageGrowth * driftFactor;
      const sepCost = separationByYear[yr];
      const ongCost = ongoingCostsByYear[yr];
      const net = eSavings + hSavings - sepCost - ongCost;
      flows.push({ netCashFlow: net });
    }
    let npv = -upfrontInvestment;
    for (let yr = 0; yr < flows.length; yr++) {
      npv += flows[yr].netCashFlow / Math.pow(1 + discountRateOverride, yr + 1);
    }
    return npv;
  }

  // Payback helper for sensitivity rows
  function sensitivityPayback(modEnhancementRA, modHeadcountRA, modOngoingByYear, modUpfront) {
    let cumulative = -modUpfront;
    const maxMonths = DCF_YEARS * 12;
    for (let month = 1; month <= maxMonths; month++) {
      const yearIndex = Math.floor((month - 1) / 12);
      if (yearIndex >= DCF_YEARS) break;
      const wageGrowth = Math.pow(1 + wageInflationRate, yearIndex);
      const driftFactor = Math.pow(1 - modelDriftRate, yearIndex);
      let cRed = 0;
      for (let y = 0; y <= yearIndex; y++) cRed += headcountReductionSchedule[y];
      const eSavings = modEnhancementRA * adoptionRamp[yearIndex] * wageGrowth * driftFactor;
      const hSavings = modHeadcountRA * cRed * wageGrowth * driftFactor;
      const monthlyNet = (eSavings + hSavings - separationByYear[yearIndex] - modOngoingByYear[yearIndex]) / 12;
      cumulative += monthlyNet;
      if (cumulative >= 0) return month;
    }
    return maxMonths + 1;
  }

  // --- Discount Rate sensitivity ---
  const discLow = Math.max(0.01, discountRate - 0.03);
  const discHigh = discountRate + 0.05;

  const extendedSensitivity = [
    sensitivityRow(
      'Team Size',
      `${teamSize} people`,
      `${teamLow} (-20%)`,
      `${teamHigh} (+20%)`,
      sensitivityNPV(teamLowVal.enhancementRA, teamLowVal.headcountRA, ongoingCostsByYear, upfrontInvestment),
      sensitivityNPV(teamHighVal.enhancementRA, teamHighVal.headcountRA, ongoingCostsByYear, upfrontInvestment),
    ),
    sensitivityRow(
      'Avg Cost per Person',
      `$${(avgSalary / 1000).toFixed(0)}K`,
      `$${(salLow / 1000).toFixed(0)}K (-20%)`,
      `$${(salHigh / 1000).toFixed(0)}K (+20%)`,
      sensitivityNPV(salLowVal.enhancementRA, salLowVal.headcountRA, ongoingCostsByYear, upfrontInvestment),
      sensitivityNPV(salHighVal.enhancementRA, salHighVal.headcountRA, ongoingCostsByYear, upfrontInvestment),
    ),
    sensitivityRow(
      'Measured Rework Cost',
      `$${(annualReworkCost / 1000).toFixed(0)}K`,
      `$${(reworkLow / 1000).toFixed(0)}K (-50%)`,
      `$${(reworkHigh / 1000).toFixed(0)}K (+50%)`,
      sensitivityNPV(reworkLowVal.enhancementRA, reworkLowVal.headcountRA, ongoingCostsByYear, upfrontInvestment),
      sensitivityNPV(reworkHighVal.enhancementRA, reworkHighVal.headcountRA, ongoingCostsByYear, upfrontInvestment),
    ),
    sensitivityRow(
      'Automation Potential',
      `${(automationPotential * 100).toFixed(0)}%`,
      `${(autLow * 100).toFixed(0)}% (-15pp)`,
      `${(autHigh * 100).toFixed(0)}% (+15pp)`,
      sensitivityNPV(autLowVal.enhancementRA, autLowVal.headcountRA, ongoingCostsByYear, upfrontInvestment),
      sensitivityNPV(autHighVal.enhancementRA, autHighVal.headcountRA, ongoingCostsByYear, upfrontInvestment),
    ),
    sensitivityRow(
      'Implementation Cost',
      `$${(realisticImplCost / 1000).toFixed(0)}K`,
      '-20%',
      '+50%',
      sensitivityNPV(enhancementRiskAdjusted, valueBreakdown.headcount.riskAdjusted, ongoingCostsByYear, implLowInv),
      sensitivityNPV(enhancementRiskAdjusted, valueBreakdown.headcount.riskAdjusted, ongoingCostsByYear, implHighInv),
    ),
    sensitivityRow(
      'Ongoing Annual Cost',
      `$${(baseOngoingCost / 1000).toFixed(0)}K`,
      `$${(ongLow / 1000).toFixed(0)}K (-50%)`,
      `$${(ongHigh / 1000).toFixed(0)}K (+100%)`,
      sensitivityNPV(enhancementRiskAdjusted, valueBreakdown.headcount.riskAdjusted, ongoingByYearScaled(0.50), upfrontInvestment),
      sensitivityNPV(enhancementRiskAdjusted, valueBreakdown.headcount.riskAdjusted, ongoingByYearScaled(2.0), upfrontInvestment),
    ),
    sensitivityRow(
      'Discount Rate',
      `${(discountRate * 100).toFixed(0)}%`,
      `${(discLow * 100).toFixed(1)}% (-3pp)`,
      `${(discHigh * 100).toFixed(1)}% (+5pp)`,
      sensitivityNPVWithDiscount(discLow),
      sensitivityNPVWithDiscount(discHigh),
    ),
  ];

  // Add payback to each sensitivity row (3B)
  extendedSensitivity.forEach((row, i) => {
    if (i === 0) { // Team Size
      row.paybackLow = sensitivityPayback(teamLowVal.enhancementRA, teamLowVal.headcountRA, ongoingCostsByYear, upfrontInvestment);
      row.paybackHigh = sensitivityPayback(teamHighVal.enhancementRA, teamHighVal.headcountRA, ongoingCostsByYear, upfrontInvestment);
    } else if (i === 1) { // Salary
      row.paybackLow = sensitivityPayback(salLowVal.enhancementRA, salLowVal.headcountRA, ongoingCostsByYear, upfrontInvestment);
      row.paybackHigh = sensitivityPayback(salHighVal.enhancementRA, salHighVal.headcountRA, ongoingCostsByYear, upfrontInvestment);
    } else if (i === 2) { // Measured rework cost
      row.paybackLow = sensitivityPayback(reworkLowVal.enhancementRA, reworkLowVal.headcountRA, ongoingCostsByYear, upfrontInvestment);
      row.paybackHigh = sensitivityPayback(reworkHighVal.enhancementRA, reworkHighVal.headcountRA, ongoingCostsByYear, upfrontInvestment);
    } else if (i === 3) { // Automation Potential
      row.paybackLow = sensitivityPayback(autLowVal.enhancementRA, autLowVal.headcountRA, ongoingCostsByYear, upfrontInvestment);
      row.paybackHigh = sensitivityPayback(autHighVal.enhancementRA, autHighVal.headcountRA, ongoingCostsByYear, upfrontInvestment);
    } else if (i === 4) { // Impl Cost
      row.paybackLow = sensitivityPayback(enhancementRiskAdjusted, valueBreakdown.headcount.riskAdjusted, ongoingCostsByYear, implLowInv);
      row.paybackHigh = sensitivityPayback(enhancementRiskAdjusted, valueBreakdown.headcount.riskAdjusted, ongoingCostsByYear, implHighInv);
    } else if (i === 5) { // Ongoing Cost
      row.paybackLow = sensitivityPayback(enhancementRiskAdjusted, valueBreakdown.headcount.riskAdjusted, ongoingByYearScaled(0.50), upfrontInvestment);
      row.paybackHigh = sensitivityPayback(enhancementRiskAdjusted, valueBreakdown.headcount.riskAdjusted, ongoingByYearScaled(2.0), upfrontInvestment);
    } else if (i === 6) { // Discount Rate — payback doesn't change with discount rate, but we include for consistency
      const basePB = calculatePayback(baseFlows);
      row.paybackLow = basePB;
      row.paybackHigh = basePB;
    }
  });

  // Backward-compatible summary sensitivity (uses full DCF base now)
  const sensitivity = {
    quickBaseNPV: baseNPV,
    lowerAdoption: extendedSensitivity[0].npvLow,
    higherCosts: extendedSensitivity[4].npvHigh,
    doubleTimeline: (() => {
      // Delayed adoption ramp for double-timeline scenario
      let npv = -upfrontInvestment;
      const delayedRamp = [0.30, 0.60, 0.85, 1.0, 1.0];
      let cumRed = 0;
      for (let yr = 0; yr < DCF_YEARS; yr++) {
        const wg = Math.pow(1 + wageInflationRate, yr);
        const enh = enhancementRiskAdjusted * delayedRamp[yr] * wg;
        cumRed += headcountReductionSchedule[yr];
        const hc = valueBreakdown.headcount.riskAdjusted * cumRed * wg;
        const net = enh + hc - separationByYear[yr] - ongoingCostsByYear[yr];
        npv += net / Math.pow(1 + discountRate, yr + 1);
      }
      return npv;
    })(),
    lowerAdoptionDelta: extendedSensitivity[0].npvLow - baseNPV,
    higherCostsDelta: extendedSensitivity[4].npvHigh - baseNPV,
    doubleTimelineDelta: 0, // will be set below
  };
  sensitivity.doubleTimelineDelta = sensitivity.doubleTimeline - baseNPV;

  // =====================================================================
  // OPPORTUNITY COST OF INACTION
  // =====================================================================
  const competitivePenalty = COMPETITIVE_PENALTY[industry] || 0.03;
  const complianceEscalation = COMPLIANCE_RISK_ESCALATION[industry] || 0.02;

  // Enhanced competitive erosion: revenue-based S-curve margin compression
  const userAnnualRevenueForErosion = inputs.annualRevenue || 0;
  const aiAdoptionRate = AI_ADOPTION_RATE_BY_INDUSTRY[industry] || 0.45;
  const marginCompression = MARGIN_COMPRESSION_BY_INDUSTRY[industry] || 0.025;

  // S-curve (logistic) adoption function for competitive erosion
  // Models that competitor AI adoption follows a logistic curve, not linear growth.
  // L = terminal adoption rate (from benchmarks), k = steepness (1.2 = moderate),
  // t0 = inflection point year (2.5 = midway through 5yr horizon)
  // Source: BCG 2025 technology adoption S-curves; McKinsey 2025 AI diffusion data
  function logisticAdoption(year, terminalRate, k = 1.2, t0 = 2.5) {
    return terminalRate / (1 + Math.exp(-k * (year - t0)));
  }

  function calculateInactionCost(delayYears) {
    let totalCost = 0;
    const yearlyBreakdown = [];
    for (let yr = 1; yr <= delayYears; yr++) {
      // Compounding: cost of wages that have grown yr years
      const wageInflation = annualLaborCost * (Math.pow(1 + wageInflationRate, yr) - 1);
      const legacyCreep = currentToolCosts * (Math.pow(1 + LEGACY_MAINTENANCE_CREEP, yr) - 1);
      // Enhanced: revenue-based S-curve margin compression when annualRevenue is provided
      let competitiveLoss;
      let revenueErosion = 0;
      let forgoneSavings = 0;
      if (userAnnualRevenueForErosion > 0) {
        // S-curve: adoption accelerates then plateaus, creating non-linear erosion
        // When using revenue-based erosion, skip forgoneSavings to avoid double-counting
        // (revenueErosion already captures the competitive cost of inaction)
        const adoptionPct = logisticAdoption(yr, aiAdoptionRate);
        revenueErosion = userAnnualRevenueForErosion * marginCompression * adoptionPct;
        competitiveLoss = revenueErosion;
      } else {
        // Fallback: cost-based competitive penalty + forgone savings
        forgoneSavings = netAnnualSavings * (yr <= DCF_YEARS ? adoptionRamp[Math.min(yr - 1, DCF_YEARS - 1)] : 1.0);
        competitiveLoss = totalCurrentCost * (Math.pow(1 + competitivePenalty, yr) - 1);
      }

      const complianceRisk = totalCurrentCost * (Math.pow(1 + complianceEscalation, yr) - 1);

      const yearTotal = wageInflation + legacyCreep + forgoneSavings + competitiveLoss + complianceRisk;
      totalCost += yearTotal;
      yearlyBreakdown.push({
        year: yr,
        wageInflation,
        legacyCreep,
        forgoneSavings,
        competitiveLoss,
        complianceRisk,
        revenueErosion,
        total: yearTotal,
      });
    }
    return { totalCost, yearlyBreakdown };
  }

  const inaction5yr = calculateInactionCost(5);

  const opportunityCost = {
    costOfWaiting12Months: inaction5yr.yearlyBreakdown[0]?.total || 0,
    costOfWaiting24Months: (inaction5yr.yearlyBreakdown[0]?.total || 0) + (inaction5yr.yearlyBreakdown[1]?.total || 0),
    yearlyBreakdown: inaction5yr.yearlyBreakdown,
  };

  // Enhanced competitive erosion summary (V2.1: S-curve model)
  const competitiveErosion = {
    annualRevenue: userAnnualRevenueForErosion,
    aiAdoptionRate,
    marginCompression,
    revenueBasedErosion: userAnnualRevenueForErosion > 0,
    erosionModel: userAnnualRevenueForErosion > 0 ? 'logistic-s-curve' : 'linear-cost-penalty',
    year5RevenueErosion: inaction5yr.yearlyBreakdown[4]?.revenueErosion || 0,
  };

  // --- "Do Nothing" Cost Projection (3C) ---
  const doNothingYearByCost = inaction5yr.yearlyBreakdown.map(yr => yr.total);
  const doNothingCumulative = doNothingYearByCost.reduce((sum, c) => sum + c, 0);
  const doNothingProjection = {
    yearByCost: doNothingYearByCost,
    cumulative5Year: doNothingCumulative,
    vsAiProjectNPV: doNothingCumulative + baseNPV, // net advantage of AI
  };

  // =====================================================================
  // R&D TAX CREDIT (informational only — NOT in NPV/ROIC)
  // =====================================================================
  const companyState = inputs.companyState || 'Other / Not Sure';
  // The optional company-state input, rather than an implementation-team
  // location, establishes whether an R&D-credit illustration is applicable.
  const isUSBased = companyState !== 'Other / Not Sure';
  const qualifiedExpenses = realisticImplCost * RD_QUALIFICATION_RATE;
  const federalCredit = isUSBased ? qualifiedExpenses * FEDERAL_RD_CREDIT_RATE : 0;
  const stateRate = STATE_RD_CREDIT_RATES[companyState] || 0;
  const stateCredit = isUSBased ? qualifiedExpenses * stateRate : 0;

  const rdTaxCredit = {
    eligible: isUSBased,
    qualifiedExpenses,
    federalCredit,
    stateCredit,
    totalCredit: federalCredit + stateCredit,
    companyState,
    federalRate: FEDERAL_RD_CREDIT_RATE,
    stateRate,
  };

  // Revenue enablement was retired as a model value stream. Preserve a clear
  // inert output for older consumers instead of silently projecting sales.
  const revenueEnablement = {
    eligible: false,
    retired: true,
    note: 'Revenue forecasts are excluded from this operating-cost model.',
    processType,
    projectArchetype: inputs.projectArchetype || null,
  };

  // =====================================================================
  // THRESHOLD / BREAKEVEN ANALYSIS
  // =====================================================================
  function calculateBreakeven() {
    const pvFactor = adoptionRamp.reduce((sum, ramp, yr) =>
      sum + ramp / Math.pow(1 + discountRate, yr + 1), 0);

    // Breakeven risk multiplier: what risk level makes NPV = 0?
    const breakevenRisk = grossAnnualSavings > 0
      ? ((upfrontInvestment / pvFactor) + baseOngoingCost) / grossAnnualSavings
      : null;

    // Maximum tolerable ongoing cost for NPV = 0
    const maxOngoingCost = pvFactor > 0
      ? riskAdjustedSavings - (upfrontInvestment / pvFactor)
      : null;

    // Break-even adoption rate: what adoption rate makes NPV = 0?
    const savingsPerAdoptionUnit = adoptionRate > 0 ? grossAnnualSavings / adoptionRate : 0;
    const breakevenAdoptionRate = savingsPerAdoptionUnit > 0 && pvFactor > 0
      ? ((upfrontInvestment / pvFactor) + baseOngoingCost) / savingsPerAdoptionUnit
      : null;

    return {
      breakevenRiskMultiplier: breakevenRisk,
      currentRiskMultiplier: riskMultiplier,
      riskMargin: breakevenRisk !== null ? riskMultiplier - breakevenRisk : null,
      isViable: breakevenRisk !== null && riskMultiplier > breakevenRisk,
      maxOngoingCost,
      currentOngoingCost: baseOngoingCost,
      ongoingCostMargin: maxOngoingCost !== null ? maxOngoingCost - baseOngoingCost : null,
      breakevenAdoptionRate,
      currentAdoptionRate: adoptionRate,
      adoptionMargin: breakevenAdoptionRate !== null ? adoptionRate - breakevenAdoptionRate : null,
    };
  }

  const thresholdAnalysis = calculateBreakeven();

  // =====================================================================
  // PHASED TIMELINE
  // =====================================================================
  const phasedTimeline = VALUE_PHASES.map(phase => {
    let phaseValue = 0;
    phase.valueTypes.forEach(type => {
      if (type === 'headcount') phaseValue += valueBreakdown.headcount.riskAdjusted;
      if (type === 'efficiency') phaseValue += valueBreakdown.efficiency.riskAdjusted;
      if (type === 'errorReduction') phaseValue += valueBreakdown.errorReduction.riskAdjusted;
      if (type === 'toolReplacement') phaseValue += valueBreakdown.toolReplacement.riskAdjusted;
      if (type === 'caseDirectSavings') phaseValue += valueBreakdown.caseDirectSavings.riskAdjusted;
    });
    return {
      ...phase,
      estimatedValue: phaseValue * phase.realizationPct,
    };
  });

  // =====================================================================
  // SCALABILITY PREMIUM
  // =====================================================================
  const scalabilityPremium = {
    currentCost: totalCurrentCost,
    aiOngoingCost: baseOngoingCost,
    scenarios: Object.entries(AI_SCALE_FACTORS).map(([label, factor]) => {
      const multiplier = parseInt(label);
      const traditionalCost = totalCurrentCost * multiplier;
      const aiCost = baseOngoingCost * (1 + factor);
      return {
        label,
        traditionalCost,
        aiCost,
        savings: traditionalCost - aiCost,
        savingsPercent: traditionalCost > 0 ? (traditionalCost - aiCost) / traditionalCost : 0,
      };
    }),
  };

  // =====================================================================
  // CONFIDENCE INTERVALS (from scenario + sensitivity spread)
  // =====================================================================
  function deriveConfidenceIntervals() {
    const consFlows = buildYearCashFlows(0.75);
    const optFlows = buildYearCashFlows(1.25);

    const consNPV = calculateNPV(consFlows);
    const optNPV = calculateNPV(optFlows);
    const baseNPVVal = calculateNPV(baseFlows);

    const npvSpread = extendedSensitivity.map(row => [row.npvLow, row.npvHigh]).flat();
    const minNPV = Math.min(consNPV, ...npvSpread);
    const maxNPV = Math.max(optNPV, ...npvSpread);

    const p25NPV = baseNPVVal + (minNPV - baseNPVVal) * 0.5;
    const p75NPV = baseNPVVal + (maxNPV - baseNPVVal) * 0.5;

    const consPayback = calculatePayback(consFlows);
    const basePayback = calculatePayback(baseFlows);
    const optPayback = calculatePayback(optFlows);

    const consROIC = calculateROIC(consFlows);
    const baseROICVal = calculateROIC(baseFlows);
    const optROIC = calculateROIC(optFlows);

    return {
      npv: { p25: p25NPV, p50: baseNPVVal, p75: p75NPV },
      payback: { p25: consPayback, p50: basePayback, p75: optPayback },
      roic: { p25: consROIC, p50: baseROICVal, p75: optROIC },
    };
  }

  // =====================================================================
  // INDUSTRY PEER COMPARISON
  // =====================================================================
  function calculatePeerComparison() {
    const peerData = (INDUSTRY_PEER_BENCHMARKS[industry] || INDUSTRY_PEER_BENCHMARKS['Other'])[companySize]
      || { medianROIC: 0.30, p25: 0.12, p75: 0.55 };

    const userROIC = calculateROIC(baseFlows);

    let percentileRank;
    if (userROIC <= peerData.p25) {
      percentileRank = Math.max(5, (userROIC / peerData.p25) * 25);
    } else if (userROIC <= peerData.medianROIC) {
      percentileRank = 25 + ((userROIC - peerData.p25) / (peerData.medianROIC - peerData.p25)) * 25;
    } else if (userROIC <= peerData.p75) {
      percentileRank = 50 + ((userROIC - peerData.medianROIC) / (peerData.p75 - peerData.medianROIC)) * 25;
    } else {
      percentileRank = Math.min(95, 75 + ((userROIC - peerData.p75) / (peerData.p75 * 0.5)) * 20);
    }

    return {
      percentileRank: Math.round(percentileRank),
      peerMedian: peerData.medianROIC,
      peerP25: peerData.p25,
      peerP75: peerData.p75,
      userROIC,
      vsMedian: userROIC - peerData.medianROIC,
    };
  }

  // =====================================================================
  // CONFIDENCE LEVEL
  // =====================================================================
  const avgReadiness = (changeReadiness + dataReadiness) / 2;
  const confidenceLevel =
    avgReadiness >= 4 && inputs.execSponsor
      ? 'High'
      : avgReadiness >= 3
        ? 'Moderate'
        : 'Conservative';

  // Deferred calculations
  const confidenceIntervals = deriveConfidenceIntervals();
  const peerComparison = calculatePeerComparison();

  // =====================================================================
  // V3: THREE VALUE CREATION PATHWAYS
  // Path A: Cost Efficiency (existing DCF — cash savings from automation)
  // Path B: Capacity Creation (strategic leverage — time/throughput gains)
  // Path C: Risk Reduction (downside protection — regulatory/compliance)
  // =====================================================================

  // --- Path A: Cost Efficiency (already computed above) ---
  const cashRealizationPct = inputs.cashRealizationPct ?? CASH_REALIZATION_DEFAULTS.base;
  const costEfficiencyPathway = {
    label: 'Cost Efficiency',
    description: 'Direct cash savings from explicit labor actions, measurable rework, tools, and contracts',
    annualGross: grossAnnualSavings,
    annualRiskAdjusted: riskAdjustedSavings,
    annualCashRealized: riskAdjustedSavings * cashRealizationPct,
    annualCapacityOnly: usesExplicitRedundancyPlan
      ? capacityOnlyEfficiencyValue
      : riskAdjustedSavings * (1 - cashRealizationPct),
    cashRealizationPct,
  };

  // --- Path B: Capacity Creation ---
  const capacityHoursFreed = usesExplicitRedundancyPlan
    ? workforceTransition.freedUpAnnualHours
    : eligibleAnnualHours * totalEfficiencyGainPct * riskMultiplier;
  const capacityFTEEquivalent = capacityHoursFreed / 2080;

  const capacityCreationPathway = {
    label: 'Capacity Creation',
    description: 'Strategic capacity created from verified workload reduction',
    hoursFreed: capacityHoursFreed,
    fteEquivalent: capacityFTEEquivalent,
    hourlyValue: hourlyRate,
    annualCapacityValue: capacityHoursFreed * hourlyRate,
    revenueAcceleration: 0,
    totalAnnualValue: capacityHoursFreed * hourlyRate,
    includeInNPV: inputs.includeCapacityValue ?? false,
  };

  // --- Path C: Risk Reduction ---
  const regBenchmarks = REGULATORY_EVENT_BENCHMARKS[industry] || REGULATORY_EVENT_BENCHMARKS['Other'];
  const regEventProbability = inputs.regulatoryEventProbability ?? regBenchmarks.probability;
  const regEventImpact = inputs.regulatoryEventImpact ?? regBenchmarks.avgImpact;
  const aiRiskReductionPct = inputs.aiRiskReductionPct ?? regBenchmarks.aiReduction;

  const expectedLossBefore = regEventProbability * regEventImpact;
  const expectedLossAfter = (regEventProbability * (1 - aiRiskReductionPct)) * regEventImpact;
  const annualRiskReductionValue = expectedLossBefore - expectedLossAfter;

  const riskReductionPathway = {
    label: 'Risk Reduction',
    description: 'Downside protection from reduced regulatory/compliance exposure',
    eventProbability: regEventProbability,
    eventImpact: regEventImpact,
    aiReductionPct: aiRiskReductionPct,
    expectedLossBefore,
    expectedLossAfter,
    annualValueAvoided: annualRiskReductionValue,
    includeInNPV: Boolean(inputs.includeRiskReduction && inputs.riskValueEvidenceValidated),
  };

  // --- Combined V3 Value ---
  // When capacity is included in NPV, add only the non-cash portion to avoid
  // double-counting with costEfficiency (which already includes cash-realized savings).
  const capacityNPVAddon = capacityCreationPathway.includeInNPV
    ? costEfficiencyPathway.annualCapacityOnly
    : 0;
  const totalV3AnnualValue =
    costEfficiencyPathway.annualRiskAdjusted
    + capacityNPVAddon
    + (riskReductionPathway.includeInNPV ? riskReductionPathway.annualValueAvoided : 0);

  const valuePathways = {
    costEfficiency: costEfficiencyPathway,
    capacityCreation: capacityCreationPathway,
    riskReduction: riskReductionPathway,
    totalAnnualValue: totalV3AnnualValue,
    costOnlyAnnual: costEfficiencyPathway.annualRiskAdjusted,
    // Additive NPV impact from V3 pathways (on top of base cost DCF)
    additionalAnnualValue:
      (capacityCreationPathway.includeInNPV ? capacityCreationPathway.totalAnnualValue : 0)
      + (riskReductionPathway.includeInNPV ? riskReductionPathway.annualValueAvoided : 0),
  };

  // =====================================================================
  // V3: CAPITAL EFFICIENCY METRICS
  // EVA, Cash-on-Cash, ROIC vs WACC comparison
  // =====================================================================
  function calculateCapitalEfficiency() {
    const baseROICVal = calculateROIC(baseFlows);
    const wacc = discountRate; // discount rate IS our WACC proxy

    // NOPAT = Net Operating Profit After Tax (annualized from 5-year total)
    const totalNetReturn = baseFlows.reduce((sum, f) => sum + f.netCashFlow, 0);
    const avgAnnualNetReturn = totalNetReturn / DCF_YEARS;
    const nopat = avgAnnualNetReturn * (1 - EFFECTIVE_TAX_RATE);

    // EVA = NOPAT - (Invested Capital × WACC)
    const eva = nopat - (totalInvestment * wacc);

    // Cash-on-Cash = Annual Cash Flow / Total Cash Invested
    // Use Year 3 (stabilized) cash flow for a representative year
    const stabilizedYear = baseFlows[Math.min(2, baseFlows.length - 1)];
    const cashOnCash = totalInvestment > 0
      ? stabilizedYear.netCashFlow / totalInvestment
      : 0;

    // ROIC vs WACC spread
    const roicWaccSpread = baseROICVal - wacc;
    const createsValue = baseROICVal > wacc;

    return {
      wacc,
      nopat,
      eva,
      cashOnCash,
      roic: baseROICVal,
      roicWaccSpread,
      createsValue,
      totalInvestment,
      effectiveTaxRate: EFFECTIVE_TAX_RATE,
    };
  }

  const capitalEfficiency = calculateCapitalEfficiency();

  // =====================================================================
  // CAPITAL ALLOCATION COMPARISON (3D)
  // Compare AI project IRR to alternative capital uses
  // =====================================================================
  function calculateCapitalAllocation() {
    const aiIRR = scenarioResults.base.irr;
    const validIRR = isFinite(aiIRR);
    const vsStockBuyback = validIRR ? aiIRR - ALTERNATIVE_HURDLE_RATES.stockBuyback : null;
    const vsMAndA = validIRR ? aiIRR - ALTERNATIVE_HURDLE_RATES.mAndAHurdleRate : null;
    const vsTreasuryBond = validIRR ? aiIRR - ALTERNATIVE_HURDLE_RATES.treasuryBond : null;

    let recommendation;
    if (!validIRR || isNaN(aiIRR)) {
      recommendation = 'Insufficient data';
    } else if (aiIRR > ALTERNATIVE_HURDLE_RATES.mAndAHurdleRate) {
      recommendation = 'Strong AI';
    } else if (aiIRR > ALTERNATIVE_HURDLE_RATES.stockBuyback) {
      recommendation = 'Marginal';
    } else {
      recommendation = 'Consider alternatives';
    }

    return {
      aiProjectIRR: aiIRR,
      vsStockBuyback,
      vsMAndA,
      vsTreasuryBond,
      hurdleRates: ALTERNATIVE_HURDLE_RATES,
      recommendation,
    };
  }

  const capitalAllocation = calculateCapitalAllocation();

  // =====================================================================
  // V5: WORKFORCE ALTERNATIVES COMPARISON (AI vs Hire vs Outsource vs Do Nothing)
  // Executives want to see AI investment vs practical alternatives
  // =====================================================================
  function calculateWorkforceAlternatives() {
    const annualGap = grossAnnualSavings; // value AI delivers = gap alternatives must fill

    // Option A: Hire more staff
    const hireFTEs = Math.max(1, Math.ceil(annualGap / (avgSalary * CAPITAL_ALLOCATION.HIRING_FULLY_LOADED_MULTIPLIER)));
    const hireAnnualCost = hireFTEs * avgSalary * CAPITAL_ALLOCATION.HIRING_FULLY_LOADED_MULTIPLIER;
    const hireTurnoverCost = hireFTEs * CAPITAL_ALLOCATION.HIRING_ANNUAL_TURNOVER * avgSalary * CAPITAL_ALLOCATION.HIRING_REPLACEMENT_COST_RATE;
    const hireTotalYear1 = hireAnnualCost + hireTurnoverCost;
    const hire5YearCost = hireTotalYear1 * DCF_YEARS * Math.pow(1 + wageInflationRate, 2); // wage inflation
    const hireROI = hire5YearCost > 0 ? (annualGap * DCF_YEARS - hire5YearCost) / hire5YearCost : 0;

    // Option B: Outsource / BPO
    const bpoAnnualCost = totalCurrentCost * CAPITAL_ALLOCATION.BPO_COST_RATIO;
    const bpoManagementCost = bpoAnnualCost * CAPITAL_ALLOCATION.BPO_MANAGEMENT_OVERHEAD;
    const bpoQualityLoss = totalCurrentCost * (1 - CAPITAL_ALLOCATION.BPO_QUALITY_DISCOUNT);
    const bpoTotalAnnual = bpoAnnualCost + bpoManagementCost + bpoQualityLoss;
    const bpoSavings = totalCurrentCost - bpoTotalAnnual;
    const bpo5YearNet = bpoSavings * DCF_YEARS;
    const bpoROI = bpoTotalAnnual > 0 ? bpoSavings / bpoTotalAnnual : 0;

    // Option C: Do nothing (status quo + competitive erosion)
    const statusQuoYear1Cost = totalCurrentCost;
    let statusQuo5YearCost = 0;
    for (let yr = 0; yr < DCF_YEARS; yr++) {
      const erosion = Math.pow(1 + CAPITAL_ALLOCATION.STATUS_QUO_COMPETITIVE_EROSION, yr);
      const wagePressure = Math.pow(1 + wageInflationRate, yr);
      statusQuo5YearCost += statusQuoYear1Cost * wagePressure * erosion;
    }
    const statusQuoOpportunityCost = statusQuo5YearCost - (statusQuoYear1Cost * DCF_YEARS);

    // Option D: AI investment (from our model)
    const ai5YearNet = scenarioResults.base.projections.reduce((sum, yr) => sum + yr.netCashFlow, 0) - upfrontInvestment;
    const aiROI = totalInvestment > 0 ? ai5YearNet / totalInvestment : 0;

    return {
      aiInvestment: {
        label: 'AI Automation',
        upfrontCost: upfrontInvestment,
        annual5YearNet: ai5YearNet,
        roi: aiROI,
        paybackMonths: scenarioResults.base.paybackMonths,
        npv: scenarioResults.base.npv,
        riskLevel: 'Medium',
      },
      hiring: {
        label: 'Hire More Staff',
        ftesNeeded: hireFTEs,
        annualCost: hireAnnualCost,
        turnoverCost: hireTurnoverCost,
        total5YearCost: hire5YearCost,
        roi: hireROI,
        rampMonths: CAPITAL_ALLOCATION.HIRING_RAMP_MONTHS,
        riskLevel: 'Low',
      },
      outsourcing: {
        label: 'Outsource / BPO',
        annualCost: bpoTotalAnnual,
        annualSavings: bpoSavings,
        total5YearNet: bpo5YearNet,
        roi: bpoROI,
        qualityImpact: `-${Math.round((1 - CAPITAL_ALLOCATION.BPO_QUALITY_DISCOUNT) * 100)}%`,
        transitionMonths: CAPITAL_ALLOCATION.BPO_TRANSITION_MONTHS,
        riskLevel: 'Low-Medium',
      },
      statusQuo: {
        label: 'Do Nothing',
        annualCost: statusQuoYear1Cost,
        total5YearCost: statusQuo5YearCost,
        opportunityCost: statusQuoOpportunityCost,
        competitiveErosionRate: CAPITAL_ALLOCATION.STATUS_QUO_COMPETITIVE_EROSION,
        riskLevel: 'High (competitive)',
      },
    };
  }

  const workforceAlternatives = calculateWorkforceAlternatives();

  // =====================================================================
  // V3: GATE STRUCTURE — Phased deployment with go/no-go thresholds
  // =====================================================================
  function calculateGateStructure() {
    return GATE_STRUCTURE.map(gate => {
      const gateInvestment = totalInvestment * gate.investmentPct;
      const gateCumulativeInvestment = GATE_STRUCTURE
        .filter(g => g.gate <= gate.gate)
        .reduce((sum, g) => sum + totalInvestment * g.investmentPct, 0);

      // Expected value at this gate (proportional to timeline)
      const gateMonths = gate.monthRange[1];
      const yearsIn = gateMonths / 12;
      const gateAnnualSavings = riskAdjustedSavings * Math.min(1, yearsIn > 0 ? adoptionRamp[Math.min(Math.floor(yearsIn), DCF_YEARS - 1)] : 0);

      return {
        ...gate,
        investment: gateInvestment,
        cumulativeInvestment: gateCumulativeInvestment,
        expectedAnnualSavings: gateAnnualSavings,
        currentAutomation: automationPotential,
        currentAdoptionRate: adoptionRate,
        meetsThresholds: {
          automation: automationPotential >= gate.requiredMetrics.minAutomationValidated,
          adoption: adoptionRate >= gate.requiredMetrics.minAdoptionRate,
        },
      };
    });
  }

  const gateStructure = calculateGateStructure();

  // =====================================================================
  // EXECUTIVE SUMMARY (executive-friendly metrics)
  // =====================================================================
  const baseProj = scenarioResults.base.projections;
  const total5YearGrossSavings = baseProj.reduce((sum, yr) => sum + yr.grossSavings, 0);
  const total5YearNetSavings = baseProj.reduce((sum, yr) => sum + yr.netCashFlow, 0);
  const simpleROI = totalInvestment > 0
    ? (total5YearGrossSavings - totalInvestment) / totalInvestment
    : 0;

  const topLevers = [...extendedSensitivity]
    .sort((a, b) => Math.abs(b.npvHigh - b.npvLow) - Math.abs(a.npvHigh - a.npvLow))
    .slice(0, 3)
    .map(row => ({
      label: row.label,
      npvSwing: Math.abs(row.npvHigh - row.npvLow),
      npvLow: row.npvLow,
      npvHigh: row.npvHigh,
    }));

  // Gross ROI = benefits vs capital only (excluding opex) — the "CFO marketing number"
  const grossROI = totalInvestment > 0
    ? (total5YearGrossSavings - totalInvestment) / totalInvestment
    : 0;
  // Net ROI = full cash flows including opex (the real picture)
  const netROI = totalInvestment > 0
    ? total5YearNetSavings / totalInvestment
    : 0;

  // Savings bridge — waterfall from gross to net (reviewer fix P1)
  const total5YearOngoing = baseProj.reduce((sum, yr) => sum + yr.ongoingCost, 0);
  const total5YearSeparation = baseProj.reduce((sum, yr) => sum + yr.separationCost, 0);
  const savingsBridge = {
    grossSavings: total5YearGrossSavings,
    lessOngoingCosts: -total5YearOngoing,
    lessSeparationCosts: -total5YearSeparation,
    netCashFlow: total5YearNetSavings,
    lessUpfrontInvestment: -upfrontInvestment,
    netReturn: total5YearNetSavings - upfrontInvestment,
    grossROI,
    netROI,
  };

  const executiveSummary = {
    simpleROI,
    grossROI,
    netROI,
    total5YearGrossSavings,
    total5YearNetSavings,
    savingsBridge,
    topLevers,
    keyAssumptions: {
      automationPotential,
      adoptionRate,
      riskMultiplier,
      discountRate,
      timelineMonths: adjustedTimeline,
      headcountFeasible,
      processAllocation,
    },
  };

  // =====================================================================
  // BREAK-EVEN ADOPTION RATE
  // Binary search for the savings multiplier where NPV = 0.
  // Since savings scale linearly with adoption rate, the break-even
  // adoption rate = currentAdoptionRate × breakEvenMultiplier.
  // =====================================================================
  let breakEvenAdoptionRate = null;
  {
    let lo = 0.01, hi = 3.0;
    for (let iter = 0; iter < 25; iter++) {
      const mid = (lo + hi) / 2;
      const testNPV = calculateNPV(buildYearCashFlows(mid));
      if (testNPV >= 0) hi = mid;
      else lo = mid;
    }
    const beRate = adoptionRate * hi;
    if (beRate <= 0.99) {
      breakEvenAdoptionRate = Math.round(beRate * 100) / 100;
    }
    // null if break-even requires > 99% adoption (infeasible)
  }

  // =====================================================================
  // PATH TO POSITIVE — prescriptive break-even levers (reviewer fix P2)
  // For each lever, binary-search for the value that makes NPV ≥ 0
  // =====================================================================
  const baseNPVForPath = scenarioResults.base.npv;
  const pathToPositive = { currentNPV: baseNPVForPath, levers: [] };

  if (baseNPVForPath < 0) {
    // Lever A: Reduce ongoing costs — find break-even ongoing cost
    {
      let lo = 0, hi = baseOngoingCost;
      for (let i = 0; i < 25; i++) {
        const mid = (lo + hi) / 2;
        const modOngoing = ongoingCostsByYear.map(c => mid * (c / baseOngoingCost));
        const npv = sensitivityNPV(enhancementRiskAdjusted, valueBreakdown.headcount.riskAdjusted, modOngoing, upfrontInvestment);
        if (npv >= 0) lo = mid; else hi = mid;
      }
      const targetOngoing = Math.round(hi);
      const reduction = baseOngoingCost - targetOngoing;
      if (reduction > 0 && targetOngoing > 0) {
        pathToPositive.levers.push({
          lever: 'Reduce ongoing AI costs',
          target: `$${targetOngoing.toLocaleString()}/yr`,
          change: `-$${Math.round(reduction).toLocaleString()}/yr (${Math.round(reduction / baseOngoingCost * 100)}% reduction)`,
        });
      }
    }

    // Lever B: Increase automation potential — find break-even automation %
    {
      let lo = automationPotential, hi = 1.0;
      for (let i = 0; i < 25; i++) {
        const mid = (lo + hi) / 2;
        const modVal = valueFromCurrentCost(totalCurrentCost, mid, teamSize);
        const npv = sensitivityNPV(modVal.enhancementRA, modVal.headcountRA, ongoingCostsByYear, upfrontInvestment);
        if (npv >= 0) hi = mid; else lo = mid;
      }
      if (hi <= 0.95 && hi > automationPotential) {
        pathToPositive.levers.push({
          lever: 'Increase automation potential',
          target: `${Math.round(hi * 100)}%`,
          change: `+${Math.round((hi - automationPotential) * 100)}pp (from ${Math.round(automationPotential * 100)}%)`,
        });
      }
    }

    // Lever C: Increase team scope
    {
      let lo = teamSize, hi = teamSize * 3;
      for (let i = 0; i < 25; i++) {
        const mid = Math.round((lo + hi) / 2);
        const modCost = mid * avgSalary + annualReworkCost + currentToolCosts + annualContractSpend;
        const modVal = valueFromCurrentCost(modCost, undefined, mid);
        const npv = sensitivityNPV(modVal.enhancementRA, modVal.headcountRA, ongoingCostsByYear, upfrontInvestment);
        if (npv >= 0) hi = mid; else lo = mid;
      }
      const targetTeam = Math.ceil(hi);
      if (targetTeam > teamSize && targetTeam <= teamSize * 2.5) {
        pathToPositive.levers.push({
          lever: 'Expand scope (team size)',
          target: `${targetTeam} FTEs`,
          change: `+${targetTeam - teamSize} FTEs (from ${teamSize})`,
        });
      }
    }

    // Lever D: Include capacity value in NPV
    if (!capacityCreationPathway.includeInNPV && capacityCreationPathway.totalAnnualValue > 0) {
      const capacityAnnual = capacityCreationPathway.totalAnnualValue;
      let capacityNPVBoost = 0;
      for (let yr = 0; yr < DCF_YEARS; yr++) {
        capacityNPVBoost += (capacityAnnual * adoptionRamp[yr]) / Math.pow(1 + discountRate, yr + 1);
      }
      if (baseNPVForPath + capacityNPVBoost >= 0) {
        pathToPositive.levers.push({
          lever: 'Monetize freed capacity',
          target: `$${Math.round(capacityAnnual).toLocaleString()}/yr`,
          change: `+$${Math.round(capacityNPVBoost).toLocaleString()} NPV (capacity value currently excluded)`,
        });
      }
    }
  }

  // =====================================================================
  // INPUT VALIDATION WARNINGS (reviewer fix P2)
  // =====================================================================
  const inputWarnings = [];
  inputWarnings.push(...caseBumpers);
  const salaryRange = SALARY_RANGES_BY_INDUSTRY[industry] || SALARY_RANGES_BY_INDUSTRY['Other'];
  if (avgSalary < salaryRange.low) {
    inputWarnings.push({
      field: 'avgSalary',
      severity: 'warning',
      message: `Salary ($${avgSalary.toLocaleString()}) is below typical range for ${industry} ($${salaryRange.low.toLocaleString()}–$${salaryRange.high.toLocaleString()}). This may understate savings potential.`,
      suggestedValue: salaryRange.typical,
    });
  }
  if (!headcountFeasible) {
    inputWarnings.push({
      field: 'hoursPerWeek',
      severity: 'info',
      message: `Team spends ${Math.round(processAllocation * 100)}% of time on this process. Headcount reduction is unlikely — model uses capacity reallocation instead.`,
    });
  }
  if (!userProvidedOngoing && computedOngoingCost > ongoingAnnualCost) {
    inputWarnings.push({
      field: 'ongoingAnnualCost',
      severity: 'info',
      message: `Model-estimated ongoing cost ($${Math.round(computedOngoingCost).toLocaleString()}) differs from default ($${Math.round(ongoingAnnualCost).toLocaleString()}). Using model estimate.`,
    });
  }
  workforceTransition.warnings.forEach((message) => {
    inputWarnings.push({
      field: 'employeesToMakeRedundant',
      severity: 'warning',
      message,
    });
  });
  [
    ...(workforceMix.inputCorrections || []),
    ...(contractExit.inputCorrections || []),
    ...(rework.inputCorrections || []),
  ].forEach((message) => {
    inputWarnings.push({
      field: 'modelGuardrail',
      severity: 'warning',
      message,
    });
  });

  // =====================================================================
  // V5.1: BREAK-EVEN UNIT ECONOMICS
  // For each archetype input, find the minimum value that makes NPV >= 0.
  // Binary search: modify ONE archetype input at a time, re-run mapping,
  // then compute a simplified NPV to find the break-even threshold.
  // =====================================================================
  function calculateBreakEvenUnits() {
    if (!inputs.archetypeInputs || !inputs.projectArchetype || !coreBenefitsEnabled) return null;

    const schema = ARCHETYPE_INPUT_MAP[inputs.projectArchetype];
    if (!schema) return null;

    const baseInputs = { ...inputs.archetypeInputs };
    const results = [];

    // Quick NPV proxy: rebuild savings from overrides, run through sensitivityNPV
    function quickNPVProxy(overrides) {
      const ap = overrides.automationPotential ?? automationPotential;
      const directCaseSavings = caseDirectSavingsEnabled
        ? Math.max(0, overrides.caseDirectSavings ?? directCaseSavingsGross)
        : 0;

      const lab = annualLaborCost;
      const displacedRaw = Math.round(teamSize * ap * adoptionRate);
      const maxDisplaced = Math.floor(teamSize * MAX_HEADCOUNT_REDUCTION);
      const displaced = usesExplicitRedundancyPlan
        ? displacedFTEs
        : Math.min(displacedRaw, maxDisplaced);
      const headGross = usesExplicitRedundancyPlan
        ? headcountSavingsGross
        : displaced * avgSalary;
      const effGross = usesExplicitRedundancyPlan
        ? 0
        : Math.max(0, lab * ap - headGross);
      const errGross = annualReworkCost * (usesExplicitRedundancyPlan
        ? totalEfficiencyGainPct
        : ap);
      const toolGross = currentToolCosts * (assumptions.toolReplacementRate ?? 0.40);
      const enhRA = (effGross + errGross + toolGross + contractSavingsGross + directCaseSavings) * riskMultiplier;
      const headRA = headGross;

      return sensitivityNPV(enhRA, headRA, ongoingCostsByYear, upfrontInvestment);
    }

    for (const inputDef of schema.inputs) {
      const currentVal = baseInputs[inputDef.key] ?? inputDef.default;
      if (inputDef.type === 'scale') continue;

      // Determine search direction: does increasing this input improve or worsen NPV?
      const bump = inputDef.type === 'percent'
        ? Math.min(currentVal * 1.5, inputDef.max)
        : Math.min(currentVal * 1.5 || 1, inputDef.max);
      const testInputs = { ...baseInputs, [inputDef.key]: bump };
      const testOverrides = mapArchetypeInputs(inputs.projectArchetype, testInputs) || {};
      const higherNPV = quickNPVProxy(testOverrides);
      const baseNPVVal = quickNPVProxy(_archetypeOverrides);
      const increasing = higherNPV >= baseNPVVal;

      // Binary search bounds
      let lo, hi;
      if (baseNPV >= 0) {
        lo = increasing ? inputDef.min : currentVal;
        hi = increasing ? currentVal : inputDef.max;
      } else {
        lo = increasing ? currentVal : inputDef.min;
        hi = increasing ? inputDef.max : currentVal;
      }

      for (let iter = 0; iter < 20; iter++) {
        const mid = (lo + hi) / 2;
        const midInputs = { ...baseInputs, [inputDef.key]: mid };
        const midOverrides = mapArchetypeInputs(inputs.projectArchetype, midInputs) || {};
        const midNPV = quickNPVProxy(midOverrides);
        if (midNPV >= 0) {
          if (increasing) hi = mid; else lo = mid;
        } else {
          if (increasing) lo = mid; else hi = mid;
        }
      }

      const beValue = increasing ? hi : lo;
      if (beValue >= inputDef.min && beValue <= inputDef.max) {
        const formatted = inputDef.type === 'percent'
          ? Math.round(beValue * 1000) / 1000
          : Math.round(beValue);
        // Margin %: how far current is from break-even, relative to current value
        const denom = Math.abs(currentVal) || Math.abs(beValue) || 1;
        const marginPct = Math.round(((currentVal - beValue) / denom) * 100);
        results.push({
          key: inputDef.key,
          label: inputDef.label,
          type: inputDef.type,
          currentValue: currentVal,
          breakEvenValue: formatted,
          marginPct,
          direction: baseNPV >= 0 ? 'floor' : 'target',
        });
      }
    }

    return results.length > 0 ? results : null;
  }

  const _breakEvenUnits = calculateBreakEvenUnits();

  // =====================================================================
  // V5.2: VOLUME SENSITIVITY TABLE
  // Shows NPV impact at stepped changes in the primary volume driver.
  // Identifies the first numeric (non-percent, non-scale) archetype input,
  // computes NPV at 5 levels around the current value.
  // =====================================================================
  function calculateVolumeSensitivity() {
    if (!inputs.archetypeInputs || !inputs.projectArchetype || !coreBenefitsEnabled) return null;
    const schema = ARCHETYPE_INPUT_MAP[inputs.projectArchetype];
    if (!schema) return null;

    // Find primary volume input: first numeric (non-percent, non-scale) input
    const volumeInput = schema.inputs.find(i => i.type === 'number');
    if (!volumeInput) return null;

    const currentVal = inputs.archetypeInputs[volumeInput.key] ?? volumeInput.default;
    if (!currentVal || currentVal <= 0) return null;

    // Choose step size: round to a "nice" interval (~20% of current value)
    const rawStep = currentVal * 0.20;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const step = Math.max(1, Math.round(rawStep / magnitude) * magnitude);

    // Build 5 levels: current-2step, current-step, current, current+step, current+2step
    const levels = [-2, -1, 0, 1, 2].map(mult => {
      const vol = Math.max(volumeInput.min || 1, currentVal + mult * step);
      const testInputs = { ...inputs.archetypeInputs, [volumeInput.key]: vol };
      const testOverrides = mapArchetypeInputs(inputs.projectArchetype, testInputs) || {};

      // Quick NPV via proxy — now accounts for hoursPerWeek and ongoing cost scaling
      const ap = testOverrides.automationPotential ?? automationPotential;
      const directCaseSavings = caseDirectSavingsEnabled
        ? Math.max(0, testOverrides.caseDirectSavings ?? directCaseSavingsGross)
        : 0;
      const hpw = testOverrides.caseWorkloadHoursPerWeek ?? hoursPerWeek;
      const pa = hasCaseInputs
        ? Math.min(1, hpw / Math.max(1, availableProcessHoursPerWeek))
        : Math.min(hpw / 40, 1);
      const headFeasible = pa >= 0.50;

      const lab = annualLaborCost;
      const displacedRaw = headFeasible ? Math.round(teamSize * ap * adoptionRate) : 0;
      const maxDisplacedCalc = Math.floor(teamSize * MAX_HEADCOUNT_REDUCTION);
      const displaced = usesExplicitRedundancyPlan
        ? displacedFTEs
        : Math.min(displacedRaw, maxDisplacedCalc);
      const headGross = usesExplicitRedundancyPlan
        ? headcountSavingsGross
        : displaced * avgSalary;
      const effGross = usesExplicitRedundancyPlan
        ? 0
        : Math.max(0, lab * ap - headGross);
      const errGross = annualReworkCost * (usesExplicitRedundancyPlan
        ? totalEfficiencyGainPct
        : ap);
      const toolGross = currentToolCosts * (assumptions.toolReplacementRate ?? 0.40);
      const enhRA = (effGross + errGross + toolGross + contractSavingsGross + directCaseSavings) * riskMultiplier;
      const headRA = headGross;

      // Scale ongoing costs proportionally to volume (API/LLM costs are volume-sensitive)
      const volumeRatio = currentVal > 0 ? vol / currentVal : 1;
      const volumeSensitiveFrac = 0.40; // ~40% of ongoing cost is volume-driven (API/tokens)
      const adjustedOngoing = ongoingCostsByYear.map(c =>
        c * (1 - volumeSensitiveFrac + volumeSensitiveFrac * volumeRatio)
      );

      const npv = sensitivityNPV(enhRA, headRA, adjustedOngoing, upfrontInvestment);

      return {
        volume: vol,
        delta: mult * step,
        npv,
        npvDelta: npv - baseNPV,
      };
    });

    return {
      inputKey: volumeInput.key,
      inputLabel: volumeInput.label,
      currentValue: currentVal,
      step,
      levels,
    };
  }

  const _volumeSensitivity = inputs._mcMode === 'fast' ? null : calculateVolumeSensitivity();

  const workloadStatus = isRetiredCase
    ? 'retired'
    : workloadExceedsCapacity
      ? 'blocked'
      : workloadTooSmallForRedundancy
        ? 'capacity-only'
        : hasCaseInputs
          ? 'ready'
          : 'not-applicable';
  const caseEconomics = {
    hasSupportedArchetype,
    hasCaseInputs,
    isRetiredCase,
    caseWorkloadHoursPerWeek,
    availableProcessHoursPerWeek,
    workloadRatio,
    workloadStatus,
    workloadBlocked: workloadExceedsCapacity || isRetiredCase,
    workloadTooSmallForRedundancy,
    eligibleAnnualHours,
    eligibleCapacityFTEs: eligibleAnnualHours / 2080,
    automationPotential,
    requestedEfficiencyGainPct,
    effectiveEfficiencyGainPct,
    efficiencyCeilingPct: caseEfficiencyCeilingPct,
    caseBuildComplexityMultiplier,
    supportCostValidated,
    supportCostCashRealizable,
    candidateDirectSavingsGross: candidateCaseDirectSavings,
    maximumDirectSavingsGross: maximumCaseDirectSavings,
    directSavingsGross: directCaseSavingsGross,
    directSavingsEnabled: caseDirectSavingsEnabled,
    directSavingsLabel: 'Verified customer support cost avoidance',
    riskAvoidanceContext: caseRiskAvoidance,
    riskAvoidanceIncludedInCoreDcf: false,
    bumperMessages: caseBumpers,
    inputCorrections: archetypeInputSanitization.corrections,
  };

  // =====================================================================
  // RETURN
  // =====================================================================
  return {
    currentState: {
      hourlyRate,
      annualLaborCost,
      weeklyHours,
      annualHours,
      hoursPerWeek,
      annualReworkCost,
      annualContractSpend,
      totalCurrentCost,
      workforceMix,
      directEmployeeCount: workforceMix.directEmployeeCount,
      employeeFullyBurdenedCost: workforceMix.employeeFullyBurdenedCost,
      offshoreContractorCount: workforceMix.offshoreContractorCount,
      contractorFullyBurdenedCost: workforceMix.contractorFullyBurdenedCost,
      totalHeadcount: teamSize,
      blendedFullyBurdenedCost: avgSalary,
      weightedHourlyCost: hourlyRate,
      totalEfficiencyGainPct,
      freedUpAnnualHours: workforceTransition.freedUpAnnualHours,
      freedCapacityFTEs: workforceTransition.freedCapacityFTEs,
      annualCapacityOnlyValue: capacityOnlyEfficiencyValue,
      annualErrorCount: rework.annualErrorCount,
      reworkFraction: rework.reworkFraction,
      reworkCostPerItem: rework.reworkCostPerItem,
      costPerProcess: processCost.costPerProcess,
      monthlyProcessCost: processCost.monthlyProcessCost,
      annualProcessCost: processCost.annualProcessCost,
    },
    benchmarks: {
      automationPotential,
      industrySuccessRate,
    },
    riskAdjustments: {
      adoptionRate,
      sponsorAdjustment,
      riskMultiplier,
      adjustedTimeline,
      adjustedImplementationCost: realisticImplCost,
    },
    aiCostModel,
    workforceTransition,
    deploymentPlan: aiCostModel.deploymentPlan,
    contractExit,
    rework,
    processCost,
    caseEconomics,
    oneTimeCosts,
    hiddenCosts,
    upfrontInvestment,
    totalInvestment,
    discountRate,
    dcfYears: DCF_YEARS,
    savings: {
      grossAnnualSavings,
      riskAdjustedSavings,
      netAnnualSavings,
    },
    valueBreakdown,
    opportunityCost,
    competitiveErosion,
    revenueEnablement,
    rdTaxCredit,
    thresholdAnalysis,
    phasedTimeline,
    scalabilityPremium,
    confidenceIntervals,
    peerComparison,
    scenarios: scenarioResults,
    scenarioWeights,
    expectedNPV,
    expectedROIC,
    sensitivity,
    extendedSensitivity,
    vendorLockIn: assessVendorLockIn(),
    confidenceLevel,
    // V3: New outputs
    valuePathways,
    capitalEfficiency,
    gateStructure,
    executiveSummary,
    // V4: Reviewer feedback outputs
    doNothingProjection,
    capitalAllocation,
    wageInflationRate,
    // V4.1: Break-even adoption rate
    breakEvenAdoptionRate,
    // V4.2: Reviewer fixes — validation, bridge, path to positive
    inputWarnings,
    savingsBridge,
    pathToPositive,
    // V5: Consulting-grade additions
    workforceAlternatives,
    modelDriftRate,
    consultingAssumptions: {
      modelDriftRate,
      modelTier,
      useTokenModel,
      isAgenticWorkflow,
      agentComplexity: isAgenticWorkflow ? agentComplexity : null,
      llmCallsPerTask,
      promptCachingRate,
    },
    // V5.1: Break-even unit economics per archetype input
    breakEvenUnits: _breakEvenUnits,
    // V5.2: Volume sensitivity table
    volumeSensitivity: _volumeSensitivity,
    // V5.3: Adoption ramp (for UI display/editing)
    adoptionRamp,
  };

}
