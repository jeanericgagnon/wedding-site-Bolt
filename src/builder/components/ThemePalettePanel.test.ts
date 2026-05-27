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

    expect(summary.title).toContain('Romantic Blush');
    expect(summary.actionLabel).toBe('Best next move');
    expect(summary.actionDetail).toContain('emotional temperature');
  });

  it('warns when a preset filter yields no options', () => {
    const summary = getThemePanelSummary({
      view: 'presets',
      selectedPack: 'coastal',
      filteredCount: 0,
      activePreset: getThemePreset('ocean'),
      customApplied: false,
    });

    expect(summary.actionLabel).toBe('Watchout');
    expect(summary.actionDetail).toContain('no presets');
  });

  it('reframes custom mode around careful adjustments', () => {
    const summary = getThemePanelSummary({
      view: 'custom',
      selectedPack: 'all',
      filteredCount: 8,
      activePreset: getThemePreset('linen'),
      customApplied: true,
    });

    expect(summary.title).toContain('Custom palette');
    expect(summary.actionLabel).toBe('Best next move');
    expect(summary.actionDetail).toContain('core brand colors');
  });
});
