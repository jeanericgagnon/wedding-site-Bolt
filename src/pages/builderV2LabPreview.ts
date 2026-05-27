import type { WeddingDataV1 } from '../types/weddingData';
import { demoWeddingSite } from '../lib/demoData';
import { buildCoupleDisplayName } from '../lib/coupleDisplayName';

export function getInitialBuilderV2LabPreviewFields() {
  return {
    coupleDisplayName: buildCoupleDisplayName(
      demoWeddingSite.couple_name_1,
      demoWeddingSite.couple_name_2,
      'The couple',
    ),
    eventDateISO: `${demoWeddingSite.wedding_date}T16:00:00`,
    storyText: 'A modern love story from city coffee dates to sunset vows in Napa.',
    scheduleTitle: 'Wedding Day',
    scheduleNote: 'Weekend events',
    travelFlights: 'Fly into SFO/OAK, then shuttle or rideshare.',
    travelParking: 'On-site valet + overflow lot',
    travelHotels: 'Room blocks at River Inn and Garden Suites',
    travelTips: 'Book early for best rates. Shuttle details shared 2 weeks before.',
    registryTitle: 'Honeymoon Fund',
    registryNote: 'Your presence is our favorite gift.',
    rsvpTitle: 'Kindly reply',
    rsvpDeadlineISO: `${demoWeddingSite.wedding_date}T00:00:00`,
  };
}

export type BuilderV2LabPreviewFields = ReturnType<typeof getInitialBuilderV2LabPreviewFields>;

export function buildBuilderV2LabPreviewFieldsFromWeddingData(
  weddingData: WeddingDataV1,
  fallback = getInitialBuilderV2LabPreviewFields(),
): BuilderV2LabPreviewFields {
  const firstScheduleItem = weddingData.schedule[0];
  const firstRegistryLink = weddingData.registry.links[0];
  const displayName = weddingData.couple.displayName?.trim()
    || buildCoupleDisplayName(
      weddingData.couple.partner1Name,
      weddingData.couple.partner2Name,
      fallback.coupleDisplayName,
    );

  return {
    ...fallback,
    coupleDisplayName: displayName,
    eventDateISO: weddingData.event.weddingDateISO || fallback.eventDateISO,
    storyText: weddingData.couple.story?.trim() || fallback.storyText,
    scheduleTitle: firstScheduleItem?.label?.trim() || fallback.scheduleTitle,
    scheduleNote: firstScheduleItem?.notes?.trim() || fallback.scheduleNote,
    travelFlights: weddingData.travel.flightInfo?.trim() || fallback.travelFlights,
    travelParking: weddingData.travel.parkingInfo?.trim() || fallback.travelParking,
    travelHotels: weddingData.travel.hotelInfo?.trim() || fallback.travelHotels,
    travelTips: weddingData.travel.notes?.trim() || fallback.travelTips,
    registryTitle: firstRegistryLink?.label?.trim() || fallback.registryTitle,
    registryNote: weddingData.registry.notes?.trim() || fallback.registryNote,
    rsvpDeadlineISO: weddingData.rsvp.deadlineISO || fallback.rsvpDeadlineISO,
  };
}
