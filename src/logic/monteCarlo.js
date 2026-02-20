// Monte Carlo simulation engine for AI ROI Modeler
// Perturbs 6 key variables across distributions, runs N iterations of the DCF engine

import {
  gaussianRandom,
  lognormalRandom,
  triangularRandom,
  percentile,
  mean,
  stdDev,
  clamp,
} from '../utils/statistics';
import { runCalculations } from './calculations';

/**
 * Create a perturbed copy of formData by sampling 6 key variables.
 * Adds `_mcMode: 'fast'` so the DCF engine skips expensive post-processing.
 *
 * V2.1: Structural correlation — a shared "environment shock" factor (ε) links
 * change readiness, implementation budget, and ongoing cost. When readiness drops,
 * costs tend to rise, preventing unrealistic combos like low readiness + low budget.
 *
 * V2.1: Readiness weighting uses anchoring bias: 50% no change, 30% +1, 20% -1.
 * Rationale: organizations rarely shift readiness dramatically mid-project.
 *
 * V2.1: Implementation budget σ increased from 0.20 → 0.30 per reviewer feedback.
 * Enterprise implementations have wider cost variance than initially modeled.
 */
export function sampleDistributions(formData) {
  const sampled = { ...formData, assumptions: { ...formData.assumptions } };

  // --- Shared environment shock (ε): correlates readiness ↔ costs ---
  // ε ~ Normal(0, 1); positive ε = favorable environment (higher readiness, lower costs)
  const environmentShock = gaussianRandom(0, 1);

  // 1. Automation potential: Normal(μ=input, σ=0.08), clamped [0.10, 0.95]
  //    Independent — driven by technology, not organizational environment
  const baseAutomation = sampled.assumptions.automationPotential || 0.50;
  sampled.assumptions = {
    ...sampled.assumptions,
    automationPotential: clamp(gaussianRandom(baseAutomation, 0.08), 0.10, 0.95),
  };

  // 2. Change readiness: Anchored perturbation with environment correlation
  //    Base weighting: 50% no change, 30% +1, 20% -1 (anchoring bias)
  //    Environment shock shifts probabilities: positive ε favors upward shift
  const baseReadiness = sampled.changeReadiness || 3;
  const readinessRoll = Math.random();
  const shockBias = environmentShock * 0.10; // ε shifts thresholds by up to ~10%
  let readinessShift;
  if (readinessRoll < (0.20 - shockBias)) {
    readinessShift = -1; // worse than expected
  } else if (readinessRoll < (0.50 - shockBias)) {
    readinessShift = 0;  // as expected
  } else {
    readinessShift = 1;  // better than expected
  }
  sampled.changeReadiness = clamp(baseReadiness + readinessShift, 1, 5);

  // 3. Implementation budget: Lognormal skewing right (0.7x–1.8x)
  //    σ increased to 0.30 (was 0.20) — enterprise implementations have wider variance
  //    Environment shock: negative ε (low readiness env) pushes costs up
  const baseBudget = sampled.implementationBudget;
  if (baseBudget && baseBudget > 0) {
    const costShock = -environmentShock * 0.08; // negative ε → positive cost shock
    const multiplier = clamp(lognormalRandom(costShock, 0.30), 0.70, 1.80);
    sampled.implementationBudget = Math.round(baseBudget * multiplier);
  }

  // 4. Ongoing annual cost: Lognormal (0.5x–2.0x), correlated with environment
  //    Negative ε (poor environment) → higher ongoing costs (more support needed)
  const baseCost = sampled.ongoingAnnualCost;
  if (baseCost && baseCost > 0) {
    const costShock = -environmentShock * 0.06;
    const multiplier = clamp(lognormalRandom(costShock, 0.35), 0.50, 2.00);
    sampled.ongoingAnnualCost = Math.round(baseCost * multiplier);
  }

  // 5. Cash realization %: Triangular(0.20, input, 0.80)
  //    Independent — driven by management decision, not environment
  const baseRealization = sampled.cashRealizationPct || 0.40;
  sampled.cashRealizationPct = clamp(
    triangularRandom(0.20, baseRealization, 0.80),
    0.20, 0.80
  );

  // 6. Error rate: Normal(μ=input, σ=input×0.25), clamped [0.01, 0.50]
  //    Independent — driven by process complexity
  const baseError = sampled.errorRate || 0.10;
  sampled.errorRate = clamp(gaussianRandom(baseError, baseError * 0.25), 0.01, 0.50);

  sampled._mcMode = 'fast';
  return sampled;
}

/**
 * Run Monte Carlo simulation: N iterations of the DCF engine with sampled inputs.
 * Returns distribution summary for NPV, IRR, Payback, and ROIC.
 *
 * @param {object} formData - user form inputs
 * @param {number} iterations - number of simulation runs (default 500)
 * @returns {object} Monte Carlo results
 */
export function runMonteCarlo(formData, iterations = 500) {
  const npvArr = [];
  const irrArr = [];
  const paybackArr = [];
  const roicArr = [];
  const upfrontArr = [];

  for (let i = 0; i < iterations; i++) {
    const sampled = sampleDistributions(formData);
    const result = runCalculations(sampled);

    // Use base-case scenario from each iteration
    const base = result.scenarios.base;
    npvArr.push(base.npv);
    if (isFinite(base.irr)) irrArr.push(base.irr);
    paybackArr.push(base.paybackMonths);
    roicArr.push(base.roic);
    upfrontArr.push(result.upfrontInvestment || 0);
  }

  // Sort arrays for percentile calculations
  npvArr.sort((a, b) => a - b);
  irrArr.sort((a, b) => a - b);
  paybackArr.sort((a, b) => a - b);
  roicArr.sort((a, b) => a - b);

  const positiveCount = npvArr.filter(v => v > 0).length;

  // VaR / tail risk metrics
  const p5Npv = percentile(npvArr, 5);
  upfrontArr.sort((a, b) => a - b);
  const medianUpfront = percentile(upfrontArr, 50);
  // Probability of losing >50% of invested capital: NPV < -0.5 * median upfront investment
  const capitalLossThreshold = -0.50 * medianUpfront;
  const capitalLossCount = npvArr.filter(v => v < capitalLossThreshold).length;
  const probCapitalLoss50 = capitalLossCount / iterations;
  // Probability payback exceeds 60 months (effectively > project horizon)
  const paybackOver60Count = paybackArr.filter(v => v > 60).length;
  const probPaybackOver60 = paybackOver60Count / iterations;

  return {
    sampleSize: iterations,
    npv: {
      p5: p5Npv,
      p10: percentile(npvArr, 10),
      p25: percentile(npvArr, 25),
      p50: percentile(npvArr, 50),
      p75: percentile(npvArr, 75),
      p90: percentile(npvArr, 90),
      mean: mean(npvArr),
      stdDev: stdDev(npvArr),
    },
    irr: {
      p10: percentile(irrArr, 10),
      p25: percentile(irrArr, 25),
      p50: percentile(irrArr, 50),
      p75: percentile(irrArr, 75),
      p90: percentile(irrArr, 90),
      mean: mean(irrArr),
    },
    payback: {
      p10: percentile(paybackArr, 10),
      p25: percentile(paybackArr, 25),
      p50: percentile(paybackArr, 50),
      p75: percentile(paybackArr, 75),
      p90: percentile(paybackArr, 90),
      mean: mean(paybackArr),
    },
    roic: {
      p10: percentile(roicArr, 10),
      p25: percentile(roicArr, 25),
      p50: percentile(roicArr, 50),
      p75: percentile(roicArr, 75),
      p90: percentile(roicArr, 90),
      mean: mean(roicArr),
    },
    probabilityPositiveNPV: positiveCount / iterations,
    // VaR / tail risk metrics
    tailRisk: {
      p5Npv: p5Npv,                       // 5th percentile NPV (worst case)
      probCapitalLoss50: probCapitalLoss50, // P(NPV < -50% of P5 magnitude)
      probPaybackOver60: probPaybackOver60, // P(payback > 60 months)
    },
    npvDistribution: npvArr, // sorted array for histogram
  };
}
