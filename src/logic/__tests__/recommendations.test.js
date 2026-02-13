import { describe, it, expect } from 'vitest';
import { getRecommendation, getRiskMitigations } from '../recommendations';

describe('getRecommendation', () => {
  const makeResults = (consNPV, baseNPV, optNPV, oppCost = null) => ({
    scenarios: {
      conservative: { npv: consNPV },
      base: { npv: baseNPV },
      optimistic: { npv: optNPV },
    },
    riskAdjustments: { sponsorAdjustment: 1.0 },
    opportunityCost: oppCost,
  });

  it('returns STRONG when conservative NPV > 0', () => {
    const rec = getRecommendation(makeResults(100000, 200000, 300000));
    expect(rec.verdict).toBe('STRONG');
    expect(rec.headline).toMatch(/strong/i);
  });

  it('returns MODERATE when base > 0 but conservative < 0', () => {
    const rec = getRecommendation(makeResults(-50000, 100000, 200000));
    expect(rec.verdict).toBe('MODERATE');
  });

  it('returns CAUTIOUS when only optimistic > 0', () => {
    const rec = getRecommendation(makeResults(-100000, -50000, 50000));
    expect(rec.verdict).toBe('CAUTIOUS');
  });

  it('returns WEAK when all NPVs negative', () => {
    const rec = getRecommendation(makeResults(-100000, -50000, -10000));
    expect(rec.verdict).toBe('WEAK');
  });

  it('each recommendation has headline, summary, steps', () => {
    const verdicts = [
      makeResults(100000, 200000, 300000),
      makeResults(-50000, 100000, 200000),
      makeResults(-100000, -50000, 50000),
      makeResults(-100000, -50000, -10000),
    ];
    verdicts.forEach((results) => {
      const rec = getRecommendation(results);
      expect(rec.headline).toBeTruthy();
      expect(rec.summary).toBeTruthy();
      expect(rec.steps).toBeInstanceOf(Array);
      expect(rec.steps.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('STRONG recommendation includes opportunity cost when available', () => {
    const oppCost = { costOfWaiting12Months: 250000 };
    const rec = getRecommendation(makeResults(100000, 200000, 300000, oppCost));
    expect(rec.summary).toContain('$250K');
  });

  it('STRONG recommendation mentions sponsor when adjustment < 1', () => {
    const results = makeResults(100000, 200000, 300000);
    results.riskAdjustments.sponsorAdjustment = 0.85;
    const rec = getRecommendation(results);
    expect(rec.steps[0]).toMatch(/sponsor/i);
  });
});

describe('getRiskMitigations', () => {
  it('returns empty for high readiness inputs', () => {
    const mits = getRiskMitigations({
      changeReadiness: 5,
      dataReadiness: 5,
      execSponsor: true,
      errorRate: 0.05,
    });
    expect(mits).toHaveLength(0);
  });

  it('flags low change readiness', () => {
    const mits = getRiskMitigations({
      changeReadiness: 1,
      dataReadiness: 5,
      execSponsor: true,
      errorRate: 0.05,
    });
    expect(mits.some((m) => m.risk.includes('change readiness'))).toBe(true);
  });

  it('flags poor data readiness', () => {
    const mits = getRiskMitigations({
      changeReadiness: 5,
      dataReadiness: 2,
      execSponsor: true,
      errorRate: 0.05,
    });
    expect(mits.some((m) => m.risk.includes('data readiness'))).toBe(true);
  });

  it('flags no executive sponsor', () => {
    const mits = getRiskMitigations({
      changeReadiness: 5,
      dataReadiness: 5,
      execSponsor: false,
      errorRate: 0.05,
    });
    expect(mits.some((m) => m.risk.includes('executive sponsor'))).toBe(true);
  });

  it('flags high error rate', () => {
    const mits = getRiskMitigations({
      changeReadiness: 5,
      dataReadiness: 5,
      execSponsor: true,
      errorRate: 0.30,
    });
    expect(mits.some((m) => m.risk.includes('error rate'))).toBe(true);
  });

  it('each mitigation has risk, impact, mitigation', () => {
    const mits = getRiskMitigations({
      changeReadiness: 1,
      dataReadiness: 1,
      execSponsor: false,
      errorRate: 0.30,
    });
    mits.forEach((m) => {
      expect(m).toHaveProperty('risk');
      expect(m).toHaveProperty('impact');
      expect(m).toHaveProperty('mitigation');
    });
  });
});
