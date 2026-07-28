import { describe, expect, it } from 'vitest';
import { getResultAccordionTone } from './resultAccordionTone';
import {
  getOngoingCostBreakdown,
  getOngoingCostImpactStatus,
} from './ongoingCostBreakdown';

describe('standardized result accordions', () => {
  it('maps each semantic model effect to a deliberate, accessible tone', () => {
    expect(getResultAccordionTone('positive').label).toBe('Improves the case');
    expect(getResultAccordionTone('material-negative').label).toBe('Material downside');
    expect(getResultAccordionTone('minor-negative').label).toBe('Small downside');
    expect(getResultAccordionTone('neutral').label).toBe('No model change');
    expect(getResultAccordionTone('unknown')).toEqual(getResultAccordionTone('neutral'));
  });

  it('uses red only when annual AI cost materially changes the financial decision', () => {
    expect(getOngoingCostImpactStatus({ annualCost: 300, grossSavings: 500, netValue: 200 }))
      .toBe('material-negative');
    expect(getOngoingCostImpactStatus({ annualCost: 100, grossSavings: 1_000, netValue: 900 }))
      .toBe('minor-negative');
    expect(getOngoingCostImpactStatus({ annualCost: 10, grossSavings: 1_000, netValue: 990 }))
      .toBe('neutral');
  });

  it('reconciles access, consumption, run, and a manual annual-cost override', () => {
    const breakdown = getOngoingCostBreakdown({
      annualBasePlatformLicense: 60_000,
      annualUserLicenseCost: 24_000,
      annualAdjacentCost: 6_000,
      annualApiCost: 15_000,
      ongoingAiLaborCost: 80_000,
      annualAgentInfrastructureCost: 12_000,
      modelRetrainingCost: 9_000,
      annualComplianceCost: 20_000,
      retainedRetrainingCost: 5_000,
      techDebtCost: 6_000,
      cyberInsuranceCost: 4_000,
      dataTransferCostAnnual: 3_000,
      computedOngoingCost: 244_000,
      baseOngoingCost: 300_000,
      userProvidedOngoing: true,
      costBuckets: {
        accessAnnual: 90_000,
        consumptionAnnual: 15_000,
        runAnnual: 139_000,
        modeledAnnualTotal: 244_000,
        annualTotal: 300_000,
      },
    });

    expect(breakdown.categories.map((category) => category.amount)).toEqual([90_000, 15_000, 139_000]);
    expect(breakdown.bucketTotal).toBe(244_000);
    expect(breakdown.effectiveAnnualCost).toBe(300_000);
    expect(breakdown.enteredAdjustment).toBe(56_000);
    expect(breakdown.isUserOverride).toBe(true);
  });

  it('prefers the live DCF-reconciled breakdown when an override is allocated across buckets', () => {
    const breakdown = getOngoingCostBreakdown({
      userProvidedOngoing: true,
      costBuckets: {
        breakdown: {
          source: 'user-entered-total',
          modeledAnnualTotal: 200_000,
          annualTotal: 300_000,
          annualOverrideDelta: 100_000,
          categories: [
            { key: 'access', label: 'Access & licensing', modeledAmount: 80_000, amount: 120_000, items: [] },
            { key: 'consumption', label: 'Consumption', modeledAmount: 20_000, amount: 30_000, items: [] },
            { key: 'run', label: 'Operations & governance', modeledAmount: 100_000, amount: 150_000, items: [] },
          ],
        },
      },
    });

    expect(breakdown.usesReconciledBreakdown).toBe(true);
    expect(breakdown.categories.reduce((total, category) => total + category.amount, 0)).toBe(300_000);
    expect(breakdown.bucketTotal).toBe(200_000);
    expect(breakdown.effectiveAnnualCost).toBe(300_000);
    expect(breakdown.enteredAdjustment).toBe(100_000);
  });

  it('degrades to a clear total when old result payloads do not contain bucket detail', () => {
    const breakdown = getOngoingCostBreakdown({ baseOngoingCost: 42_000 });

    expect(breakdown.effectiveAnnualCost).toBe(42_000);
    expect(breakdown.bucketTotal).toBe(0);
    expect(breakdown.hasBucketDetail).toBe(false);
  });
});
