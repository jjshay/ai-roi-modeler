import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { runCalculations } from '../logic/calculations';
import { getPdfOngoingCostBreakdown } from './generateReport';

const source = readFileSync(
  '/Users/johnshay/ai-roi-modeler/src/pdf/generateReport.js',
  'utf-8',
);

describe('PDF export: workforce-mix deployment reporting', () => {
  it('does not expose legacy team-location or location-salary assumptions', () => {
    expect(source).not.toContain('AI_TEAM_SALARY');
    expect(source).not.toContain('teamLocation');
    expect(source).not.toContain('blendedAISalary');
    expect(source).not.toContain('aiSalary');
    expect(source).not.toContain('Compensation by Location');
  });

  it('describes implementation cost through workforce mix and delivery pace', () => {
    expect(source).toContain('Workforce Mix & Delivery Pace');
    expect(source).toContain('Weighted workforce mix and delivery pace');
    expect(source).toContain('Accelerated applies 120% staffing/cost');
  });

  it('uses the effective recurring-cost allocation when an annual plan overrides the model', () => {
    const result = runCalculations({
      industry: 'Technology / Software',
      companySize: 'Mid-Market (501-5,000)',
      projectArchetype: 'risk-compliance-legal-ai',
      processType: 'Quality & Compliance',
      directEmployeeCount: 20,
      employeeFullyBurdenedCost: 200000,
      offshoreContractorCount: 0,
      contractorFullyBurdenedCost: 0,
      hoursPerWeek: 40,
      implementationBudget: 200000,
      expectedTimeline: 6,
      ongoingAnnualCost: 50000,
      changeReadiness: 3,
      dataReadiness: 3,
      execSponsor: true,
      totalEfficiencyGainPct: 0.10,
      existingContractCount: 5,
      annualCostPerContract: 100000,
      contractNoticePeriodMonths: 6,
      aiLicensedUsers: 0,
      monthlyAiRequests: 0,
      avgInputTokensPerRequest: 0,
      avgOutputTokensPerRequest: 0,
      monthlyAgentWorkflows: 0,
      documentsPerMonth: 0,
      dataStoredGb: 0,
      connectedApplications: 0,
      archetypeInputs: {
        'risk-compliance-legal-ai': {
          reviewsPerMonth: 200,
          hoursPerReview: 4,
          pctAutomatable: 0.35,
          findingsPerYear: 15,
          fineExposure: 500000,
          preventableFindingPct: 0.20,
        },
      },
    });
    const ai = result.aiCostModel;
    const disclosure = getPdfOngoingCostBreakdown(ai);
    const disclosedTotal = disclosure.categories
      .reduce((sum, category) => sum + category.amount, 0);

    expect(ai.computedOngoingCost).toBeGreaterThan(ai.baseOngoingCost);
    expect(disclosure.source).toBe('user-entered-total');
    expect(disclosure.allocationIsEstimated).toBe(true);
    expect(disclosure.annualTotal).toBe(50000);
    expect(disclosure.modeledAnnualTotal).toBe(ai.computedOngoingCost);
    expect(disclosure.annualOverrideDelta).toBeCloseTo(
      ai.baseOngoingCost - ai.computedOngoingCost,
      8,
    );
    expect(disclosedTotal).toBeCloseTo(ai.baseOngoingCost, 8);
    expect(disclosure.categories[0].amount).toBeLessThan(ai.annualLicenseCost);
  });

  it('keeps the ongoing-cost disclosure together instead of orphaning its table', () => {
    expect(source).toContain('ongoingSectionEstimatedHeight');
    expect(source).toContain("pageBreak: 'avoid'");
    expect(source).toContain("rowPageBreak: 'avoid'");
  });
});
