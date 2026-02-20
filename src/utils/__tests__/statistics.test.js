import { describe, it, expect } from 'vitest';
import {
  gaussianRandom,
  lognormalRandom,
  triangularRandom,
  percentile,
  mean,
  stdDev,
  clamp,
} from '../statistics';

describe('gaussianRandom', () => {
  it('returns a number', () => {
    expect(typeof gaussianRandom()).toBe('number');
  });

  it('produces values centered around the mean', () => {
    const samples = Array.from({ length: 5000 }, () => gaussianRandom(100, 10));
    const avg = samples.reduce((s, v) => s + v, 0) / samples.length;
    expect(avg).toBeGreaterThan(95);
    expect(avg).toBeLessThan(105);
  });

  it('respects stdDev (most values within 3σ)', () => {
    const samples = Array.from({ length: 5000 }, () => gaussianRandom(0, 1));
    const outsiders = samples.filter(v => Math.abs(v) > 3).length;
    expect(outsiders / 5000).toBeLessThan(0.01); // < 1% beyond 3σ
  });
});

describe('lognormalRandom', () => {
  it('always returns a positive number', () => {
    const samples = Array.from({ length: 1000 }, () => lognormalRandom(0, 0.5));
    expect(samples.every(v => v > 0)).toBe(true);
  });

  it('produces median near exp(meanOfUnderlying)', () => {
    const samples = Array.from({ length: 5000 }, () => lognormalRandom(0, 0.2));
    samples.sort((a, b) => a - b);
    const median = samples[Math.floor(samples.length / 2)];
    expect(median).toBeGreaterThan(0.8);
    expect(median).toBeLessThan(1.2);
  });
});

describe('triangularRandom', () => {
  it('stays within [low, high]', () => {
    const samples = Array.from({ length: 2000 }, () => triangularRandom(1, 5, 10));
    expect(samples.every(v => v >= 1 && v <= 10)).toBe(true);
  });

  it('has mode near mid value', () => {
    const samples = Array.from({ length: 5000 }, () => triangularRandom(0, 0.5, 1));
    // Bucket into [0-0.25], [0.25-0.5], [0.5-0.75], [0.75-1]
    const nearMode = samples.filter(v => v >= 0.35 && v <= 0.65).length;
    const atEdge = samples.filter(v => v < 0.1 || v > 0.9).length;
    expect(nearMode).toBeGreaterThan(atEdge);
  });
});

describe('percentile', () => {
  it('returns min for p=0 and max for p=100', () => {
    const arr = [10, 20, 30, 40, 50];
    expect(percentile(arr, 0)).toBe(10);
    expect(percentile(arr, 100)).toBe(50);
  });

  it('returns median for p=50 with odd-length array', () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
  });

  it('interpolates for p=50 with even-length array', () => {
    expect(percentile([1, 2, 3, 4], 50)).toBeCloseTo(2.5);
  });

  it('handles single-element array', () => {
    expect(percentile([42], 50)).toBe(42);
  });

  it('handles empty array', () => {
    expect(percentile([], 50)).toBe(0);
  });
});

describe('mean', () => {
  it('computes correct mean', () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3);
  });

  it('returns 0 for empty array', () => {
    expect(mean([])).toBe(0);
  });
});

describe('stdDev', () => {
  it('returns 0 for single-element array', () => {
    expect(stdDev([5])).toBe(0);
  });

  it('computes correct population stdDev', () => {
    // [2, 4, 4, 4, 5, 5, 7, 9] → mean=5, variance=4, stdDev=2
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 1);
  });
});

describe('clamp', () => {
  it('returns value when in range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to min', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
  });

  it('clamps to max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
});
