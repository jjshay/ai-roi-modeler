// ---------------------------------------------------------------------------
// Workforce, contract, and measurable-rework helpers
// ---------------------------------------------------------------------------
// These functions deliberately contain no UI state or benchmark defaults so
// every surface (wizard, live preview, Excel export) can use the same math.

function finiteNumber(value, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nonNegative(value, fallback = 0) {
  return Math.max(0, finiteNumber(value, fallback));
}

function boundedNonNegative(value, maximum, fallback = 0) {
  const raw = nonNegative(value, fallback);
  return {
    raw,
    value: Math.min(raw, maximum),
    capped: raw > maximum,
  };
}

// [M3] Model guardrails. These are deliberate planning limits, not market
// benchmarks: values above them can still be analyzed outside this starter
// model, but need case evidence rather than a silently explosive ROI result.
export const MODEL_INPUT_LIMITS = {
  workforceCount: 100000,
  fullyBurdenedAnnualCost: 2000000,
  existingContractCount: 100000,
  annualCostPerContract: 50000000,
  annualExistingContractSpend: 500000000,
  annualErrorCount: 10000000,
  reworkCostPerItem: 100000,
  annualReworkCost: 500000000,
};

function hasValue(value) {
  return value !== null && value !== undefined && value !== '';
}

/**
 * Normalizes both fraction inputs (0.1) and percent-point inputs (10).
 */
export function normalizePercent(value, fallback = 0) {
  const numeric = finiteNumber(value, fallback);
  const fraction = Math.abs(numeric) > 1 ? numeric / 100 : numeric;
  return Math.max(0, Math.min(fraction, 1));
}

/**
 * Calculates the present workforce cost from explicit employee and contractor
 * inputs. `hasWorkforceMix` is false until at least one worker is specified,
 * allowing callers to preserve legacy teamSize × avgSalary models.
 */
export function calculateWorkforceMix(inputs = {}) {
  const directEmployeeCountInput = boundedNonNegative(
    inputs.directEmployeeCount ?? inputs.employeeCount
    , MODEL_INPUT_LIMITS.workforceCount
  );
  const employeeFullyBurdenedCostInput = boundedNonNegative(
    inputs.employeeFullyBurdenedCost ?? inputs.avgEmployeeCost
    , MODEL_INPUT_LIMITS.fullyBurdenedAnnualCost
  );
  const offshoreContractorCountInput = boundedNonNegative(
    inputs.offshoreContractorCount ?? inputs.contractorCount
    , MODEL_INPUT_LIMITS.workforceCount
  );
  const contractorFullyBurdenedCostInput = boundedNonNegative(
    inputs.contractorFullyBurdenedCost ?? inputs.avgContractorCost
    , MODEL_INPUT_LIMITS.fullyBurdenedAnnualCost
  );
  const directEmployeeCount = directEmployeeCountInput.value;
  const employeeFullyBurdenedCost = employeeFullyBurdenedCostInput.value;
  const offshoreContractorCount = offshoreContractorCountInput.value;
  const contractorFullyBurdenedCost = contractorFullyBurdenedCostInput.value;
  const hoursPerWeek = Math.max(0, finiteNumber(inputs.hoursPerWeek, 40));

  const directEmployeeAnnualCost = directEmployeeCount * employeeFullyBurdenedCost;
  const contractorAnnualCost = offshoreContractorCount * contractorFullyBurdenedCost;
  const totalHeadcount = directEmployeeCount + offshoreContractorCount;
  const totalAnnualHeadcountCost = directEmployeeAnnualCost + contractorAnnualCost;
  const blendedFullyBurdenedCost = totalHeadcount > 0
    ? totalAnnualHeadcountCost / totalHeadcount
    : 0;

  // Fully burdened annual cost is normalized to a standard 2,080-hour FTE.
  const weightedHourlyCost = blendedFullyBurdenedCost / 2080;
  const weeklyHours = totalHeadcount * hoursPerWeek;
  const annualHours = weeklyHours * 52;
  const mixFieldsPresent = [
    inputs.directEmployeeCount,
    inputs.employeeFullyBurdenedCost,
    inputs.offshoreContractorCount,
    inputs.contractorFullyBurdenedCost,
  ].some(hasValue);
  const inputCorrections = [];
  if (directEmployeeCountInput.capped) {
    inputCorrections.push(`Direct employee count was capped at ${MODEL_INPUT_LIMITS.workforceCount.toLocaleString()} for this model.`);
  }
  if (offshoreContractorCountInput.capped) {
    inputCorrections.push(`Offshore contractor count was capped at ${MODEL_INPUT_LIMITS.workforceCount.toLocaleString()} for this model.`);
  }
  if (employeeFullyBurdenedCostInput.capped) {
    inputCorrections.push(`Average fully burdened direct-employee cost was capped at $${MODEL_INPUT_LIMITS.fullyBurdenedAnnualCost.toLocaleString()}/year. Add evidence before using a higher amount outside this model.`);
  }
  if (contractorFullyBurdenedCostInput.capped) {
    inputCorrections.push(`Average fully burdened contractor cost was capped at $${MODEL_INPUT_LIMITS.fullyBurdenedAnnualCost.toLocaleString()}/year. Add evidence before using a higher amount outside this model.`);
  }

  return {
    hasWorkforceMix: mixFieldsPresent && totalHeadcount > 0,
    directEmployeeCount,
    employeeFullyBurdenedCost,
    offshoreContractorCount,
    contractorFullyBurdenedCost,
    directEmployeeAnnualCost,
    contractorAnnualCost,
    totalHeadcount,
    totalAnnualHeadcountCost,
    blendedFullyBurdenedCost,
    weightedHourlyCost,
    hoursPerWeek,
    weeklyHours,
    annualHours,
    inputCorrections,
  };
}

/**
 * Estimates the one-time cost to cancel current contracts during their notice
 * period. It does not assume the underlying annual contract spend becomes a
 * recurring AI savings stream; that decision belongs to an explicit exit plan.
 */
export function calculateContractExitCost(inputs = {}) {
  const existingContractCountInput = boundedNonNegative(
    inputs.existingContractCount ?? inputs.contractCount,
    MODEL_INPUT_LIMITS.existingContractCount,
  );
  const annualCostPerContractInput = boundedNonNegative(
    inputs.annualCostPerContract ?? inputs.annualContractCost,
    MODEL_INPUT_LIMITS.annualCostPerContract,
  );
  const existingContractCount = existingContractCountInput.value;
  const annualCostPerContract = annualCostPerContractInput.value;
  const contractNoticePeriodMonths = Math.max(
    0,
    finiteNumber(inputs.contractNoticePeriodMonths ?? inputs.cancellationNoticeMonths, 3)
  );
  const uncappedAnnualExistingContractCost = existingContractCount * annualCostPerContract;
  const annualExistingContractCost = Math.min(
    uncappedAnnualExistingContractCost,
    MODEL_INPUT_LIMITS.annualExistingContractSpend,
  );
  const contractExitCost = annualExistingContractCost * (contractNoticePeriodMonths / 12);
  const inputCorrections = [];
  if (existingContractCountInput.capped) {
    inputCorrections.push(`Existing contract count was capped at ${MODEL_INPUT_LIMITS.existingContractCount.toLocaleString()} for this model.`);
  }
  if (annualCostPerContractInput.capped) {
    inputCorrections.push(`Annual cost per contract was capped at $${MODEL_INPUT_LIMITS.annualCostPerContract.toLocaleString()}. Use a documented enterprise-contract analysis for higher values.`);
  }
  if (uncappedAnnualExistingContractCost > MODEL_INPUT_LIMITS.annualExistingContractSpend) {
    inputCorrections.push(`Total annual contract spend was capped at $${MODEL_INPUT_LIMITS.annualExistingContractSpend.toLocaleString()} for this model. Split the portfolio into documented exit cases before using a higher total.`);
  }

  return {
    existingContractCount,
    annualCostPerContract,
    contractNoticePeriodMonths,
    uncappedAnnualExistingContractCost,
    annualExistingContractCost,
    contractExitCost,
    inputCorrections,
  };
}

/**
 * Computes rework only from measured operational inputs. There is no default
 * labor-percentage or industry benchmark in this calculation.
 */
export function calculateReworkCost(inputs = {}) {
  const errorCountEmployeesInput = boundedNonNegative(
    inputs.errorCountEmployees ?? inputs.employeeErrorCount,
    MODEL_INPUT_LIMITS.annualErrorCount,
  );
  const errorCountContractsInput = boundedNonNegative(
    inputs.errorCountContracts ?? inputs.contractErrorCount,
    MODEL_INPUT_LIMITS.annualErrorCount,
  );
  const errorCountEmployees = errorCountEmployeesInput.value;
  const errorCountContracts = errorCountContractsInput.value;
  const detailedErrorCount = errorCountEmployees + errorCountContracts;
  const providedAnnualErrorCountInput = boundedNonNegative(
    inputs.annualErrorCount ?? inputs.annualErrors,
    MODEL_INPUT_LIMITS.annualErrorCount,
  );
  const providedAnnualErrorCount = providedAnnualErrorCountInput.value;
  const hasDetailedErrorCounts = [
    inputs.errorCountEmployees,
    inputs.employeeErrorCount,
    inputs.errorCountContracts,
    inputs.contractErrorCount,
  ].some(hasValue);

  // Detailed counts win whenever the new workflow supplies them, including a
  // deliberate zero. This prevents a stale legacy aggregate from surviving
  // after the user corrects both detailed counts back to zero.
  const annualErrorCount = hasDetailedErrorCounts
    ? detailedErrorCount
    : providedAnnualErrorCount;
  const reworkFraction = normalizePercent(
    inputs.reworkFraction ?? inputs.fractionNeedingRework ?? inputs.errorRate,
    0
  );
  const reworkCostPerItemInput = boundedNonNegative(
    inputs.reworkCostPerItem ?? inputs.estimatedReworkCostPerItem ?? inputs.costPerError,
    MODEL_INPUT_LIMITS.reworkCostPerItem,
  );
  const reworkCostPerItem = reworkCostPerItemInput.value;
  const uncappedAnnualReworkCost = annualErrorCount * reworkFraction * reworkCostPerItem;
  const annualReworkCost = Math.min(uncappedAnnualReworkCost, MODEL_INPUT_LIMITS.annualReworkCost);
  const inputCorrections = [];
  if (errorCountEmployeesInput.capped || errorCountContractsInput.capped || providedAnnualErrorCountInput.capped) {
    inputCorrections.push(`Annual error counts were capped at ${MODEL_INPUT_LIMITS.annualErrorCount.toLocaleString()} per entered field for this model.`);
  }
  if (reworkCostPerItemInput.capped) {
    inputCorrections.push(`Estimated rework cost per item was capped at $${MODEL_INPUT_LIMITS.reworkCostPerItem.toLocaleString()}. Use documented item-level evidence for higher values.`);
  }
  if (uncappedAnnualReworkCost > MODEL_INPUT_LIMITS.annualReworkCost) {
    inputCorrections.push(`Total annual rework cost was capped at $${MODEL_INPUT_LIMITS.annualReworkCost.toLocaleString()} for this model. Validate the error population and item-level cost before using a higher total.`);
  }

  return {
    errorCountEmployees,
    errorCountContracts,
    annualErrorCount,
    reworkFraction,
    reworkCostPerItem,
    uncappedAnnualReworkCost,
    annualReworkCost,
    inputCorrections,
  };
}

/**
 * Calculates labor cost per internal process and the associated monthly and
 * annual workload cost. Process volume is interpreted as transactions/month.
 */
export function calculateProcessCost(inputs = {}) {
  const workforceMix = calculateWorkforceMix(inputs);
  const processVolume = nonNegative(inputs.processVolume);
  const handlingTimeMin = nonNegative(inputs.handlingTimeMin);
  const fallbackHourlyCost = nonNegative(inputs.avgSalary) / 2080;
  const hourlyCost = workforceMix.hasWorkforceMix
    ? workforceMix.weightedHourlyCost
    : fallbackHourlyCost;
  const costPerProcess = hourlyCost * (handlingTimeMin / 60);
  const monthlyProcessCost = costPerProcess * processVolume;
  const annualProcessCost = monthlyProcessCost * 12;

  return {
    processVolume,
    handlingTimeMin,
    hourlyCost,
    costPerProcess,
    monthlyProcessCost,
    annualProcessCost,
  };
}

/**
 * Maps the user’s measured efficiency plan to capacity and explicit workforce
 * actions. The model recognizes cash labor savings only from declared direct-
 * employee redundancies; retrained employees remain capacity-only.
 */
export function calculateWorkforceTransitionPlan(inputs = {}, suppliedWorkforceMix, options = {}) {
  const workforceMix = suppliedWorkforceMix || calculateWorkforceMix(inputs);
  const totalEfficiencyGainPct = normalizePercent(inputs.totalEfficiencyGainPct, 0.10);
  const directEmployees = workforceMix.hasWorkforceMix
    ? workforceMix.directEmployeeCount
    : nonNegative(inputs.teamSize, 0);
  const employeeCost = workforceMix.hasWorkforceMix
    ? workforceMix.employeeFullyBurdenedCost
    : nonNegative(inputs.avgSalary);
  const totalHeadcount = workforceMix.hasWorkforceMix
    ? workforceMix.totalHeadcount
    : nonNegative(inputs.teamSize, 0);
  const workforceAnnualHours = workforceMix.hasWorkforceMix
    ? workforceMix.annualHours
    : totalHeadcount * Math.max(0, finiteNumber(inputs.hoursPerWeek, 40)) * 52;
  const hasEligibleHours = Object.prototype.hasOwnProperty.call(options, 'eligibleAnnualHours');
  // A case can only create capacity inside the workload it actually covers.
  // The cap protects a 40-hour staffing assumption from turning a small
  // process into a whole-team redundancy claim.
  const eligibleAnnualHours = hasEligibleHours
    ? Math.min(workforceAnnualHours, nonNegative(options.eligibleAnnualHours))
    : workforceAnnualHours;
  const eligibleCapacityFTEs = eligibleAnnualHours / 2080;

  const freedUpAnnualHours = eligibleAnnualHours * totalEfficiencyGainPct;
  const freedCapacityFTEs = freedUpAnnualHours / 2080;
  const requestedEmployeesToMakeRedundant = nonNegative(inputs.employeesToMakeRedundant);
  const requestedEmployeesToRetrain = nonNegative(inputs.employeesToRetrain);
  const redundancyCapacityCap = Math.floor(freedCapacityFTEs + 1e-9);
  const redundanciesAllowed = options.allowRedundancies !== false;
  const maximumRedundancies = redundanciesAllowed
    ? Math.min(directEmployees, redundancyCapacityCap)
    : 0;
  const employeesToMakeRedundant = Math.min(
    requestedEmployeesToMakeRedundant,
    maximumRedundancies
  );
  const employeesToRetrain = Math.min(
    requestedEmployeesToRetrain,
    Math.max(0, directEmployees - employeesToMakeRedundant)
  );
  const annualHeadcountSavings = employeesToMakeRedundant * employeeCost;
  const oneTimeRedundancyCost = employeesToMakeRedundant * 1.5 * employeeCost;
  const redundancySchedule = [0.50, 0.30, 0.20, 0, 0];
  const redundancyCostByYear = redundancySchedule.map(pct => oneTimeRedundancyCost * pct);
  const annualWorkforceCost = (
    workforceMix.hasWorkforceMix
      ? workforceMix.totalAnnualHeadcountCost
      : totalHeadcount * employeeCost
  );
  const workforceHourlyCost = workforceAnnualHours > 0
    ? annualWorkforceCost / workforceAnnualHours
    : 0;
  const annualWorkforceEfficiencyValue = eligibleAnnualHours
    * workforceHourlyCost
    * totalEfficiencyGainPct;
  const annualCapacityOnlyValue = Math.max(
    0,
    annualWorkforceEfficiencyValue - annualHeadcountSavings
  );
  const warnings = [];

  if (requestedEmployeesToMakeRedundant > maximumRedundancies) {
    warnings.push(
      redundanciesAllowed
        ? `Redundancy plan capped at ${maximumRedundancies} direct employees because the measured freed capacity supports ${freedCapacityFTEs.toFixed(1)} FTEs.`
        : 'Redundancy plan is turned off because this case does not cover enough verified workforce capacity to support a defensible workforce action.'
    );
  }
  if (requestedEmployeesToRetrain > employeesToRetrain) {
    warnings.push(
      `Retraining plan capped at ${employeesToRetrain} direct employees after the redundancy plan.`
    );
  }

  return {
    totalEfficiencyGainPct,
    workforceAnnualHours,
    eligibleAnnualHours,
    eligibleCapacityFTEs,
    redundanciesAllowed,
    freedUpAnnualHours,
    freedCapacityFTEs,
    requestedEmployeesToMakeRedundant,
    employeesToMakeRedundant,
    requestedEmployeesToRetrain,
    employeesToRetrain,
    maximumRedundancies,
    annualHeadcountSavings,
    oneTimeRedundancyCost,
    redundancySchedule,
    redundancyCostByYear,
    annualWorkforceEfficiencyValue,
    annualCapacityOnlyValue,
    warnings,
  };
}

/**
 * Produces a transparent delivery scenario. The pace changes are intentionally
 * simple planning levers: accelerated delivery staffs and costs 20% more;
 * extended delivery staffs and costs 20% less. A provided implementation
 * budget remains the final override in the calculation engine.
 */
export function calculateDeploymentPlan(inputs = {}, options = {}) {
  const workforceMix = options.workforceMix || calculateWorkforceMix(inputs);
  const pace = inputs.deliveryPace || 'standard';
  const paceConfig = {
    accelerated: { staffingMultiplier: 1.20, durationMultiplier: 0.80, costMultiplier: 1.20 },
    standard: { staffingMultiplier: 1, durationMultiplier: 1, costMultiplier: 1 },
    extended: { staffingMultiplier: 0.80, durationMultiplier: 1.25, costMultiplier: 0.80 },
  }[pace] || { staffingMultiplier: 1, durationMultiplier: 1, costMultiplier: 1 };
  const baselineTimelineMonths = Math.max(1, finiteNumber(options.baselineTimelineMonths, 6));
  const baselineImplementationHeadcount = Math.max(
    0.5,
    finiteNumber(options.baselineImplementationHeadcount, 1)
  );
  // Deployment labor is priced from the workforce mix entered for the
  // affected process.  Older saved models that pre-date the mix use their
  // entered average workforce cost instead.  Do not fall back to a location
  // or an assumed AI-team salary: the model has no implementation-location
  // question and must not invent one.
  const fallbackAnnualCost = nonNegative(
    options.fallbackAnnualCost,
    nonNegative(inputs.avgSalary, 100000),
  );
  const annualFullyBurdenedCost = workforceMix.hasWorkforceMix
    ? workforceMix.blendedFullyBurdenedCost
    : fallbackAnnualCost;
  const rateSource = workforceMix.hasWorkforceMix
    ? 'entered-blended-workforce-cost'
    : 'legacy-entered-workforce-cost';
  const implementationHeadcount = baselineImplementationHeadcount * paceConfig.staffingMultiplier;
  const estimatedDurationMonths = Math.max(
    1,
    Math.ceil(baselineTimelineMonths * paceConfig.durationMultiplier)
  );
  const baselineDeploymentLaborCost = baselineImplementationHeadcount
    * annualFullyBurdenedCost
    * (baselineTimelineMonths / 12);
  const estimatedDeploymentLaborCost = baselineDeploymentLaborCost * paceConfig.costMultiplier;

  return {
    deliveryPace: pace,
    baselineTimelineMonths,
    estimatedDurationMonths,
    baselineImplementationHeadcount,
    implementationHeadcount,
    staffingMultiplier: paceConfig.staffingMultiplier,
    durationMultiplier: paceConfig.durationMultiplier,
    costMultiplier: paceConfig.costMultiplier,
    annualFullyBurdenedCost,
    rateSource,
    baselineDeploymentLaborCost,
    estimatedDeploymentLaborCost,
  };
}
