import { describe, expect, it } from 'vitest';
import { runCalculations } from '../calculations';
import { ARCHETYPE_INPUT_SCHEMAS, getArchetypeInputDefaults } from '../archetypeInputs';
import { PROJECT_ARCHETYPES } from '../archetypes';
import { BASE_INPUTS } from './testFixtures';

const coveredWorkforce = {
  directEmployeeCount: 100,
  employeeFullyBurdenedCost: 120000,
  offshoreContractorCount: 0,
  contractorFullyBurdenedCost: 0,
  hoursPerWeek: 40,
};

function modelForCase(projectArchetype, overrides = {}) {
  return runCalculations({
    ...BASE_INPUTS,
    ...coveredWorkforce,
    projectArchetype,
    archetypeInputs: {
      ...getArchetypeInputDefaults(projectArchetype),
      ...(overrides.archetypeInputs || {}),
    },
    totalEfficiencyGainPct: 0.10,
    ...overrides,
  });
}

describe('case-specific workload and evidence guardrails', () => {
  it.each(PROJECT_ARCHETYPES.map(archetype => [archetype.id]))(
    '%s produces finite results with its supported operating levers',
    (projectArchetype) => {
      const result = modelForCase(projectArchetype);
      expect(Number.isFinite(result.scenarios.base.npv)).toBe(true);
      expect(result.caseEconomics.hasCaseInputs).toBe(true);
      expect(result.caseEconomics.caseWorkloadHoursPerWeek).toBeGreaterThan(0);
      expect(result.caseEconomics.workloadStatus).not.toBe('blocked');
    },
  );

  it('runs every displayed input through a visible final-model output', () => {
    for (const schema of ARCHETYPE_INPUT_SCHEMAS) {
      const defaults = getArchetypeInputDefaults(schema.id);
      const modelForInputs = (archetypeInputs) => runCalculations({
        ...BASE_INPUTS,
        directEmployeeCount: 1000,
        employeeFullyBurdenedCost: 120000,
        offshoreContractorCount: 0,
        contractorFullyBurdenedCost: 0,
        hoursPerWeek: 40,
        implementationBudget: null,
        ongoingAnnualCost: null,
        projectArchetype: schema.id,
        archetypeInputs: {
          ...archetypeInputs,
          ...(schema.id === 'customer-facing-ai'
            ? { supportCostValidated: true, supportCostCashRealizable: true }
            : {}),
        },
      });
      const signature = (result) => ({
        workload: result.caseEconomics.caseWorkloadHoursPerWeek,
        automationCeiling: result.caseEconomics.efficiencyCeilingPct,
        buildCost: result.aiCostModel.computedImplCost,
        directSavings: result.caseEconomics.candidateDirectSavingsGross,
        riskContext: result.caseEconomics.riskAvoidanceContext,
      });
      const baseline = signature(modelForInputs(defaults));

      for (const input of schema.inputs) {
        const alternateValue = input.default === input.max ? input.min : input.max;
        const changed = signature(modelForInputs({
          ...defaults,
          [input.key]: alternateValue,
        }));
        expect(
          changed,
          `${schema.id}.${input.key} must affect workload, automation, build cost, direct savings, or risk context`,
        ).not.toEqual(baseline);
      }
    }
  });

  it.each([
    ['internal-process-automation', 'processVolume'],
    ['customer-facing-ai', 'ticketsPerMonth'],
    ['data-analytics-automation', 'reportsPerMonth'],
    ['risk-compliance-legal-ai', 'reviewsPerMonth'],
  ])('%s blocks savings when its measured workload is zero', (projectArchetype, volumeKey) => {
    const result = modelForCase(projectArchetype, {
      archetypeInputs: { [volumeKey]: 0 },
      employeesToMakeRedundant: 100,
    });

    expect(result.caseEconomics.caseWorkloadHoursPerWeek).toBe(0);
    expect(result.caseEconomics.workloadStatus).toBe('blocked');
    expect(result.caseEconomics.workloadBlocked).toBe(true);
    expect(result.caseEconomics.effectiveEfficiencyGainPct).toBe(0);
    expect(result.workforceTransition.employeesToMakeRedundant).toBe(0);
    expect(result.valueBreakdown.headcount.gross).toBe(0);
    expect(result.valueBreakdown.caseDirectSavings.gross).toBe(0);
    expect(result.savings.grossAnnualSavings).toBe(0);
    expect(result.inputWarnings.some(warning => (
      warning.field === 'caseWorkloadHoursPerWeek' && warning.severity === 'blocking'
    ))).toBe(true);
  });

  it.each([
    ['internal-process-automation', 'processVolume'],
    ['customer-facing-ai', 'ticketsPerMonth'],
    ['data-analytics-automation', 'reportsPerMonth'],
    ['risk-compliance-legal-ai', 'reviewsPerMonth'],
  ])('%s preserves a smallest positive workload as capacity-only', (projectArchetype, volumeKey) => {
    const result = modelForCase(projectArchetype, {
      archetypeInputs: { [volumeKey]: 1 },
      totalEfficiencyGainPct: 0.90,
      employeesToMakeRedundant: 100,
    });

    expect(result.caseEconomics.caseWorkloadHoursPerWeek).toBeGreaterThan(0);
    expect(result.caseEconomics.workloadRatio).toBeGreaterThan(0);
    expect(result.caseEconomics.workloadRatio).toBeLessThan(0.10);
    expect(result.caseEconomics.workloadStatus).toBe('capacity-only');
    expect(result.caseEconomics.workloadBlocked).toBe(false);
    expect(result.workforceTransition.employeesToMakeRedundant).toBe(0);
    expect(result.valueBreakdown.headcount.gross).toBe(0);
    expect(result.inputWarnings.some(warning => (
      warning.field === 'caseWorkloadHoursPerWeek' && warning.severity === 'warning'
    ))).toBe(true);
  });

  it('turns off savings when customer workload exceeds the entered staffing capacity', () => {
    const result = runCalculations({
      ...BASE_INPUTS,
      directEmployeeCount: 2,
      employeeFullyBurdenedCost: 120000,
      hoursPerWeek: 40,
      projectArchetype: 'customer-facing-ai',
      archetypeInputs: {
        ...getArchetypeInputDefaults('customer-facing-ai'),
        ticketsPerMonth: 100000,
        resolutionTimeMin: 60,
        supportCostValidated: true,
        supportCostCashRealizable: true,
      },
      totalEfficiencyGainPct: 0.60,
      employeesToMakeRedundant: 2,
    });

    expect(result.caseEconomics.workloadBlocked).toBe(true);
    expect(result.caseEconomics.effectiveEfficiencyGainPct).toBe(0);
    expect(result.workforceTransition.employeesToMakeRedundant).toBe(0);
    expect(result.valueBreakdown.headcount.gross).toBe(0);
    expect(result.valueBreakdown.caseDirectSavings.gross).toBe(0);
    expect(result.inputWarnings.some(warning => warning.severity === 'blocking')).toBe(true);
  });

  it('caps requested efficiency at the case-specific technical ceiling and reports why', () => {
    const result = modelForCase('internal-process-automation', {
      totalEfficiencyGainPct: 90,
      archetypeInputs: {
        pctAutomatable: 0.20,
        humanInLoopPct: 0.50,
      },
    });
    expect(result.caseEconomics.requestedEfficiencyGainPct).toBeCloseTo(0.90);
    expect(result.caseEconomics.effectiveEfficiencyGainPct)
      .toBeLessThan(result.caseEconomics.requestedEfficiencyGainPct);
    expect(result.caseEconomics.bumperMessages.some(message => (
      message.field === 'totalEfficiencyGainPct'
    ))).toBe(true);
  });

  it('does not put unvalidated customer support cost avoidance into the DCF', () => {
    const unvalidated = modelForCase('customer-facing-ai', {
      archetypeInputs: { supportCostValidated: false },
    });
    const validated = modelForCase('customer-facing-ai', {
      archetypeInputs: { supportCostValidated: true, supportCostCashRealizable: true },
    });

    expect(unvalidated.caseEconomics.candidateDirectSavingsGross).toBeGreaterThan(0);
    expect(unvalidated.valueBreakdown.caseDirectSavings.gross).toBe(0);
    expect(validated.valueBreakdown.caseDirectSavings.gross).toBeGreaterThan(0);
  });

  it('keeps risk-avoidance estimates outside the core DCF', () => {
    const result = modelForCase('risk-compliance-legal-ai');
    expect(result.caseEconomics.riskAvoidanceContext).toBeGreaterThan(0);
    expect(result.caseEconomics.riskAvoidanceIncludedInCoreDcf).toBe(false);
    expect(result.valueBreakdown.archetypeRevenue.gross).toBe(0);
  });

  it.each([
    ['revenue-growth-ai', { pipelineVolume: 1000000, avgDealSize: 50000 }],
    ['knowledge-management-ai', { searchQueriesPerDay: 300, timeToFindMin: 12 }],
  ])('blocks retired %s saved cases instead of silently remapping them', (projectArchetype, archetypeInputs) => {
    const result = runCalculations({
      ...BASE_INPUTS,
      projectArchetype,
      archetypeInputs,
    });
    expect(result.caseEconomics.isRetiredCase).toBe(true);
    expect(result.caseEconomics.workloadBlocked).toBe(true);
    expect(result.benchmarks.automationPotential).toBe(0);
    expect(result.inputWarnings.some(warning => warning.field === 'projectArchetype')).toBe(true);
  });
});
