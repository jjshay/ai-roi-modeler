import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';

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
});
