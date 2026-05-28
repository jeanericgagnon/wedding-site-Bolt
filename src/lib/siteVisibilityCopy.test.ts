import { describe, expect, it } from 'vitest';

import { SITE_VISIBILITY_COPY } from './siteVisibilityCopy';

describe('siteVisibilityCopy', () => {
  it('keeps private preview and published visibility copy framed as sharing truth', () => {
    expect(SITE_VISIBILITY_COPY.privatePreviewExplainer).toBe(
      'Private preview lets you share the site with specific guests before sharing it more widely.',
    );
    expect(SITE_VISIBILITY_COPY.publishedStatus).toBe('Shared and visible to guests');
    expect(SITE_VISIBILITY_COPY.publishedExplainer).toBe(
      'Sharing the site makes it available to guests at your guest-facing DayOf URL.',
    );
  });
});
