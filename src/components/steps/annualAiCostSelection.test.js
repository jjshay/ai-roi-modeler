import { describe, expect, it } from 'vitest';
import {
  ANNUAL_AI_COST_MODES,
  getAnnualAiCostMode,
  getAnnualAiCostModeValue,
} from './annualAiCostSelection';

const annual = {
  lowerPlanning: 75_000,
  typical: 100_000,
  higherPlanning: 125_000,
};

describe('annual AI cost selector', () => {
  it('keeps model-derived annual cost as null rather than silently making an override', () => {
    expect(getAnnualAiCostMode(null, annual)).toBe(ANNUAL_AI_COST_MODES.modelDerived);
    expect(getAnnualAiCostModeValue(ANNUAL_AI_COST_MODES.modelDerived, annual)).toBeNull();
  });

  it('maps the three planning options to the exact annual override amounts', () => {
    expect(getAnnualAiCostMode(75_000, annual)).toBe(ANNUAL_AI_COST_MODES.lowerPlanning);
    expect(getAnnualAiCostMode(100_000, annual)).toBe(ANNUAL_AI_COST_MODES.typical);
    expect(getAnnualAiCostMode(125_000, annual)).toBe(ANNUAL_AI_COST_MODES.higherPlanning);
    expect(getAnnualAiCostModeValue(ANNUAL_AI_COST_MODES.higherPlanning, annual)).toBe(125_000);
  });

  it('keeps an independently entered amount visibly custom', () => {
    expect(getAnnualAiCostMode(93_500, annual)).toBe(ANNUAL_AI_COST_MODES.custom);
    expect(getAnnualAiCostModeValue(ANNUAL_AI_COST_MODES.custom, annual)).toBeUndefined();
  });
});
