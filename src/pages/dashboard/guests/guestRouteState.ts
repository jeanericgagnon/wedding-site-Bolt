export type GuestRouteState = {
  guestsTab: 'ops' | 'rsvp-config' | null;
  viewMode: 'list' | 'households' | null;
  filterStatus: 'missing-address' | 'thank-you-due' | null;
  showInsights: boolean | null;
  showOpsMenu: boolean | null;
};

export function resolveGuestRouteState(search: string): GuestRouteState {
  const params = new URLSearchParams(search);
  const tool = params.get('tool');
  const tab = params.get('tab');

  if (tool === 'import-export') {
    return {
      guestsTab: 'ops',
      viewMode: 'list',
      filterStatus: null,
      showInsights: false,
      showOpsMenu: true,
    };
  }

  if (tool === 'address-collection') {
    return {
      guestsTab: 'ops',
      viewMode: 'list',
      filterStatus: 'missing-address',
      showInsights: false,
      showOpsMenu: true,
    };
  }

  if (tool === 'guest-details') {
    return {
      guestsTab: 'ops',
      viewMode: 'list',
      filterStatus: null,
      showInsights: false,
      showOpsMenu: null,
    };
  }

  if (tool === 'thank-you-notes') {
    return {
      guestsTab: 'ops',
      viewMode: 'list',
      filterStatus: 'thank-you-due',
      showInsights: false,
      showOpsMenu: true,
    };
  }

  if (tab === 'rsvp-settings') {
    return {
      guestsTab: 'rsvp-config',
      viewMode: null,
      filterStatus: null,
      showInsights: null,
      showOpsMenu: null,
    };
  }

  if (tab === 'list') {
    return {
      guestsTab: null,
      viewMode: 'list',
      filterStatus: null,
      showInsights: false,
      showOpsMenu: null,
    };
  }

  return {
    guestsTab: null,
    viewMode: null,
    filterStatus: null,
    showInsights: null,
    showOpsMenu: null,
  };
}
