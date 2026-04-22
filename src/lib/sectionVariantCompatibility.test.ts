import { describe, expect, it } from 'vitest';
import { resolveBuilderVariant } from './sectionVariantCompatibility';

describe('resolveBuilderVariant onboarding handoff compatibility', () => {
  it('keeps shipped registry template aliases on stable builder variants', () => {
    expect(resolveBuilderVariant('registry', 'cards')).toBe('cards');
    expect(resolveBuilderVariant('registry', 'featured')).toBe('featured');
    expect(resolveBuilderVariant('registry', 'minimal')).toBe('minimal');
    expect(resolveBuilderVariant('registry', 'honeymoon')).toBe('honeymoon');
    expect(resolveBuilderVariant('registry', 'tabs')).toBe('tabs');
    expect(resolveBuilderVariant('registry', 'illustrated')).toBe('illustrated');
    expect(resolveBuilderVariant('registry', 'classic')).toBe('classic');
    expect(resolveBuilderVariant('registry', 'luxury')).toBe('luxury');
    expect(resolveBuilderVariant('registry', 'experiences')).toBe('experiences');
    expect(resolveBuilderVariant('registry', 'modern')).toBe('modern');
    expect(resolveBuilderVariant('registry', 'playful')).toBe('playful');
  });

  it('maps legacy registry content aliases to the right builder fallback variants', () => {
    expect(resolveBuilderVariant('registry', 'fundHighlight')).toBe('fundHighlight');
    expect(resolveBuilderVariant('registry', 'grid')).toBe('grid');
  });

  it('trims persisted registry variants before resolving builder compatibility', () => {
    expect(resolveBuilderVariant('registry', ' featured ')).toBe('featured');
    expect(resolveBuilderVariant('registry', ' fundHighlight ')).toBe('fundHighlight');
  });

  it('normalizes persisted registry variant casing before resolving builder compatibility', () => {
    expect(resolveBuilderVariant('registry', 'FEATURED')).toBe('featured');
    expect(resolveBuilderVariant('registry', 'FundHighlight')).toBe('fundHighlight');
    expect(resolveBuilderVariant('registry', 'Modern')).toBe('modern');
  });

  it('normalizes ai-assisted onboarding handoff aliases before builder fallback', () => {
    expect(resolveBuilderVariant('travel', ' LocalGuide ')).toBe('localGuide');
    expect(resolveBuilderVariant('travel', 'MAPPINS')).toBe('localGuide');
    expect(resolveBuilderVariant('schedule', ' agendacards ')).toBe('dayTabs');
    expect(resolveBuilderVariant('faq', ' Compact ')).toBe('accordion');
  });
});
