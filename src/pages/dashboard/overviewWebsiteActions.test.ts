import { describe, expect, it } from 'vitest';

import {
  getOverviewDraftVisibilityNote,
  getOverviewRegistryReadinessNote,
  getOverviewOpenWebsiteLabel,
  getOverviewSiteActivityLabel,
  getOverviewWebsiteEditorLabel,
} from './overviewWebsiteActions';

describe('getOverviewWebsiteEditorLabel', () => {
  it('keeps unpublished overview copy framed as a draft sharing step', () => {
    expect(getOverviewWebsiteEditorLabel(false)).toBe('Edit draft before sharing');
  });

  it('keeps published overview copy framed as shared-site editing', () => {
    expect(getOverviewWebsiteEditorLabel(true)).toBe('Edit shared website');
  });

  it('keeps unpublished overview visibility copy framed as sharing, not go-live urgency', () => {
    expect(getOverviewDraftVisibilityNote()).toBe(
      'Sharing the site makes it available to guests at your guest-facing DayOf URL. Until then, keep it in draft or intentional private-preview mode only.',
    );
  });

  it('keeps registry summary copy tied to items added, not guest-ready overclaim', () => {
    expect(getOverviewRegistryReadinessNote()).toBe('Registry items added so far');
  });

  it('keeps the main website action framed as shared visibility, not live-launch theater', () => {
    expect(getOverviewOpenWebsiteLabel(true)).toBe('Open shared website');
    expect(getOverviewOpenWebsiteLabel(false)).toBe('Preview draft website');
  });

  it('keeps recent site activity framed around shared-site changes, not live-site certainty', () => {
    expect(getOverviewSiteActivityLabel('publish')).toBe('Shared guest-facing site');
    expect(getOverviewSiteActivityLabel('rollback')).toBe('Restored older version');
    expect(getOverviewSiteActivityLabel('save')).toBe('Saved draft');
  });
});
