export type BuilderWorkbenchActionKind =
  | 'select-first-section'
  | 'show-inspector'
  | 'save-draft'
  | 'switch-to-edit'
  | 'switch-to-preview';

export interface BuilderWorkbenchGuidanceInput {
  activePageTitle: string | null;
  sectionCount: number;
  selectedSectionLabel?: string | null;
  mode: 'edit' | 'preview';
  inspectorHidden: boolean;
  isDirty: boolean;
}

export interface BuilderWorkbenchGuidance {
  badge: string;
  heading: string;
  summary: string;
  focusTitle: string;
  focusDetail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  currentStep: string;
  nextStep: string;
  thenStep: string;
  checklist: Array<{ id: string; title: string; detail: string }>;
  primaryAction: { kind: BuilderWorkbenchActionKind; label: string };
}

export function getBuilderWorkbenchGuidance({
  activePageTitle,
  sectionCount,
  selectedSectionLabel,
  mode,
  inspectorHidden,
  isDirty,
}: BuilderWorkbenchGuidanceInput): BuilderWorkbenchGuidance {
  const pageLabel = activePageTitle ?? 'this page';

  if (mode === 'preview') {
    return {
      badge: 'Previewing guest flow',
      heading: 'Stay in preview long enough to judge the guest experience honestly',
      summary: `You are looking at ${pageLabel} the way a guest would. Use that perspective before reopening the editor.`,
      focusTitle: 'Check whether the page feels easy to trust on first read.',
      focusDetail: 'This is the right moment to notice missing anchors, awkward order, or mobile friction before you touch more settings.',
      bestNextMove: 'Scroll the guest view once, then return to edit mode only if you spotted something that weakens clarity.',
      decisionRule: 'Use preview to verify guest trust, not to admire the draft.',
      watchout: 'Do not bounce out of preview too quickly or you will miss the exact friction guests would notice.',
      currentStep: `Read ${pageLabel} as a guest instead of as the editor.`,
      nextStep: 'Identify one thing that truly weakens trust or flow.',
      thenStep: 'Return to edit mode and fix only that highest-value issue first.',
      checklist: [
        {
          id: 'guest-first-read',
          title: 'Read the first screen like a guest',
          detail: 'Make sure the page purpose, names, timing, or call to action are obvious without editing in your head.',
        },
        {
          id: 'mobile-friction',
          title: 'Check for mobile friction',
          detail: 'Look for spacing, ordering, or clarity issues that would matter more on a phone than in the editor.',
        },
        {
          id: 'return-with-purpose',
          title: 'Return to edit mode with one target',
          detail: 'Go back only once you know the highest-value fix, not just because the editor feels tempting.',
        },
      ],
      primaryAction: { kind: 'switch-to-edit', label: 'Back to edit mode' },
    };
  }

  if (sectionCount === 0) {
    return {
      badge: 'Page needs structure',
      heading: `${pageLabel} still needs its first real section`,
      summary: 'The shell is ready, but this page needs one anchor section before finer editing decisions will pay off.',
      focusTitle: 'Start with the section that gives the page a job.',
      focusDetail: 'A strong first section is more valuable right now than a perfect template debate or visual polish pass.',
      bestNextMove: 'Add the first anchor section and make sure it answers the main guest question for this page.',
      decisionRule: 'Choose structure before polish whenever the page is still blank.',
      watchout: 'Do not let a blank page turn into a search for tiny decorative fixes somewhere else.',
      currentStep: `Give ${pageLabel} a real starting point.`,
      nextStep: 'Add the anchor section that explains why this page exists.',
      thenStep: 'Once the anchor is in place, refine the first read before adding extras.',
      checklist: [
        {
          id: 'anchor',
          title: 'Pick the anchor section first',
          detail: 'Choose the section that carries the page purpose instead of a supporting or decorative block.',
        },
        {
          id: 'first-read',
          title: 'Read it once in the canvas',
          detail: 'Make sure the new section immediately tells guests what this page is for.',
        },
        {
          id: 'expand-later',
          title: 'Expand only after it feels grounded',
          detail: 'Add supporting sections only once the first section already makes the page legible.',
        },
      ],
      primaryAction: { kind: 'switch-to-preview', label: 'Stay in edit mode and add structure' },
    };
  }

  if (!selectedSectionLabel) {
    return {
      badge: 'Page-level pass',
      heading: `Use ${pageLabel} as a page right now, not just a pile of sections`,
      summary: `This page has ${sectionCount} section${sectionCount === 1 ? '' : 's'}. Choose the right one before you start tweaking details.`,
      focusTitle: 'Pick the section carrying the most guest weight first.',
      focusDetail: 'The next move is to open the section that determines the first read, not the easiest one to edit.',
      bestNextMove: 'Select the lead section for this page and shape that before you fan out into secondary sections.',
      decisionRule: 'Open the section that changes guest understanding the most.',
      watchout: 'If you pick a section just because it is nearby, the page can drift while the most important section stays vague.',
      currentStep: `Treat ${pageLabel} like one guest-facing page.`,
      nextStep: 'Choose the lead section for this page.',
      thenStep: 'Refine supporting sections only after the lead one feels settled.',
      checklist: [
        {
          id: 'lead-section',
          title: 'Choose the section with the most guest weight',
          detail: 'Open the section that carries the headline, answer, or main call to action for this page.',
        },
        {
          id: 'sequence',
          title: 'Work in page order',
          detail: 'Move from the lead section into supporting sections only after the top read feels right.',
        },
        {
          id: 'avoid-drift',
          title: 'Avoid low-value wandering',
          detail: 'Do not disappear into side sections before the main one is trustworthy.',
        },
      ],
      primaryAction: { kind: 'select-first-section', label: 'Open the first live section' },
    };
  }

  if (inspectorHidden) {
    return {
      badge: 'Inspector hidden',
      heading: `${selectedSectionLabel} is selected, but the editing controls are tucked away`,
      summary: 'The canvas has context, but the next useful controls are hidden right now.',
      focusTitle: 'Bring the inspector back before you make more guesses.',
      focusDetail: 'You already chose the right section. Now reopen the controls so the next move is specific instead of improvised.',
      bestNextMove: 'Show the inspector and take the next action from the right panel instead of editing by memory.',
      decisionRule: 'When the right section is selected, let the inspector carry the next move.',
      watchout: 'Working with the inspector hidden makes the Builder feel harder than it actually is.',
      currentStep: `${selectedSectionLabel} is active in the canvas.`,
      nextStep: 'Reopen the inspector so the section guidance is visible again.',
      thenStep: 'Use the best-next-step inside the inspector before branching out.',
      checklist: [
        {
          id: 'reopen-inspector',
          title: 'Bring the right panel back',
          detail: 'The inspector is where the section-specific next move is already framed for you.',
        },
        {
          id: 'follow-guidance',
          title: 'Take the guided next step',
          detail: 'Use the section panel to choose content, layout, or style in the right order.',
        },
        {
          id: 'stay-section-scoped',
          title: 'Finish one meaningful move first',
          detail: 'Keep the edit scoped to the selected section before you bounce elsewhere.',
        },
      ],
      primaryAction: { kind: 'show-inspector', label: 'Show inspector' },
    };
  }

  if (isDirty) {
    return {
      badge: 'Unsaved draft',
      heading: `${selectedSectionLabel} has meaningful changes worth stabilizing`,
      summary: 'The draft moved. Saving now will keep the shell, preview, and publish truth aligned.',
      focusTitle: 'Stabilize the draft before you branch into more edits.',
      focusDetail: 'Once the current section has changed meaningfully, saving is a trust move, not an interruption.',
      bestNextMove: 'Save the draft once this section feels coherent, then keep working from a synchronized state.',
      decisionRule: 'Save at the end of a real section-level thought, not after every keystroke and not 20 edits too late.',
      watchout: 'If you stack too many unsaved moves, preview and launch confidence become harder to trust.',
      currentStep: `${selectedSectionLabel} is the active editing lane.`,
      nextStep: 'Finish the current section thought and save the draft.',
      thenStep: 'Preview or continue editing from a synchronized state.',
      checklist: [
        {
          id: 'finish-thought',
          title: 'Finish one coherent section move',
          detail: 'Get the section to a stable thought instead of saving halfway through a messy change.',
        },
        {
          id: 'save',
          title: 'Save to lock the draft truth',
          detail: 'A saved draft is much easier to preview, compare, and publish confidently.',
        },
        {
          id: 'decide-next-lap',
          title: 'Choose preview or one more edit',
          detail: 'Once saved, decide whether this section needs proof or whether the next section is the better move.',
        },
      ],
      primaryAction: { kind: 'save-draft', label: 'Save this draft' },
    };
  }

  return {
    badge: 'Editing with steady footing',
    heading: `${selectedSectionLabel} is a good lane to refine from here`,
    summary: `You are in edit mode on ${pageLabel} with the right controls visible and the draft already synchronized.`,
    focusTitle: 'Keep the next move tight and section-specific.',
    focusDetail: 'This is the best moment to refine the active section or preview the guest path, not to reopen a wider search for direction.',
    bestNextMove: 'Either make one more meaningful improvement to this section or switch to preview and verify the guest read.',
    decisionRule: 'When the draft is steady, either improve the active section or verify it in preview — do not drift.',
    watchout: 'A stable editor state can still invite low-value tweaking if you do not choose the next lane deliberately.',
    currentStep: `${selectedSectionLabel} is active and ready for a clean pass.`,
    nextStep: 'Make one more meaningful improvement or move to preview.',
    thenStep: 'Use the preview pass to decide whether anything else truly needs changing.',
    checklist: [
      {
        id: 'one-clean-pass',
        title: 'Make one clean improvement',
        detail: 'Use the stable state to improve the active section in a way guests would actually feel.',
      },
      {
        id: 'preview-proof',
        title: 'Preview before reopening the editor loop',
        detail: 'Check the guest-facing read before deciding you need another full edit pass.',
      },
      {
        id: 'protect-momentum',
        title: 'Protect the calm path',
        detail: 'Keep the next move deliberate so the Builder feels guided instead of sprawling.',
      },
    ],
    primaryAction: { kind: 'switch-to-preview', label: 'Preview this draft' },
  };
}
