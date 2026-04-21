import { describe, expect, it } from 'vitest';
import { deriveInviteEvents } from './rsvpEventFallback';

describe('deriveInviteEvents', () => {
  it('prefers real itinerary events when present', () => {
    const itinerary = [{ id: '1', event_name: 'Welcome Dinner', event_date: '2027-01-15', start_time: '', location_name: 'Amor' }];
    const seeds = [{ id: 'seed-1', label: 'Friday Welcome Dinner', locationName: 'Fallback Place' }];
    expect(deriveInviteEvents(itinerary, seeds)).toEqual(itinerary);
  });

  it('falls back to RSVP seeds when itinerary events are missing', () => {
    const fallback = deriveInviteEvents([], [
      { id: 'seed-1', label: 'Friday Pickleball Tournament', locationName: 'Narwhal Pickleball Club' },
      { id: 'seed-2', label: 'Welcome Dinner', locationName: 'Amor Boutique Hotel' },
    ]);

    expect(fallback).toEqual([
      { id: 'seed-1', event_name: 'Friday Pickleball Tournament', event_date: '', start_time: '', location_name: 'Narwhal Pickleball Club' },
      { id: 'seed-2', event_name: 'Welcome Dinner', event_date: '', start_time: '', location_name: 'Amor Boutique Hotel' },
    ]);
  });

  it('falls back to RSVP seeds when itinerary rows exist but are only blank placeholders', () => {
    const fallback = deriveInviteEvents([
      { id: 'placeholder-1', event_name: '', event_date: '', start_time: '', location_name: '' },
      { id: 'placeholder-2', event_name: '   ', event_date: null, start_time: null, location_name: '   ' },
    ], [
      { id: 'seed-1', label: 'Welcome Party', locationName: 'Casa Verde' },
      { id: 'seed-2', label: 'Farewell Brunch', locationName: 'Beach Club' },
    ]);

    expect(fallback).toEqual([
      { id: 'seed-1', event_name: 'Welcome Party', event_date: '', start_time: '', location_name: 'Casa Verde' },
      { id: 'seed-2', event_name: 'Farewell Brunch', event_date: '', start_time: '', location_name: 'Beach Club' },
    ]);
  });
});
