import { describe, expect, it } from 'vitest';

import { getBuilderInspectorTabGuidance } from './builderInspectorTabGuidance';

describe('getBuilderInspectorTabGuidance', () => {
  it('pushes hidden sections back to layout/visibility decisions first', () => {
    const guidance = getBuilderInspectorTabGuidance({
      sectionLabel: 'Hero',
      hasMeaningfulContent: true,
      hasStyleOverrides: false,
      hasLayoutCustomization: true,
      hasBindings: false,
      dataConfigured: true,
      enabled: false,
      recommendedTab: 'layout',
    });

    expect(guidance.find((item) => item.id === 'layout')?.status).toBe('recommended');
    expect(guidance.find((item) => item.id === 'content')?.status).toBe('blocked');
    expect(guidance.find((item) => item.id === 'style')?.status).toBe('blocked');
  });

  it('pushes content before style when the section still lacks real copy', () => {
    const guidance = getBuilderInspectorTabGuidance({
      sectionLabel: 'Story',
      hasMeaningfulContent: false,
      hasStyleOverrides: false,
      hasLayoutCustomization: false,
      hasBindings: false,
      dataConfigured: true,
      enabled: true,
      recommendedTab: 'content',
    });

    expect(guidance.find((item) => item.id === 'content')?.status).toBe('recommended');
    expect(guidance.find((item) => item.id === 'layout')?.status).toBe('pending');
    expect(guidance.find((item) => item.id === 'style')?.status).toBe('pending');
  });

  it('treats disconnected structured data as the real next lane', () => {
    const guidance = getBuilderInspectorTabGuidance({
      sectionLabel: 'Schedule',
      hasMeaningfulContent: true,
      hasStyleOverrides: false,
      hasLayoutCustomization: true,
      hasBindings: true,
      dataConfigured: false,
      enabled: true,
      recommendedTab: 'data',
    });

    expect(guidance.find((item) => item.id === 'data')?.status).toBe('recommended');
    expect(guidance.find((item) => item.id === 'style')?.status).toBe('pending');
  });

  it('treats style as optional when the section is already structurally healthy', () => {
    const guidance = getBuilderInspectorTabGuidance({
      sectionLabel: 'FAQ',
      hasMeaningfulContent: true,
      hasStyleOverrides: false,
      hasLayoutCustomization: true,
      hasBindings: false,
      dataConfigured: true,
      enabled: true,
      recommendedTab: 'style',
    });

    expect(guidance.find((item) => item.id === 'content')?.status).toBe('done');
    expect(guidance.find((item) => item.id === 'layout')?.status).toBe('done');
    expect(guidance.find((item) => item.id === 'style')?.status).toBe('recommended');
  });
});
