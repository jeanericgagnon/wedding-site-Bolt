import { describe, expect, it } from 'vitest';
import { resolveGuestRouteState } from './guestRouteState';

describe('resolveGuestRouteState', () => {
  it('opens import-export in ops list mode', () => {
    expect(resolveGuestRouteState('?tool=import-export')).toEqual({
      guestsTab: 'ops',
      viewMode: 'list',
      filterStatus: null,
      showInsights: false,
      showOpsMenu: true,
    });
  });

  it('opens address collection with the missing-address filter', () => {
    expect(resolveGuestRouteState('?tool=address-collection')).toEqual({
      guestsTab: 'ops',
      viewMode: 'list',
      filterStatus: 'missing-address',
      showInsights: false,
      showOpsMenu: true,
    });
  });

  it('routes RSVP settings into the config tab', () => {
    expect(resolveGuestRouteState('?tab=rsvp-settings')).toEqual({
      guestsTab: 'rsvp-config',
      viewMode: null,
      filterStatus: null,
      showInsights: null,
      showOpsMenu: null,
    });
  });

  it('opens thank-you notes in the guest ops list with the thank-you-due filter', () => {
    expect(resolveGuestRouteState('?tool=thank-you-notes')).toEqual({
      guestsTab: 'ops',
      viewMode: 'list',
      filterStatus: 'thank-you-due',
      showInsights: false,
      showOpsMenu: true,
    });
  });
});
