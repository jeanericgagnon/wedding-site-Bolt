import { ThemePreset } from '../../lib/themePresets';

interface GuidanceStep {
  title: string;
  detail: string;
}

export interface ThemePanelSummary {
  focusTitle: string;
  focusDetail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  currentStep: GuidanceStep;
  nextStep: GuidanceStep;
  thenStep: GuidanceStep;
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
      focusTitle: customApplied ? 'Custom palette in progress' : 'Tune the palette with care',
      focusDetail: customApplied
        ? 'You are shaping a one-off color system on top of the current preset.'
        : `Start from ${activePreset.name} and adjust only the colors that need to move.`,
      bestNextMove: customApplied
        ? 'Lock in the core brand colors first, then refine surfaces and text only if contrast or mood still feels off.'
        : `Duplicate ${activePreset.name} into custom only when the preset is almost right and you can name the one or two colors that still need to shift.`,
      decisionRule: customApplied
        ? 'Protect the emotional temperature first. If a color tweak changes the whole mood, back up and adjust fewer tokens.'
        : 'Use custom only when the preset is directionally right but one or two colors still fight the brand.',
      watchout: customApplied
        ? 'Do not chase perfection across every token in one pass or you will lose the clean preset foundation that made the palette work.'
        : 'Going custom too early usually creates color churn before the site has earned that level of precision.',
      currentStep: customApplied
        ? {
            title: 'Anchor the palette',
            detail: 'Confirm the primary, accent, and secondary colors still carry the brand mood cleanly.',
          }
        : {
            title: `Start from ${activePreset.name}`,
            detail: 'Use the active preset as your baseline so the custom pass stays disciplined.',
          },
      nextStep: customApplied
        ? {
            title: 'Refine surfaces and text',
            detail: 'Adjust background, surface, border, and text tokens only where readability or tone still feels off.',
          }
        : {
            title: 'Move only the tokens that fight',
            detail: 'Change the smallest set of colors needed to resolve the mismatch.',
          },
      thenStep: {
        title: 'Leave the rest alone',
        detail: 'Once contrast and mood are steady, stop tweaking and return to the page content.',
      },
      filteredCount,
    };
  }

  return {
    focusTitle: customApplied ? 'Custom palette is leading' : `${activePreset.name} is your current direction`,
    focusDetail: customApplied
      ? 'A custom palette is active, so presets are best used as reset points or mood pivots.'
      : `${activePreset.description}. Use presets to pick the overall mood before you fine-tune anything.`,
    bestNextMove: filteredCount === 0
      ? 'Switch back to all packs or a neighboring mood family before you commit to custom work.'
      : selectedPack === 'all'
        ? 'Choose the preset that gets the emotional temperature right, then leave the details alone unless something clearly clashes.'
        : `Compare just the ${filteredLabel} options first so you do not churn across unrelated moods.`,
    decisionRule: filteredCount === 0
      ? 'If a filter leaves you with no viable options, widen the search before you start editing colors by hand.'
      : customApplied
        ? 'Use presets here as reset points or strategic pivots, not as things to endlessly audition.'
        : 'Pick the broad mood first. Token-level tuning should happen only after the site already feels mostly right.',
    watchout: filteredCount === 0
      ? 'This pack has no presets. Switch back to all packs or try a neighboring mood family before going custom.'
      : 'Do not compare dozens of presets after you already have a strong direction or you will create avoidable churn.',
    currentStep: filteredCount === 0
      ? {
          title: 'Widen the pack filter',
          detail: 'Get back to a real set of options before deciding whether the current direction is wrong.',
        }
      : {
          title: customApplied ? 'Treat presets as pivots' : 'Choose the mood family',
          detail: customApplied
            ? 'Use the preset list to sanity-check the custom palette against stronger known directions.'
            : selectedPack === 'all'
              ? 'Scan for the preset that feels emotionally right before worrying about tiny differences.'
              : `Stay inside the ${filteredLabel} while you compare closely related directions.`,
        },
    nextStep: {
      title: filteredCount === 0 ? 'Pick the best reset point' : 'Commit to one direction',
      detail: filteredCount === 0
        ? 'Once you find a viable preset again, use it as the cleanest baseline for further edits.'
        : 'Apply the preset that best fits the site and stop browsing once the mood is clearly working.',
    },
    thenStep: {
      title: 'Refine only if needed',
      detail: 'Move to custom palette work only when one or two colors still fight the brand after the preset choice.',
    },
    filteredCount,
  };
}
