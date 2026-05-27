import { describe, expect, it } from 'vitest';
import { buildCoupleFocusModel } from './coupleFocus';

describe('buildCoupleFocusModel', () => {
  it('prioritizes launch blockers before other work', () => {
    const model = buildCoupleFocusModel({
      daysUntilWedding: 40,
      isPublished: false,
      isArchiveLike: false,
      publishBlockerCount: 3,
      pendingGuestCount: 8,
      contactGapCount: 2,
      overdueTaskCount: 1,
      dueSoonVendorCount: 0,
      seatingUnassignedCount: 4,
    });

    expect(model.headline).toMatch(/launch readiness/i);
    expect(model.steps[0]?.id).toBe('launch');
    expect(model.steps[1]?.id).toBe('guests');
    expect(model.steps[2]).toMatchObject({ id: 'planning', target: 'planning' });
  });

  it('prioritizes planning pressure when launch is already stable', () => {
    const model = buildCoupleFocusModel({
      daysUntilWedding: 80,
      isPublished: true,
      isArchiveLike: false,
      publishBlockerCount: 0,
      pendingGuestCount: 0,
      contactGapCount: 0,
      overdueTaskCount: 2,
      dueSoonVendorCount: 1,
      seatingUnassignedCount: 0,
    });

    expect(model.headline).toMatch(/planning pressure/i);
    expect(model.steps[0]).toMatchObject({ id: 'planning', target: 'planning-tasks' });
  });

  it('routes vendor pressure to the vendor planning lane', () => {
    const model = buildCoupleFocusModel({
      daysUntilWedding: 80,
      isPublished: true,
      isArchiveLike: false,
      publishBlockerCount: 0,
      pendingGuestCount: 0,
      contactGapCount: 0,
      overdueTaskCount: 0,
      dueSoonVendorCount: 2,
      seatingUnassignedCount: 0,
    });

    expect(model.headline).toMatch(/planning pressure/i);
    expect(model.steps[0]).toMatchObject({ id: 'planning', target: 'planning-vendors' });
  });

  it('shifts toward day-of readiness when the wedding is close and the list is calm', () => {
    const model = buildCoupleFocusModel({
      daysUntilWedding: 12,
      isPublished: true,
      isArchiveLike: false,
      publishBlockerCount: 0,
      pendingGuestCount: 0,
      contactGapCount: 0,
      overdueTaskCount: 0,
      dueSoonVendorCount: 0,
      seatingUnassignedCount: 0,
    });

    expect(model.steps[0]?.id).toBe('day-of');
    expect(model.headline).toMatch(/live readiness/i);
  });

  it('prioritizes schedule clarity when the wedding is close and no itinerary exists yet', () => {
    const model = buildCoupleFocusModel({
      daysUntilWedding: 12,
      isPublished: true,
      isArchiveLike: false,
      publishBlockerCount: 0,
      pendingGuestCount: 0,
      contactGapCount: 0,
      overdueTaskCount: 0,
      dueSoonVendorCount: 0,
      seatingUnassignedCount: 0,
      itineraryEventCount: 0,
    });

    expect(model.headline).toMatch(/weekend timeline/i);
    expect(model.steps[0]).toMatchObject({ id: 'itinerary', target: 'itinerary' });
    expect(model.steps[1]?.id).toBe('launch');
  });

  it('surfaces restricted guest access as the couple focus when the site is live and the wedding is close', () => {
    const model = buildCoupleFocusModel({
      daysUntilWedding: 12,
      isPublished: true,
      isArchiveLike: false,
      privacyMode: 'password_protected',
      publishBlockerCount: 0,
      pendingGuestCount: 0,
      contactGapCount: 0,
      overdueTaskCount: 0,
      dueSoonVendorCount: 0,
      seatingUnassignedCount: 0,
      itineraryEventCount: 2,
    });

    expect(model.headline).toMatch(/guest access/i);
    expect(model.steps[0]).toMatchObject({ id: 'launch', target: 'settings' });
    expect(model.steps[1]?.id).toBe('guests');
  });
});
