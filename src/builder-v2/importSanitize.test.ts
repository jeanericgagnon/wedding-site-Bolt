import { describe, it, expect } from 'vitest';
import { sanitizeImportedBlockType, sanitizeImportedSectionType } from './importSanitize';

describe('sanitizeImportedBlockType', () => {
  it('keeps known block types', () => {
    expect(sanitizeImportedBlockType('title')).toBe('title');
    expect(sanitizeImportedBlockType('faqItem')).toBe('faqItem');
  });

  it('falls back unknown block types to text', () => {
    expect(sanitizeImportedBlockType('not-real')).toBe('text');
    expect(sanitizeImportedBlockType(null)).toBe('text');
  });

  it('normalizes drifted block type aliases onto supported block types', () => {
    expect(sanitizeImportedBlockType('FAQ')).toBe('faqItem');
    expect(sanitizeImportedBlockType('fund-highlight')).toBe('fundHighlight');
    expect(sanitizeImportedBlockType('hotel')).toBe('hotelCard');
    expect(sanitizeImportedBlockType('question-answer')).toBe('qna');
  });
});

describe('sanitizeImportedSectionType', () => {
  it('normalizes known drifted section aliases', () => {
    expect(sanitizeImportedSectionType('RegistrySection')).toBe('registry');
    expect(sanitizeImportedSectionType('weddingParty')).toBe('wedding-party');
    expect(sanitizeImportedSectionType('dress_code')).toBe('dress-code');
  });

  it('falls back to kebab-case for unknown section shapes', () => {
    expect(sanitizeImportedSectionType('Custom Feature')).toBe('custom-feature');
    expect(sanitizeImportedSectionType(null)).toBe('custom');
  });
});
