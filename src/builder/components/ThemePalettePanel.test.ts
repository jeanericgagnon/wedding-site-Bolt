import { describe, expect, it } from 'vitest';
import { getThemePanelSummary } from './themePanelSummary';
import { getThemePreset } from '../../lib/themePresets';

describe('getThemePanelSummary', () => {
  it('guides preset browsing around the active mood', () => {
    const summary = getThemePanelSummary({
      view: 'presets',
      selectedPack: 'all',
      filteredCount: 8,
      activePreset: getThemePreset('romantic'),
      customApplied: false,
    });

    expect(summary.focusTitle).toContain('Romantic Blush');
    expect(summary.bestNextMove).toContain('emotional temperature');
    expect(summary.decisionRule).toContain('broad mood');
    expect(summary.currentStep.title).toContain('Choose');
  });

  it('warns when a preset filter yields no options', () => {
    const summary = getThemePanelSummary({
      view: 'presets',
      selectedPack: 'coastal',
      filteredCount: 0,
      activePreset: getThemePreset('ocean'),
      customApplied: false,
    });

    expect(summary.bestNextMove).toContain('all packs');
    expect(summary.decisionRule).toContain('widen the search');
    expect(summary.watchout).toContain('no presets');
  });

  it('reframes custom mode around careful adjustments', () => {
    const summary = getThemePanelSummary({
      view: 'custom',
      selectedPack: 'all',
      filteredCount: 8,
      activePreset: getThemePreset('linen'),
      customApplied: true,
    });

    expect(summary.focusTitle).toContain('Custom palette');
    expect(summary.bestNextMove).toContain('core brand colors');
    expect(summary.watchout).toContain('preset foundation');
    expect(summary.thenStep.title).toContain('Leave');
  });
});
