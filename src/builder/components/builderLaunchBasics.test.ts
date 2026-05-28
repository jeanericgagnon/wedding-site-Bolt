import { describe, expect, it } from 'vitest';

import { createEmptyWeddingData } from '../../types/weddingData';
import {
  applyBuilderLaunchBasicsDraft,
  createBuilderLaunchBasicsDraft,
  getBuilderLaunchBasicsSummary,
} from './builderLaunchBasics';

describe('builderLaunchBasics', () => {
  it('creates a launch-basics draft from wedding data', () => {
    const weddingData = createEmptyWeddingData();
    weddingData.couple.partner1Name = 'Alex';
    weddingData.couple.partner2Name = 'Jordan';
    weddingData.event.weddingDateISO = '2026-10-14T16:00:00.000Z';
    weddingData.venues = [{ id: 'venue-1', name: 'Sunset Estate', address: '123 Main St' }];

    expect(createBuilderLaunchBasicsDraft(weddingData)).toEqual({
      partner1Name: 'Alex',
      partner2Name: 'Jordan',
      weddingDate: '2026-10-14',
      venueName: 'Sunset Estate',
      venueAddress: '123 Main St',
      rsvpEnabled: true,
    });
  });

  it('applies basics while preserving custom display names and date suffixes', () => {
    const weddingData = createEmptyWeddingData();
    weddingData.couple.partner1Name = 'Old';
    weddingData.couple.partner2Name = 'Names';
    weddingData.couple.displayName = 'The Celebration Weekend';
    weddingData.event.weddingDateISO = '2026-10-14T16:00:00.000Z';
    weddingData.venues = [{ id: 'venue-1', name: 'Old Hall', address: 'Old Address' }];

    const next = applyBuilderLaunchBasicsDraft(weddingData, {
      partner1Name: 'Alex',
      partner2Name: 'Jordan',
      weddingDate: '2026-11-20',
      venueName: 'Sunset Estate',
      venueAddress: '123 Main St',
      rsvpEnabled: false,
    });

    expect(next.couple.partner1Name).toBe('Alex');
    expect(next.couple.partner2Name).toBe('Jordan');
    expect(next.couple.displayName).toBe('The Celebration Weekend');
    expect(next.event.weddingDateISO).toBe('2026-11-20T16:00:00.000Z');
    expect(next.venues[0]).toMatchObject({
      id: 'venue-1',
      name: 'Sunset Estate',
      address: '123 Main St',
    });
    expect(next.rsvp.enabled).toBe(false);
  });

  it('summarizes the exact basics blocker when RSVP is disabled', () => {
    const summary = getBuilderLaunchBasicsSummary({
      partner1Name: 'Alex',
      partner2Name: 'Jordan',
      weddingDate: '2026-11-20',
      venueName: 'Sunset Estate',
      venueAddress: '',
      rsvpEnabled: false,
    }, 'rsvp-disabled');

    expect(summary.focusTitle).toContain('Align the invitation path');
    expect(summary.suggestedField).toBe('rsvpEnabled');
    expect(summary.completedCount).toBe(3);
    expect(summary.items.find((item) => item.id === 'rsvp')?.done).toBe(false);
  });

  it('keeps basics guidance framed around the shared site and ready reply path', () => {
    const namesSummary = getBuilderLaunchBasicsSummary({
      partner1Name: '',
      partner2Name: '',
      weddingDate: '2026-11-20',
      venueName: 'Sunset Estate',
      venueAddress: '',
      rsvpEnabled: true,
    }, 'missing-couple-names');

    expect(namesSummary.bestNextMove).toContain('shared site');

    const rsvpSummary = getBuilderLaunchBasicsSummary({
      partner1Name: 'Alex',
      partner2Name: 'Jordan',
      weddingDate: '2026-11-20',
      venueName: 'Sunset Estate',
      venueAddress: '',
      rsvpEnabled: false,
    }, 'rsvp-disabled');

    expect(rsvpSummary.decisionRule).toContain('reply path should be ready before launch');
  });
});
