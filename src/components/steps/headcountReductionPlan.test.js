import { describe, expect, it } from 'vitest';
import {
  formatPeople,
  getHeadcountReductionPlan,
  getWorkforceActionCaps,
} from './headcountReductionPlan';

describe('headcount reduction presentation plan', () => {
  it('uses the calculated total target and phases it evenly over the selected years', () => {
    const plan = getHeadcountReductionPlan({
      workforce: { directEmployeeCount: 8, offshoreContractorCount: 4 },
      transitionPlan: {
        totalHeadcountReductionTarget: 6,
        maximumDirectEmployeeRedundancies: 4,
        contractorRollOffTarget: 2,
      },
      years: 3,
    });

    expect(plan).toMatchObject({
      totalHeadcountReductionTarget: 6,
      directEmployeeReductionCap: 4,
      contractorRollOffCap: 2,
      years: 3,
      annualTarget: 2,
    });
  });

  it('falls back to the existing direct-employee capacity limit for saved models', () => {
    const plan = getHeadcountReductionPlan({
      workforce: { directEmployeeCount: 5, offshoreContractorCount: 2 },
      transitionPlan: { maximumRedundancies: 3 },
    });

    expect(plan).toMatchObject({
      totalHeadcountReductionTarget: 3,
      directEmployeeReductionCap: 3,
      contractorRollOffCap: 0,
      years: 3,
      annualTarget: 1,
    });
  });

  it('never adds employee and contractor caps into a larger total target', () => {
    const plan = getHeadcountReductionPlan({
      workforce: { directEmployeeCount: 5, offshoreContractorCount: 4 },
      transitionPlan: {
        totalHeadcountReductionTarget: 3,
        maximumDirectEmployeeRedundancies: 3,
        maximumContractorRollOffs: 2,
        remainingDirectEmployeeReductionCapacity: 1,
        directEmployeeRedundancies: 1,
        contractorsToRollOff: 2,
      },
    });

    expect(plan).toMatchObject({
      totalHeadcountReductionTarget: 3,
      directEmployeeReductionCap: 3,
      directEmployeeSelectionCap: 1,
      contractorRollOffCap: 2,
      directEmployeeRedundancies: 1,
      contractorsToRollOff: 2,
      totalSelectedWorkforceReductions: 3,
    });
    expect(getWorkforceActionCaps(plan, {
      employeesToMakeRedundant: plan.directEmployeeRedundancies,
      contractorsToRollOff: plan.contractorsToRollOff,
    })).toMatchObject({
      directEmployeeMax: 1,
      contractorMax: 2,
    });
  });

  it('keeps direct redundancies and contractor roll-off within one shared target', () => {
    const plan = getHeadcountReductionPlan({
      workforce: { directEmployeeCount: 5, offshoreContractorCount: 4 },
      transitionPlan: {
        totalHeadcountReductionTarget: 3,
        maximumDirectEmployeeRedundancies: 3,
        maximumContractorRollOffs: 2,
      },
    });

    expect(getWorkforceActionCaps(plan, { contractorsToRollOff: 2 })).toMatchObject({
      directEmployeeMax: 1,
      contractorMax: 2,
    });
    expect(getWorkforceActionCaps(plan, { employeesToMakeRedundant: 3 })).toMatchObject({
      directEmployeeMax: 3,
      contractorMax: 0,
    });
  });

  it('never displays a reduction larger than the workforce that was entered', () => {
    const plan = getHeadcountReductionPlan({
      workforce: { directEmployeeCount: 2, offshoreContractorCount: 1 },
      transitionPlan: { totalHeadcountReductionTarget: 99 },
      years: 99,
    });

    expect(plan).toMatchObject({
      totalHeadcountReductionTarget: 3,
      directEmployeeReductionCap: 2,
      contractorRollOffCap: 0,
      years: 5,
      annualTarget: 0.6,
    });
    expect(formatPeople(plan.annualTarget, { approximate: true })).toBe('~0.6 people');
  });
});
