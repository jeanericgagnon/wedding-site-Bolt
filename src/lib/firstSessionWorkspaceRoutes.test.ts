import { describe, expect, it } from 'vitest';
import { FIRST_SESSION_WORKSPACE_ROUTES, getFirstSessionSignupState } from './firstSessionWorkspaceRoutes';

describe('FIRST_SESSION_WORKSPACE_ROUTES', () => {
  it('keeps the signed-in couple start paths on the live dashboard routes', () => {
    expect(FIRST_SESSION_WORKSPACE_ROUTES.builder).toBe('/dashboard/builder-guide');
    expect(FIRST_SESSION_WORKSPACE_ROUTES.overview).toBe('/dashboard/overview');
    expect(FIRST_SESSION_WORKSPACE_ROUTES.planning).toBe('/dashboard/planning');
    expect(FIRST_SESSION_WORKSPACE_ROUTES.settings).toBe('/dashboard/settings');
    expect(FIRST_SESSION_WORKSPACE_ROUTES.guests).toBe('/dashboard/guests');
    expect(FIRST_SESSION_WORKSPACE_ROUTES.messages).toBe('/dashboard/messages');
    expect(FIRST_SESSION_WORKSPACE_ROUTES.rsvpBoard).toBe('/dashboard/rsvp-board');
    expect(FIRST_SESSION_WORKSPACE_ROUTES.coordinator).toBe('/dashboard/coordinator');
  });

  it('keeps signed-out start-draft handoff aimed at the live builder path', () => {
    expect(getFirstSessionSignupState()).toEqual({
      returnTo: '/dashboard/builder-guide',
    });
  });
});
