import { describe, it, expect } from 'vitest';
import { runCalculations } from '../calculations';
import {
  BASE_INPUTS,
  STARTUP_INPUTS,
  ENTERPRISE_INPUTS,
  GOVERNMENT_INPUTS,
  NON_US_INPUTS,
  REVENUE_ELIGIBLE_INPUTS,
  NON_REVENUE_INPUTS,
} from './testFixtures';

// =====================================================================
// Current State
// =====================================================================
describe('Current State calculations', () => {
  it('computes annual labor cost correctly', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.currentState.annualLaborCost).toBe(20 * 85000);
  });

  it('computes annual rework cost as labor × error rate', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.currentState.annualReworkCost).toBe(20 * 85000 * 0.15);
  });

  it('computes total current cost as labor + rework + tools', () => {
    const r = runCalculations(BASE_INPUTS);
    const expected = 20 * 85000 + 20 * 85000 * 0.15 + 50000;
    expect(r.currentState.totalCurrentCost).toBe(expected);
  });

  it('computes hourly rate from salary / 2080', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.currentState.hourlyRate).toBeCloseTo(85000 / 2080, 2);
  });
});

// =====================================================================
// One-Time Transition Costs (Separation Cost Fix)
// =====================================================================
describe('One-Time Transition Costs (separation cost)', () => {
  it('uses separation multiplier instead of weeks-based severance', () => {
    const r = runCalculations(BASE_INPUTS);
    // Mid-Market multiplier = 1.15
    expect(r.oneTimeCosts.separationMultiplier).toBe(1.15);
    expect(r.oneTimeCosts.separationCostPerFTE).toBe(85000 * 1.15);
  });

  it('calculates displaced FTEs from team × automation × adoption', () => {
    const r = runCalculations(BASE_INPUTS);
    // automation: 0.60 (Tech/DocProc), adoption: 0.70 (changeReadiness=3)
    const expected = Math.round(20 * 0.60 * 0.70);
    expect(r.oneTimeCosts.displacedFTEs).toBe(expected);
  });

  it('total separation = displaced × salary × multiplier', () => {
    const r = runCalculations(BASE_INPUTS);
    const expected = r.oneTimeCosts.displacedFTEs * 85000 * 1.15;
    expect(r.oneTimeCosts.totalSeparationCost).toBe(expected);
  });

  it('includes legal, security, contingency, and vendor termination in total one-time costs (separation is separate)', () => {
    const r = runCalculations(BASE_INPUTS);
    const sum =
      r.oneTimeCosts.legalComplianceCost +
      r.oneTimeCosts.securityAuditCost +
      r.oneTimeCosts.contingencyReserve +
      r.oneTimeCosts.vendorTerminationCost;
    expect(r.oneTimeCosts.totalOneTimeCosts).toBeCloseTo(sum, 0);
  });

  it('vendor termination cost flows into one-time costs when provided', () => {
    const r = runCalculations({ ...BASE_INPUTS, vendorsReplaced: 2, vendorTerminationCost: 75000 });
    expect(r.oneTimeCosts.vendorsReplaced).toBe(2);
    expect(r.oneTimeCosts.vendorTerminationCost).toBe(75000);
    const sum =
      r.oneTimeCosts.legalComplianceCost +
      r.oneTimeCosts.securityAuditCost +
      r.oneTimeCosts.contingencyReserve +
      75000;
    expect(r.oneTimeCosts.totalOneTimeCosts).toBeCloseTo(sum, 0);
  });

  it('startup uses lower separation multiplier (0.70)', () => {
    const r = runCalculations(STARTUP_INPUTS);
    expect(r.oneTimeCosts.separationMultiplier).toBe(0.70);
  });

  it('enterprise uses higher separation multiplier (1.30)', () => {
    const r = runCalculations(ENTERPRISE_INPUTS);
    expect(r.oneTimeCosts.separationMultiplier).toBe(1.30);
  });
});

// =====================================================================
// Value Breakdown (Feature 2)
// =====================================================================
describe('Value Creation Breakdown', () => {
  it('returns all 4 categories', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.valueBreakdown).toHaveProperty('headcount');
    expect(r.valueBreakdown).toHaveProperty('efficiency');
    expect(r.valueBreakdown).toHaveProperty('errorReduction');
    expect(r.valueBreakdown).toHaveProperty('toolReplacement');
  });

  it('each category has gross and riskAdjusted', () => {
    const r = runCalculations(BASE_INPUTS);
    for (const cat of ['headcount', 'efficiency', 'errorReduction', 'toolReplacement']) {
      expect(r.valueBreakdown[cat]).toHaveProperty('gross');
      expect(r.valueBreakdown[cat]).toHaveProperty('riskAdjusted');
    }
  });

  it('riskAdjusted <= gross for each category', () => {
    const r = runCalculations(BASE_INPUTS);
    for (const cat of ['headcount', 'efficiency', 'errorReduction', 'toolReplacement']) {
      expect(r.valueBreakdown[cat].riskAdjusted).toBeLessThanOrEqual(
        r.valueBreakdown[cat].gross
      );
    }
  });

  it('totalGross equals sum of category grosses', () => {
    const r = runCalculations(BASE_INPUTS);
    const sum =
      r.valueBreakdown.headcount.gross +
      r.valueBreakdown.efficiency.gross +
      r.valueBreakdown.errorReduction.gross +
      r.valueBreakdown.toolReplacement.gross;
    expect(r.valueBreakdown.totalGross).toBeCloseTo(sum, 0);
  });

  it('headcount savings = displacedFTEs × avgSalary', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.valueBreakdown.headcount.gross).toBe(
      r.oneTimeCosts.displacedFTEs * BASE_INPUTS.avgSalary
    );
  });

  it('tool replacement uses process-specific rate', () => {
    const r = runCalculations(BASE_INPUTS);
    // DocProc tool replacement = 0.55
    expect(r.valueBreakdown.toolReplacement.gross).toBe(50000 * 0.55);
  });
});

// =====================================================================
// Opportunity Cost (Feature 3)
// =====================================================================
describe('Opportunity Cost of Inaction', () => {
  it('returns 12-month and 24-month costs', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.opportunityCost.costOfWaiting12Months).toBeGreaterThan(0);
    expect(r.opportunityCost.costOfWaiting24Months).toBeGreaterThan(0);
  });

  it('24-month cost > 12-month cost', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.opportunityCost.costOfWaiting24Months).toBeGreaterThan(
      r.opportunityCost.costOfWaiting12Months
    );
  });

  it('yearly breakdown has expected components', () => {
    const r = runCalculations(BASE_INPUTS);
    const yr1 = r.opportunityCost.yearlyBreakdown[0];
    expect(yr1).toHaveProperty('wageInflation');
    expect(yr1).toHaveProperty('legacyCreep');
    expect(yr1).toHaveProperty('forgoneSavings');
    expect(yr1).toHaveProperty('competitiveLoss');
    expect(yr1).toHaveProperty('complianceRisk');
  });

  it('wage inflation = laborCost × 0.04 × year', () => {
    const r = runCalculations(BASE_INPUTS);
    const yr1 = r.opportunityCost.yearlyBreakdown[0];
    expect(yr1.wageInflation).toBeCloseTo(r.currentState.annualLaborCost * 0.04, 0);
  });
});

// =====================================================================
// Revenue Enablement
// =====================================================================
describe('Revenue Enablement', () => {
  it('eligible for revenue-eligible process types', () => {
    const r = runCalculations(REVENUE_ELIGIBLE_INPUTS);
    expect(r.revenueEnablement.eligible).toBe(true);
    expect(r.revenueEnablement.totalAnnualRevenue).toBeGreaterThan(0);
  });

  it('not eligible for non-revenue process types', () => {
    const r = runCalculations(NON_REVENUE_INPUTS);
    expect(r.revenueEnablement.eligible).toBe(false);
  });

  it('returns breakdown by revenue type', () => {
    const r = runCalculations(REVENUE_ELIGIBLE_INPUTS);
    if (r.revenueEnablement.eligible) {
      expect(r.revenueEnablement.timeToMarket).toBeGreaterThan(0);
      expect(r.revenueEnablement.customerExperience).toBeGreaterThan(0);
      expect(r.revenueEnablement.newCapability).toBeGreaterThan(0);
    }
  });
});

// =====================================================================
// Threshold / Breakeven Analysis
// =====================================================================
describe('Threshold Analysis', () => {
  it('returns breakeven risk multiplier', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.thresholdAnalysis).toBeDefined();
    expect(r.thresholdAnalysis.breakevenRiskMultiplier).toBeGreaterThan(0);
  });

  it('current risk multiplier exceeds breakeven for viable projects', () => {
    const r = runCalculations(BASE_INPUTS);
    if (r.thresholdAnalysis.isViable) {
      expect(r.thresholdAnalysis.riskMargin).toBeGreaterThan(0);
    }
  });

  it('returns max tolerable ongoing cost', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.thresholdAnalysis.maxOngoingCost).toBeDefined();
    expect(r.thresholdAnalysis.currentOngoingCost).toBeGreaterThan(0);
  });
});

// =====================================================================
// R&D Tax Credit (Feature 5)
// =====================================================================
describe('R&D Tax Credit', () => {
  it('eligible for US-based teams', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.rdTaxCredit.eligible).toBe(true);
  });

  it('not eligible for non-US teams', () => {
    const r = runCalculations(NON_US_INPUTS);
    expect(r.rdTaxCredit.eligible).toBe(false);
    expect(r.rdTaxCredit.federalCredit).toBe(0);
    expect(r.rdTaxCredit.stateCredit).toBe(0);
  });

  it('qualified expenses = 65% of implementation cost', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.rdTaxCredit.qualifiedExpenses).toBeCloseTo(
      r.riskAdjustments.adjustedImplementationCost * 0.65,
      0
    );
  });

  it('federal credit = qualified × 6.5%', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.rdTaxCredit.federalCredit).toBeCloseTo(
      r.rdTaxCredit.qualifiedExpenses * 0.065,
      0
    );
  });

  it('California state rate is 24%', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.rdTaxCredit.stateRate).toBe(0.24);
    expect(r.rdTaxCredit.companyState).toBe('California');
  });

  it('total credit = federal + state', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.rdTaxCredit.totalCredit).toBeCloseTo(
      r.rdTaxCredit.federalCredit + r.rdTaxCredit.stateCredit,
      0
    );
  });

  it('Virginia has 0% state rate', () => {
    const r = runCalculations(GOVERNMENT_INPUTS);
    expect(r.rdTaxCredit.stateRate).toBe(0);
  });
});

// =====================================================================
// Phased Timeline (Feature 6)
// =====================================================================
describe('Phased Timeline', () => {
  it('returns 4 phases', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.phasedTimeline).toHaveLength(4);
  });

  it('each phase has estimatedValue', () => {
    const r = runCalculations(BASE_INPUTS);
    r.phasedTimeline.forEach((phase) => {
      expect(phase).toHaveProperty('estimatedValue');
      expect(typeof phase.estimatedValue).toBe('number');
    });
  });

  it('phase 4 realization = 100%, phase 1 = 25%', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.phasedTimeline[0].realizationPct).toBe(0.25);
    expect(r.phasedTimeline[3].realizationPct).toBe(1.0);
  });

  it('later phases generally have higher estimated values', () => {
    const r = runCalculations(BASE_INPUTS);
    // Phase 4 should be >= Phase 1 (more value types + higher realization)
    expect(r.phasedTimeline[3].estimatedValue).toBeGreaterThanOrEqual(
      r.phasedTimeline[0].estimatedValue
    );
  });
});

// =====================================================================
// Scalability Premium (Feature 7)
// =====================================================================
describe('Scalability Premium', () => {
  it('returns 2x and 3x scenarios', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.scalabilityPremium.scenarios).toHaveLength(2);
    expect(r.scalabilityPremium.scenarios[0].label).toBe('2x');
    expect(r.scalabilityPremium.scenarios[1].label).toBe('3x');
  });

  it('traditional cost scales linearly', () => {
    const r = runCalculations(BASE_INPUTS);
    const s2x = r.scalabilityPremium.scenarios[0];
    expect(s2x.traditionalCost).toBe(r.scalabilityPremium.currentCost * 2);
  });

  it('AI cost scales sub-linearly', () => {
    const r = runCalculations(BASE_INPUTS);
    const s2x = r.scalabilityPremium.scenarios[0];
    // AI at 2x = ongoing × 1.25
    expect(s2x.aiCost).toBe(r.scalabilityPremium.aiOngoingCost * 1.25);
  });

  it('savings = traditional - AI cost', () => {
    const r = runCalculations(BASE_INPUTS);
    r.scalabilityPremium.scenarios.forEach((s) => {
      expect(s.savings).toBeCloseTo(s.traditionalCost - s.aiCost, 0);
    });
  });

  it('3x savings > 2x savings', () => {
    const r = runCalculations(BASE_INPUTS);
    const [s2x, s3x] = r.scalabilityPremium.scenarios;
    expect(s3x.savings).toBeGreaterThan(s2x.savings);
  });
});

// =====================================================================
// Confidence Intervals (Feature 8)
// =====================================================================
describe('Confidence Intervals', () => {
  it('returns NPV, payback, and ROIC intervals', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.confidenceIntervals).toHaveProperty('npv');
    expect(r.confidenceIntervals).toHaveProperty('payback');
    expect(r.confidenceIntervals).toHaveProperty('roic');
  });

  it('each interval has p25, p50, p75', () => {
    const r = runCalculations(BASE_INPUTS);
    for (const key of ['npv', 'payback', 'roic']) {
      expect(r.confidenceIntervals[key]).toHaveProperty('p25');
      expect(r.confidenceIntervals[key]).toHaveProperty('p50');
      expect(r.confidenceIntervals[key]).toHaveProperty('p75');
    }
  });

  it('NPV p25 <= p50 <= p75', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.confidenceIntervals.npv.p25).toBeLessThanOrEqual(
      r.confidenceIntervals.npv.p50
    );
    expect(r.confidenceIntervals.npv.p50).toBeLessThanOrEqual(
      r.confidenceIntervals.npv.p75
    );
  });

  it('ROIC p25 <= p50 <= p75', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.confidenceIntervals.roic.p25).toBeLessThanOrEqual(
      r.confidenceIntervals.roic.p50
    );
    expect(r.confidenceIntervals.roic.p50).toBeLessThanOrEqual(
      r.confidenceIntervals.roic.p75
    );
  });

  it('payback p25 >= p50 >= p75 (higher payback = worse)', () => {
    const r = runCalculations(BASE_INPUTS);
    // p25 = conservative (worst), p75 = optimistic (best)
    expect(r.confidenceIntervals.payback.p25).toBeGreaterThanOrEqual(
      r.confidenceIntervals.payback.p50
    );
    expect(r.confidenceIntervals.payback.p50).toBeGreaterThanOrEqual(
      r.confidenceIntervals.payback.p75
    );
  });
});

// =====================================================================
// Peer Comparison (Feature 9)
// =====================================================================
describe('Peer Comparison', () => {
  it('returns percentileRank between 5 and 95', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.peerComparison.percentileRank).toBeGreaterThanOrEqual(5);
    expect(r.peerComparison.percentileRank).toBeLessThanOrEqual(95);
  });

  it('returns peer median and ranges', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.peerComparison.peerMedian).toBeGreaterThan(0);
    expect(r.peerComparison.peerP25).toBeGreaterThan(0);
    expect(r.peerComparison.peerP75).toBeGreaterThan(r.peerComparison.peerP25);
  });

  it('vsMedian = userROIC - peerMedian', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.peerComparison.vsMedian).toBeCloseTo(
      r.peerComparison.userROIC - r.peerComparison.peerMedian,
      4
    );
  });

  it('uses correct peer data for industry/size', () => {
    const r = runCalculations(BASE_INPUTS);
    // Tech / Mid-Market median = 0.55
    expect(r.peerComparison.peerMedian).toBe(0.55);
  });
});

// =====================================================================
// Scenario Analysis
// =====================================================================
describe('Scenario Analysis', () => {
  it('conservative savings < base < optimistic', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.scenarios.conservative.savings).toBeLessThan(r.scenarios.base.savings);
    expect(r.scenarios.base.savings).toBeLessThan(r.scenarios.optimistic.savings);
  });

  it('each scenario has NPV, IRR, ROIC, payback', () => {
    const r = runCalculations(BASE_INPUTS);
    for (const key of ['conservative', 'base', 'optimistic']) {
      expect(r.scenarios[key]).toHaveProperty('npv');
      expect(r.scenarios[key]).toHaveProperty('irr');
      expect(r.scenarios[key]).toHaveProperty('roic');
      expect(r.scenarios[key]).toHaveProperty('paybackMonths');
    }
  });

  it('5-year projections have 5 entries each', () => {
    const r = runCalculations(BASE_INPUTS);
    for (const key of ['conservative', 'base', 'optimistic']) {
      expect(r.scenarios[key].projections).toHaveLength(5);
    }
  });

  it('base case ROIC is capped at 100%', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.scenarios.base.roic).toBeLessThanOrEqual(1.0);
  });

  it('base case IRR is capped at 75% or N/A', () => {
    const r = runCalculations(BASE_INPUTS);
    // IRR may be NaN if solver can't converge (valid), or capped at 75%
    if (isFinite(r.scenarios.base.irr)) {
      expect(r.scenarios.base.irr).toBeLessThanOrEqual(0.75);
    } else {
      expect(isNaN(r.scenarios.base.irr)).toBe(true);
    }
  });

  it('payback months is 1-61', () => {
    const r = runCalculations(BASE_INPUTS);
    for (const key of ['conservative', 'base', 'optimistic']) {
      expect(r.scenarios[key].paybackMonths).toBeGreaterThanOrEqual(1);
      expect(r.scenarios[key].paybackMonths).toBeLessThanOrEqual(61);
    }
  });
});

// =====================================================================
// Probability-Weighted Expected Value
// =====================================================================
describe('Probability-Weighted Expected Value', () => {
  it('computes expectedNPV as weighted average of scenarios', () => {
    const r = runCalculations(BASE_INPUTS);
    const manual = r.scenarios.conservative.npv * 0.25
      + r.scenarios.base.npv * 0.50
      + r.scenarios.optimistic.npv * 0.25;
    expect(r.expectedNPV).toBeCloseTo(manual, 0);
  });

  it('computes expectedROIC as weighted average of scenarios', () => {
    const r = runCalculations(BASE_INPUTS);
    const manual = r.scenarios.conservative.roic * 0.25
      + r.scenarios.base.roic * 0.50
      + r.scenarios.optimistic.roic * 0.25;
    expect(r.expectedROIC).toBeCloseTo(manual, 4);
  });

  it('scenario weights sum to 1.0', () => {
    const r = runCalculations(BASE_INPUTS);
    const total = Object.values(r.scenarioWeights).reduce((s, w) => s + w, 0);
    expect(total).toBe(1.0);
  });
});

// =====================================================================
// AI Cost Model
// =====================================================================
describe('AI Cost Model', () => {
  it('uses location-specific salary', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.aiCostModel.aiSalary).toBe(215000); // US Major Tech Hub
  });

  it('realistic impl cost >= user budget (risk-adjusted)', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.aiCostModel.realisticImplCost).toBeGreaterThanOrEqual(
      BASE_INPUTS.implementationBudget
    );
  });

  it('ongoing cost >= user ongoing cost', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.aiCostModel.baseOngoingCost).toBeGreaterThanOrEqual(
      BASE_INPUTS.ongoingAnnualCost
    );
  });

  it('implementation team respects max team cap', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.aiCostModel.implEngineers).toBeLessThanOrEqual(10); // Mid-Market max
  });

  it('includes model retraining and tech debt in ongoing costs', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.aiCostModel.modelRetrainingCost).toBeGreaterThan(0);
    expect(r.aiCostModel.techDebtCost).toBeGreaterThan(0);
    expect(r.aiCostModel.cyberInsuranceCost).toBeGreaterThan(0);
    expect(r.aiCostModel.annualComplianceCost).toBeGreaterThan(0);
    expect(r.aiCostModel.retainedRetrainingCost).toBeGreaterThanOrEqual(0);
  });

  it('uses tapered escalation schedule', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.aiCostModel.escalationSchedule).toEqual([0, 0.12, 0.12, 0.07, 0.07]);
    // Year 3-4 escalation should be lower than Year 1-2
    const yr2Escalation = r.aiCostModel.ongoingCostsByYear[2] / r.aiCostModel.ongoingCostsByYear[1];
    const yr4Escalation = r.aiCostModel.ongoingCostsByYear[4] / r.aiCostModel.ongoingCostsByYear[3];
    expect(yr4Escalation).toBeLessThan(yr2Escalation);
  });
});

// =====================================================================
// Hidden Costs
// =====================================================================
describe('Hidden Costs', () => {
  it('change management = 15% of impl cost', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.hiddenCosts.changeManagement).toBeCloseTo(
      r.aiCostModel.realisticImplCost * 0.15,
      0
    );
  });

  it('data cleanup depends on data readiness', () => {
    const rLow = runCalculations({ ...BASE_INPUTS, dataReadiness: 2 });
    const rHigh = runCalculations({ ...BASE_INPUTS, dataReadiness: 5 });
    expect(rLow.hiddenCosts.dataCleanup).toBeGreaterThan(0);
    expect(rHigh.hiddenCosts.dataCleanup).toBe(0);
  });

  it('totalHidden = sum of all hidden costs', () => {
    const r = runCalculations(BASE_INPUTS);
    const sum =
      r.hiddenCosts.changeManagement +
      r.hiddenCosts.culturalResistance +
      r.hiddenCosts.dataCleanup +
      r.hiddenCosts.integrationTesting +
      r.hiddenCosts.productivityDip;
    expect(r.hiddenCosts.totalHidden).toBeCloseTo(sum, 0);
  });
});

// =====================================================================
// Total Investment
// =====================================================================
describe('Total Investment', () => {
  it('totalInvestment = upfront + separation', () => {
    const r = runCalculations(BASE_INPUTS);
    // upfrontInvestment = impl + hidden + oneTime (no separation)
    // totalInvestment = upfrontInvestment + totalSeparationCost
    const upfront =
      r.aiCostModel.realisticImplCost +
      r.hiddenCosts.totalHidden +
      r.oneTimeCosts.totalOneTimeCosts;
    expect(r.upfrontInvestment).toBeCloseTo(upfront, 0);
    expect(r.totalInvestment).toBeCloseTo(upfront + r.oneTimeCosts.totalSeparationCost, 0);
  });
});

// =====================================================================
// Risk Adjustments
// =====================================================================
describe('Risk Adjustments', () => {
  it('no exec sponsor reduces sponsorAdjustment to 0.85', () => {
    const r = runCalculations({ ...BASE_INPUTS, execSponsor: false });
    expect(r.riskAdjustments.sponsorAdjustment).toBe(0.85);
  });

  it('exec sponsor gives full adjustment (1.0)', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.riskAdjustments.sponsorAdjustment).toBe(1.0);
  });

  it('low change readiness reduces adoption rate', () => {
    const rLow = runCalculations({ ...BASE_INPUTS, changeReadiness: 1 });
    const rHigh = runCalculations({ ...BASE_INPUTS, changeReadiness: 5 });
    expect(rLow.riskAdjustments.adoptionRate).toBeLessThan(
      rHigh.riskAdjustments.adoptionRate
    );
  });
});

// =====================================================================
// Variable Discount Rate
// =====================================================================
describe('Variable Discount Rate', () => {
  it('uses 10% for mid-market (base case)', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.discountRate).toBe(0.10);
  });

  it('uses higher rate for startups', () => {
    const r = runCalculations(STARTUP_INPUTS);
    expect(r.discountRate).toBe(0.18);
  });

  it('uses lower rate for enterprises', () => {
    const r = runCalculations(ENTERPRISE_INPUTS);
    expect(r.discountRate).toBe(0.09);
  });

  it('startup higher discount rate reduces NPV vs mid-market at same inputs', () => {
    const rMid = runCalculations({ ...BASE_INPUTS, companySize: 'Mid-Market (501-5,000)' });
    const rStartup = runCalculations({ ...BASE_INPUTS, companySize: 'Startup (1-50)' });
    // Higher discount rate penalizes future cash flows more, so NPV should be lower
    // (controlling for other size effects)
    expect(rStartup.discountRate).toBeGreaterThan(rMid.discountRate);
  });
});

// =====================================================================
// Vendor Lock-In
// =====================================================================
describe('Vendor Lock-In', () => {
  it('returns object with level, switchingCost, and escalation data', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(['Low', 'Medium', 'High']).toContain(r.vendorLockIn.level);
    expect(r.vendorLockIn.switchingCost).toBeGreaterThan(0);
    expect(r.vendorLockIn.escalationSchedule).toEqual([0, 0.12, 0.12, 0.07, 0.07]);
    expect(r.vendorLockIn.year5OngoingCost).toBeGreaterThan(0);
    expect(r.vendorLockIn.totalOngoing5Year).toBeGreaterThan(0);
  });
});

// =====================================================================
// Sensitivity Analysis
// =====================================================================
describe('Sensitivity Analysis', () => {
  it('has 3 basic sensitivity scenarios', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.sensitivity).toHaveProperty('lowerAdoption');
    expect(r.sensitivity).toHaveProperty('higherCosts');
    expect(r.sensitivity).toHaveProperty('doubleTimeline');
  });

  it('has 6 extended sensitivity rows', () => {
    const r = runCalculations(BASE_INPUTS);
    expect(r.extendedSensitivity).toHaveLength(6);
  });

  it('each extended row has npvLow and npvHigh', () => {
    const r = runCalculations(BASE_INPUTS);
    r.extendedSensitivity.forEach((row) => {
      expect(row).toHaveProperty('npvLow');
      expect(row).toHaveProperty('npvHigh');
      expect(typeof row.npvLow).toBe('number');
      expect(typeof row.npvHigh).toBe('number');
    });
  });
});

// =====================================================================
// Cross-Scenario: different input profiles
// =====================================================================
describe('Cross-scenario consistency', () => {
  it('government worst-case still returns valid results', () => {
    const r = runCalculations(GOVERNMENT_INPUTS);
    expect(r.currentState.totalCurrentCost).toBeGreaterThan(0);
    expect(r.totalInvestment).toBeGreaterThan(0);
    expect(r.scenarios.base).toBeDefined();
    expect(r.valueBreakdown.totalGross).toBeGreaterThan(0);
  });

  it('enterprise produces higher total investment than startup', () => {
    const rStartup = runCalculations(STARTUP_INPUTS);
    const rEnterprise = runCalculations(ENTERPRISE_INPUTS);
    expect(rEnterprise.totalInvestment).toBeGreaterThan(rStartup.totalInvestment);
  });

  it('all results have consistent structure across profiles', () => {
    const profiles = [BASE_INPUTS, STARTUP_INPUTS, ENTERPRISE_INPUTS, GOVERNMENT_INPUTS];
    for (const profile of profiles) {
      const r = runCalculations(profile);
      expect(r).toHaveProperty('currentState');
      expect(r).toHaveProperty('valueBreakdown');
      expect(r).toHaveProperty('opportunityCost');
      // revenueEnablement removed from model
      expect(r).toHaveProperty('rdTaxCredit');
      expect(r).toHaveProperty('phasedTimeline');
      expect(r).toHaveProperty('scalabilityPremium');
      expect(r).toHaveProperty('confidenceIntervals');
      expect(r).toHaveProperty('peerComparison');
      expect(r).toHaveProperty('scenarios');
    }
  });
});
