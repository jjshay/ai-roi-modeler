import { describe, expect, it } from 'vitest';
import { runCalculations } from '../../logic/calculations';
import { getArchetypeInputDefaults } from '../../logic/archetypeInputs';
import { BASE_INPUTS } from '../../logic/__tests__/testFixtures';
import {
  SENSITIVITY_PLANNING_POINT_INDEX,
  buildTwoDriverSensitivityMatrix,
  getCaseSensitivityConfig,
  getSensitivityLeverLabel,
} from './sensitivityMatrix';

function formForCase(projectArchetype) {
  return {
    ...BASE_INPUTS,
    // A declared action makes the sensitivity a cash decision rather than a
    // capacity-only view. The model still caps redundancy per cell by the
    // workload it can actually support.
    directEmployeeCount: 10,
    employeeFullyBurdenedCost: 120000,
    offshoreContractorCount: 0,
    contractorFullyBurdenedCost: 0,
    hoursPerWeek: 40,
    employeesToMakeRedundant: 10,
    totalEfficiencyGainPct: 0.75,
    projectArchetype,
    archetypeInputs: {
      ...getArchetypeInputDefaults(projectArchetype),
      ...(projectArchetype === 'customer-facing-ai'
        ? { supportCostValidated: true, supportCostCashRealizable: true }
        : {}),
    },
  };
}

describe('two-driver case sensitivity matrix', () => {
  it.each([
    'internal-process-automation',
    'customer-facing-ai',
    'data-analytics-automation',
    'risk-compliance-legal-ai',
  ])('recalculates all 100 planning cells for %s', (projectArchetype) => {
    const formData = formForCase(projectArchetype);
    const base = runCalculations(formData);
    const matrix = buildTwoDriverSensitivityMatrix(formData, base);

    expect(matrix).not.toBeNull();
    expect(matrix.volumeLevels).toHaveLength(10);
    expect(matrix.economicLevels).toHaveLength(10);
    expect(matrix.rows).toHaveLength(10);
    expect(matrix.rows.flatMap((row) => row.cells)).toHaveLength(100);

    for (const cell of matrix.rows.flatMap((row) => row.cells)) {
      expect(Number.isFinite(cell.npv)).toBe(true);
      expect(Number.isFinite(cell.annualCashSavings)).toBe(true);
    }

    const median = matrix.planningPoints.p50;
    expect(median.volume).toBe(matrix.volumeLevels[SENSITIVITY_PLANNING_POINT_INDEX.p50]);
    expect(median.economicValue).toBe(matrix.economicLevels[SENSITIVITY_PLANNING_POINT_INDEX.p50]);
    expect(median.npv).toBeCloseTo(base.scenarios.base.npv, 6);
    expect(median.annualCashSavings).toBeCloseTo(
      base.scenarios.base.projections.at(-1).grossSavings,
      6,
    );

    const npvs = matrix.rows.flatMap((row) => row.cells.map((cell) => cell.npv));
    expect(Math.max(...npvs) - Math.min(...npvs)).toBeGreaterThan(0);
  });

  it('uses cost per contact only after the Customer Service evidence gate is complete', () => {
    const formData = formForCase('customer-facing-ai');
    const evidenceReady = runCalculations(formData);
    expect(getCaseSensitivityConfig('customer-facing-ai', evidenceReady).economicKey).toBe('costPerResolvedTicket');

    const capacityOnly = runCalculations({
      ...formData,
      archetypeInputs: {
        ...formData.archetypeInputs,
        supportCostValidated: false,
        supportCostCashRealizable: false,
      },
    });
    expect(getCaseSensitivityConfig('customer-facing-ai', capacityOnly).economicKey).toBe('resolutionTimeMin');
  });

  it('marks workload combinations blocked by the production guardrail instead of presenting them as savings', () => {
    const formData = formForCase('internal-process-automation');
    const matrix = buildTwoDriverSensitivityMatrix(formData, runCalculations(formData));
    const blockedCells = matrix.rows.flatMap((row) => row.cells).filter((cell) => cell.blocked);

    expect(blockedCells.length).toBeGreaterThan(0);
    for (const cell of blockedCells) {
      expect(cell.guardrailMessage).toMatch(/workforce capacity|measured workload/i);
    }
  });

  it('replaces generic workload labels in the sensitivity UI', () => {
    const config = getCaseSensitivityConfig('customer-facing-ai', { caseEconomics: { supportCostCashRealizable: true } });
    expect(getSensitivityLeverLabel('Team Size', config)).toBe('Support ticket volume');
    expect(getSensitivityLeverLabel('Avg Cost per Person', config)).toBe('Blended workforce cost');
  });
});
