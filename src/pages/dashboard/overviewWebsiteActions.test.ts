import { describe, expect, it } from 'vitest';

import {
  getOverviewDraftVisibilityNote,
  getOverviewRegistryReadinessNote,
  getOverviewWebsiteEditorLabel,
} from './overviewWebsiteActions';

describe('getOverviewWebsiteEditorLabel', () => {
  it('keeps unpublished overview copy framed as a draft sharing step', () => {
    expect(getOverviewWebsiteEditorLabel(false)).toBe('Edit draft before sharing');
  });

  it('keeps published overview copy framed as live-site editing', () => {
    expect(getOverviewWebsiteEditorLabel(true)).toBe('Edit live website');
  });

  it('keeps unpublished overview visibility copy framed as sharing, not go-live urgency', () => {
    expect(getOverviewDraftVisibilityNote()).toBe(
      'Sharing the site makes it available to guests at your guest-facing DayOf URL. Until then, keep it in draft or intentional private-preview mode only.',
    );
  });

  it('keeps registry summary copy tied to items added, not guest-ready overclaim', () => {
    expect(getOverviewRegistryReadinessNote()).toBe('Registry items added so far');
  });
});
