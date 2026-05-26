import { describe, expect, it } from 'vitest';

import { buildGuestJourneyLinks, getGuestJourneyCopy } from './guestJourney';

describe('guestJourney', () => {
  it('builds stable guest journey links from a site slug and invite token', () => {
    const links = buildGuestJourneyLinks({
      currentSurface: 'photos',
      siteSlug: 'ericandkaras',
      inviteToken: 'invite-123',
      previewGuest: 'guest-42',
      isHubEntry: true,
    });

    expect(links.map((link) => link.key)).toEqual(['hub', 'travel', 'rsvp', 'contact']);
    expect(links.find((link) => link.key === 'hub')?.href).toBe('/site/ericandkaras?previewGuest=guest-42&previewSurface=public&token=invite-123');
    expect(links.find((link) => link.key === 'travel')?.href).toBe('/site/ericandkaras?previewGuest=guest-42&previewSurface=travel&token=invite-123#travel');
    expect(links.find((link) => link.key === 'rsvp')?.href).toBe('/rsvp?site=ericandkaras&token=invite-123');
    expect(links.find((link) => link.key === 'contact')?.href).toBe('/guest-contact/ericandkaras?previewGuest=guest-42&previewSurface=contact');
  });

  it('drops links when the route does not have a site slug to carry forward', () => {
    expect(buildGuestJourneyLinks({ currentSurface: 'rsvp' })).toEqual([]);
  });

  it('keeps the guest path copy intentional for vault surfaces', () => {
    expect(getGuestJourneyCopy('vault')).toEqual({
      title: 'The story stretches past the wedding weekend',
      detail: 'Anniversary notes live later in the story, but the wedding hub, RSVP, travel details, and photos should still be easy to reopen from here.',
    });
  });
});
