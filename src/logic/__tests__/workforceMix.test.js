import { describe, expect, it } from 'vitest';
import { runCalculations } from '../calculations';
import {
  calculateContractExitCost,
  calculateDeploymentPlan,
  calculateProcessCost,
  calculateReworkCost,
  calculateWorkforceMix,
  calculateWorkforceTransitionPlan,
} from '../workforceMix';
import { BASE_INPUTS } from './testFixtures';

describe('workforce-mix model helpers', () => {
  const mixInputs = {
    directEmployeeCount: 10,
    employeeFullyBurdenedCost: 120000,
    offshoreContractorCount: 5,
    contractorFullyBurdenedCost: 60000,
    hoursPerWeek: 40,
  };

  it('derives blended workforce cost from direct employees and contractors', () => {
    const mix = calculateWorkforceMix(mixInputs);
    expect(mix.hasWorkforceMix).toBe(true);
    expect(mix.totalHeadcount).toBe(15);
    expect(mix.directEmployeeAnnualCost).toBe(1200000);
    expect(mix.contractorAnnualCost).toBe(300000);
    expect(mix.totalAnnualHeadcountCost).toBe(1500000);
    expect(mix.blendedFullyBurdenedCost).toBe(100000);
    expect(mix.weightedHourlyCost).toBeCloseTo(100000 / 2080, 6);
  });

  it('calculates labor cost per process from the workforce mix', () => {
    const process = calculateProcessCost({
      ...mixInputs,
      processVolume: 1000,
      handlingTimeMin: 30,
    });
    expect(process.costPerProcess).toBeCloseTo((100000 / 2080) * 0.5, 6);
    expect(process.monthlyProcessCost).toBeCloseTo(process.costPerProcess * 1000, 6);
    expect(process.annualProcessCost).toBeCloseTo(process.monthlyProcessCost * 12, 6);
  });

  it('uses measured errors rather than a blanket labor percentage', () => {
    const rework = calculateReworkCost({
      errorCountEmployees: 100,
      errorCountContracts: 50,
      reworkFraction: 0.4,
      reworkCostPerItem: 200,
    });
    expect(rework.annualErrorCount).toBe(150);
    expect(rework.annualReworkCost).toBe(12000);
  });

  it('honors deliberate zero detailed error counts over a stale legacy aggregate', () => {
    const rework = calculateReworkCost({
      errorCountEmployees: 0,
      errorCountContracts: 0,
      annualErrorCount: 100,
      reworkFraction: 0.5,
      reworkCostPerItem: 200,
    });
    expect(rework.annualErrorCount).toBe(0);
    expect(rework.annualReworkCost).toBe(0);
  });

  it('uses a three-month notice period by default for contract exits', () => {
    const exit = calculateContractExitCost({
      existingContractCount: 3,
      annualCostPerContract: 100000,
    });
    expect(exit.annualExistingContractCost).toBe(300000);
    expect(exit.contractNoticePeriodMonths).toBe(3);
    expect(exit.contractExitCost).toBe(75000);
  });

  it('caps redundancies to measured freed capacity and phases severance 50/30/20', () => {
    const mix = calculateWorkforceMix(mixInputs);
    const plan = calculateWorkforceTransitionPlan({
      ...mixInputs,
      totalEfficiencyGainPct: 10,
      employeesToMakeRedundant: 3,
      employeesToRetrain: 20,
    }, mix);
    expect(plan.totalEfficiencyGainPct).toBe(0.10);
    expect(plan.freedUpAnnualHours).toBe(3120);
    expect(plan.maximumRedundancies).toBe(1);
    expect(plan.employeesToMakeRedundant).toBe(1);
    expect(plan.oneTimeRedundancyCost).toBe(180000);
    expect(plan.redundancyCostByYear).toEqual([90000, 54000, 36000, 0, 0]);
    expect(plan.warnings.length).toBeGreaterThan(0);
  });

  it('limits workforce actions to the workload the selected case actually covers', () => {
    const mix = calculateWorkforceMix(mixInputs);
    const plan = calculateWorkforceTransitionPlan({
      ...mixInputs,
      totalEfficiencyGainPct: 0.50,
      employeesToMakeRedundant: 2,
    }, mix, {
      // One 40-hour weekly workflow out of a 15-person workforce.
      eligibleAnnualHours: 2080,
      allowRedundancies: false,
    });
    expect(plan.eligibleAnnualHours).toBe(2080);
    expect(plan.freedCapacityFTEs).toBeCloseTo(0.5, 6);
    expect(plan.maximumRedundancies).toBe(0);
    expect(plan.employeesToMakeRedundant).toBe(0);
    expect(plan.annualWorkforceEfficiencyValue).toBeLessThan(100000);
    expect(plan.warnings.some(message => message.includes('turned off'))).toBe(true);
  });

  it('makes delivery pace an explicit staffing, duration, and cost scenario', () => {
    const mix = calculateWorkforceMix(mixInputs);
    const standard = calculateDeploymentPlan({ deliveryPace: 'standard' }, {
      workforceMix: mix,
      baselineTimelineMonths: 6,
      baselineImplementationHeadcount: 2,
    });
    const accelerated = calculateDeploymentPlan({ deliveryPace: 'accelerated' }, {
      workforceMix: mix,
      baselineTimelineMonths: 6,
      baselineImplementationHeadcount: 2,
    });
    expect(accelerated.estimatedDurationMonths).toBeLessThan(standard.estimatedDurationMonths);
    expect(accelerated.implementationHeadcount).toBeGreaterThan(standard.implementationHeadcount);
    expect(accelerated.estimatedDeploymentLaborCost).toBeGreaterThan(standard.estimatedDeploymentLaborCost);
  });

  it('caps unsupported money outliers and returns explicit correction messages', () => {
    const mix = calculateWorkforceMix({
      directEmployeeCount: 1,
      employeeFullyBurdenedCost: 999999999,
      offshoreContractorCount: 1,
      contractorFullyBurdenedCost: 999999999,
    });
    const exit = calculateContractExitCost({
      existingContractCount: 1,
      annualCostPerContract: 999999999,
      currentToolCosts: 999999999,
    });
    const rework = calculateReworkCost({
      annualErrorCount: 10,
      reworkFraction: 1,
      reworkCostPerItem: 999999999,
    });

    expect(mix.employeeFullyBurdenedCost).toBe(2000000);
    expect(mix.contractorFullyBurdenedCost).toBe(2000000);
    expect(exit.annualCostPerContract).toBe(50000000);
    expect(rework.reworkCostPerItem).toBe(100000);
    expect(mix.inputCorrections.length).toBeGreaterThan(0);
    expect(exit.inputCorrections.length).toBeGreaterThan(0);
    expect(rework.inputCorrections.length).toBeGreaterThan(0);
  });
});

describe('workforce-mix integration with the DCF', () => {
  it('uses declared workforce, contract, and redundancy inputs exactly once', () => {
    const r = runCalculations({
      ...BASE_INPUTS,
      directEmployeeCount: 10,
      employeeFullyBurdenedCost: 120000,
      offshoreContractorCount: 5,
      contractorFullyBurdenedCost: 60000,
      hoursPerWeek: 40,
      totalEfficiencyGainPct: 10,
      employeesToMakeRedundant: 3,
      employeesToRetrain: 2,
      existingContractCount: 2,
      annualCostPerContract: 100000,
      contractNoticePeriodMonths: 3,
      errorCountEmployees: 100,
      errorCountContracts: 50,
      reworkFraction: 0.5,
      reworkCostPerItem: 200,
    });

    expect(r.currentState.annualLaborCost).toBe(1500000);
    expect(r.currentState.annualReworkCost).toBe(15000);
    expect(r.currentState.annualContractSpend).toBe(200000);
    expect(r.currentState.totalCurrentCost).toBe(1765000);
    expect(r.currentState.totalHeadcount).toBe(15);
    expect(r.valueBreakdown.headcount.gross).toBe(120000); // capped at one FTE
    expect(r.valueBreakdown.contractExit.gross).toBe(200000);
    expect(r.oneTimeCosts.contractExitCost).toBe(50000);
    expect(r.oneTimeCosts.effectiveContractExitCost).toBe(50000);
    expect(r.oneTimeCosts.totalOneTimeCosts).toBe(
      r.oneTimeCosts.legalComplianceCost
      + r.oneTimeCosts.securityAuditCost
      + r.oneTimeCosts.contingencyReserve
      + r.oneTimeCosts.effectiveContractExitCost,
    );
    expect(r.oneTimeCosts.separationByYear).toEqual([90000, 54000, 36000, 0, 0]);
  });

  it('surfaces input-cap corrections in central calculation warnings', () => {
    const r = runCalculations({
      ...BASE_INPUTS,
      directEmployeeCount: 1,
      employeeFullyBurdenedCost: 999999999,
      existingContractCount: 1,
      annualCostPerContract: 999999999,
      errorCountEmployees: 1,
      reworkFraction: 1,
      reworkCostPerItem: 999999999,
    });
    expect(Number.isFinite(r.scenarios.base.npv)).toBe(true);
    expect(r.valueBreakdown.toolReplacement.gross).toBeLessThanOrEqual(100000000);
    expect(r.inputWarnings.some(warning => warning.field === 'modelGuardrail')).toBe(true);
  });

  it('uses the explicit efficiency plan for measured rework savings', () => {
    const r = runCalculations({
      ...BASE_INPUTS,
      directEmployeeCount: 10,
      employeeFullyBurdenedCost: 120000,
      totalEfficiencyGainPct: 10,
      errorCountEmployees: 100,
      errorCountContracts: 0,
      reworkFraction: 1,
      reworkCostPerItem: 100,
    });
    expect(r.currentState.annualReworkCost).toBe(10000);
    expect(r.valueBreakdown.errorReduction.gross).toBe(1000);
  });

  it('uses the selected archetype process inputs in central process economics', () => {
    const r = runCalculations({
      ...BASE_INPUTS,
      directEmployeeCount: 10,
      employeeFullyBurdenedCost: 120000,
      projectArchetype: 'internal-process-automation',
      archetypeInputs: {
        processVolume: 1000,
        handlingTimeMin: 60,
        errorRate: 0,
        costPerError: 0,
        pctAutomatable: 0.5,
        humanInLoopPct: 0.2,
      },
    });
    expect(r.currentState.costPerProcess).toBeCloseTo(120000 / 2080, 6);
    expect(r.currentState.monthlyProcessCost).toBeCloseTo((120000 / 2080) * 1000, 6);
  });

  it('lets archetype driver inputs override a generic automation default', () => {
    const baseArchetypeInputs = {
      processVolume: 5000,
      handlingTimeMin: 15,
      errorRate: 0.08,
      costPerError: 150,
      integrationComplexity: 3,
      humanInLoopPct: 0.2,
      processCriticality: 3,
    };
    const low = runCalculations({
      ...BASE_INPUTS,
      assumptions: { ...BASE_INPUTS.assumptions, automationPotential: 0.6 },
      archetypeInputs: { ...baseArchetypeInputs, pctAutomatable: 0.2 },
    });
    const high = runCalculations({
      ...BASE_INPUTS,
      assumptions: { ...BASE_INPUTS.assumptions, automationPotential: 0.6 },
      archetypeInputs: { ...baseArchetypeInputs, pctAutomatable: 0.8 },
    });
    expect(low.benchmarks.automationPotential).toBeLessThan(high.benchmarks.automationPotential);
    expect(low.savings.grossAnnualSavings).toBeLessThan(high.savings.grossAnnualSavings);
  });

  it('returns non-overlapping executive AI cost buckets and usage meters', () => {
    const r = runCalculations({
      ...BASE_INPUTS,
      aiLicensedUsers: 25,
      monthlyAiRequests: 50000,
      avgInputTokensPerRequest: 1000,
      avgOutputTokensPerRequest: 300,
      monthlyAgentWorkflows: 1000,
      documentsPerMonth: 10000,
      dataStoredGb: 500,
      connectedApplications: 4,
    });
    const buckets = r.aiCostModel.costBuckets;
    expect(buckets.buildIntegrationOneTime).toBe(r.aiCostModel.realisticImplCost);
    expect(buckets.accessAnnual).toBeGreaterThan(0);
    expect(buckets.consumptionAnnual).toBeGreaterThan(0);
    expect(buckets.runAnnual).toBeGreaterThan(0);
    expect(buckets.planningRanges.build).toEqual({ min: 0.30, max: 0.45 });
    expect(r.aiCostModel.usageMeters.monthlyAiRequests).toBe(50000);
    expect(r.aiCostModel.usageMeters.documentsPerMonth).toBe(10000);
  });

  it('does not turn nonzero request volume into zero consumption when optional token fields are zero', () => {
    const base = {
      ...BASE_INPUTS,
      monthlyAiRequests: 5000,
      avgInputTokensPerRequest: null,
      avgOutputTokensPerRequest: null,
    };
    const untouched = runCalculations(base);
    const enteredZeroes = runCalculations({
      ...base,
      avgInputTokensPerRequest: 0,
      avgOutputTokensPerRequest: 0,
    });

    expect(untouched.consultingAssumptions.useTokenModel).toBe(false);
    expect(enteredZeroes.consultingAssumptions.useTokenModel).toBe(false);
    expect(enteredZeroes.aiCostModel.costBuckets.consumptionAnnual).toBeGreaterThan(0);
    expect(enteredZeroes.aiCostModel.costBuckets.consumptionAnnual)
      .toBe(untouched.aiCostModel.costBuckets.consumptionAnnual);
  });
});
