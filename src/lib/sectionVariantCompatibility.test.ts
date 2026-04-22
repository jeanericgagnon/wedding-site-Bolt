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

  it('normalizes persisted registry alias casing before builder fallback', () => {
    expect(resolveBuilderVariant('registry', ' honeymoon ')).toBe('honeymoon');
    expect(resolveBuilderVariant('registry', 'ILLUSTRATED')).toBe('illustrated');
  });

  it('falls back to the public-first registry cards layout when persisted variants are blank or unknown', () => {
    expect(resolveBuilderVariant('registry', '   ')).toBe('cards');
    expect(resolveBuilderVariant('registry', 'not-a-real-variant')).toBe('cards');
  });

  it('tolerates missing or malformed onboarding handoff variants without crashing', () => {
    expect(resolveBuilderVariant('registry', undefined as never)).toBe('cards');
    expect(resolveBuilderVariant('registry', null as never)).toBe('cards');
    expect(resolveBuilderVariant('travel', { variant: 'localGuide' } as never)).toBe('default');
    expect(resolveBuilderVariant('faq', 42 as never)).toBe('default');
  });

  it('keeps persisted registry aliases on builder-native variants after trim and casing normalization', () => {
    expect(resolveBuilderVariant('registry', ' FEATURED ')).toBe('featured');
    expect(resolveBuilderVariant('registry', 'Tabs')).toBe('tabs');
    expect(resolveBuilderVariant('registry', 'Classic')).toBe('classic');
    expect(resolveBuilderVariant('registry', 'Experiences')).toBe('experiences');
  });

  it('preserves builder-native registry variants when alias fallback resolves with different casing', () => {
    expect(resolveBuilderVariant('registry', 'PLAYFUL')).toBe('playful');
    expect(resolveBuilderVariant('registry', 'Luxury')).toBe('luxury');
  });

  it('normalizes ai-assisted setup handoff variants across onboarding-driven sections', () => {
    expect(resolveBuilderVariant('travel', ' localguide ')).toBe('localGuide');
    expect(resolveBuilderVariant('schedule', 'DAYTABS')).toBe('dayTabs');
    expect(resolveBuilderVariant('faq', ' icongrid ')).toBe('iconGrid');
  });

  it('accepts separator-heavy ai handoff variants that describe the same builder section', () => {
    expect(resolveBuilderVariant('travel', 'local-guide')).toBe('localGuide');
    expect(resolveBuilderVariant('travel', 'local guide')).toBe('localGuide');
    expect(resolveBuilderVariant('schedule', 'day_tabs')).toBe('dayTabs');
    expect(resolveBuilderVariant('faq', 'icon-grid')).toBe('iconGrid');
    expect(resolveBuilderVariant('registry', 'fund-highlight')).toBe('fundHighlight');
  });

  it('accepts punctuation-heavy ai handoff variants from generated setup text', () => {
    expect(resolveBuilderVariant('travel', 'local/guide')).toBe('localGuide');
    expect(resolveBuilderVariant('schedule', 'day.tabs')).toBe('dayTabs');
    expect(resolveBuilderVariant('registry', 'fund.highlight')).toBe('fundHighlight');
  });

  it('accepts mixed punctuation and casing in ai handoff variants before builder fallback', () => {
    expect(resolveBuilderVariant('travel', 'LOCAL-GUIDE')).toBe('localGuide');
    expect(resolveBuilderVariant('schedule', 'Day.Tabs')).toBe('dayTabs');
    expect(resolveBuilderVariant('registry', 'FUND_HIGHLIGHT')).toBe('fundHighlight');
  });
});
