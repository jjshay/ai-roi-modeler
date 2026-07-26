import { describe, expect, it } from 'vitest';
import {
  getValueBreakdownCategories,
  getValueBreakdownTotals,
} from './ValueBreakdown';
import { buildSavingsBuckets } from './LiveCalculation';
import { getExecutiveValueCategories } from '../../pptx/generateExecutiveReport';
import { getReportValueBreakdownCategories } from '../../pdf/generateReport';

const valueBreakdown = {
  headcount: { gross: 100, riskAdjusted: 80 },
  efficiency: { gross: 50, riskAdjusted: 40 },
  errorReduction: { gross: 25, riskAdjusted: 20 },
  toolReplacement: { gross: 10, riskAdjusted: 8 },
  contractExit: { gross: 30, riskAdjusted: 24 },
  caseDirectSavings: {
    gross: 200,
    riskAdjusted: 160,
    label: 'Verified customer support cost avoidance',
  },
  // Legacy scenarios may still carry this. It must never flow into output.
  archetypeRevenue: { gross: 9_999, riskAdjusted: 8_888 },
};

describe('cash-only result value categories', () => {
  it('uses verified support cost avoidance and excludes legacy revenue', () => {
    const categories = getValueBreakdownCategories(valueBreakdown);
    const labels = categories.map((category) => category.label);
    const keys = categories.map((category) => category.key);

    expect(keys).toContain('caseDirectSavings');
    expect(keys).not.toContain('archetypeRevenue');
    expect(labels).toContain('Verified customer support cost avoidance');
    expect(labels).not.toContain('Revenue Impact');
    expect(getValueBreakdownTotals(valueBreakdown)).toEqual({
      gross: 415,
      riskAdjusted: 332,
    });
  });

  it('makes the same verified cost-avoidance category available to the waterfall and exports', () => {
    const waterfall = buildSavingsBuckets(valueBreakdown, 0.5);
    const executive = getExecutiveValueCategories(valueBreakdown);
    const report = getReportValueBreakdownCategories(valueBreakdown);

    expect(waterfall).toContainEqual(expect.objectContaining({
      label: 'Verified customer support cost avoidance',
      value: 80,
    }));
    expect(executive).toContainEqual(expect.objectContaining({
      name: 'Verified customer support cost avoidance',
      gross: 200,
      riskAdjusted: 160,
    }));
    expect(report).toContainEqual(expect.objectContaining({
      label: 'Verified customer support cost avoidance',
      gross: 200,
      riskAdjusted: 160,
    }));

    for (const labels of [
      waterfall.map((bucket) => bucket.label),
      executive.map((category) => category.name),
      report.map((category) => category.label),
    ]) {
      expect(labels.join(' ')).not.toMatch(/revenue/i);
    }
  });

  it('does not allow an unsafe legacy label to reintroduce a revenue claim', () => {
    const unsafe = {
      caseDirectSavings: {
        gross: 1,
        riskAdjusted: 1,
        label: 'Revenue Impact',
      },
    };

    expect(getValueBreakdownCategories(unsafe)).toContainEqual(expect.objectContaining({
      key: 'caseDirectSavings',
      label: 'Verified customer support cost avoidance',
    }));
    expect(getExecutiveValueCategories(unsafe)).toContainEqual(expect.objectContaining({
      key: 'caseDirectSavings',
      name: 'Verified customer support cost avoidance',
    }));
    expect(getReportValueBreakdownCategories(unsafe)).toContainEqual(expect.objectContaining({
      label: 'Verified customer support cost avoidance',
    }));
  });
});
