type InspectorTab = 'guide' | 'content' | 'style' | 'layout' | 'data';

export interface BuilderSectionEditingGuidance {
  focusTitle: string;
  focusDetail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  currentStep: string;
  nextStep: string;
  thenStep: string;
  nextActionTab: InspectorTab;
  nextActionLabel: string;
  nextActionDetail: string;
  progressPercent: number;
}

export function getBuilderSectionEditingGuidance({
  sectionLabel,
  hasMeaningfulContent,
  hasStyleOverrides,
  hasLayoutCustomization,
  hasBindings,
  dataConfigured,
  enabled,
}: {
  sectionLabel: string;
  hasMeaningfulContent: boolean;
  hasStyleOverrides: boolean;
  hasLayoutCustomization: boolean;
  hasBindings: boolean;
  dataConfigured: boolean;
  enabled: boolean;
}): BuilderSectionEditingGuidance {
  const requiredSteps = [
    hasMeaningfulContent,
    hasLayoutCustomization,
    !hasBindings || dataConfigured,
    enabled,
  ];
  const progressPercent = Math.round(
    (requiredSteps.filter(Boolean).length / Math.max(requiredSteps.length, 1)) * 100
  );

  if (!enabled) {
    return {
      focusTitle: `${sectionLabel} is hidden from guests`,
      focusDetail: 'The section still exists in the draft, but none of its content matters until you decide whether it belongs back on the live page.',
      bestNextMove: 'Decide whether this section should return to the page before you spend time refining its details.',
      decisionRule: 'If the section still supports the page story, show it again and improve it. If it no longer belongs, remove it instead of letting it drift hidden.',
      watchout: 'Hidden sections are easy to forget, which quietly creates two versions of the page: the live one and the abandoned draft one.',
      currentStep: 'Confirm whether this section still belongs in the page flow at all.',
      nextStep: 'Show it again if the structure still needs it, then finish the content or layout work that made you hide it in the first place.',
      thenStep: 'If it no longer fits, remove it cleanly instead of letting it become hidden clutter.',
      nextActionTab: 'layout',
      nextActionLabel: 'Review visibility',
      nextActionDetail: 'Decide whether to show the section again or remove it.',
      progressPercent,
    };
  }

  if (!hasMeaningfulContent) {
    return {
      focusTitle: `${sectionLabel} still needs its real content`,
      focusDetail: 'The structure may be present, but guests still do not have the actual message, details, or story this section is supposed to carry.',
      bestNextMove: 'Fill in the key text or details first so you can judge whether this section earns its place on the page.',
      decisionRule: 'Write the substance before tuning the presentation. Layout and style choices only matter once the section says something real.',
      watchout: 'It is easy to overwork layout or color on a section that still has placeholder-level content underneath.',
      currentStep: 'Add the headline, body copy, or details this section exists to deliver.',
      nextStep: 'Once the content is real, confirm the layout still fits the amount and shape of that content.',
      thenStep: 'Only after content and layout agree should you spend time on section-specific style tweaks.',
      nextActionTab: 'content',
      nextActionLabel: 'Open content',
      nextActionDetail: 'Add the real guest-facing content first.',
      progressPercent,
    };
  }

  if (!hasLayoutCustomization) {
    return {
      focusTitle: `${sectionLabel} needs its right structure`,
      focusDetail: 'The content is present, but the layout or spacing still has not been shaped enough to know whether this section reads cleanly.',
      bestNextMove: 'Choose the layout variant and spacing that makes the content easiest to scan and trust.',
      decisionRule: 'Pick the version that requires the least compensating copy or styling. The best layout should make the content feel easier, not louder.',
      watchout: 'If you keep writing around the wrong layout, the section can feel busy even when the content is good.',
      currentStep: 'Compare layout and spacing choices against the actual content now in the section.',
      nextStep: 'Commit to the variant that gives the page the clearest rhythm.',
      thenStep: 'After the structure feels right, decide whether the default site styling is already enough.',
      nextActionTab: 'layout',
      nextActionLabel: 'Open layout',
      nextActionDetail: 'Pick the version that best fits the content you already have.',
      progressPercent,
    };
  }

  if (hasBindings && !dataConfigured) {
    return {
      focusTitle: `${sectionLabel} still needs its connected data`,
      focusDetail: 'The section shape is there, but it is not yet pulling in the schedule, venue, FAQ, registry, or media data guests actually need.',
      bestNextMove: 'Connect the missing data before you try to polish the section visually.',
      decisionRule: 'If the section depends on structured data, that data should be trustworthy before you fine-tune copy or style around it.',
      watchout: 'Polishing a disconnected section creates false confidence because the page can still look finished while showing incomplete truth.',
      currentStep: 'Bind the live data this section is supposed to represent.',
      nextStep: 'Check that the connected items appear in the right order and shape.',
      thenStep: 'Only after the data is trustworthy should you revisit presentation details.',
      nextActionTab: 'data',
      nextActionLabel: 'Connect data',
      nextActionDetail: 'Make sure this section is pulling the real structured content it depends on.',
      progressPercent,
    };
  }

  if (!hasStyleOverrides) {
    return {
      focusTitle: `${sectionLabel} is structurally sound`,
      focusDetail: 'The section has content, layout, and any needed data. Now the question is whether it already fits the site well enough without extra customization.',
      bestNextMove: 'Preview the section in context and change its styling only if it still feels out of family with the rest of the page.',
      decisionRule: 'Use section-level style overrides only when the default theme is not doing the job. Restraint usually keeps the page more coherent.',
      watchout: 'Unnecessary overrides can make one section feel special in a way that breaks the page instead of elevating it.',
      currentStep: 'Check whether the section already reads clearly with the shared site styling.',
      nextStep: 'If something still clashes, make the smallest style adjustment that solves it.',
      thenStep: 'Return to page-level review instead of endlessly polishing a section that is already working.',
      nextActionTab: 'style',
      nextActionLabel: 'Review style',
      nextActionDetail: 'Only customize the section if the default site styling still falls short.',
      progressPercent,
    };
  }

  return {
    focusTitle: `${sectionLabel} is in a strong place`,
    focusDetail: 'This section is carrying real content, the structure fits, and the extra adjustments already look intentional.',
    bestNextMove: 'Preview the page in context and decide whether this section truly needs anything else before you keep editing.',
    decisionRule: 'Once a section is doing its job, the next move is usually to verify it in the full page flow, not to keep changing it in isolation.',
    watchout: 'A healthy section can still invite low-value tweaking if you stay zoomed in too long.',
    currentStep: 'Check the section against the surrounding page instead of against an imagined perfect version.',
    nextStep: 'Make one final correction only if preview reveals a real problem.',
    thenStep: 'Move on to the next page or section that still has a larger gap.',
    nextActionTab: 'layout',
    nextActionLabel: 'Preview in context',
    nextActionDetail: 'Verify the section in the page flow before making any more local edits.',
    progressPercent,
  };
}
