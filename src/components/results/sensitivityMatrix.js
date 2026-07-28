import { runCalculations } from '../../logic/calculations';
import { ARCHETYPE_INPUT_MAP } from '../../logic/archetypeInputs';

// Ten deliberately spaced planning levels. The current input is the median
// point; P25/P75 target 75% and 125% of the current operating level and are
// adjusted only when needed to keep valid UI input steps distinct. These are
// scenario points, not statistical confidence intervals.
export const SENSITIVITY_LEVEL_MULTIPLIERS = Object.freeze([
  0.50, 0.60, 0.70, 0.75, 0.85,
  1.00,
  1.15, 1.25, 1.35, 1.50,
]);

export const SENSITIVITY_PLANNING_POINT_INDEX = Object.freeze({
  p25: 3,
  p50: 5,
  p75: 7,
});

// The second axis is deliberately an operating-value driver, not the old
// generic salary/team-size proxy. Each selection already maps into the core
// model through its case-specific workload and benefit calculations.
const CASE_SENSITIVITY_CONFIG = Object.freeze({
  'internal-process-automation': {
    volumeKey: 'processVolume',
    volumeShortLabel: 'monthly process volume',
    volumeLabel: 'Process volume',
    volumeUnit: 'transactions/month',
    economicKey: 'handlingTimeMin',
    economicLabel: 'Time per process',
    economicUnit: 'minutes',
    valueLeverTitle: 'More time-intensive work',
    valueLeverDescription: 'Validate the hands-on minutes per process. Higher measured effort increases the cash value that can be released from this workflow.',
  },
  'customer-facing-ai': {
    volumeKey: 'ticketsPerMonth',
    volumeShortLabel: 'monthly support tickets',
    volumeLabel: 'Support ticket volume',
    volumeUnit: 'tickets/month',
    economicKey: 'costPerResolvedTicket',
    economicLabel: 'Cost per human-resolved contact',
    economicUnit: '$/contact',
    valueLeverTitle: 'Verified cost per contact',
    valueLeverDescription: 'Validate the fully loaded cost per resolved contact and the avoidable support spend before treating containment as cash savings.',
  },
  'data-analytics-automation': {
    volumeKey: 'reportsPerMonth',
    volumeShortLabel: 'monthly reports',
    volumeLabel: 'Report volume',
    volumeUnit: 'reports/month',
    economicKey: 'hoursPerReport',
    economicLabel: 'Analyst time per report',
    economicUnit: 'hours',
    valueLeverTitle: 'More analyst-intensive reporting',
    valueLeverDescription: 'Validate the analyst hours per report. The model only counts cash when an approved workforce or third-party-spend action exists.',
  },
  'risk-compliance-legal-ai': {
    volumeKey: 'reviewsPerMonth',
    volumeShortLabel: 'monthly reviews',
    volumeLabel: 'Review volume',
    volumeUnit: 'reviews/month',
    economicKey: 'hoursPerReview',
    economicLabel: 'Staff time per review',
    economicUnit: 'hours',
    valueLeverTitle: 'More labor-intensive reviews',
    valueLeverDescription: 'Validate staff hours per review. Historical avoided-loss estimates remain outside core NPV until Finance accepts the evidence.',
  },
});

const CUSTOMER_SERVICE_CAPACITY_CONFIG = Object.freeze({
  ...CASE_SENSITIVITY_CONFIG['customer-facing-ai'],
  economicKey: 'resolutionTimeMin',
  economicLabel: 'Human resolution time',
  economicUnit: 'minutes',
  valueLeverTitle: 'More time-intensive contacts',
  valueLeverDescription: 'The support-cost evidence gate is not complete, so this view uses human resolution time and keeps unvalidated cost avoidance out of core cash savings.',
  capacityOnly: true,
});

function asFiniteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function decimalPlaces(step) {
  if (!Number.isFinite(step) || step <= 0 || step >= 1) return 0;
  return Math.min(6, String(step).split('.')[1]?.length || 0);
}

function roundForInput(value, input) {
  const precision = decimalPlaces(input.step);
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function roundToInputStep(value, input) {
  const min = asFiniteNumber(input.min, 0);
  const step = asFiniteNumber(input.step, 0);
  if (step <= 0) return roundForInput(value, input);
  const rounded = min + Math.round((value - min) / step) * step;
  return roundForInput(rounded, input);
}

function getSchemaInput(schema, key) {
  return schema?.inputs?.find((input) => input.key === key) || null;
}

/**
 * Select the two operating levers for an archetype. Customer Service uses the
 * measured cost/contact only after its evidence gate is complete; otherwise
 * the model intentionally shows a capacity-based resolution-time range.
 */
export function getCaseSensitivityConfig(projectArchetype, results = {}) {
  const config = CASE_SENSITIVITY_CONFIG[projectArchetype];
  if (!config) return null;

  if (
    projectArchetype === 'customer-facing-ai'
    && !results?.caseEconomics?.supportCostCashRealizable
  ) {
    return CUSTOMER_SERVICE_CAPACITY_CONFIG;
  }

  return config;
}

/**
 * Builds ten bounded input levels around the current operating assumption.
 * Defaults give a 50%–150% planning range; the bounds protect saved links and
 * manually entered edge values from producing invalid model runs.
 */
export function buildSensitivityLevels(input, currentValue) {
  if (!input) return [];

  const min = asFiniteNumber(input.min, 0);
  const max = asFiniteNumber(input.max, Number.MAX_SAFE_INTEGER);
  const defaultValue = asFiniteNumber(input.default, min);
  const current = clamp(asFiniteNumber(currentValue, defaultValue), min, max);

  const step = asFiniteNumber(input.step, 0);
  const hasRoomForInputSteps = step > 0
    && current - min >= step * SENSITIVITY_PLANNING_POINT_INDEX.p50
    && max - current >= step * (SENSITIVITY_LEVEL_MULTIPLIERS.length - 1 - SENSITIVITY_PLANNING_POINT_INDEX.p50);

  const values = SENSITIVITY_LEVEL_MULTIPLIERS.map((multiplier) => {
    const raw = clamp(current * multiplier, min, max);
    return hasRoomForInputSteps ? roundToInputStep(raw, input) : roundForInput(raw, input);
  });

  // Preserve the exact current assumption at the P50 point. It makes the
  // center planning point reconcile to the visible base-case model.
  values[SENSITIVITY_PLANNING_POINT_INDEX.p50] = current;

  // The matrix must always have ten distinct planning lines. If a normal UI
  // input step rounds adjacent ranges together (e.g. 10.5 and 11.25 minutes),
  // place each value in an available step slot while preserving the exact
  // median. At a hard bound, preserve the continuous planning values instead
  // of moving the median away from what the user actually entered.
  if (hasRoomForInputSteps) {
    for (let index = 0; index < SENSITIVITY_PLANNING_POINT_INDEX.p50; index += 1) {
      const minAllowed = index === 0 ? min : values[index - 1] + step;
      const maxAllowed = current - step * (SENSITIVITY_PLANNING_POINT_INDEX.p50 - index);
      values[index] = clamp(values[index], minAllowed, maxAllowed);
    }
    for (let index = SENSITIVITY_PLANNING_POINT_INDEX.p50 + 1; index < values.length; index += 1) {
      const minAllowed = values[index - 1] + step;
      const maxAllowed = max - step * (values.length - 1 - index);
      values[index] = clamp(values[index], minAllowed, maxAllowed);
    }
  }

  return values;
}

function buildCellFormData(formData, volumeKey, volume, economicKey, economicValue) {
  return {
    ...formData,
    archetypeInputs: {
      ...(formData.archetypeInputs || {}),
      [volumeKey]: volume,
      [economicKey]: economicValue,
    },
  };
}

function modelOutput(model) {
  const npv = asFiniteNumber(model?.scenarios?.base?.npv, NaN);
  const yearFiveProjection = model?.scenarios?.base?.projections?.at?.(-1);
  const annualCashSavings = asFiniteNumber(
    yearFiveProjection?.grossSavings,
    model?.savings?.riskAdjustedSavings,
  );

  const guardrailMessage = model?.caseEconomics?.bumperMessages?.find(
    (message) => message.severity === 'blocking',
  )?.message || null;

  return {
    npv,
    annualCashSavings,
    blocked: Boolean(model?.caseEconomics?.workloadBlocked),
    guardrailMessage,
  };
}

/**
 * Calculate a 10 x 10 sensitivity square from the same production model used
 * by the results page. Every cell changes the selected case's workload volume
 * and its relevant economic driver together; nothing is extrapolated from a
 * visual-only chart.
 */
export function buildTwoDriverSensitivityMatrix(formData, results, modelRunner = runCalculations) {
  const projectArchetype = formData?.projectArchetype;
  const config = getCaseSensitivityConfig(projectArchetype, results);
  const schema = ARCHETYPE_INPUT_MAP[projectArchetype];
  if (!config || !schema || typeof modelRunner !== 'function') return null;

  const volumeInput = getSchemaInput(schema, config.volumeKey);
  const economicInput = getSchemaInput(schema, config.economicKey);
  if (!volumeInput || !economicInput) return null;

  const suppliedInputs = formData?.archetypeInputs || {};
  const volumeLevels = buildSensitivityLevels(volumeInput, suppliedInputs[config.volumeKey]);
  const economicLevels = buildSensitivityLevels(economicInput, suppliedInputs[config.economicKey]);
  if (volumeLevels.length !== 10 || economicLevels.length !== 10) return null;

  const rows = economicLevels.map((economicValue) => ({
    economicValue,
    cells: volumeLevels.map((volume) => {
      try {
        const output = modelOutput(modelRunner(buildCellFormData(
          formData,
          config.volumeKey,
          volume,
          config.economicKey,
          economicValue,
        )));
        return { volume, economicValue, ...output };
      } catch {
        // A saved malformed scenario should not make the full results page
        // unusable. The cell is visibly unavailable and the main model still
        // retains its own validation messages.
        return {
          volume,
          economicValue,
          npv: NaN,
          annualCashSavings: NaN,
          blocked: true,
          guardrailMessage: 'This planning combination could not be calculated.',
        };
      }
    }),
  }));

  const pointAt = (index) => rows[index]?.cells[index] || null;
  const cells = rows.flatMap((row) => row.cells);
  const hasVariation = (key) => {
    const values = cells
      .filter((cell) => !cell.blocked)
      .map((cell) => cell[key])
      .filter(Number.isFinite);
    return values.length > 1 && Math.max(...values) - Math.min(...values) > 0.01;
  };
  return {
    config,
    volumeInput,
    economicInput,
    volumeLevels,
    economicLevels,
    rows,
    blockedCellCount: cells.filter((cell) => cell.blocked).length,
    hasNpvVariation: hasVariation('npv'),
    hasAnnualCashSavingsVariation: hasVariation('annualCashSavings'),
    planningPoints: {
      p25: pointAt(SENSITIVITY_PLANNING_POINT_INDEX.p25),
      p50: pointAt(SENSITIVITY_PLANNING_POINT_INDEX.p50),
      p75: pointAt(SENSITIVITY_PLANNING_POINT_INDEX.p75),
    },
  };
}

/** User-facing replacement for legacy DCF sensitivity labels. */
export function getSensitivityLeverLabel(label, config) {
  if (label === 'Team Size') return config?.volumeLabel || 'Workload volume';
  if (label === 'Avg Cost per Person') return 'Blended workforce cost';
  return label;
}
