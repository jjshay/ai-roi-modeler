import { describe, expect, it } from 'vitest';
import { ARCHETYPE_INPUT_SCHEMAS } from '../../logic/archetypeInputs';
import { getStepForNumber } from './Step3_ProcessDetails';

describe('case-driver slider precision', () => {
  it('keeps every numeric default on its slider step lattice', () => {
    for (const schema of ARCHETYPE_INPUT_SCHEMAS) {
      for (const input of schema.inputs.filter(({ type }) => type === 'number')) {
        const step = getStepForNumber(input);
        const stepCount = (input.default - input.min) / step;

        expect(
          stepCount,
          `${schema.id}.${input.key} default must be reachable without browser coercion`,
        ).toBeCloseTo(Math.round(stepCount), 8);
      }
    }
  });

  it('preserves the formerly coerced finance and decimal defaults exactly', () => {
    const lookup = Object.fromEntries(
      ARCHETYPE_INPUT_SCHEMAS.flatMap((schema) => schema.inputs.map((input) => [input.key, input])),
    );

    expect(getStepForNumber(lookup.costPerResolvedTicket)).toBe(1);
    expect(getStepForNumber(lookup.hoursPerReport)).toBe(0.5);
    expect(getStepForNumber(lookup.hoursPerReview)).toBe(0.25);
    expect(getStepForNumber(lookup.findingsPerYear)).toBe(1);
  });
});
