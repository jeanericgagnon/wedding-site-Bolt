import { describe, it, expect } from 'vitest';
import { sanitizeImportedBlockType } from './importSanitize';

describe('sanitizeImportedBlockType', () => {
  it('keeps known block types', () => {
    expect(sanitizeImportedBlockType('title')).toBe('title');
    expect(sanitizeImportedBlockType('faqItem')).toBe('faqItem');
  });

  it('falls back unknown block types to text', () => {
    expect(sanitizeImportedBlockType('not-real')).toBe('text');
    expect(sanitizeImportedBlockType(null)).toBe('text');
  });
});
