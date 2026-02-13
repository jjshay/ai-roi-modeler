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
  SCENARIO_CONFIGS,
  EFFECTIVE_TAX_RATE,
  GATE_STRUCTURE,
} from './benchmarks';

export function runCalculations(inputs) {
  // =====================================================================
  // CONTEXT-AWARE DEFAULTS (for null/undefined values)
  // =====================================================================
  const teamSize = Math.max(1, Math.min(inputs.teamSize || 10, 100000));
  const avgSalary = Math.max(10000, Math.min(inputs.avgSalary || 100000, 10000000));
  const hoursPerWeek = Math.max(1, Math.min(inputs.hoursPerWeek || 20, 80));
  const errorRate = Math.max(0, Math.min(inputs.errorRate ?? 0.10, 1));
  const currentToolCosts = Math.max(0, inputs.currentToolCosts || 0);
  const companySize = inputs.companySize || 'Mid-Market (501-5,000)';
  const industry = inputs.industry || 'Other';
  const processType = inputs.processType || 'Other';
  const teamLocation = inputs.teamLocation || 'US - Major Tech Hub';
  const dataReadiness = inputs.dataReadiness ?? 3;
  const changeReadiness = inputs.changeReadiness ?? 3;

  // Auto-calculate implementation budget if not provided
  const aiSalaryForCalc = AI_TEAM_SALARY[teamLocation] || 135000;
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
  const automationPotential = getAutomationPotential(industry, processType);
  const industrySuccessRate = getIndustrySuccessRate(industry);

  // =====================================================================
  // RISK ADJUSTMENTS
  // =====================================================================
  const adoptionRate = ADOPTION_MULTIPLIERS[changeReadiness] || 0.70;
  const sponsorAdjustment = inputs.execSponsor ? 1.0 : 0.85;
  // Blended risk: average of org readiness and industry success rate
  // Avoids triple-stacking that compounds independent factors unrealistically
  const orgReadiness = adoptionRate * sponsorAdjustment;
  const riskMultiplier = (orgReadiness + industrySuccessRate) / 2;

  // =====================================================================
  // DISCOUNT RATE (WACC proxy, varies by company size)
  // =====================================================================
  const discountRate = DISCOUNT_RATE_BY_SIZE[companySize] || DISCOUNT_RATE;

  // =====================================================================
  // DISPLACED / RETAINED FTEs (needed for ongoing cost model)
  // =====================================================================
  const rawDisplacedFTEs = Math.round(teamSize * automationPotential * adoptionRate);
  const maxDisplaced = Math.floor(teamSize * MAX_HEADCOUNT_REDUCTION);
  const displacedFTEs = Math.min(rawDisplacedFTEs, maxDisplaced);
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
  const aiSalary = AI_TEAM_SALARY[teamLocation] || 135000;
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

  // API / inference costs
  const requestsPerHour = REQUESTS_PER_PERSON_HOUR[processType] || 12;
  const monthlyApiVolume = teamSize * hoursPerWeek * 4.33 * requestsPerHour;
  const apiCostPerK = API_COST_PER_1K_REQUESTS[processType] || 10;
  const monthlyApiCost = (monthlyApiVolume / 1000) * apiCostPerK;
  const annualApiCost = monthlyApiCost * 12;

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

  // Base year-1 ongoing cost (core AI ops + maintenance/compliance/insurance)
  const coreOngoingCost = ongoingAiLaborCost + annualApiCost + annualLicenseCost + annualAdjacentCost;
  const computedOngoingCost = coreOngoingCost + modelRetrainingCost + annualComplianceCostVal
    + retainedRetrainingCost + techDebtCost + cyberInsuranceCost;
  const baseOngoingCost = Math.max(ongoingAnnualCost, computedOngoingCost);

  // 5-year ongoing costs with tapered vendor escalation
  // Years 1-2: 12% increase, Years 3-4: 7% (stabilized)
  const ongoingCostsByYear = [];
  let cumulativeEscalation = 1.0;
  for (let yr = 0; yr < DCF_YEARS; yr++) {
    cumulativeEscalation *= (1 + (AI_COST_ESCALATION_SCHEDULE[yr] || 0));
    ongoingCostsByYear.push(baseOngoingCost * cumulativeEscalation);
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
    computedOngoingCost,
    baseOngoingCost,
    ongoingCostsByYear,
    totalOngoing5Year,
    escalationSchedule: AI_COST_ESCALATION_SCHEDULE,
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
  const productivityDip = (annualLaborCost / 12) * 3 * 0.25; // 3 months at 25% dip (was 2mo at 20%)
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
  // ANNUAL SAVINGS (gross metrics for reference)
  // =====================================================================
  const grossAnnualSavings = totalCurrentCost * automationPotential;
  const riskAdjustedSavings = grossAnnualSavings * riskMultiplier;
  const netAnnualSavings = riskAdjustedSavings - baseOngoingCost;

  // =====================================================================
  // VALUE CREATION BREAKDOWN
  // 4 categories, with per-employee gain and enhancement vs headcount phases
  // =====================================================================
  const toolReplacementRate = TOOL_REPLACEMENT_RATE[inputs.processType] || 0.40;

  const headcountSavingsGross = displacedFTEs * avgSalary;
  const efficiencySavingsGross = Math.max(0, (annualLaborCost * automationPotential) - headcountSavingsGross);
  const errorReductionGross = annualReworkCost * automationPotential;
  const toolReplacementGross = currentToolCosts * toolReplacementRate;

  // Enhancement savings = what you get Year 1 (no headcount reduction yet)
  const enhancementGross = efficiencySavingsGross + errorReductionGross + toolReplacementGross;
  const enhancementRiskAdjusted = enhancementGross * riskMultiplier;

  const valueBreakdown = {
    headcount: {
      gross: headcountSavingsGross,
      riskAdjusted: headcountSavingsGross * riskMultiplier,
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
    totalGross: headcountSavingsGross + efficiencySavingsGross + errorReductionGross + toolReplacementGross,
    totalRiskAdjusted: (headcountSavingsGross + efficiencySavingsGross + errorReductionGross + toolReplacementGross) * riskMultiplier,
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
  // =====================================================================
  function buildYearCashFlows(scenarioMultiplier) {
    const flows = [];
    let cumulativeReduction = 0;
    let cumulativeNet = -upfrontInvestment;

    for (let yr = 0; yr < DCF_YEARS; yr++) {
      // Savings inflate with wage growth (the labor costs being avoided grow annually)
      const wageGrowth = Math.pow(1 + WAGE_INFLATION_RATE, yr);

      // Enhancement savings (efficiency + error + tool) — adoption ramp applies
      const enhancementSavings = enhancementRiskAdjusted * ADOPTION_RAMP[yr] * scenarioMultiplier * wageGrowth;

      // Headcount savings — phased reduction (cumulative)
      cumulativeReduction += HEADCOUNT_REDUCTION_SCHEDULE[yr];
      const headcountSavings = valueBreakdown.headcount.riskAdjusted * cumulativeReduction * scenarioMultiplier * wageGrowth;

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
    conservative: { label: 'Conservative', multiplier: 0.70 },
    base: { label: 'Base Case', multiplier: 1.0 },
    optimistic: { label: 'Optimistic', multiplier: 1.20 },
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
      roicCapped: key === 'base' && rawROIC > MAX_BASE_ROIC,
      paybackMonths: calculatePayback(yearFlows),
    };
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
    if (realisticImplCost > 500000 && processType === 'Workflow Automation')
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
      const wageGrowth = Math.pow(1 + WAGE_INFLATION_RATE, yr);
      const eSavings = modEnhancementRA * ADOPTION_RAMP[yr] * wageGrowth;
      cumulativeReduction += HEADCOUNT_REDUCTION_SCHEDULE[yr];
      const hSavings = modHeadcountRA * cumulativeReduction * wageGrowth;
      const sepCost = separationByYear[yr];
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
  function valueFromCurrentCost(modCurrentCost, modAutomation) {
    const ap = modAutomation ?? automationPotential;
    const modLaborCost = modCurrentCost - currentToolCosts; // approximate
    const modReworkCost = modLaborCost * errorRate / (1 + errorRate); // back-derive
    const modHeadGross = displacedFTEs * (modLaborCost / teamSize);
    const modEffGross = Math.max(0, modLaborCost * ap - modHeadGross);
    const modErrGross = modReworkCost * ap;
    const modToolGross = currentToolCosts * (TOOL_REPLACEMENT_RATE[processType] || 0.40);
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
  const teamLowVal = valueFromCurrentCost(costForTeam(teamLow));
  const teamHighVal = valueFromCurrentCost(costForTeam(teamHigh));

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
  ];

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
        const wg = Math.pow(1 + WAGE_INFLATION_RATE, yr);
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

  // BUG FIX: Use compounding instead of linear growth (audit issue #4)
  // Linear (rate × yr) understates 5-year totals by 5-8%; inconsistent with DCF
  function calculateInactionCost(delayYears) {
    let totalCost = 0;
    const yearlyBreakdown = [];
    for (let yr = 1; yr <= delayYears; yr++) {
      // Compounding: cost of wages that have grown yr years
      const wageInflation = annualLaborCost * (Math.pow(1 + WAGE_INFLATION_RATE, yr) - 1);
      const legacyCreep = currentToolCosts * (Math.pow(1 + LEGACY_MAINTENANCE_CREEP, yr) - 1);
      const forgoneSavings = netAnnualSavings * (yr <= DCF_YEARS ? ADOPTION_RAMP[Math.min(yr - 1, DCF_YEARS - 1)] : 1.0);
      // Compounding competitive and compliance penalties
      const competitiveLoss = totalCurrentCost * (Math.pow(1 + competitivePenalty, yr) - 1);
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

  // =====================================================================
  // R&D TAX CREDIT (informational only — NOT in NPV/ROIC)
  // =====================================================================
  const companyState = inputs.companyState || 'Other / Not Sure';
  const isUSBased = (teamLocation || '').startsWith('US');
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
  // =====================================================================
  const isRevenueEligible = REVENUE_ELIGIBLE_PROCESSES.includes(processType);
  const revenueUpliftData = REVENUE_UPLIFT[industry] || REVENUE_UPLIFT['Other'];
  const revenueProxy = totalCurrentCost * 3; // conservative: process supports ~3x its cost in revenue

  let revenueEnablement;
  if (isRevenueEligible) {
    const timeToMarketRev = revenueProxy * revenueUpliftData.timeToMarket * REVENUE_RISK_DISCOUNT * riskMultiplier;
    const customerExpRev = revenueProxy * revenueUpliftData.customerExperience * REVENUE_RISK_DISCOUNT * riskMultiplier;
    const newCapabilityRev = revenueProxy * revenueUpliftData.newCapability * REVENUE_RISK_DISCOUNT * riskMultiplier;
    revenueEnablement = {
      eligible: true,
      revenueProxy,
      timeToMarket: timeToMarketRev,
      customerExperience: customerExpRev,
      newCapability: newCapabilityRev,
      totalAnnualRevenue: timeToMarketRev + customerExpRev + newCapabilityRev,
      riskDiscount: REVENUE_RISK_DISCOUNT,
    };
  } else {
    revenueEnablement = {
      eligible: false,
      processType: processType,
    };
  }

  // =====================================================================
  // THRESHOLD / BREAKEVEN ANALYSIS
  // =====================================================================
  function calculateBreakeven() {
    const pvFactor = ADOPTION_RAMP.reduce((sum, ramp, yr) =>
      sum + ramp / Math.pow(1 + discountRate, yr + 1), 0);

    // Breakeven risk multiplier: what risk level makes NPV = 0?
    const breakevenRisk = grossAnnualSavings > 0
      ? ((upfrontInvestment / pvFactor) + baseOngoingCost) / grossAnnualSavings
      : null;

    // Maximum tolerable ongoing cost for NPV = 0
    const maxOngoingCost = pvFactor > 0
      ? riskAdjustedSavings - (upfrontInvestment / pvFactor)
      : null;

    return {
      breakevenRiskMultiplier: breakevenRisk,
      currentRiskMultiplier: riskMultiplier,
      riskMargin: breakevenRisk !== null ? riskMultiplier - breakevenRisk : null,
      isViable: breakevenRisk !== null && riskMultiplier > breakevenRisk,
      maxOngoingCost,
      currentOngoingCost: baseOngoingCost,
      ongoingCostMargin: maxOngoingCost !== null ? maxOngoingCost - baseOngoingCost : null,
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
    const consFlows = buildYearCashFlows(0.70);
    const optFlows = buildYearCashFlows(1.20);

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
  const includeRevAccelInNPV = inputs.includeRevenueAcceleration ?? false;
  const totalV3AnnualValue =
    costEfficiencyPathway.annualRiskAdjusted
    + (capacityCreationPathway.includeInNPV ? capacityCreationPathway.totalAnnualValue : 0)
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
      const gateAnnualSavings = riskAdjustedSavings * Math.min(1, yearsIn > 0 ? ADOPTION_RAMP[Math.min(Math.floor(yearsIn), DCF_YEARS - 1)] : 0);

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
  };
}
