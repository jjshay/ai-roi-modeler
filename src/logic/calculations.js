import {
  getAutomationPotential,
  getErrorRate,
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
  AI_TEAM_SALARY,
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
  REVENUE_UPLIFT,
  REVENUE_ELIGIBLE_PROCESSES,
  REVENUE_RISK_DISCOUNT,
  FEDERAL_RD_CREDIT_RATE,
  STATE_RD_CREDIT_RATES,
  RD_QUALIFICATION_RATE,
  VALUE_PHASES,
  AI_SCALE_FACTORS,
  INDUSTRY_PEER_BENCHMARKS,
  // V3 imports
  CASH_REALIZATION_DEFAULTS,
  REGULATORY_EVENT_BENCHMARKS,
  CYCLE_TIME_REDUCTION,

  EFFECTIVE_TAX_RATE,
  GATE_STRUCTURE,
  // V4: Reviewer feedback additions
  PRODUCTIVITY_DIP_PARAMS,
  RETAINED_TALENT_PREMIUM_RATE,
  AGENTIC_COMPUTE_MULTIPLIER,
  DATA_TRANSFER_COST_MONTHLY,
  REVENUE_DISPLACEMENT_RISK_RATE,
  COMPLIANCE_ESCALATION_RATE,
  ALTERNATIVE_HURDLE_RATES,
  AI_ADOPTION_RATE_BY_INDUSTRY,
  MARGIN_COMPRESSION_BY_INDUSTRY,
  SALARY_RANGES_BY_INDUSTRY,
  // V5: Consulting-grade additions
  TOKEN_PROFILES,
  MODEL_TIERS,
  PROVIDER_PRICING,
  CONTRACT_DISCOUNT,
  OVERAGE_MULTIPLIER,
  PROMPT_CACHING_RATE,
  CACHED_INPUT_DISCOUNT,
  AGENT_COST_PROFILES,
  AGENT_INFRASTRUCTURE_MONTHLY,
  MODEL_DRIFT_RATE,
  CAPITAL_ALLOCATION,
} from './benchmarks';
import { mapArchetypeInputs, ARCHETYPE_INPUT_MAP } from './archetypeInputs';

export function runCalculations(inputs) {
  // =====================================================================
  // ARCHETYPE INPUT OVERRIDES (optional — refines base variables)
  // =====================================================================
  let _archetypeOverrides = {};
  if (inputs.archetypeInputs && inputs.projectArchetype) {
    _archetypeOverrides = mapArchetypeInputs(inputs.projectArchetype, inputs.archetypeInputs) || {};
  }

  // =====================================================================
  // CONTEXT-AWARE DEFAULTS (for null/undefined values)
  // Archetype overrides refine hoursPerWeek and errorRate if provided
  // =====================================================================
  const assumptions = inputs.assumptions || {};
  const industry = inputs.industry || 'Other';
  const processType = inputs.processType || 'Other';
  const teamSize = Math.max(1, Math.min(inputs.teamSize || 10, 100000));
  const avgSalary = Math.max(10000, Math.min(inputs.avgSalary || 100000, 10000000));
  const hoursPerWeek = Math.max(1, Math.min(assumptions.hoursPerWeek ?? _archetypeOverrides.hoursPerWeek ?? inputs.hoursPerWeek ?? 20, 10000));
  const errorRate = Math.max(0, Math.min(assumptions.errorRate ?? _archetypeOverrides.errorRate ?? inputs.errorRate ?? getErrorRate(industry, processType), 1));
  const archetypeRevenueImpact = Math.max(0, _archetypeOverrides.revenueImpact || 0);
  // Archetype-specific dollar impacts (toggled on by selected use case)
  // Split into: truly additive (no headcount overlap) vs labor-overlapping (discounted)
  // Additive: SLA penalties are cash fines, not labor; cycle compression is revenue;
  //           onboarding savings are for future hires not in current team size
  // Overlapping: repeat contact cost shares agents with headcount bucket;
  //              remediation shares compliance staff; close time partially overlaps FP&A team
  const LABOR_OVERLAP_DISCOUNT = 0.40; // 60% of overlapping value is already in headcount
  const archetypeSlaPenaltyCost = Math.max(0, _archetypeOverrides.slaPenaltyCost || 0);
  const archetypeRepeatContactCost = Math.max(0, _archetypeOverrides.repeatContactCost || 0) * LABOR_OVERLAP_DISCOUNT;
  const archetypeCloseTimeSavings = Math.max(0, _archetypeOverrides.closeTimeSavings || 0) * LABOR_OVERLAP_DISCOUNT;
  const archetypeCycleCompressionRevenue = Math.max(0, _archetypeOverrides.cycleCompressionRevenue || 0);
  const archetypeRemediationSavings = Math.max(0, _archetypeOverrides.remediationSavings || 0) * LABOR_OVERLAP_DISCOUNT;
  const archetypeOnboardingSavings = Math.max(0, _archetypeOverrides.onboardingSavings || 0);
  const archetypeDecisionQualityValue = Math.max(0, _archetypeOverrides.decisionQualityValue || 0);
  const archetypeFalseNegativeRiskCost = Math.min(0, _archetypeOverrides.falseNegativeRiskCost || 0); // Always negative or zero
  const archetypeKpiSavings = archetypeSlaPenaltyCost + archetypeRepeatContactCost
    + archetypeCloseTimeSavings + archetypeCycleCompressionRevenue
    + archetypeRemediationSavings + archetypeOnboardingSavings
    + archetypeDecisionQualityValue
    + archetypeFalseNegativeRiskCost; // Negative value reduces net savings
  const currentToolCosts = Math.max(0, inputs.currentToolCosts || 0);
  // Normalize companySize — handles truncated values from legacy share links
  const VALID_SIZES = ['Startup (1-50)', 'SMB (51-500)', 'Mid-Market (501-5,000)', 'Enterprise (5,001-50,000)', 'Large Enterprise (50,000+)'];
  const rawSize = inputs.companySize || 'Mid-Market (501-5,000)';
  const companySize = VALID_SIZES.includes(rawSize)
    ? rawSize
    : VALID_SIZES.find(s => s.startsWith(rawSize)) || 'Mid-Market (501-5,000)';
  const teamLocation = inputs.teamLocation || 'US - Major Tech Hub';
  const dataReadiness = inputs.dataReadiness ?? 3;
  const changeReadiness = inputs.changeReadiness ?? 3;

  // Auto-calculate implementation budget if not provided
  const aiSalaryForCalc = teamLocation === 'Blended'
    ? (inputs.blendedAISalary || 169500)
    : (AI_TEAM_SALARY[teamLocation] || 135000);
  const maxTeamForCalc = MAX_IMPL_TEAM[companySize] || 10;
  const sizeMultForCalc = SIZE_MULTIPLIER[companySize] || 1.0;
  const dataTimeMultForCalc = DATA_TIMELINE_MULTIPLIER[dataReadiness] || 1.10;
  const autoTimelineMonths = Math.ceil(6 * dataTimeMultForCalc * sizeMultForCalc);
  const autoTimelineYears = autoTimelineMonths / 12;
  const scopeMinEng = Math.max(1, Math.ceil(teamSize / 12));
  const dataHeadcountMultForCalc = dataReadiness <= 2 ? 1.3 : dataReadiness === 3 ? 1.1 : 1.0;
  const rawEng = Math.ceil(scopeMinEng * dataHeadcountMultForCalc);
  const engForCalc = Math.min(rawEng, maxTeamForCalc);
  const pmForCalc = Math.max(0.5, Math.ceil(engForCalc / 5));
  const autoEngCost = engForCalc * aiSalaryForCalc * autoTimelineYears;
  const autoPMCost = pmForCalc * (aiSalaryForCalc * 0.85) * autoTimelineYears;
  const autoImplCost = Math.round((autoEngCost + autoPMCost) * 1.20 / 5000) * 5000;

  // Use provided values or auto-calculated defaults
  const implementationBudget = inputs.implementationBudget ?? autoImplCost;
  const expectedTimeline = inputs.expectedTimeline ?? (autoTimelineMonths / sizeMultForCalc);

  // Auto-calculate ongoing cost if not provided
  const licenseCostForCalc = PLATFORM_LICENSE_COST[companySize] || 48000;
  const autoOngoing = Math.round((licenseCostForCalc + (engForCalc * aiSalaryForCalc * 0.15)) / 5000) * 5000;
  const ongoingAnnualCost = inputs.ongoingAnnualCost ?? autoOngoing;

  // =====================================================================
  // CURRENT STATE
  // =====================================================================
  const hourlyRate = avgSalary / 2080;
  const annualLaborCost = teamSize * avgSalary;
  const weeklyHours = teamSize * hoursPerWeek;
  const annualHours = weeklyHours * 52;
  const annualReworkCost = annualLaborCost * errorRate;
  const totalCurrentCost = annualLaborCost + annualReworkCost + currentToolCosts;

  // =====================================================================
  // INDUSTRY BENCHMARKS
  // =====================================================================
  const automationPotential = assumptions.automationPotential ?? _archetypeOverrides.automationPotential ?? getAutomationPotential(industry, processType);
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
  // Reviewer fix P1: If team spends <50% time on process, headcount reduction
  // is unrealistic (employees have other responsibilities). Switch to
  // capacity reallocation mode where savings come from efficiency only.
  // =====================================================================
  const processAllocation = hoursPerWeek / 40; // fraction of time on this process
  const headcountFeasible = processAllocation >= 0.50;
  const rawDisplacedFTEs = headcountFeasible
    ? Math.round(teamSize * automationPotential * adoptionRate)
    : 0; // no headcount reduction when <50% allocation
  const maxDisplaced = Math.floor(teamSize * MAX_HEADCOUNT_REDUCTION);
  const displacedFTEs = Math.max(0, Math.min(rawDisplacedFTEs, maxDisplaced));
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
  const aiSalary = teamLocation === 'Blended'
    ? (inputs.blendedAISalary || 169500)
    : (AI_TEAM_SALARY[teamLocation] || 135000);
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

  // Implementation cost breakdown
  const implEngineeringCost = aiImplEngineers * aiSalary * implTimelineYears;
  const implPMCost = aiImplPMs * (aiSalary * 0.85) * implTimelineYears;
  const implInfraCost = (implEngineeringCost + implPMCost) * 0.12;
  const implTrainingCost = (implEngineeringCost + implPMCost) * 0.08;
  const computedImplCost = implEngineeringCost + implPMCost + implInfraCost + implTrainingCost;
  const realisticImplCost = Math.max(userAdjustedImplCost, computedImplCost);

  // Ongoing AI operations team
  const ongoingAiHeadcount = Math.max(0.5, Math.round(aiImplEngineers * 0.25 * 2) / 2);
  const ongoingAiLaborCost = ongoingAiHeadcount * aiSalary;

  // API / inference costs — token-based model with legacy fallback
  const isAgenticWorkflow = inputs.isAgenticWorkflow || false;
  const requestsPerHour = assumptions.requestsPerPersonHour ?? REQUESTS_PER_PERSON_HOUR[processType] ?? 12;
  const monthlyTaskVolume = teamSize * hoursPerWeek * 4.33 * requestsPerHour;

  // Token-based cost model (activates when user provides token-level inputs, model tier, or provider)
  const useTokenModel = assumptions.useTokenModel
    || assumptions.modelTier != null
    || assumptions.avgInputTokensPerRequest != null
    || inputs.aiProvider != null;

  const tokenProfile = TOKEN_PROFILES[processType] || TOKEN_PROFILES['Other'];
  const modelTier = assumptions.modelTier || 'standard';
  const blendedTierPricing = MODEL_TIERS[modelTier] || MODEL_TIERS['standard'];
  // Provider-specific pricing: if user selected a provider, use its tier pricing;
  // otherwise fall back to the blended average across all providers.
  const aiProvider = inputs.aiProvider || null;
  const providerTier = aiProvider ? PROVIDER_PRICING[aiProvider]?.[modelTier] : null;
  const tierInputPer1M = providerTier ? providerTier.input : blendedTierPricing.inputPer1M;
  const tierOutputPer1M = providerTier ? providerTier.output : blendedTierPricing.outputPer1M;
  const avgInputTokens = assumptions.avgInputTokensPerRequest ?? tokenProfile.avgInput;
  const avgOutputTokens = assumptions.avgOutputTokensPerRequest ?? tokenProfile.avgOutput;
  // Contract commitment affects token pricing (monthly/annual/multi-year)
  const contractType = assumptions.contractType || 'annual';
  const contractDiscount = CONTRACT_DISCOUNT[contractType] || CONTRACT_DISCOUNT['annual'];
  const inputCostPer1M = (assumptions.inputTokenCostPer1M ?? tierInputPer1M) * contractDiscount;
  const outputCostPer1M = (assumptions.outputTokenCostPer1M ?? tierOutputPer1M) * contractDiscount;

  // Prompt caching — reduces effective input token cost
  const promptCachingRate = assumptions.promptCachingRate ?? PROMPT_CACHING_RATE;
  const effectiveInputCostPer1M = inputCostPer1M * (1 - promptCachingRate * CACHED_INPUT_DISCOUNT);

  // Agent complexity — multiple LLM calls per task for agentic workflows
  const agentComplexity = assumptions.agentComplexity || 'moderate';
  const agentProfile = isAgenticWorkflow
    ? (AGENT_COST_PROFILES[agentComplexity] || AGENT_COST_PROFILES['moderate'])
    : AGENT_COST_PROFILES['simple'];
  const llmCallsPerTask = agentProfile.llmCallsPerTask;
  const monthlyLLMCalls = monthlyTaskVolume * llmCallsPerTask;

  // Token costs
  const monthlyInputTokens = monthlyLLMCalls * avgInputTokens;
  const monthlyOutputTokens = monthlyLLMCalls * avgOutputTokens;
  const monthlyInputCost = (monthlyInputTokens / 1_000_000) * effectiveInputCostPer1M;
  const monthlyOutputCost = (monthlyOutputTokens / 1_000_000) * outputCostPer1M;
  const monthlyTokenCost = monthlyInputCost + monthlyOutputCost;

  // Agent infrastructure costs (orchestration, vector DB, eval, guardrails)
  const agentInfraDefaults = AGENT_INFRASTRUCTURE_MONTHLY[companySize] || AGENT_INFRASTRUCTURE_MONTHLY['Mid-Market (501-5,000)'];
  const monthlyAgentInfraCost = isAgenticWorkflow
    ? (assumptions.orchestrationPlatformCost ?? agentInfraDefaults.orchestration)
      + (assumptions.vectorDatabaseCost ?? agentInfraDefaults.vectorDb)
      + (assumptions.evalMonitoringCost ?? agentInfraDefaults.evalMonitoring)
      + (assumptions.guardrailsCost ?? agentInfraDefaults.guardrails)
    : 0;

  // Final monthly/annual API cost — token model or legacy fallback
  const effectiveRequestsPerHour = isAgenticWorkflow ? requestsPerHour * AGENTIC_COMPUTE_MULTIPLIER : requestsPerHour;
  const monthlyApiVolume = teamSize * hoursPerWeek * 4.33 * effectiveRequestsPerHour;
  let monthlyApiCost, annualApiCost;
  if (useTokenModel) {
    monthlyApiCost = monthlyTokenCost + monthlyAgentInfraCost;
    annualApiCost = monthlyApiCost * 12;
  } else {
    // Legacy request-based cost (backward compat with existing tests/users)
    const apiCostPerK = assumptions.apiCostPer1kRequests ?? API_COST_PER_1K_REQUESTS[processType] ?? 10;
    monthlyApiCost = (monthlyApiVolume / 1000) * apiCostPerK + monthlyAgentInfraCost;
    annualApiCost = monthlyApiCost * 12;
  }

  // Platform / license costs
  const annualLicenseCost = PLATFORM_LICENSE_COST[companySize] || 48000;

  // Adjacent product costs (forced cross-sells from vendor)
  const annualAdjacentCost = annualLicenseCost * ADJACENT_PRODUCT_RATE;

  // Additional ongoing costs (model maintenance, compliance, retraining, tech debt, insurance)
  const modelRetrainingCost = realisticImplCost * MODEL_RETRAINING_RATE;
  const annualComplianceCostVal = ANNUAL_COMPLIANCE_COST[companySize] || 30000;
  const retainedRetrainingCost = retainedFTEs * avgSalary * RETAINED_RETRAINING_RATE;
  const techDebtCost = realisticImplCost * TECH_DEBT_RATE;
  const cyberInsuranceCost = CYBER_INSURANCE_INCREASE[companySize] || 12000;

  // Retained talent premium — wage increase to keep top performers during AI transition
  const retainedTalentPremiumRate = inputs.retainedTalentPremiumRate ?? RETAINED_TALENT_PREMIUM_RATE;
  const retainedTalentPremium = retainedFTEs * avgSalary * retainedTalentPremiumRate;

  // Data egress/ingress costs
  const dataTransferCostMonthly = DATA_TRANSFER_COST_MONTHLY[companySize] || 3000;
  const dataTransferCostAnnual = dataTransferCostMonthly * 12;

  // Base year-1 ongoing cost (core AI ops + maintenance/compliance/insurance)
  // Retained Talent Premium is a workforce planning cost, NOT an AI operating cost —
  // separated out so it doesn't inflate ongoing AI costs (reviewer fix P0)
  const coreOngoingCost = ongoingAiLaborCost + annualApiCost + annualLicenseCost + annualAdjacentCost;
  const computedOngoingCost = coreOngoingCost + modelRetrainingCost + annualComplianceCostVal
    + retainedRetrainingCost + techDebtCost + cyberInsuranceCost
    + dataTransferCostAnnual;
  // Use computed ongoing if user didn't provide a value; never silently override user input
  const userProvidedOngoing = inputs.ongoingAnnualCost != null;
  const baseOngoingCost = userProvidedOngoing ? ongoingAnnualCost : computedOngoingCost;
  const ongoingCostOverridden = !userProvidedOngoing && computedOngoingCost > ongoingAnnualCost;

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
    aiSalary,
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
    annualLicenseCost,
    annualAdjacentCost,
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
      modelTierLabel: blendedTierPricing.label,
      aiProvider,
      providerModel: providerTier?.model ?? null,
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

  // Total separation cost per FTE and breakdown
  const separationMultiplier = SEPARATION_COST_MULTIPLIER[companySize] || 1.0;
  const separationCostPerFTE = avgSalary * separationMultiplier;
  const totalSeparationCost = displacedFTEs * separationCostPerFTE;

  // Itemized separation breakdown
  const separationBreakdown = {};
  for (const [key, { rate, label }] of Object.entries(SEPARATION_COST_BREAKDOWN)) {
    separationBreakdown[key] = {
      label,
      perFTE: separationCostPerFTE * rate,
      total: totalSeparationCost * rate,
    };
  }

  // Phased separation costs by year (follows HEADCOUNT_REDUCTION_SCHEDULE)
  const separationByYear = HEADCOUNT_REDUCTION_SCHEDULE.map(pct => totalSeparationCost * pct);

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

  // Vendor termination cost (user-provided — cost to exit CURRENT vendor contracts)
  const vendorsReplaced = inputs.vendorsReplaced || 0;
  const vendorTerminationCost = inputs.vendorTerminationCost || 0;

  // One-time costs that are truly upfront (NO separation — it's phased)
  const totalOneTimeCosts = legalComplianceCost + securityAuditCost + contingencyReserve + vendorTerminationCost;

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
    separationPhasing: HEADCOUNT_REDUCTION_SCHEDULE,
    severanceWeeks,
    legalComplianceCost,
    securityAuditCost,
    contingencyReserve,
    vendorSwitchingCost,
    vendorSwitchingRate,
    vendorsReplaced,
    vendorTerminationCost,
    totalOneTimeCosts,
  };

  // =====================================================================
  // HIDDEN COSTS (based on realistic implementation cost)
  // =====================================================================
  const changeManagement = realisticImplCost * 0.15;
  const culturalResistance = realisticImplCost * CULTURAL_RESISTANCE_RATE;
  const dataCleanup =
    realisticImplCost *
    (dataReadiness <= 2 ? 0.25 : dataReadiness === 3 ? 0.10 : 0);
  const integrationTesting = realisticImplCost * 0.10;
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

  const headcountSavingsGross = displacedFTEs * avgSalary;
  const efficiencySavingsGross = Math.max(0, (annualLaborCost * automationPotential) - headcountSavingsGross);
  const errorReductionGross = annualReworkCost * automationPotential;
  const toolReplacementGross = currentToolCosts * toolReplacementRate;
  const archetypeRevenueGross = archetypeRevenueImpact;

  // Enhancement savings = what you get Year 1 (no headcount reduction yet)
  // Includes archetype-specific KPI savings (SLA penalties, repeat contacts, etc.)
  const enhancementGross = efficiencySavingsGross + errorReductionGross + toolReplacementGross + archetypeRevenueGross + archetypeKpiSavings;
  const enhancementRiskAdjusted = enhancementGross * riskMultiplier;

  // =====================================================================
  // ANNUAL SAVINGS (gross metrics for reference)
  // Uses decomposed value breakdown to avoid applying automation % to tool costs
  // =====================================================================
  const grossAnnualSavings = headcountSavingsGross + efficiencySavingsGross + errorReductionGross + toolReplacementGross + archetypeRevenueGross + archetypeKpiSavings;
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
    },
    errorReduction: {
      gross: errorReductionGross,
      riskAdjusted: errorReductionGross * riskMultiplier,
    },
    toolReplacement: {
      gross: toolReplacementGross,
      riskAdjusted: toolReplacementGross * riskMultiplier,
    },
    archetypeRevenue: {
      gross: archetypeRevenueGross,
      riskAdjusted: archetypeRevenueGross * riskMultiplier,
    },
    archetypeKpi: {
      gross: archetypeKpiSavings,
      riskAdjusted: archetypeKpiSavings * riskMultiplier,
      detail: {
        slaPenaltyCost: archetypeSlaPenaltyCost,
        repeatContactCost: archetypeRepeatContactCost,
        closeTimeSavings: archetypeCloseTimeSavings,
        cycleCompressionRevenue: archetypeCycleCompressionRevenue,
        remediationSavings: archetypeRemediationSavings,
        onboardingSavings: archetypeOnboardingSavings,
        decisionQualityValue: archetypeDecisionQualityValue,
        falseNegativeRiskCost: archetypeFalseNegativeRiskCost,
      },
    },
    // Totals use individual riskAdjusted values to avoid double-application
    totalGross: headcountSavingsGross + efficiencySavingsGross + errorReductionGross + toolReplacementGross + archetypeRevenueGross + archetypeKpiSavings,
    totalRiskAdjusted: headcountSavingsGross
      + efficiencySavingsGross * riskMultiplier
      + errorReductionGross * riskMultiplier
      + toolReplacementGross * riskMultiplier
      + archetypeRevenueGross * riskMultiplier
      + archetypeKpiSavings * riskMultiplier,
    perEmployeeGain: teamSize > 0
      ? enhancementRiskAdjusted / teamSize
      : 0,
    enhancementPhaseAnnual: enhancementRiskAdjusted,
    // Headcount phase: no risk multiplier — gated by HR phasing schedule
    headcountPhaseAnnual: headcountSavingsGross,
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

    // Decompose enhancement into labor-indexed (affected by wage growth)
    // vs non-labor (tool, revenue, KPI — not wage-indexed)
    const laborEnhancementRA = efficiencySavingsGross * riskMultiplier;
    const aiDrivenEnhancementRA = (efficiencySavingsGross + errorReductionGross) * riskMultiplier;
    const nonLaborEnhancementRA = (toolReplacementGross + archetypeRevenueGross + archetypeKpiSavings) * riskMultiplier;

    for (let yr = 0; yr < DCF_YEARS; yr++) {
      // Wage growth applies only to labor-based savings
      const wageGrowth = Math.pow(1 + wageInflationRate, yr);

      // Model drift applies only to AI-driven components (efficiency, error)
      // NOT to headcount (people stay cut), tools (contract cancelled), or revenue
      const driftFactor = Math.pow(1 - modelDriftRate, yr);

      // AI-driven savings: wage-indexed + drift-affected
      const aiSavings = aiDrivenEnhancementRA * adoptionRamp[yr] * scenarioMultiplier * wageGrowth * driftFactor;
      // Non-labor savings: no wage growth, no drift (tool/revenue/KPI)
      const nonLaborSavings = nonLaborEnhancementRA * adoptionRamp[yr] * scenarioMultiplier;
      const enhancementSavings = aiSavings + nonLaborSavings;

      // Headcount: gated by HR schedule, wage-indexed, NO drift (cuts are permanent)
      // NO scenario multiplier — phasing schedule IS the realization constraint
      cumulativeReduction += HEADCOUNT_REDUCTION_SCHEDULE[yr];
      const headcountSavings = valueBreakdown.headcount.riskAdjusted * cumulativeReduction * wageGrowth;

      const grossSavings = enhancementSavings + headcountSavings;

      // Separation costs escalated for future-year wage inflation
      const separationCost = separationByYear[yr] * Math.pow(1 + wageInflationRate, yr);

      // Ongoing AI costs (escalating per schedule)
      const ongoingCost = ongoingCostsByYear[yr];

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

    // Newton-Raphson with dampening and consistent bounds
    const IRR_FLOOR = -0.95;
    const IRR_CEILING = 5.0; // 500% max — anything higher is not credible for AI
    let rate = 0.10;
    for (let i = 0; i < maxIterations; i++) {
      if (!isFinite(rate) || rate <= IRR_FLOOR || rate > IRR_CEILING) return NaN;

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
        if (newRate < IRR_FLOOR || newRate > IRR_CEILING) return NaN;
        return newRate;
      }
      rate = newRate;
    }
    if (rate < IRR_FLOOR || rate > IRR_CEILING || !isFinite(rate)) return NaN;
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
      vendorTerminationCost,
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
    let cumulativeNet = -modUpfront;
    for (let yr = 0; yr < DCF_YEARS; yr++) {
      const wageGrowth = Math.pow(1 + wageInflationRate, yr);
      const driftFactor = Math.pow(1 - modelDriftRate, yr);
      // Enhancement: drift applies to AI-driven portion only
      const eSavings = modEnhancementRA * adoptionRamp[yr] * wageGrowth * driftFactor;
      // Headcount: NO drift (cuts are permanent), NO scenario multiplier
      cumulativeReduction += HEADCOUNT_REDUCTION_SCHEDULE[yr];
      const hSavings = modHeadcountRA * cumulativeReduction * wageGrowth;
      const sepCost = separationByYear[yr] * Math.pow(1 + wageInflationRate, yr);
      const ongCost = modOngoingByYear[yr];
      const net = eSavings + hSavings - sepCost - ongCost;
      cumulativeNet += net;
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
  function valueFromCurrentCost(modCurrentCost, modAutomation, modTeamSize) {
    const ap = modAutomation ?? automationPotential;
    const ts = modTeamSize ?? teamSize;
    const modLaborCost = modCurrentCost - currentToolCosts; // approximate
    const modReworkCost = modLaborCost * errorRate / (1 + errorRate); // back-derive
    const modAvgSalary = ts > 0 ? modLaborCost / (ts * (1 + errorRate)) : avgSalary;
    // Recalculate displaced FTEs for the modified scenario
    const modRawDisplaced = Math.round(ts * ap * adoptionRate);
    const modMaxDisplaced = Math.floor(ts * MAX_HEADCOUNT_REDUCTION);
    const modDisplacedFTEs = Math.min(modRawDisplaced, modMaxDisplaced);
    const modHeadGross = modDisplacedFTEs * modAvgSalary;
    const modEffGross = Math.max(0, (ts * modAvgSalary) * ap - modHeadGross);
    const modErrGross = modReworkCost * ap;
    const modToolGross = currentToolCosts * (assumptions.toolReplacementRate ?? TOOL_REPLACEMENT_RATE[processType] ?? 0.40);
    const modEnhRA = (modEffGross + modErrGross + modToolGross) * riskMultiplier;
    const modHeadRA = modHeadGross * riskMultiplier;
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
    return lab + lab * errorRate + currentToolCosts;
  }
  const teamLowVal = valueFromCurrentCost(costForTeam(teamLow), undefined, teamLow);
  const teamHighVal = valueFromCurrentCost(costForTeam(teamHigh), undefined, teamHigh);

  // --- Salary sensitivity ---
  const salLow = avgSalary * 0.80;
  const salHigh = avgSalary * 1.20;
  function costForSalary(s) {
    const lab = teamSize * s;
    return lab + lab * errorRate + currentToolCosts;
  }
  const salLowVal = valueFromCurrentCost(costForSalary(salLow));
  const salHighVal = valueFromCurrentCost(costForSalary(salHigh));

  // --- Error rate sensitivity ---
  const errLow = Math.max(0, errorRate * 0.50);
  const errHigh = Math.min(0.50, errorRate * 1.50);
  function costForError(e) {
    return teamSize * avgSalary + teamSize * avgSalary * e + currentToolCosts;
  }
  const errLowVal = valueFromCurrentCost(costForError(errLow));
  const errHighVal = valueFromCurrentCost(costForError(errHigh));

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
      cumulativeReduction += HEADCOUNT_REDUCTION_SCHEDULE[yr];
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
      for (let y = 0; y <= yearIndex; y++) cRed += HEADCOUNT_REDUCTION_SCHEDULE[y];
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
      'Error / Rework Rate',
      `${(errorRate * 100).toFixed(0)}%`,
      `${(errLow * 100).toFixed(0)}% (-50%)`,
      `${(errHigh * 100).toFixed(0)}% (+50%)`,
      sensitivityNPV(errLowVal.enhancementRA, errLowVal.headcountRA, ongoingCostsByYear, upfrontInvestment),
      sensitivityNPV(errHighVal.enhancementRA, errHighVal.headcountRA, ongoingCostsByYear, upfrontInvestment),
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
    } else if (i === 2) { // Error Rate
      row.paybackLow = sensitivityPayback(errLowVal.enhancementRA, errLowVal.headcountRA, ongoingCostsByYear, upfrontInvestment);
      row.paybackHigh = sensitivityPayback(errHighVal.enhancementRA, errHighVal.headcountRA, ongoingCostsByYear, upfrontInvestment);
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
      const flows = [];
      let cumRed = 0;
      for (let yr = 0; yr < DCF_YEARS; yr++) {
        const wg = Math.pow(1 + wageInflationRate, yr);
        const enh = enhancementRiskAdjusted * delayedRamp[yr] * wg;
        cumRed += HEADCOUNT_REDUCTION_SCHEDULE[yr];
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
  const isUSBased = (teamLocation || '').startsWith('US') || teamLocation === 'Blended';
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

  // =====================================================================
  // REVENUE ENABLEMENT (informational — NOT in NPV/ROIC to stay conservative)
  // Only computed when user provides annualRevenue — no speculative proxies
  // =====================================================================
  const isRevenueEligible = assumptions.revenueEligible ?? REVENUE_ELIGIBLE_PROCESSES.includes(processType);
  const userAnnualRevenue = inputs.annualRevenue || 0;
  const revenueUpliftData = REVENUE_UPLIFT[industry] || REVENUE_UPLIFT['Other'];

  let revenueEnablement;
  if (isRevenueEligible && userAnnualRevenue > 0) {
    const timeToMarketRev = userAnnualRevenue * revenueUpliftData.timeToMarket * REVENUE_RISK_DISCOUNT * riskMultiplier;
    const customerExpRev = userAnnualRevenue * revenueUpliftData.customerExperience * REVENUE_RISK_DISCOUNT * riskMultiplier;
    const newCapabilityRev = userAnnualRevenue * revenueUpliftData.newCapability * REVENUE_RISK_DISCOUNT * riskMultiplier;
    // Revenue displacement risk — chance AI degrades customer experience initially
    // Apply same REVENUE_RISK_DISCOUNT as uplift so downside uncertainty is symmetric
    const displacementRisk = userAnnualRevenue * REVENUE_DISPLACEMENT_RISK_RATE * REVENUE_RISK_DISCOUNT * riskMultiplier;
    const grossRevenue = timeToMarketRev + customerExpRev + newCapabilityRev;
    revenueEnablement = {
      eligible: true,
      revenueBase: userAnnualRevenue,
      timeToMarket: timeToMarketRev,
      customerExperience: customerExpRev,
      newCapability: newCapabilityRev,
      displacementRisk,
      totalAnnualRevenue: grossRevenue - displacementRisk,
      riskDiscount: REVENUE_RISK_DISCOUNT,
    };
  } else {
    revenueEnablement = {
      eligible: false,
      processType: processType,
      projectArchetype: inputs.projectArchetype || null,
    };
  }

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
      if (type === 'archetypeRevenue') phaseValue += valueBreakdown.archetypeRevenue.riskAdjusted;
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
    description: 'Direct cash savings from labor, error, and tool reduction',
    annualGross: grossAnnualSavings,
    annualRiskAdjusted: riskAdjustedSavings,
    annualCashRealized: riskAdjustedSavings * cashRealizationPct,
    annualCapacityOnly: riskAdjustedSavings * (1 - cashRealizationPct),
    cashRealizationPct,
  };

  // --- Path B: Capacity Creation ---
  const annualRevenue = inputs.annualRevenue || 0;
  const contributionMargin = inputs.contributionMargin ?? 0.30;
  const cycleTimeBenchmarks = CYCLE_TIME_REDUCTION[industry] || CYCLE_TIME_REDUCTION['Other'];
  const cycleTimeReductionMonths = inputs.cycleTimeReductionMonths ?? cycleTimeBenchmarks.months;

  const capacityHoursFreed = annualHours * automationPotential * riskMultiplier;
  const capacityFTEEquivalent = capacityHoursFreed / 2080;

  // Revenue acceleration: if AI reduces cycle time, revenue arrives sooner
  const revenueAcceleration = annualRevenue > 0 && cycleTimeReductionMonths > 0
    ? (annualRevenue * contributionMargin * cycleTimeReductionMonths / 12) * riskMultiplier
    : 0;

  const capacityCreationPathway = {
    label: 'Capacity Creation',
    description: 'Strategic leverage from freed capacity and accelerated cycles',
    hoursFreed: capacityHoursFreed,
    fteEquivalent: capacityFTEEquivalent,
    hourlyValue: hourlyRate,
    annualCapacityValue: capacityHoursFreed * hourlyRate,
    revenueAcceleration,
    cycleTimeReductionMonths,
    annualRevenue,
    contributionMargin,
    totalAnnualValue: (capacityHoursFreed * hourlyRate) + revenueAcceleration,
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
    includeInNPV: inputs.includeRiskReduction ?? false,
  };

  // --- Combined V3 Value ---
  // When capacity is included in NPV, add only the non-cash portion to avoid
  // double-counting with costEfficiency (which already includes cash-realized savings).
  const includeRevAccelInNPV = inputs.includeRevenueAcceleration ?? false;
  const capacityNPVAddon = capacityCreationPathway.includeInNPV
    ? costEfficiencyPathway.annualCapacityOnly + revenueAcceleration
    : 0;
  const totalV3AnnualValue =
    costEfficiencyPathway.annualRiskAdjusted
    + capacityNPVAddon
    + (riskReductionPathway.includeInNPV ? riskReductionPathway.annualValueAvoided : 0)
    + (includeRevAccelInNPV ? revenueAcceleration : 0);

  const valuePathways = {
    costEfficiency: costEfficiencyPathway,
    capacityCreation: capacityCreationPathway,
    riskReduction: riskReductionPathway,
    totalAnnualValue: totalV3AnnualValue,
    costOnlyAnnual: costEfficiencyPathway.annualRiskAdjusted,
    // Additive NPV impact from V3 pathways (on top of base cost DCF)
    additionalAnnualValue:
      (capacityCreationPathway.includeInNPV ? capacityCreationPathway.totalAnnualValue : 0)
      + (riskReductionPathway.includeInNPV ? riskReductionPathway.annualValueAvoided : 0)
      + (includeRevAccelInNPV ? revenueAcceleration : 0),
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
        const modOngoing = ongoingCostsByYear.map((c, yr) => mid * (c / baseOngoingCost));
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
        const modCost = mid * avgSalary + mid * avgSalary * errorRate + currentToolCosts;
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

  // =====================================================================
  // V5.1: BREAK-EVEN UNIT ECONOMICS
  // For each archetype input, find the minimum value that makes NPV >= 0.
  // Binary search: modify ONE archetype input at a time, re-run mapping,
  // then compute a simplified NPV to find the break-even threshold.
  // =====================================================================
  function calculateBreakEvenUnits() {
    if (!inputs.archetypeInputs || !inputs.projectArchetype) return null;

    const schema = ARCHETYPE_INPUT_MAP[inputs.projectArchetype];
    if (!schema) return null;

    const baseInputs = { ...inputs.archetypeInputs };
    const results = [];

    // Quick NPV proxy: rebuild savings from overrides, run through sensitivityNPV
    function quickNPVProxy(overrides) {
      const ap = overrides.automationPotential ?? automationPotential;
      const er = Math.max(0, Math.min(overrides.errorRate ?? errorRate, 1));
      const rev = Math.max(0, overrides.revenueImpact || 0);

      const lab = teamSize * avgSalary;
      const rw = lab * er;
      const displacedRaw = Math.round(teamSize * ap * adoptionRate);
      const maxDisplaced = Math.floor(teamSize * MAX_HEADCOUNT_REDUCTION);
      const displaced = Math.min(displacedRaw, maxDisplaced);
      const headGross = displaced * avgSalary;
      const effGross = Math.max(0, lab * ap - headGross);
      const errGross = rw * ap;
      const toolGross = currentToolCosts * (assumptions.toolReplacementRate ?? 0.40);
      const enhRA = (effGross + errGross + toolGross + rev) * riskMultiplier;
      const headRA = headGross * riskMultiplier;

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
        const safeDiv = (a, b) => b !== 0 ? a / b : 0;
        results.push({
          key: inputDef.key,
          label: inputDef.label,
          type: inputDef.type,
          currentValue: currentVal,
          breakEvenValue: formatted,
          marginPct: Math.round(safeDiv(currentVal - beValue, Math.abs(beValue) || 1) * 100),
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
    if (!inputs.archetypeInputs || !inputs.projectArchetype) return null;
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

      // Quick NPV via proxy (same approach as break-even units)
      const ap = testOverrides.automationPotential ?? automationPotential;
      const er = Math.max(0, Math.min(testOverrides.errorRate ?? errorRate, 1));
      const rev = Math.max(0, testOverrides.revenueImpact || 0);

      const lab = teamSize * avgSalary;
      const rw = lab * er;
      const displacedRaw = Math.round(teamSize * ap * adoptionRate);
      const maxDisplacedCalc = Math.floor(teamSize * MAX_HEADCOUNT_REDUCTION);
      const displaced = Math.min(displacedRaw, maxDisplacedCalc);
      const headGross = displaced * avgSalary;
      const effGross = Math.max(0, lab * ap - headGross);
      const errGross = rw * ap;
      const toolGross = currentToolCosts * (assumptions.toolReplacementRate ?? 0.40);
      const enhRA = (effGross + errGross + toolGross + rev) * riskMultiplier;
      const headRA = headGross * riskMultiplier;

      const npv = sensitivityNPV(enhRA, headRA, ongoingCostsByYear, upfrontInvestment);

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

  // =====================================================================
  // UNIT ECONOMICS — Per-person and per-percent impact
  // =====================================================================
  const savingsPerPerson = teamSize > 0
    ? Math.round(riskAdjustedSavings / teamSize)
    : 0;
  const costPerPerson = avgSalary; // fully loaded
  const netPerPerson = savingsPerPerson - Math.round(baseOngoingCost / Math.max(teamSize, 1));
  const savingsPerEfficiencyPct = Math.round(riskAdjustedSavings / (automationPotential * 100));
  const aiCostPerPerson = Math.round(baseOngoingCost / Math.max(teamSize, 1));

  const unitEconomics = {
    savingsPerPerson,
    costPerAdditionalPerson: costPerPerson,
    netValuePerPerson: netPerPerson,
    aiCostPerPerson,
    savingsPerEfficiencyPct,
    breakEvenTeamSize: baseOngoingCost > 0 && savingsPerPerson > 0
      ? Math.ceil(baseOngoingCost / savingsPerPerson)
      : null,
    summary: {
      positive: `Each person on this process = ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(netPerPerson)}/year net savings`,
      negative: `Each additional person costs ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(costPerPerson)}/year; AI cost per person = ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(aiCostPerPerson)}/year`,
      efficiency: `Each 1% efficiency gain = ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(savingsPerEfficiencyPct)}/year incremental savings`,
    },
  };

  // =====================================================================
  // 2D SENSITIVITY MATRIX — AI Cost vs Headcount/Efficiency
  // Rows: AI cost multiplier (0.5x to 2.0x)
  // Cols: Team size delta (-10 to +10) or efficiency delta (-20% to +20%)
  // Cell: 5-year NPV at that combination
  // =====================================================================
  const costMultipliers = [0.50, 0.75, 1.00, 1.25, 1.50, 2.00];
  const teamDeltas = [-10, -5, 0, 5, 10, 15];

  function matrixNPV(costMult, teamDelta) {
    const adjTeam = Math.max(1, teamSize + teamDelta);
    const adjLabor = adjTeam * avgSalary;
    const adjRework = adjLabor * errorRate;
    const adjCurrentCost = adjLabor + adjRework + currentToolCosts;
    const adjHeadcountGross = Math.min(adjTeam * MAX_HEADCOUNT_REDUCTION, adjTeam * automationPotential) * avgSalary;
    const adjEfficiencyGross = Math.max(0, (adjLabor * automationPotential) - adjHeadcountGross);
    const adjErrorGross = adjRework * automationPotential;
    const adjEnhancement = (adjEfficiencyGross + adjErrorGross + toolReplacementGross + archetypeRevenueGross + archetypeKpiSavings) * riskMultiplier;
    const adjOngoing = baseOngoingCost * costMult;

    let npv = -upfrontInvestment;
    let cumReduction = 0;
    for (let yr = 0; yr < DCF_YEARS; yr++) {
      const wg = Math.pow(1 + wageInflationRate, yr);
      const drift = Math.pow(1 - modelDriftRate, yr);
      const eSavings = adjEnhancement * adoptionRamp[yr] * wg * drift;
      cumReduction += HEADCOUNT_REDUCTION_SCHEDULE[yr];
      const hSavings = adjHeadcountGross * cumReduction * wg * drift;
      const sep = separationByYear[yr] * (adjTeam / Math.max(teamSize, 1));
      const ong = adjOngoing * (1 + (AI_COST_ESCALATION_SCHEDULE[yr] || 0));
      const net = eSavings + hSavings - sep - ong;
      npv += net / Math.pow(1 + discountRate, yr + 1);
    }
    return Math.round(npv);
  }

  const costVsHeadcountMatrix = {
    costMultipliers,
    teamDeltas,
    costLabels: costMultipliers.map(m => `${Math.round(m * 100)}% AI Cost`),
    teamLabels: teamDeltas.map(d => d === 0 ? `${teamSize} (current)` : d > 0 ? `+${d} people` : `${d} people`),
    grid: costMultipliers.map(cm =>
      teamDeltas.map(td => matrixNPV(cm, td))
    ),
    baseNPV: matrixNPV(1.0, 0),
    unitEconomicsSummary: unitEconomics.summary,
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
      annualReworkCost,
      totalCurrentCost,
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
      aiProvider,
      providerModel: providerTier?.model ?? null,
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
    // V6: Unit economics + 2D sensitivity matrix
    unitEconomics,
    costVsHeadcountMatrix,
  };

}
