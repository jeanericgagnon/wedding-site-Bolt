import { describe, expect, it } from 'vitest';
import { buildGuestHubActions, summarizeGuestHubActions } from './guestHubActions';

describe('guestHubActions', () => {
  it('builds the full no-app guest hub action set from one slug', () => {
    const actions = buildGuestHubActions('maya-and-leo', {});

    expect(actions.map((action) => action.id)).toEqual([
      'rsvp',
      'schedule',
      'travel',
      'registry',
      'photos',
      'guestbook',
      'recap',
    ]);
    expect(actions.find((action) => action.id === 'rsvp')).toMatchObject({
      href: '/site/maya-and-leo#rsvp',
      primary: true,
    });
    expect(actions.find((action) => action.id === 'photos')?.href).toBe('/photos/upload?site=maya-and-leo&hub=1');
  });

  it('adds the guest update action only when a private guest path exists', () => {
    const noGuestPath = buildGuestHubActions('maya-and-leo', {});
    const withGuestPath = buildGuestHubActions('maya-and-leo', {}, {
      guestContactHref: '/guest-contact/maya-and-leo',
    });

    expect(noGuestPath.map((action) => action.id)).not.toContain('contact');
    expect(withGuestPath.map((action) => action.id)).toContain('contact');
    expect(withGuestPath.find((action) => action.id === 'contact')).toMatchObject({
      href: '/guest-contact/maya-and-leo',
    });
  });

  it('adds a day-of updates action when the shared hub exposes an updates section', () => {
    const actions = buildGuestHubActions('maya-and-leo', {}, {
      dayOfUpdatesHref: '/event/maya-and-leo#day-of-updates',
      guestInviteToken: 'guest-token-123',
      guestLanguage: 'fr-CA',
    });

    expect(actions.map((action) => action.id)).toContain('updates');
    expect(actions.find((action) => action.id === 'updates')).toMatchObject({
      href: '/event/maya-and-leo?invite_token=guest-token-123&guestLang=fr#day-of-updates',
    });
  });

  it('carries guest-specific identity through private guest-path actions and same-site anchors', () => {
    const actions = buildGuestHubActions('maya-and-leo', {}, {
      guestContactHref: '/guest-contact/maya-and-leo',
      guestInviteToken: 'guest-token-123',
      guestLanguage: 'fr-CA',
    });

    expect(actions.find((action) => action.id === 'photos')?.href).toBe('/photos/upload?site=maya-and-leo&hub=1&invite_token=guest-token-123&guestLang=fr');
    expect(actions.find((action) => action.id === 'guestbook')?.href).toBe('/guestbook/maya-and-leo?invite_token=guest-token-123&guestLang=fr');
    expect(actions.find((action) => action.id === 'vault')?.href).toBe('/vault/maya-and-leo?invite_token=guest-token-123&guestLang=fr');
    expect(actions.find((action) => action.id === 'recap')?.href).toBe('/event/maya-and-leo/recap?invite_token=guest-token-123&guestLang=fr');
    expect(actions.find((action) => action.id === 'contact')?.href).toBe('/guest-contact/maya-and-leo?invite_token=guest-token-123&guestLang=fr');
    expect(actions.find((action) => action.id === 'rsvp')?.href).toBe('/site/maya-and-leo?invite_token=guest-token-123&guestLang=fr#rsvp');
    expect(actions.find((action) => action.id === 'schedule')?.href).toBe('/site/maya-and-leo?invite_token=guest-token-123&guestLang=fr#schedule');
    expect(actions.find((action) => action.id === 'travel')?.href).toBe('/site/maya-and-leo?invite_token=guest-token-123&guestLang=fr#travel');
    expect(actions.find((action) => action.id === 'registry')?.href).toBe('/site/maya-and-leo?invite_token=guest-token-123&guestLang=fr#registry');
  });

  it('keeps the anniversary vault out of the generic public hub when there is no private guest path', () => {
    const actions = buildGuestHubActions('maya-and-leo', {});

    expect(actions.map((action) => action.id)).not.toContain('vault');
  });

  it('honors hub controls without leaving orphan recap links when photos are off', () => {
    const actions = buildGuestHubActions('maya-and-leo', {
      photos_enabled: false,
      registry_enabled: false,
      travel_enabled: false,
    });

    expect(actions.map((action) => action.id)).toEqual(['rsvp', 'schedule', 'guestbook']);
  });

  it('encodes the site slug for every action', () => {
    const actions = buildGuestHubActions('maya leo', {});

    expect(actions.every((action) => action.href.includes('maya%20leo'))).toBe(true);
  });

  it('summarizes enabled actions for owner QR confidence copy', () => {
    expect(summarizeGuestHubActions(buildGuestHubActions('maya-and-leo', { photos_enabled: false }).slice(0, 3))).toBe('RSVP, schedule, and travel');
    expect(summarizeGuestHubActions([{ id: 'updates' }])).toBe('day-of updates');
    expect(summarizeGuestHubActions(buildGuestHubActions('maya-and-leo', {}, { guestContactHref: '/guest-contact/maya-and-leo' }).slice(0, 2))).toBe('RSVP and guest update');
    expect(summarizeGuestHubActions([{ id: 'vault' }])).toBe('anniversary vault');
    expect(summarizeGuestHubActions([])).toBe('No guest actions are enabled yet');
  });
});
