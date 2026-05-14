import { describe, expect, it } from 'vitest';
import { buildGuestVisibilityPreview } from './guestVisibilityPreview';

describe('guestVisibilityPreview', () => {
  it('separates visible and hidden itinerary events from invited event ids', () => {
    const preview = buildGuestVisibilityPreview({
      guest: {
        id: 'guest-1',
        firstName: 'Maya',
        lastName: 'Lee',
        inviteToken: 'secret-token',
        invitedToCeremony: true,
        invitedToReception: true,
      },
      events: [
        { id: 'welcome', eventName: 'Welcome Drinks' },
        { id: 'ceremony', eventName: 'Ceremony' },
        { id: 'brunch', eventName: 'Farewell Brunch' },
      ],
      invitedEventIds: new Set(['ceremony', 'brunch']),
    });

    expect(preview.accessSummary).toBe('2 of 3 events visible');
    expect(preview.visibleEvents.map((event) => event.eventName)).toEqual(['Ceremony', 'Farewell Brunch']);
    expect(preview.hiddenEvents.map((event) => event.eventName)).toEqual(['Welcome Drinks']);
  });

  it('builds guest preview links without leaking the token into display copy', () => {
    const preview = buildGuestVisibilityPreview({
      guest: {
        id: 'guest-1',
        name: 'Maya Lee',
        inviteToken: 'private-token',
        preferredLanguage: 'es-MX',
      },
      events: [],
      invitedEventIds: null,
      publicSiteSlug: 'maya-and-rowan',
    });

    expect(preview.links).toEqual([
      {
        kind: 'rsvp',
        label: 'Open RSVP as guest',
        href: '/rsvp?token=private-token&previewGuest=guest-1&previewSurface=rsvp&guestLang=es',
      },
      {
        kind: 'contact',
        label: 'Open guest update view',
        href: '/guest-contact/maya-and-rowan?invite_token=private-token&previewGuest=guest-1&previewSurface=contact&guestLang=es',
      },
      {
        kind: 'photos',
        label: 'Open photo upload as guest',
        href: '/photos/upload?site=maya-and-rowan&hub=1&invite_token=private-token&previewGuest=guest-1&previewSurface=photos&guestLang=es',
      },
      {
        kind: 'guestbook',
        label: 'Open guestbook as guest',
        href: '/guestbook/maya-and-rowan?invite_token=private-token&previewGuest=guest-1&previewSurface=guestbook&guestLang=es',
      },
      {
        kind: 'vault',
        label: 'Open anniversary vault as guest',
        href: '/vault/maya-and-rowan?invite_token=private-token&previewGuest=guest-1&previewSurface=vault&guestLang=es',
      },
      {
        kind: 'recap',
        label: 'Open recap as guest',
        href: '/event/maya-and-rowan/recap?invite_token=private-token&previewGuest=guest-1&previewSurface=recap&guestLang=es',
      },
      {
        kind: 'travel',
        label: 'Open travel section as guest',
        href: '/site/maya-and-rowan?previewGuest=guest-1&previewSurface=travel&guestLang=es#travel',
      },
      {
        kind: 'registry',
        label: 'Open registry section as guest',
        href: '/site/maya-and-rowan?previewGuest=guest-1&previewSurface=registry&guestLang=es#registry',
      },
      {
        kind: 'site',
        label: 'Open public site view',
        href: '/site/maya-and-rowan?previewGuest=guest-1&previewSurface=public&guestLang=es',
      },
    ]);
    expect(`${preview.bannerLabel} ${preview.accessDetail} ${preview.accessSummary}`).not.toContain('private-token');
    expect(preview.links.map((link) => link.label)).toContain('Open travel section as guest');
    expect(preview.links.map((link) => link.label)).toContain('Open registry section as guest');
  });

  it('falls back to legacy ceremony and reception visibility when no itinerary events exist', () => {
    const preview = buildGuestVisibilityPreview({
      guest: {
        id: 'guest-1',
        name: 'Maya Lee',
        invitedToCeremony: true,
        invitedToReception: false,
      },
      events: [],
    });

    expect(preview.accessSummary).toBe('1 of 2 events visible');
    expect(preview.visibleEvents.map((event) => event.eventName)).toEqual(['Ceremony']);
    expect(preview.hiddenEvents.map((event) => event.eventName)).toEqual(['Reception']);
  });

  it('warns when the guest path is missing private access or household state is mixed', () => {
    const preview = buildGuestVisibilityPreview({
      guest: {
        id: 'guest-1',
        name: 'Maya Lee',
      },
      events: [{ id: 'welcome', eventName: 'Welcome Drinks' }],
      invitedEventIds: [],
      householdMembers: [
        { id: 'guest-1', name: 'Maya Lee', rsvpStatus: 'confirmed' },
        { id: 'guest-2', name: 'Rowan Lee', rsvpStatus: 'pending' },
      ],
    });

    expect(preview.warnings).toContain('No private RSVP link exists yet for this guest.');
    expect(preview.warnings).toContain('This guest is not invited to any visible event yet.');
    expect(preview.warnings).toContain('Household RSVP states are mixed, so preview this guest before sending reminders.');
  });
});
