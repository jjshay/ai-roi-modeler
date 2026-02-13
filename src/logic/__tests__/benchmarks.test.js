import { describe, it, expect } from 'vitest';
import {
  getAutomationPotential,
  getIndustrySuccessRate,
  getRealisticTimeline,
  ADOPTION_MULTIPLIERS,
  SEPARATION_COST_MULTIPLIER,
  TOOL_REPLACEMENT_RATE,
  COMPETITIVE_PENALTY,
  COMPLIANCE_RISK_ESCALATION,
  REVENUE_UPLIFT,
  REVENUE_ELIGIBLE_PROCESSES,
  FEDERAL_RD_CREDIT_RATE,
  STATE_RD_CREDIT_RATES,
  RD_QUALIFICATION_RATE,
  VALUE_PHASES,
  AI_SCALE_FACTORS,
  INDUSTRY_PEER_BENCHMARKS,
  BENCHMARK_SOURCES,
} from '../benchmarks';

describe('getAutomationPotential', () => {
  it('returns correct value for known industry/process', () => {
    expect(getAutomationPotential('Technology / Software', 'Workflow Automation')).toBe(0.65);
    expect(getAutomationPotential('Government / Public Sector', 'Content Creation')).toBe(0.20);
  });

  it('falls back to Other industry', () => {
    const val = getAutomationPotential('Unknown Industry', 'Document Processing');
    expect(val).toBe(0.45); // Other → Document Processing
  });

  it('falls back to Other process type', () => {
    const val = getAutomationPotential('Technology / Software', 'Unknown Process');
    expect(val).toBe(0.40); // Tech → Other
  });

  it('all values are between 0 and 1', () => {
    const industries = ['Technology / Software', 'Healthcare / Life Sciences', 'Government / Public Sector'];
    const processes = ['Document Processing', 'Customer Communication', 'Workflow Automation'];
    for (const ind of industries) {
      for (const proc of processes) {
        const val = getAutomationPotential(ind, proc);
        expect(val).toBeGreaterThan(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('getIndustrySuccessRate', () => {
  it('Technology is highest', () => {
    expect(getIndustrySuccessRate('Technology / Software')).toBe(0.72);
  });

  it('Government is lowest', () => {
    expect(getIndustrySuccessRate('Government / Public Sector')).toBe(0.45);
  });

  it('unknown industry falls back to Other', () => {
    expect(getIndustrySuccessRate('Fake Industry')).toBe(0.55);
  });
});

describe('Separation Cost Multiplier', () => {
  it('covers all 5 company sizes', () => {
    expect(Object.keys(SEPARATION_COST_MULTIPLIER)).toHaveLength(5);
  });

  it('values range from 0.70 to 1.50', () => {
    const values = Object.values(SEPARATION_COST_MULTIPLIER);
    expect(Math.min(...values)).toBe(0.70);
    expect(Math.max(...values)).toBe(1.50);
  });

  it('larger companies have higher multipliers', () => {
    expect(SEPARATION_COST_MULTIPLIER['Startup (1-50)']).toBeLessThan(
      SEPARATION_COST_MULTIPLIER['Large Enterprise (50,000+)']
    );
  });
});

describe('Tool Replacement Rate', () => {
  it('covers all process types', () => {
    expect(Object.keys(TOOL_REPLACEMENT_RATE).length).toBeGreaterThanOrEqual(8);
  });

  it('Workflow Automation has highest rate (0.65)', () => {
    expect(TOOL_REPLACEMENT_RATE['Workflow Automation']).toBe(0.65);
  });

  it('all values between 0 and 1', () => {
    Object.values(TOOL_REPLACEMENT_RATE).forEach((v) => {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    });
  });
});

describe('Opportunity Cost constants', () => {
  it('competitive penalty covers all industries', () => {
    expect(Object.keys(COMPETITIVE_PENALTY).length).toBeGreaterThanOrEqual(10);
  });

  it('compliance escalation covers all industries', () => {
    expect(Object.keys(COMPLIANCE_RISK_ESCALATION).length).toBeGreaterThanOrEqual(10);
  });
});

describe('Revenue Enablement constants', () => {
  it('REVENUE_ELIGIBLE_PROCESSES has 4 types', () => {
    expect(REVENUE_ELIGIBLE_PROCESSES).toHaveLength(4);
    expect(REVENUE_ELIGIBLE_PROCESSES).toContain('Customer Communication');
    expect(REVENUE_ELIGIBLE_PROCESSES).toContain('Content Creation');
  });

  it('each industry has 3 revenue uplift types', () => {
    Object.values(REVENUE_UPLIFT).forEach((data) => {
      expect(data).toHaveProperty('timeToMarket');
      expect(data).toHaveProperty('customerExperience');
      expect(data).toHaveProperty('newCapability');
    });
  });
});

describe('R&D Tax Credit constants', () => {
  it('federal rate is 6.5%', () => {
    expect(FEDERAL_RD_CREDIT_RATE).toBe(0.065);
  });

  it('qualification rate is 65%', () => {
    expect(RD_QUALIFICATION_RATE).toBe(0.65);
  });

  it('California has highest state rate', () => {
    const max = Math.max(...Object.values(STATE_RD_CREDIT_RATES));
    expect(STATE_RD_CREDIT_RATES['California']).toBe(max);
  });

  it('Other / Not Sure has 0% rate', () => {
    expect(STATE_RD_CREDIT_RATES['Other / Not Sure']).toBe(0);
  });
});

describe('Value Phases', () => {
  it('has 4 phases', () => {
    expect(VALUE_PHASES).toHaveLength(4);
  });

  it('realization increases across phases', () => {
    for (let i = 1; i < VALUE_PHASES.length; i++) {
      expect(VALUE_PHASES[i].realizationPct).toBeGreaterThanOrEqual(
        VALUE_PHASES[i - 1].realizationPct
      );
    }
  });

  it('phase 4 has 100% realization', () => {
    expect(VALUE_PHASES[3].realizationPct).toBe(1.0);
  });
});

describe('AI Scale Factors', () => {
  it('2x and 3x exist', () => {
    expect(AI_SCALE_FACTORS['2x']).toBe(0.25);
    expect(AI_SCALE_FACTORS['3x']).toBe(0.40);
  });
});

describe('Industry Peer Benchmarks', () => {
  it('covers 10 industries', () => {
    expect(Object.keys(INDUSTRY_PEER_BENCHMARKS)).toHaveLength(10);
  });

  it('each industry has 5 company sizes', () => {
    Object.values(INDUSTRY_PEER_BENCHMARKS).forEach((ind) => {
      expect(Object.keys(ind)).toHaveLength(5);
    });
  });

  it('p25 < median < p75 for all entries', () => {
    Object.values(INDUSTRY_PEER_BENCHMARKS).forEach((ind) => {
      Object.values(ind).forEach((data) => {
        expect(data.p25).toBeLessThan(data.medianROIC);
        expect(data.medianROIC).toBeLessThan(data.p75);
      });
    });
  });
});

describe('Benchmark Sources', () => {
  it('has 26 sources', () => {
    expect(BENCHMARK_SOURCES).toHaveLength(26);
  });

  it('IDs are sequential 1-26', () => {
    BENCHMARK_SOURCES.forEach((src, i) => {
      expect(src.id).toBe(i + 1);
    });
  });

  it('each source has short and full description', () => {
    BENCHMARK_SOURCES.forEach((src) => {
      expect(src.short).toBeTruthy();
      expect(src.full).toBeTruthy();
    });
  });
});
