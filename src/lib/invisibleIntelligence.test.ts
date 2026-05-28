import { describe, expect, it } from 'vitest';

import { getBuilderLaunchChecklistRoute } from '../pages/builderCutoverRoute';
import { buildInvisibleIntelligenceSuggestions } from './invisibleIntelligence';

describe('buildInvisibleIntelligenceSuggestions', () => {
  it('routes the launch-review nudge through the shared Builder V2 launch route', () => {
    const suggestions = buildInvisibleIntelligenceSuggestions({
      isPublished: false,
      siteSlug: null,
      weddingDate: null,
      totalGuests: 10,
      pendingGuests: 0,
      contactableGuestCount: 0,
      registryItemCount: 1,
      activePhotoAlbumCount: 1,
      photoAlbumCount: 1,
      vaultCount: 0,
      enabledVaultCount: 0,
    });

    const publishNudge = suggestions.find((suggestion) => suggestion.id === 'site-publish');
    expect(publishNudge).toMatchObject({
      detail: 'The public site should have one clean launch review before guests see it.',
      actionLabel: 'Open launch review',
      href: getBuilderLaunchChecklistRoute(),
    });
  });
});
