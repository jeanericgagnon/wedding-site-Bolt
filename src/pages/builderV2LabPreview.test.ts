import { describe, expect, it } from 'vitest';

import { buildBuilderV2LabPreviewFieldsFromWeddingData, getInitialBuilderV2LabPreviewFields } from './builderV2LabPreview';
import { createEmptyWeddingData } from '../types/weddingData';

describe('builderV2LabPreview', () => {
  it('hydrates preview fields from real wedding data when available', () => {
    const weddingData = createEmptyWeddingData();
    weddingData.couple.partner1Name = 'Alex';
    weddingData.couple.partner2Name = 'Jordan';
    weddingData.couple.story = 'From coffee dates to sunset vows.';
    weddingData.event.weddingDateISO = '2026-09-14T16:00:00.000Z';
    weddingData.schedule = [{ id: '1', label: 'Wedding Weekend', notes: 'Ceremony, dinner, and dancing.' }];
    weddingData.travel.flightInfo = 'Fly into SFO';
    weddingData.travel.parkingInfo = 'Valet at the venue';
    weddingData.travel.hotelInfo = 'Room block at River Inn';
    weddingData.travel.notes = 'Book by August 1.';
    weddingData.registry.links = [{ id: 'reg-1', label: 'Honeymoon Fund', url: 'https://example.com' }];
    weddingData.registry.notes = 'Your presence is enough.';
    weddingData.rsvp.deadlineISO = '2026-08-01T00:00:00.000Z';

    const preview = buildBuilderV2LabPreviewFieldsFromWeddingData(weddingData);
    expect(preview).toMatchObject({
      coupleDisplayName: 'Alex & Jordan',
      storyText: 'From coffee dates to sunset vows.',
      eventDateISO: '2026-09-14T16:00:00.000Z',
      scheduleTitle: 'Wedding Weekend',
      scheduleNote: 'Ceremony, dinner, and dancing.',
      travelFlights: 'Fly into SFO',
      travelParking: 'Valet at the venue',
      travelHotels: 'Room block at River Inn',
      travelTips: 'Book by August 1.',
      registryTitle: 'Honeymoon Fund',
      registryNote: 'Your presence is enough.',
      rsvpDeadlineISO: '2026-08-01T00:00:00.000Z',
    });
  });

  it('keeps stable fallbacks when wedding data is still thin', () => {
    const preview = buildBuilderV2LabPreviewFieldsFromWeddingData(createEmptyWeddingData(), getInitialBuilderV2LabPreviewFields());
    expect(preview.coupleDisplayName).toBeTruthy();
    expect(preview.registryTitle).toBeTruthy();
    expect(preview.scheduleTitle).toBeTruthy();
  });
});
