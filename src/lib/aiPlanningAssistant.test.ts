import { describe, expect, it } from 'vitest';
import { buildPlanningAssistantModel } from './aiPlanningAssistant';
import { buildLaunchReadiness, type LaunchReadinessInput } from './launchReadiness';

const makeStats = (overrides: Partial<LaunchReadinessInput> = {}): LaunchReadinessInput => ({
  isPublished: false,
  siteSlug: null,
  weddingDate: null,
  coupleName1: 'Alex',
  coupleName2: 'Jordan',
  venueName: null,
  venueLocation: null,
  totalGuests: 0,
  confirmedGuests: 0,
  declinedGuests: 0,
  pendingGuests: 0,
  contactableGuestCount: 0,
  registryItemCount: 0,
  photoAlbumCount: 0,
  activePhotoAlbumCount: 0,
  ...overrides,
});

describe('buildPlanningAssistantModel', () => {
  it('prioritizes publish, guest import, and photo hub before polish', () => {
    const stats = makeStats();
    const model = buildPlanningAssistantModel(stats, buildLaunchReadiness(stats));

    expect(model.headline).toContain('Do these first');
    expect(model.actions.map((action) => action.id)).toEqual([
      'publish-site',
      'import-guests',
      'photo-hub',
      'registry-proof',
    ]);
    expect(model.actions.map((action) => `${action.title} ${action.detail} ${action.cta}`).join(' ')).not.toMatch(/bucket/i);
  });

  it('surfaces pending RSVP and missing contact coverage when guests exist', () => {
    const stats = makeStats({
      isPublished: true,
      siteSlug: 'alex-jordan',
      totalGuests: 120,
      confirmedGuests: 70,
      declinedGuests: 10,
      pendingGuests: 40,
      contactableGuestCount: 90,
      activePhotoAlbumCount: 1,
      photoAlbumCount: 2,
      registryItemCount: 4,
      weddingDate: '2026-06-20',
      venueName: 'The Foundry',
    });
    const model = buildPlanningAssistantModel(stats, buildLaunchReadiness(stats));

    expect(model.actions.map((action) => action.id)).toContain('rsvp-followup');
    expect(model.actions.map((action) => action.id)).toContain('address-wrangler');
    const contactAction = model.actions.find((action) => action.id === 'address-wrangler');
    expect(contactAction?.title).toBe('Collect missing contact info');
    expect(contactAction?.detail).toContain('30 guests');
  });
});
