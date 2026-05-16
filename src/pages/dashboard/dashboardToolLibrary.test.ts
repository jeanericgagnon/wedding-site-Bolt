import { describe, expect, it } from 'vitest';
import {
  DASHBOARD_TOOL_GROUPS,
  DEFAULT_DASHBOARD_TOOLS,
  PINNABLE_NAV_TOOL_IDS,
  getAllDashboardTools,
} from './dashboardToolLibrary';

describe('dashboardToolLibrary', () => {
  it('keeps the default dashboard navigation calm and exact', () => {
    expect(DEFAULT_DASHBOARD_TOOLS.map((tool) => tool.name)).toEqual([
      'Home',
      'Website',
      'Guests',
      'Registry',
      'Messages',
      'Memories',
      'More Tools',
    ]);
  });

  it('contains the complete More Tools groups and optional sidebar tools', () => {
    expect(DASHBOARD_TOOL_GROUPS.map((group) => group.title)).toEqual([
      'Planning',
      'Wedding Day',
      'Guest Experience',
      'Memories',
      'Advanced',
    ]);
    expect(PINNABLE_NAV_TOOL_IDS).toEqual([
      'wedding-day',
      'planning',
      'seating',
      'vendors',
      'name-change',
      'activity',
      'settings',
    ]);
    expect(getAllDashboardTools().map((tool) => tool.id)).toEqual(expect.arrayContaining([
      'address-collection',
      'qr-codes',
      'coordinator',
      'seating-lookup',
      'song-requests',
      'guest-questions',
      'guestbook-prompts',
      'vaults',
      'photo-recap',
      'video-uploads',
      'anniversary-capsules',
      'collaborators',
      'import-export',
      'privacy-access',
      'advanced-design',
      'data-settings',
    ]));
  });
});
