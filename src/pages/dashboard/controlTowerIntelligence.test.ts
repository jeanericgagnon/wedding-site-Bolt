import { describe, expect, it } from 'vitest';
import { buildControlTowerBriefing } from './controlTowerIntelligence';

function makeInput(overrides: Partial<Parameters<typeof buildControlTowerBriefing>[0]> = {}) {
  return {
    totalGuests: 100,
    confirmedGuests: 42,
    declinedGuests: 8,
    pendingGuests: 50,
    contactableGuestCount: 84,
    itineraryEventCount: 2,
    registryItemCount: 12,
    photoAlbumCount: 2,
    activePhotoAlbumCount: 1,
    interactiveSuggestionCount: 3,
    recentRsvpCount: 4,
    recentSiteActivityCount: 2,
    publishBlockerCount: 0,
    daysUntilWedding: 28,
    isPublished: true,
    isArchiveLike: false,
    ...overrides,
  };
}

describe('buildControlTowerBriefing', () => {
  it('prioritizes archive memory guidance after the wedding', () => {
    const briefing = buildControlTowerBriefing(makeInput({
      isArchiveLike: true,
      daysUntilWedding: -4,
      activePhotoAlbumCount: 0,
    }));

    expect(briefing.title).toContain('memory should take the lead');
    expect(briefing.primaryAction).toMatchObject({ target: 'vault' });
  });

  it('prioritizes launch blockers when the wedding is close', () => {
    const briefing = buildControlTowerBriefing(makeInput({
      isPublished: false,
      publishBlockerCount: 3,
      daysUntilWedding: 18,
      pendingGuests: 5,
    }));

    expect(briefing.title).toContain('Launch readiness');
    expect(briefing.focusTitle).toContain('Clear the blockers');
    expect(briefing.focusDetail).toMatch(/date is close|launch path/i);
    expect(briefing.primaryAction).toMatchObject({ target: 'builder-launch' });
    expect(briefing.badges).toContain('3 blockers');
    expect(briefing.sequence[0]).toMatchObject({ status: 'current' });
  });

  it('prioritizes RSVP follow-up when replies are lagging', () => {
    const briefing = buildControlTowerBriefing(makeInput({
      confirmedGuests: 20,
      declinedGuests: 5,
      pendingGuests: 75,
      recentRsvpCount: 0,
    }));

    expect(briefing.title).toContain('Guest response follow-up');
    expect(briefing.focusTitle).toContain('Turn waiting into deliberate follow-up');
    expect(briefing.focusDetail).toMatch(/dashboard watching|outreach pass/i);
    expect(briefing.primaryAction).toMatchObject({ target: 'guests' });
    expect(briefing.secondaryAction).toMatchObject({ target: 'messages' });
    expect(briefing.sequence.map((step) => step.status)).toEqual(['current', 'next', 'then']);
  });

  it('switches into coordinator-first guidance when launch basics are steady and the wedding is close', () => {
    const briefing = buildControlTowerBriefing(makeInput({
      confirmedGuests: 78,
      declinedGuests: 14,
      pendingGuests: 8,
      contactableGuestCount: 99,
      registryItemCount: 18,
      activePhotoAlbumCount: 2,
      photoAlbumCount: 2,
      interactiveSuggestionCount: 1,
      recentRsvpCount: 5,
      daysUntilWedding: 6,
      isPublished: true,
    }));

    expect(briefing.title).toContain('day-of readiness');
    expect(briefing.primaryAction).toMatchObject({ target: 'coordinator' });
    expect(briefing.secondaryAction).toMatchObject({ target: 'seating' });
  });

  it('pushes schedule work first when the wedding is close and no itinerary exists yet', () => {
    const briefing = buildControlTowerBriefing(makeInput({
      confirmedGuests: 78,
      declinedGuests: 14,
      pendingGuests: 8,
      contactableGuestCount: 100,
      itineraryEventCount: 0,
      registryItemCount: 18,
      activePhotoAlbumCount: 2,
      photoAlbumCount: 2,
      recentRsvpCount: 5,
      daysUntilWedding: 6,
      isPublished: true,
    }));

    expect(briefing.title).toContain('guest-facing schedule');
    expect(briefing.primaryAction).toMatchObject({ target: 'itinerary' });
    expect(briefing.secondaryAction).toMatchObject({ target: 'builder-polish' });
  });

  it('surfaces guest access handoff when a live site is restricted close to the wedding', () => {
    const briefing = buildControlTowerBriefing(makeInput({
      confirmedGuests: 78,
      declinedGuests: 14,
      pendingGuests: 8,
      contactableGuestCount: 100,
      itineraryEventCount: 2,
      registryItemCount: 18,
      activePhotoAlbumCount: 2,
      photoAlbumCount: 2,
      recentRsvpCount: 5,
      daysUntilWedding: 6,
      isPublished: true,
      privacyMode: 'invite_only',
    }));

    expect(briefing.title).toContain('Guest access instructions');
    expect(briefing.primaryAction).toMatchObject({ target: 'settings' });
    expect(briefing.secondaryAction).toMatchObject({ target: 'messages' });
  });

  it('points guest prompt review back to the overview suggestions lane', () => {
    const briefing = buildControlTowerBriefing(makeInput({
      confirmedGuests: 74,
      declinedGuests: 12,
      pendingGuests: 14,
      contactableGuestCount: 100,
      registryItemCount: 20,
      activePhotoAlbumCount: 2,
      photoAlbumCount: 2,
      interactiveSuggestionCount: 4,
      recentSiteActivityCount: 2,
    }));

    expect(briefing.title).toContain('Guest input is arriving');
    expect(briefing.primaryAction).toMatchObject({ target: 'suggestions' });
    expect(briefing.secondaryAction).toMatchObject({ target: 'photos' });
  });

  it('falls back to a calm guidance mode when the board is steady', () => {
    const briefing = buildControlTowerBriefing(makeInput({
      confirmedGuests: 74,
      declinedGuests: 12,
      pendingGuests: 14,
      contactableGuestCount: 100,
      registryItemCount: 20,
      activePhotoAlbumCount: 2,
      photoAlbumCount: 2,
      interactiveSuggestionCount: 0,
      recentSiteActivityCount: 0,
    }));

    expect(briefing.title).toContain('board looks calm');
    expect(briefing.primaryAction).toMatchObject({ target: 'builder-polish' });
  });
});
