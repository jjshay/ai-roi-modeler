import { describe, expect, it } from 'vitest';
import {
  AI_COST_BUCKET_EXPLANATIONS,
  ANNUAL_AI_COST_QUESTION,
  getAnnualAiCostSuggestion,
  getIndustryCostMultiplier,
} from '../aiCostSuggestions';

describe('annual AI cost suggestion data model', () => {
  it('provides an explicit question, planning range, and the four executive buckets', () => {
    const suggestion = getAnnualAiCostSuggestion({
      companySize: 'Mid-Market (501-5,000)',
      industry: 'Healthcare / Life Sciences',
      licensedUsers: 25,
      monthlyRequests: 50_000,
      apiCostPer1kRequests: 12,
      buildIntegrationOneTime: 300_000,
    });

    expect(suggestion.question).toBe(ANNUAL_AI_COST_QUESTION);
    expect(suggestion.source).toBe('preliminary-planning-envelope');
    expect(suggestion.annual.lowerPlanning).toBe(suggestion.annual.typical * 0.75);
    expect(suggestion.annual.higherPlanning).toBe(suggestion.annual.typical * 1.25);
    expect(suggestion.buckets.map((bucket) => bucket.key))
      .toEqual(['build', 'access', 'consumption', 'run']);
    expect(suggestion.buckets.every((bucket) => bucket.explanation === AI_COST_BUCKET_EXPLANATIONS[bucket.key]))
      .toBe(true);
    expect(suggestion.buckets.find((bucket) => bucket.key === 'build').period).toBe('one-time');
    expect(suggestion.buckets.filter((bucket) => bucket.key !== 'build').every((bucket) => bucket.period === 'annual'))
      .toBe(true);
  });

  it('is visibly tied to company size and industry without representing a quote', () => {
    const startup = getAnnualAiCostSuggestion({
      companySize: 'Startup (1-50)',
      industry: 'Technology / Software',
      licensedUsers: 10,
    });
    const regulatedEnterprise = getAnnualAiCostSuggestion({
      companySize: 'Enterprise (5,001-50,000)',
      industry: 'Healthcare / Life Sciences',
      licensedUsers: 10,
    });

    expect(regulatedEnterprise.annual.typical).toBeGreaterThan(startup.annual.typical);
    expect(getIndustryCostMultiplier('Healthcare / Life Sciences')).toBeGreaterThan(
      getIndustryCostMultiplier('Technology / Software'),
    );
    expect(regulatedEnterprise.annual.note).toContain('not price quotes');
  });

  it('uses a live manual annual total exactly, rather than showing a conflicting bucket total', () => {
    const suggestion = getAnnualAiCostSuggestion({
      companySize: 'Mid-Market (501-5,000)',
      industry: 'Technology / Software',
      modeledBuckets: {
        source: 'user-entered-total',
        allocationIsEstimated: true,
        accessAnnual: 60_000,
        consumptionAnnual: 5_000,
        runAnnual: 35_000,
        modeledAnnualTotal: 160_000,
        annualTotal: 100_000,
        buildIntegrationOneTime: 250_000,
      },
    });

    expect(suggestion.source).toBe('live-model');
    expect(suggestion.isManualOverride).toBe(true);
    expect(suggestion.annual.lowerPlanning).toBe(120_000);
    expect(suggestion.annual.typical).toBe(160_000);
    expect(suggestion.annual.higherPlanning).toBe(200_000);
    expect(suggestion.annual.annualTotal).toBe(100_000);
    expect(suggestion.annual.annualOverrideDelta).toBe(-60_000);
    expect(suggestion.buckets.filter((bucket) => bucket.period === 'annual')
      .reduce((sum, bucket) => sum + bucket.amount, 0)).toBe(100_000);
  });
});
