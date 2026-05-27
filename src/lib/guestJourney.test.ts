import { describe, expect, it } from 'vitest';

import { buildGuestJourneyLinks, buildGuestJourneySteps, getGuestJourneyCopy } from './guestJourney';

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

  it('marks completed and next guest-path steps clearly', () => {
    const steps = buildGuestJourneySteps({
      currentSurface: 'contact',
      completedSurfaces: ['rsvp'],
    });

    expect(steps).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'contact', status: 'current' }),
      expect.objectContaining({ key: 'rsvp', status: 'done' }),
      expect.objectContaining({ key: 'photos', status: 'next' }),
    ]));
  });

  it('keeps the guest path copy intentional for vault surfaces', () => {
    expect(getGuestJourneyCopy('vault')).toMatchObject({
      title: 'The story stretches past the wedding weekend',
      detail: 'Anniversary notes live later in the story, but the wedding hub, RSVP, travel details, and photos should still be easy to reopen from here.',
      bestNextMove: expect.stringMatching(/anniversary note|memory/i),
      watchout: expect.stringMatching(/live wedding path feel buried|continuity/i),
      sequence: [
        expect.objectContaining({ status: 'current' }),
        expect.objectContaining({ status: 'next' }),
        expect.objectContaining({ status: 'then' }),
      ],
    });
  });

  it('warns when the RSVP path turns continuity into separate chores', () => {
    const copy = getGuestJourneyCopy('rsvp');

    expect(copy.watchout).toMatch(/dead end|separate chores/i);
    expect(copy.decisionRule).toMatch(/re-enter the wedding story/i);
  });
});
