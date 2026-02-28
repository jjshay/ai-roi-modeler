import { describe, it, expect } from 'vitest';
import {
  ARCHETYPE_INPUT_SCHEMAS,
  ARCHETYPE_INPUT_MAP,
  CLASSIFICATION_PROFILES,
  CLASSIFICATION_QUESTIONS,
  classifyArchetype,
  mapArchetypeInputs,
  getArchetypeInputDefaults,
  validateArchetypeInputs,
} from '../archetypeInputs';
import { PROJECT_ARCHETYPES } from '../archetypes';

// ---------------------------------------------------------------------------
// Schema Validation
// ---------------------------------------------------------------------------
describe('ARCHETYPE_INPUT_SCHEMAS', () => {
  it('has exactly 12 archetype schemas', () => {
    expect(ARCHETYPE_INPUT_SCHEMAS).toHaveLength(12);
  });

  it('every schema has a matching entry in PROJECT_ARCHETYPES', () => {
    const archetypeIds = PROJECT_ARCHETYPES.map(a => a.id);
    for (const schema of ARCHETYPE_INPUT_SCHEMAS) {
      expect(archetypeIds).toContain(schema.id);
    }
  });

  it('every schema has 8 inputs', () => {
    for (const schema of ARCHETYPE_INPUT_SCHEMAS) {
      expect(schema.inputs).toHaveLength(8);
    }
  });

  it('every input has required fields', () => {
    for (const schema of ARCHETYPE_INPUT_SCHEMAS) {
      for (const input of schema.inputs) {
        expect(input.key).toBeTruthy();
        expect(input.label).toBeTruthy();
        expect(input.type).toBeTruthy();
        expect(typeof input.default).toBe('number');
        expect(typeof input.min).toBe('number');
        expect(typeof input.max).toBe('number');
        expect(input.min).toBeLessThanOrEqual(input.max);
        expect(input.default).toBeGreaterThanOrEqual(input.min);
        expect(input.default).toBeLessThanOrEqual(input.max);
      }
    }
  });

  it('every schema has at least 2 computed mappings', () => {
    for (const schema of ARCHETYPE_INPUT_SCHEMAS) {
      expect(schema.computedMappings.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('every computed mapping has mapsTo, jsMap, and excelFormula', () => {
    for (const schema of ARCHETYPE_INPUT_SCHEMAS) {
      for (const mapping of schema.computedMappings) {
        expect(mapping.mapsTo).toBeTruthy();
        expect(typeof mapping.jsMap).toBe('function');
        expect(typeof mapping.excelFormula).toBe('string');
      }
    }
  });

  it('input keys are unique within each archetype', () => {
    for (const schema of ARCHETYPE_INPUT_SCHEMAS) {
      const keys = schema.inputs.map(i => i.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

// ---------------------------------------------------------------------------
// ARCHETYPE_INPUT_MAP
// ---------------------------------------------------------------------------
describe('ARCHETYPE_INPUT_MAP', () => {
  it('has all 12 archetypes indexed by id', () => {
    expect(Object.keys(ARCHETYPE_INPUT_MAP)).toHaveLength(12);
    for (const schema of ARCHETYPE_INPUT_SCHEMAS) {
      expect(ARCHETYPE_INPUT_MAP[schema.id]).toBe(schema);
    }
  });
});

// ---------------------------------------------------------------------------
// getArchetypeInputDefaults
// ---------------------------------------------------------------------------
describe('getArchetypeInputDefaults', () => {
  it('returns defaults for a valid archetype', () => {
    const d = getArchetypeInputDefaults('internal-process-automation');
    expect(d.processVolume).toBe(5000);
    expect(d.handlingTimeMin).toBe(15);
    expect(d.errorRate).toBe(0.08);
  });

  it('returns empty object for unknown archetype', () => {
    expect(getArchetypeInputDefaults('unknown')).toEqual({});
  });

  it('returns 8 keys per archetype', () => {
    for (const schema of ARCHETYPE_INPUT_SCHEMAS) {
      const d = getArchetypeInputDefaults(schema.id);
      expect(Object.keys(d)).toHaveLength(8);
    }
  });
});

// ---------------------------------------------------------------------------
// mapArchetypeInputs
// ---------------------------------------------------------------------------
describe('mapArchetypeInputs', () => {
  it('maps internal-process-automation defaults to overrides', () => {
    const defaults = getArchetypeInputDefaults('internal-process-automation');
    const overrides = mapArchetypeInputs('internal-process-automation', defaults);
    expect(overrides.automationPotential).toBeGreaterThan(0);
    expect(overrides.automationPotential).toBeLessThanOrEqual(0.85);
    expect(overrides.errorRate).toBe(0.08);
    expect(overrides.hoursPerWeek).toBeGreaterThan(0);
  });

  it('maps customer-facing-ai to include revenueImpact', () => {
    const defaults = getArchetypeInputDefaults('customer-facing-ai');
    const overrides = mapArchetypeInputs('customer-facing-ai', defaults);
    expect(overrides.revenueImpact).toBeGreaterThan(0);
    expect(overrides.automationPotential).toBeGreaterThan(0);
  });

  it('maps risk-compliance-ai to include riskReduction', () => {
    const defaults = getArchetypeInputDefaults('risk-compliance-ai');
    const overrides = mapArchetypeInputs('risk-compliance-ai', defaults);
    expect(overrides.riskReduction).toBeGreaterThan(0);
  });

  it('maps it-operations-aiops to include riskReduction', () => {
    const defaults = getArchetypeInputDefaults('it-operations-aiops');
    const overrides = mapArchetypeInputs('it-operations-aiops', defaults);
    expect(overrides.riskReduction).toBeGreaterThan(0);
    expect(overrides.errorRate).toBeGreaterThan(0);
  });

  it('returns empty object for unknown archetype', () => {
    expect(mapArchetypeInputs('unknown', {})).toEqual({});
  });

  it('produces sensible automation potential for all archetypes', () => {
    for (const schema of ARCHETYPE_INPUT_SCHEMAS) {
      const defaults = getArchetypeInputDefaults(schema.id);
      const overrides = mapArchetypeInputs(schema.id, defaults);
      if (overrides.automationPotential !== undefined) {
        expect(overrides.automationPotential).toBeGreaterThanOrEqual(0);
        expect(overrides.automationPotential).toBeLessThanOrEqual(1);
      }
    }
  });

  it('hoursPerWeek is always positive when mapped', () => {
    for (const schema of ARCHETYPE_INPUT_SCHEMAS) {
      const defaults = getArchetypeInputDefaults(schema.id);
      const overrides = mapArchetypeInputs(schema.id, defaults);
      if (overrides.hoursPerWeek !== undefined) {
        expect(overrides.hoursPerWeek).toBeGreaterThan(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// validateArchetypeInputs
// ---------------------------------------------------------------------------
describe('validateArchetypeInputs', () => {
  it('returns no errors for default values', () => {
    for (const schema of ARCHETYPE_INPUT_SCHEMAS) {
      const defaults = getArchetypeInputDefaults(schema.id);
      const errors = validateArchetypeInputs(schema.id, defaults);
      expect(errors).toHaveLength(0);
    }
  });

  it('catches values below min', () => {
    const errors = validateArchetypeInputs('internal-process-automation', { processVolume: -100 });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].key).toBe('processVolume');
  });

  it('catches values above max', () => {
    const errors = validateArchetypeInputs('internal-process-automation', { processVolume: 9999999 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('catches non-numeric values', () => {
    const errors = validateArchetypeInputs('internal-process-automation', { processVolume: 'abc' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('must be a number');
  });

  it('returns schema error for unknown archetype', () => {
    const errors = validateArchetypeInputs('nonexistent', {});
    expect(errors[0].key).toBe('_schema');
  });

  it('allows missing values (uses defaults)', () => {
    const errors = validateArchetypeInputs('internal-process-automation', {});
    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------
describe('Classification', () => {
  it('has profiles for all 12 archetypes', () => {
    expect(Object.keys(CLASSIFICATION_PROFILES)).toHaveLength(12);
    for (const schema of ARCHETYPE_INPUT_SCHEMAS) {
      expect(CLASSIFICATION_PROFILES[schema.id]).toBeDefined();
    }
  });

  it('each profile has 6 scores matching the 6 questions', () => {
    expect(CLASSIFICATION_QUESTIONS).toHaveLength(6);
    for (const profile of Object.values(CLASSIFICATION_PROFILES)) {
      expect(profile).toHaveLength(6);
      for (const score of profile) {
        expect(score).toBeGreaterThanOrEqual(1);
        expect(score).toBeLessThanOrEqual(5);
      }
    }
  });

  it('classifyArchetype returns top 3 ranked results', () => {
    const ranked = classifyArchetype({ primaryGoal: 3, customerFacing: 5, dataComplexity: 3, processVolume: 4, regulatoryBurden: 2, technicalTeam: 3 });
    expect(ranked).toHaveLength(3);
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
    expect(ranked[1].score).toBeGreaterThanOrEqual(ranked[2].score);
    expect(ranked[0].maxScore).toBe(30);
  });

  it('perfect match for IPA profile returns IPA first', () => {
    const ranked = classifyArchetype({ primaryGoal: 1, customerFacing: 1, dataComplexity: 2, processVolume: 5, regulatoryBurden: 2, technicalTeam: 2 });
    expect(ranked[0].id).toBe('internal-process-automation');
    expect(ranked[0].score).toBe(30);
  });

  it('perfect match for customer-facing profile returns customer-facing first', () => {
    const ranked = classifyArchetype({ primaryGoal: 3, customerFacing: 5, dataComplexity: 3, processVolume: 4, regulatoryBurden: 2, technicalTeam: 3 });
    expect(ranked[0].id).toBe('customer-facing-ai');
  });

  it('perfect match for risk-compliance profile returns risk-compliance first', () => {
    const ranked = classifyArchetype({ primaryGoal: 4, customerFacing: 1, dataComplexity: 3, processVolume: 4, regulatoryBurden: 5, technicalTeam: 3 });
    expect(ranked[0].id).toBe('risk-compliance-ai');
  });

  it('handles missing answers gracefully (defaults to 3)', () => {
    const ranked = classifyArchetype({});
    expect(ranked).toHaveLength(3);
    for (const r of ranked) {
      expect(r.score).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Backward Compatibility: calculations without archetypeInputs
// ---------------------------------------------------------------------------
describe('Backward compatibility', () => {
  it('runCalculations works without archetypeInputs', async () => {
    const { runCalculations } = await import('../calculations');
    const result = runCalculations({
      teamSize: 10,
      avgSalary: 100000,
      hoursPerWeek: 20,
      errorRate: 0.10,
      industry: 'Technology / Software',
      processType: 'Document Processing',
    });
    expect(result).toBeDefined();
    expect(result.scenarios.base).toBeDefined();
    expect(result.scenarios.base.roic).toBeDefined();
  });
});
