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
