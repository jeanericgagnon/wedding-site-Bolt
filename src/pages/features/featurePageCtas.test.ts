import { describe, expect, it } from 'vitest';
import { FIRST_SESSION_WORKSPACE_ROUTES } from '../../lib/firstSessionWorkspaceRoutes';
import { getFeaturePageFooterCtas, getFeaturePageHeroCtas } from './featurePageCtas';

describe('featurePageCtas', () => {
  it('keeps signed-out feature-page CTAs pointed at signup and product context', () => {
    const hero = getFeaturePageHeroCtas('guests', false);
    const footer = getFeaturePageFooterCtas('guests', false);

    expect(hero.primary.label).toBe('Start your website');
    expect(hero.primary.to).toBe('/signup');
    expect(hero.primary.state).toBeTruthy();
    expect(hero.secondary).toEqual({ label: 'See how Dayof works', to: '/product' });

    expect(footer.primary.label).toBe('Start your website');
    expect(footer.primary.to).toBe('/signup');
    expect(footer.primary.state).toBeTruthy();
    expect(footer.secondary).toEqual({ label: 'Explore more features', to: '/product' });
  });

  it('routes signed-in feature-page CTAs into live workspaces instead of marketing loops', () => {
    expect(getFeaturePageHeroCtas('guests', true)).toEqual({
      primary: { label: 'Open guest list', to: FIRST_SESSION_WORKSPACE_ROUTES.guests },
      secondary: { label: 'Open dashboard', to: FIRST_SESSION_WORKSPACE_ROUTES.overview },
    });
    expect(getFeaturePageHeroCtas('rsvp', true)).toEqual({
      primary: { label: 'Open RSVP board', to: FIRST_SESSION_WORKSPACE_ROUTES.rsvpBoard },
      secondary: { label: 'Open dashboard', to: FIRST_SESSION_WORKSPACE_ROUTES.overview },
    });
    expect(getFeaturePageHeroCtas('messaging', true)).toEqual({
      primary: { label: 'Open messages', to: FIRST_SESSION_WORKSPACE_ROUTES.messages },
      secondary: { label: 'Open dashboard', to: FIRST_SESSION_WORKSPACE_ROUTES.overview },
    });
    expect(getFeaturePageHeroCtas('travel', true)).toEqual({
      primary: { label: 'Open itinerary', to: FIRST_SESSION_WORKSPACE_ROUTES.itinerary },
      secondary: { label: 'Open dashboard', to: FIRST_SESSION_WORKSPACE_ROUTES.overview },
    });
    expect(getFeaturePageHeroCtas('registry', true)).toEqual({
      primary: { label: 'Open registry', to: FIRST_SESSION_WORKSPACE_ROUTES.registry },
      secondary: { label: 'Open dashboard', to: FIRST_SESSION_WORKSPACE_ROUTES.overview },
    });
    expect(getFeaturePageHeroCtas('seating', true)).toEqual({
      primary: { label: 'Open seating', to: FIRST_SESSION_WORKSPACE_ROUTES.seating },
      secondary: { label: 'Open dashboard', to: FIRST_SESSION_WORKSPACE_ROUTES.overview },
    });
    expect(getFeaturePageFooterCtas('guests', true)).toEqual({
      primary: { label: 'Open guest list', to: FIRST_SESSION_WORKSPACE_ROUTES.guests },
      secondary: { label: 'Open dashboard', to: FIRST_SESSION_WORKSPACE_ROUTES.overview },
    });
  });
});
