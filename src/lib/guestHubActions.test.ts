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
    expect(summarizeGuestHubActions([])).toBe('No guest actions are enabled yet');
  });
});
