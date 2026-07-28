const APPROXIMATE_MATCH_TOLERANCE = 1;

export const ANNUAL_AI_COST_MODES = Object.freeze({
  modelDerived: 'model-derived',
  lowerPlanning: 'lower-planning',
  typical: 'typical',
  higherPlanning: 'higher-planning',
  custom: 'custom',
});

function isCloseTo(value, comparison) {
  return Math.abs(Number(value) - Number(comparison)) <= APPROXIMATE_MATCH_TOLERANCE;
}

/**
 * Keeps the selector honest: null means the live model owns the cost; every
 * other mode writes a clear annual override into the calculation input.
 */
export function getAnnualAiCostMode(value, annualSuggestion = {}) {
  if (value === null || value === undefined || value === '') {
    return ANNUAL_AI_COST_MODES.modelDerived;
  }
  if (isCloseTo(value, annualSuggestion.lowerPlanning)) return ANNUAL_AI_COST_MODES.lowerPlanning;
  if (isCloseTo(value, annualSuggestion.typical)) return ANNUAL_AI_COST_MODES.typical;
  if (isCloseTo(value, annualSuggestion.higherPlanning)) return ANNUAL_AI_COST_MODES.higherPlanning;
  return ANNUAL_AI_COST_MODES.custom;
}

export function getAnnualAiCostModeValue(mode, annualSuggestion = {}) {
  switch (mode) {
    case ANNUAL_AI_COST_MODES.modelDerived:
      return null;
    case ANNUAL_AI_COST_MODES.lowerPlanning:
      return annualSuggestion.lowerPlanning;
    case ANNUAL_AI_COST_MODES.typical:
      return annualSuggestion.typical;
    case ANNUAL_AI_COST_MODES.higherPlanning:
      return annualSuggestion.higherPlanning;
    default:
      return undefined;
  }
}
