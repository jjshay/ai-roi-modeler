import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { PROJECT_ARCHETYPES } from '../logic/archetypes';
import { ARCHETYPE_INPUT_MAP } from '../logic/archetypeInputs';

const repoRoot = '/Users/johnshay/ai-roi-modeler';
const readSource = (path) => readFileSync(`${repoRoot}/${path}`, 'utf-8');

const executiveSource = readSource('src/pptx/generateExecutiveReport.js');
const overviewSource = readSource('src/pptx/generatePresentation.js');
const systemReviewSource = readSource('src/pptx/generateSystemReview.js');
const pdfSource = readSource('src/pdf/generateReport.js');

describe('case-organized report outputs', () => {
  it('uses exactly the four supported AI use cases and no retired case IDs', () => {
    expect(PROJECT_ARCHETYPES.map((archetype) => archetype.id)).toEqual([
      'internal-process-automation',
      'customer-facing-ai',
      'data-analytics-automation',
      'risk-compliance-legal-ai',
    ]);
    expect(PROJECT_ARCHETYPES.map((archetype) => archetype.label)).toContain('Customer Service');
    expect(PROJECT_ARCHETYPES.map((archetype) => archetype.id)).not.toContain('knowledge-management-ai');
    expect(Object.keys(ARCHETYPE_INPUT_MAP)).toEqual(PROJECT_ARCHETYPES.map((archetype) => archetype.id));
  });

  it('keeps each user-facing output tied to the selected case input schema', () => {
    expect(executiveSource).toContain('ARCHETYPE_INPUT_MAP[formData.projectArchetype]');
    expect(overviewSource).toContain('ARCHETYPE_INPUT_MAP[archetype.id]');
    expect(systemReviewSource).toContain('ARCHETYPE_INPUT_MAP[arch.id]');
    expect(pdfSource).toContain('ARCHETYPE_INPUT_MAP[formData.projectArchetype]');
  });

  it('presents the plain-language case sequence and removes retired labels', () => {
    expect(executiveSource).toContain('2. ASSUMPTION');
    expect(executiveSource).toContain('3. CALCULATION');
    expect(executiveSource).toContain('4. FOOTNOTE');
    expect(overviewSource).toContain('2. Assumptions → 3. Calculation → 4. Footnote');
    expect(systemReviewSource).toContain('Inputs → Assumptions → Calculation → Footnote');
    expect(pdfSource).toContain('Selected AI Use Case Glossary');

    for (const source of [executiveSource, overviewSource, systemReviewSource, pdfSource]) {
      expect(source).not.toMatch(/knowledge management ai|customer[- ]facing ai|revenue impact/i);
    }
  });
});
