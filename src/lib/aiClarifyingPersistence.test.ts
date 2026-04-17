import { describe, expect, it } from 'vitest';
import { createEmptyClarifyingPersistence } from './aiClarifyingPersistence';

describe('aiClarifyingPersistence', () => {
  it('creates an empty persistence envelope', () => {
    const value = createEmptyClarifyingPersistence();
    expect(value.clarifying.mode).toBe('ask');
    expect(value.clarifying.questions).toEqual([]);
    expect(value.clarifying.history).toEqual([]);
    expect(value.draftOutputs).toEqual({});
  });
});
