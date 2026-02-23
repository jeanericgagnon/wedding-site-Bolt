import { describe, it, expect } from 'vitest';
import { validateBuilderV2Document } from './validate';

describe('validateBuilderV2Document', () => {
  it('accepts a valid v2 document', () => {
    const doc = {
      version: 'v2',
      updatedAtISO: new Date().toISOString(),
      sections: [
        {
          id: 'hero-1',
          type: 'hero',
          variant: 'default',
          enabled: true,
          blocks: [{ id: 'b1', type: 'title', data: { text: 'Hi' } }],
        },
      ],
    };

    const result = validateBuilderV2Document(doc);
    expect(result.ok).toBe(true);
  });

  it('rejects an invalid block type', () => {
    const doc = {
      version: 'v2',
      updatedAtISO: new Date().toISOString(),
      sections: [
        {
          id: 'hero-1',
          type: 'hero',
          variant: 'default',
          enabled: true,
          blocks: [{ id: 'b1', type: 'not-real', data: {} }],
        },
      ],
    };

    const result = validateBuilderV2Document(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('type is invalid');
    }
  });
});
