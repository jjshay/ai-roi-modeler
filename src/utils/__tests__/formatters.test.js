import { describe, it, expect } from 'vitest';
import { formatCurrency, formatPercent, formatNumber, formatCompact } from '../formatters';

describe('formatCurrency', () => {
  it('formats positive values', () => {
    expect(formatCurrency(1000)).toBe('$1,000');
    expect(formatCurrency(1234567)).toBe('$1,234,567');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('handles null/undefined/NaN', () => {
    expect(formatCurrency(null)).toBe('$0');
    expect(formatCurrency(undefined)).toBe('$0');
    expect(formatCurrency(NaN)).toBe('$0');
  });

  it('rounds to whole dollars', () => {
    expect(formatCurrency(1234.56)).toBe('$1,235');
  });
});

describe('formatPercent', () => {
  it('formats decimal as percentage', () => {
    expect(formatPercent(0.5)).toBe('50%');
    expect(formatPercent(1.0)).toBe('100%');
  });

  it('includes one decimal when needed', () => {
    expect(formatPercent(0.123)).toBe('12.3%');
  });

  it('handles null/undefined/NaN', () => {
    expect(formatPercent(null)).toBe('0%');
    expect(formatPercent(undefined)).toBe('0%');
    expect(formatPercent(NaN)).toBe('0%');
  });
});

describe('formatNumber', () => {
  it('formats with commas', () => {
    expect(formatNumber(1000000)).toBe('1,000,000');
  });

  it('handles null/NaN', () => {
    expect(formatNumber(null)).toBe('0');
    expect(formatNumber(NaN)).toBe('0');
  });
});

describe('formatCompact', () => {
  it('formats millions', () => {
    expect(formatCompact(1500000)).toBe('$1.5M');
    expect(formatCompact(2000000)).toBe('$2.0M');
  });

  it('formats thousands', () => {
    expect(formatCompact(250000)).toBe('$250K');
    expect(formatCompact(1000)).toBe('$1K');
  });

  it('formats small values as currency', () => {
    expect(formatCompact(500)).toBe('$500');
  });

  it('handles null/NaN', () => {
    expect(formatCompact(null)).toBe('$0');
    expect(formatCompact(NaN)).toBe('$0');
  });
});
