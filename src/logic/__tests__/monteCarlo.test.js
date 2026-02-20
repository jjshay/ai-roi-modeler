import { describe, it, expect } from 'vitest';
import { sampleDistributions, runMonteCarlo } from '../monteCarlo';
import { BASE_INPUTS, ENTERPRISE_INPUTS } from './testFixtures';

describe('sampleDistributions', () => {
  it('returns an object with _mcMode flag', () => {
    const sampled = sampleDistributions(BASE_INPUTS);
    expect(sampled._mcMode).toBe('fast');
  });

  it('perturbs automationPotential within [0.10, 0.95]', () => {
    for (let i = 0; i < 50; i++) {
      const sampled = sampleDistributions(BASE_INPUTS);
      expect(sampled.assumptions.automationPotential).toBeGreaterThanOrEqual(0.10);
      expect(sampled.assumptions.automationPotential).toBeLessThanOrEqual(0.95);
    }
  });

  it('perturbs changeReadiness within [1, 5]', () => {
    for (let i = 0; i < 50; i++) {
      const sampled = sampleDistributions(BASE_INPUTS);
      expect(sampled.changeReadiness).toBeGreaterThanOrEqual(1);
      expect(sampled.changeReadiness).toBeLessThanOrEqual(5);
    }
  });

  it('perturbs implementationBudget within [0.7x, 1.8x]', () => {
    const base = BASE_INPUTS.implementationBudget;
    for (let i = 0; i < 50; i++) {
      const sampled = sampleDistributions(BASE_INPUTS);
      expect(sampled.implementationBudget).toBeGreaterThanOrEqual(base * 0.69);
      expect(sampled.implementationBudget).toBeLessThanOrEqual(base * 1.81);
    }
  });

  it('perturbs errorRate within [0.01, 0.50]', () => {
    for (let i = 0; i < 50; i++) {
      const sampled = sampleDistributions(BASE_INPUTS);
      expect(sampled.errorRate).toBeGreaterThanOrEqual(0.01);
      expect(sampled.errorRate).toBeLessThanOrEqual(0.50);
    }
  });

  it('does not mutate original inputs', () => {
    const original = JSON.parse(JSON.stringify(BASE_INPUTS));
    sampleDistributions(BASE_INPUTS);
    expect(BASE_INPUTS.assumptions.automationPotential).toBe(original.assumptions.automationPotential);
    expect(BASE_INPUTS.changeReadiness).toBe(original.changeReadiness);
  });
});

describe('runMonteCarlo', () => {
  it('returns expected structure with 50 iterations', () => {
    const mc = runMonteCarlo(BASE_INPUTS, 50);
    expect(mc.sampleSize).toBe(50);
    expect(mc.npv).toHaveProperty('p10');
    expect(mc.npv).toHaveProperty('p50');
    expect(mc.npv).toHaveProperty('p90');
    expect(mc.npv).toHaveProperty('mean');
    expect(mc.npv).toHaveProperty('stdDev');
    expect(mc.irr).toHaveProperty('p50');
    expect(mc.payback).toHaveProperty('p50');
    expect(mc.roic).toHaveProperty('p50');
    expect(typeof mc.probabilityPositiveNPV).toBe('number');
    expect(mc.npvDistribution).toHaveLength(50);
    // V2.1: tail risk metrics
    expect(mc.tailRisk).toHaveProperty('p5Npv');
    expect(mc.tailRisk).toHaveProperty('probCapitalLoss50');
    expect(mc.tailRisk).toHaveProperty('probPaybackOver60');
    expect(mc.tailRisk.probCapitalLoss50).toBeGreaterThanOrEqual(0);
    expect(mc.tailRisk.probCapitalLoss50).toBeLessThanOrEqual(1);
    expect(mc.tailRisk.probPaybackOver60).toBeGreaterThanOrEqual(0);
    expect(mc.tailRisk.probPaybackOver60).toBeLessThanOrEqual(1);
    // V2.1: P5 in NPV
    expect(mc.npv).toHaveProperty('p5');
  });

  it('produces sorted npvDistribution', () => {
    const mc = runMonteCarlo(BASE_INPUTS, 50);
    for (let i = 1; i < mc.npvDistribution.length; i++) {
      expect(mc.npvDistribution[i]).toBeGreaterThanOrEqual(mc.npvDistribution[i - 1]);
    }
  });

  it('probabilityPositiveNPV is between 0 and 1', () => {
    const mc = runMonteCarlo(BASE_INPUTS, 50);
    expect(mc.probabilityPositiveNPV).toBeGreaterThanOrEqual(0);
    expect(mc.probabilityPositiveNPV).toBeLessThanOrEqual(1);
  });

  it('p10 <= p50 <= p90 for NPV', () => {
    const mc = runMonteCarlo(BASE_INPUTS, 100);
    expect(mc.npv.p10).toBeLessThanOrEqual(mc.npv.p50);
    expect(mc.npv.p50).toBeLessThanOrEqual(mc.npv.p90);
  });

  it('works with enterprise inputs', () => {
    const mc = runMonteCarlo(ENTERPRISE_INPUTS, 30);
    expect(mc.sampleSize).toBe(30);
    expect(typeof mc.npv.mean).toBe('number');
  });
});
