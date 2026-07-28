const TARGET_KEYS = [
  'totalHeadcountReductionTarget',
  'headcountReductionTarget',
  'maximumHeadcountReduction',
  'totalReductionTarget',
];

const DIRECT_EMPLOYEE_TARGET_KEYS = [
  'maximumDirectEmployeeRedundancies',
  'directEmployeeReductionTarget',
  'directEmployeeRedundancyTarget',
  'employeeReductionTarget',
];

const DIRECT_EMPLOYEE_SELECTION_CAP_KEYS = [
  'remainingDirectEmployeeReductionCapacity',
  'maximumRedundancies',
];

const CONTRACTOR_TARGET_KEYS = [
  'contractorRollOffTarget',
  'maximumContractorRollOffs',
  'contractorRollOffCount',
  'offshoreContractorRollOffTarget',
];

const DIRECT_EMPLOYEE_SELECTED_KEYS = [
  'directEmployeeRedundancies',
  'employeesToMakeRedundant',
];

const CONTRACTOR_SELECTED_KEYS = [
  'contractorsToRollOff',
  'contractorRollOffs',
];

function wholeNonNegative(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : null;
}

function firstWholeValue(source, keys) {
  for (const key of keys) {
    const value = wholeNonNegative(source?.[key]);
    if (value !== null) return value;
  }
  return null;
}

function clamp(value, maximum) {
  return Math.min(Math.max(0, value), Math.max(0, maximum));
}

/**
 * Presentation adapter for the workforce-transition outputs. It keeps the
 * screen compatible with saved models while preferring the live model's
 * explicit target and employee/contractor allocation when available.
 */
export function getHeadcountReductionPlan({ workforce = {}, transitionPlan = {}, years } = {}) {
  const directEmployeeCount = wholeNonNegative(workforce.directEmployeeCount) ?? 0;
  const contractorCount = wholeNonNegative(workforce.offshoreContractorCount) ?? 0;
  const totalWorkforce = directEmployeeCount + contractorCount;
  const selectedYears = clamp(wholeNonNegative(years) ?? 3, 5) || 1;

  const modelTarget = firstWholeValue(transitionPlan, TARGET_KEYS);
  const directModelTarget = firstWholeValue(transitionPlan, DIRECT_EMPLOYEE_TARGET_KEYS);
  const remainingDirectEmployeeCapacity = firstWholeValue(
    transitionPlan,
    DIRECT_EMPLOYEE_SELECTION_CAP_KEYS,
  );
  const contractorModelTarget = firstWholeValue(transitionPlan, CONTRACTOR_TARGET_KEYS);

  // Employee redundancies and contractor roll-offs are alternative ways to
  // realize one total capacity target. Their individual maxima must never be
  // added together—doing so would overstate the target when either group can
  // absorb the same freed capacity.
  const fallbackTarget = Math.max(
    directModelTarget ?? remainingDirectEmployeeCapacity ?? 0,
    contractorModelTarget ?? 0,
  );
  const totalHeadcountReductionTarget = clamp(
    modelTarget ?? fallbackTarget,
    totalWorkforce,
  );
  const directEmployeeReductionCap = clamp(
    directModelTarget ?? remainingDirectEmployeeCapacity ?? totalHeadcountReductionTarget,
    Math.min(directEmployeeCount, totalHeadcountReductionTarget),
  );
  const contractorRollOffCap = clamp(
    contractorModelTarget ?? 0,
    Math.min(contractorCount, totalHeadcountReductionTarget),
  );
  const contractorsToRollOff = clamp(
    firstWholeValue(transitionPlan, CONTRACTOR_SELECTED_KEYS) ?? 0,
    Math.min(contractorRollOffCap, totalHeadcountReductionTarget),
  );
  const directEmployeeSelectionCap = clamp(
    remainingDirectEmployeeCapacity ?? directEmployeeReductionCap,
    Math.min(
      directEmployeeCount,
      directEmployeeReductionCap,
      totalHeadcountReductionTarget - contractorsToRollOff,
    ),
  );
  const directEmployeeRedundancies = clamp(
    firstWholeValue(transitionPlan, DIRECT_EMPLOYEE_SELECTED_KEYS) ?? 0,
    directEmployeeSelectionCap,
  );

  return {
    directEmployeeCount,
    contractorCount,
    totalWorkforce,
    totalHeadcountReductionTarget,
    directEmployeeReductionCap,
    directEmployeeSelectionCap,
    contractorRollOffCap,
    directEmployeeRedundancies,
    contractorsToRollOff,
    totalSelectedWorkforceReductions: directEmployeeRedundancies + contractorsToRollOff,
    years: selectedYears,
    annualTarget: totalHeadcountReductionTarget / selectedYears,
  };
}

/**
 * The reduction target is one shared pool. These UI caps keep the two explicit
 * actions from claiming the same freed capacity twice while the calculation
 * engine remains the final source of truth.
 */
export function getWorkforceActionCaps(plan = {}, selections = {}) {
  const totalTarget = wholeNonNegative(plan.totalHeadcountReductionTarget) ?? 0;
  const directCap = wholeNonNegative(plan.directEmployeeReductionCap) ?? 0;
  const contractorCap = wholeNonNegative(plan.contractorRollOffCap) ?? 0;
  const directEmployeeCount = wholeNonNegative(plan.directEmployeeCount) ?? 0;
  const requestedDirect = clamp(
    wholeNonNegative(selections.employeesToMakeRedundant) ?? 0,
    directCap,
  );
  const requestedContractors = clamp(
    wholeNonNegative(selections.contractorsToRollOff) ?? 0,
    contractorCap,
  );
  const directEmployeeMax = Math.max(0, Math.min(directCap, totalTarget - requestedContractors));
  const contractorMax = Math.max(0, Math.min(contractorCap, totalTarget - requestedDirect));

  return {
    directEmployeeMax,
    contractorMax,
    employeeRetrainMax: Math.max(0, directEmployeeCount - Math.min(requestedDirect, directEmployeeMax)),
  };
}

export function formatPeople(value, { approximate = false } = {}) {
  const numeric = Number(value) || 0;
  const displayed = Number.isInteger(numeric) ? numeric.toLocaleString() : numeric.toFixed(1);
  const noun = Math.abs(numeric - 1) < 1e-9 ? 'person' : 'people';
  return `${approximate ? '~' : ''}${displayed} ${noun}`;
}
