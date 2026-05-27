import { ThemePreset } from '../../lib/themePresets';

export interface ThemePanelSummary {
  title: string;
  detail: string;
  actionLabel: string;
  actionDetail: string;
  filteredCount: number;
}

export function getThemePanelSummary({
  view,
  selectedPack,
  filteredCount,
  activePreset,
  customApplied,
}: {
  view: 'presets' | 'custom';
  selectedPack: string;
  filteredCount: number;
  activePreset: ThemePreset;
  customApplied: boolean;
}): ThemePanelSummary {
  const filteredLabel = selectedPack === 'all' ? 'all theme packs' : `${selectedPack.replace(/-/g, ' ')} pack`;

  if (view === 'custom') {
    return {
      title: customApplied ? 'Custom palette in progress' : 'Tune the palette with care',
      detail: customApplied
        ? 'You are shaping a one-off color system on top of the current preset.'
        : `Start from ${activePreset.name} and adjust only the colors that need to move.`,
      actionLabel: customApplied ? 'Best next move' : 'Decision rule',
      actionDetail: customApplied
        ? 'Lock in the core brand colors first, then refine surfaces and text only if contrast or mood still feels off.'
        : 'Use custom only when the preset is directionally right but one or two colors still fight the brand.',
      filteredCount,
    };
  }

  return {
    title: customApplied ? 'Custom palette is leading' : `${activePreset.name} is your current direction`,
    detail: customApplied
      ? 'A custom palette is active, so presets are best used as reset points or mood pivots.'
      : `${activePreset.description}. Use presets to pick the overall mood before you fine-tune anything.`,
    actionLabel: filteredCount === 0 ? 'Watchout' : 'Best next move',
    actionDetail: filteredCount === 0
      ? 'This pack has no presets. Switch back to all packs or try a neighboring mood family before going custom.'
      : selectedPack === 'all'
        ? 'Choose the preset that gets the emotional temperature right, then leave the details alone unless something clearly clashes.'
        : `Compare just the ${filteredLabel} options first so you do not churn across unrelated moods.`,
    filteredCount,
  };
}
