import { describe, expect, it } from 'vitest';

import {
  buildBuilderV2RailSelectionIntent,
  resolveBuilderV2PreviewSelectionIntent,
} from './builderV2SelectionInteraction';

describe('builderV2SelectionInteraction', () => {
  it('focuses the rail when preview selection starts, even before editor-open mode', () => {
    expect(resolveBuilderV2PreviewSelectionIntent({
      sectionId: 'story',
      primedPreviewSectionId: null,
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
    })).toEqual({
      additive: false,
      range: false,
      scrollPreview: true,
      openEditor: false,
      focusRail: true,
      nextPrimedId: 'story',
    });
  });

  it('opens the editor and keeps rail focus for modifier and repeated preview selections', () => {
    expect(resolveBuilderV2PreviewSelectionIntent({
      sectionId: 'travel',
      primedPreviewSectionId: null,
      shiftKey: true,
      metaKey: false,
      ctrlKey: false,
    })).toEqual({
      additive: false,
      range: true,
      scrollPreview: false,
      openEditor: true,
      focusRail: true,
      nextPrimedId: null,
    });

    expect(resolveBuilderV2PreviewSelectionIntent({
      sectionId: 'travel',
      primedPreviewSectionId: 'travel',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
    })).toEqual({
      additive: false,
      range: false,
      scrollPreview: false,
      openEditor: true,
      focusRail: true,
      nextPrimedId: null,
    });
  });

  it('keeps primary rail selection wired to preview scrolling', () => {
    expect(buildBuilderV2RailSelectionIntent()).toEqual({
      additive: false,
      range: false,
      scrollPreview: true,
    });
  });
});
