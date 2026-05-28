import { describe, expect, it } from 'vitest';

import { getOverviewWebsiteEditorLabel } from './overviewWebsiteActions';

describe('getOverviewWebsiteEditorLabel', () => {
  it('keeps unpublished overview copy framed as a draft sharing step', () => {
    expect(getOverviewWebsiteEditorLabel(false)).toBe('Edit draft before sharing');
  });

  it('keeps published overview copy framed as live-site editing', () => {
    expect(getOverviewWebsiteEditorLabel(true)).toBe('Edit live website');
  });
});
