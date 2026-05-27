import { describe, expect, it } from 'vitest';
import { buildDayOfDispatchModel } from './dayOfDispatch';

describe('buildDayOfDispatchModel', () => {
  it('keeps day-of messaging quiet when the wedding is not close yet', () => {
    const model = buildDayOfDispatchModel({
      daysUntilWedding: 24,
      venueName: 'Garden House',
      pendingGuests: 9,
      itineraryAudienceCount: 0,
      scheduledDayOfCount: 0,
      sentDayOfCount: 0,
      overdueDayOfCount: 0,
    });

    expect(model.title).toMatch(/background/i);
    expect(model.primaryAction.action).toBe('none');
    expect(model.sequence.map((step) => step.status)).toEqual(['current', 'next', 'then']);
  });

  it('prioritizes due day-of sends ahead of drafting new ones', () => {
    const model = buildDayOfDispatchModel({
      daysUntilWedding: 0,
      venueName: 'Garden House',
      pendingGuests: 0,
      itineraryAudienceCount: 3,
      scheduledDayOfCount: 1,
      sentDayOfCount: 0,
      overdueDayOfCount: 1,
    });

    expect(model.title).toMatch(/already due/i);
    expect(model.primaryAction.action).toBe('run-due-scheduled');
    expect(model.sequence[0]?.title).toMatch(/queued day-of note|send/i);
  });

  it('encourages staging one calm update once the wedding is close and no live note exists yet', () => {
    const model = buildDayOfDispatchModel({
      daysUntilWedding: 2,
      venueName: 'Garden House',
      pendingGuests: 1,
      itineraryAudienceCount: 2,
      scheduledDayOfCount: 0,
      sentDayOfCount: 0,
      overdueDayOfCount: 0,
    });

    expect(model.title).toMatch(/stage/i);
    expect(model.primaryAction.action).toBe('compose-day-of-update');
    expect(model.badges[1]).toMatch(/itinerary audience/i);
  });
});
