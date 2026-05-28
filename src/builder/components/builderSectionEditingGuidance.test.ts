import { describe, expect, it } from 'vitest';
import { getBuilderSectionEditingGuidance } from './builderSectionEditingGuidance';

describe('getBuilderSectionEditingGuidance', () => {
  it('pushes content-first guidance when the section is still empty', () => {
    const guidance = getBuilderSectionEditingGuidance({
      sectionLabel: 'Hero',
      hasMeaningfulContent: false,
      hasStyleOverrides: false,
      hasLayoutCustomization: false,
      hasBindings: false,
      dataConfigured: true,
      enabled: true,
    });

    expect(guidance.focusTitle).toContain('Hero');
    expect(guidance.bestNextMove).toContain('key text');
    expect(guidance.nextActionTab).toBe('content');
    expect(guidance.watchout).toContain('placeholder');
  });

  it('pushes layout guidance once content exists but structure is still generic', () => {
    const guidance = getBuilderSectionEditingGuidance({
      sectionLabel: 'Story',
      hasMeaningfulContent: true,
      hasStyleOverrides: false,
      hasLayoutCustomization: false,
      hasBindings: false,
      dataConfigured: true,
      enabled: true,
    });

    expect(guidance.focusTitle).toContain('right structure');
    expect(guidance.nextActionTab).toBe('layout');
    expect(guidance.decisionRule).toContain('least compensating copy');
  });

  it('pushes data binding work before style polish when structured data is missing', () => {
    const guidance = getBuilderSectionEditingGuidance({
      sectionLabel: 'Schedule',
      hasMeaningfulContent: true,
      hasStyleOverrides: false,
      hasLayoutCustomization: true,
      hasBindings: true,
      dataConfigured: false,
      enabled: true,
    });

    expect(guidance.focusTitle).toContain('connected data');
    expect(guidance.nextActionTab).toBe('data');
    expect(guidance.watchout).toContain('false confidence');
    expect(guidance.currentStep).toContain('real data');
  });

  it('reframes hidden sections around a show-or-remove decision', () => {
    const guidance = getBuilderSectionEditingGuidance({
      sectionLabel: 'FAQ',
      hasMeaningfulContent: true,
      hasStyleOverrides: true,
      hasLayoutCustomization: true,
      hasBindings: true,
      dataConfigured: true,
      enabled: false,
    });

    expect(guidance.focusTitle).toContain('hidden');
    expect(guidance.bestNextMove).toContain('return');
    expect(guidance.nextActionTab).toBe('layout');
    expect(guidance.thenStep).toContain('remove');
    expect(guidance.focusDetail).toContain('visible page');
  });
});
