export type BuilderV2PreviewSelectionIntent = {
  additive: boolean;
  range: boolean;
  scrollPreview: boolean;
  openEditor: boolean;
  focusRail: boolean;
  nextPrimedId: string | null;
};

export const resolveBuilderV2PreviewSelectionIntent = ({
  sectionId,
  primedPreviewSectionId,
  shiftKey,
  metaKey,
  ctrlKey,
}: {
  sectionId: string;
  primedPreviewSectionId: string | null;
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
}): BuilderV2PreviewSelectionIntent => {
  if (shiftKey) {
    return {
      additive: false,
      range: true,
      scrollPreview: false,
      openEditor: true,
      focusRail: true,
      nextPrimedId: null,
    };
  }

  if (metaKey || ctrlKey) {
    return {
      additive: true,
      range: false,
      scrollPreview: false,
      openEditor: true,
      focusRail: true,
      nextPrimedId: null,
    };
  }

  if (primedPreviewSectionId === sectionId) {
    return {
      additive: false,
      range: false,
      scrollPreview: false,
      openEditor: true,
      focusRail: true,
      nextPrimedId: null,
    };
  }

  return {
    additive: false,
    range: false,
    scrollPreview: true,
    openEditor: false,
    focusRail: true,
    nextPrimedId: sectionId,
  };
};

export const buildBuilderV2RailSelectionIntent = () => ({
  additive: false,
  range: false,
  scrollPreview: true,
});
