import { demoWeddingSite } from '../lib/demoData';
import { buildCoupleDisplayName } from '../lib/coupleDisplayName';
import { getTemplatePack } from './constants/builderTemplatePacks';
import { BuilderProject, createEmptyBuilderProject } from '../types/builder/project';
import { createDefaultSectionInstance } from '../types/builder/section';
import { WeddingDataV1, createEmptyWeddingData } from '../types/weddingData';

function toIsoDateOrUndefined(value: string): string | undefined {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function buildDemoSchedule(weddingDateISO?: string) {
  if (!weddingDateISO) return [];
  const weddingDate = new Date(weddingDateISO);

  return [
    { id: 'sched-1', label: 'Guest Arrival', startTimeISO: new Date(weddingDate.getTime() - 60 * 60 * 1000).toISOString(), venueId: 'venue-ceremony' },
    { id: 'sched-2', label: 'Ceremony', startTimeISO: weddingDate.toISOString(), venueId: 'venue-ceremony' },
    { id: 'sched-3', label: 'Cocktail Hour', startTimeISO: new Date(weddingDate.getTime() + 90 * 60 * 1000).toISOString(), venueId: 'venue-reception' },
    { id: 'sched-4', label: 'Dinner & Toasts', startTimeISO: new Date(weddingDate.getTime() + 150 * 60 * 1000).toISOString(), venueId: 'venue-reception' },
    { id: 'sched-5', label: 'Dancing', startTimeISO: new Date(weddingDate.getTime() + 240 * 60 * 1000).toISOString(), venueId: 'venue-reception' },
  ];
}

export function createDemoBuilderProject(): BuilderProject {
  const templateId = 'modern-luxe';
  const project = createEmptyBuilderProject(demoWeddingSite.id, templateId);
  const template = getTemplatePack(templateId);

  if (template) {
    project.themeId = template.defaultThemeId;
    project.pages[0].sections = template.sectionComposition.map((section, index) => ({
      ...createDefaultSectionInstance(section.type, section.variant, index),
      enabled: section.enabled,
      locked: section.locked,
      settings: { ...section.settings },
    }));
  }

  return project;
}

export function createDemoWeddingDataFromSite(overrides: Partial<typeof demoWeddingSite> = {}): WeddingDataV1 {
  const data = createEmptyWeddingData();
  const now = new Date();
  const site = { ...demoWeddingSite, ...overrides };
  const weddingDateISO = toIsoDateOrUndefined(site.wedding_date);

  data.couple.partner1Name = site.couple_name_1;
  data.couple.partner2Name = site.couple_name_2;
  data.couple.displayName = buildCoupleDisplayName(site.couple_name_1, site.couple_name_2, 'The couple');
  data.couple.story = 'We met on a rainy Tuesday in Seattle and spent our first date talking for six hours in a tiny coffee shop. Years later, after moving cities, building a home, and collecting too many plants, we got engaged at sunset with our families nearby. We cannot wait to celebrate with everyone we love.';
  data.event.weddingDateISO = weddingDateISO;
  data.event.timezone = 'America/Los_Angeles';

  data.venues = [
    { id: 'venue-ceremony', name: 'Sunset Gardens Estate', address: site.venue_location, notes: 'Ceremony lawn opens at 3:30 PM.' },
    { id: 'venue-reception', name: 'Grand Ballroom', address: '123 Garden Lane, Napa Valley, CA 94558', notes: 'Cocktail hour and reception.' },
  ];

  data.schedule = buildDemoSchedule(weddingDateISO);

  data.rsvp.deadlineISO = new Date(now.getTime() + 45 * 86400000).toISOString();
  data.travel.hotelInfo = 'We reserved room blocks at Hotel Indigo Napa Valley and The Archer. Mention "Thompson-Rivera Wedding" for discounted rates.';
  data.travel.parkingInfo = 'Complimentary valet is available at the main entrance. Rideshare drop-off is at the Garden Gate.';
  data.travel.flightInfo = 'Closest airports: OAK and SFO. From either airport, expect a 70–90 minute drive.';

  data.registry.links = [
    { id: 'reg-1', label: 'Honeyfund', url: 'https://www.honeyfund.com/' },
    { id: 'reg-2', label: 'Crate & Barrel', url: 'https://www.crateandbarrel.com/gift-registry/' },
    { id: 'reg-3', label: 'Amazon', url: 'https://www.amazon.com/wedding' },
  ];
  data.registry.notes = 'Your presence is the best gift. If you would like, you can contribute to our honeymoon and first-home fund.';

  data.faq = [
    { id: 'faq-1', q: 'What is the dress code?', a: 'Garden formal: suits, cocktail dresses, and comfortable shoes for lawn paths.' },
    { id: 'faq-2', q: 'Can I bring a plus one?', a: 'Please refer to your invitation. If your invite includes a plus one, it will be reflected in RSVP.' },
    { id: 'faq-3', q: 'Are kids invited?', a: 'We love your little ones, but this will be an adults-only celebration.' },
    { id: 'faq-4', q: 'What time should I arrive?', a: 'Please arrive 30 minutes before the ceremony so we can begin on time.' },
  ];

  data.media.heroImageUrl = site.hero_image_url;
  data.media.gallery = [
    { id: 'g-1', url: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg', caption: 'Our favorite weekend trip' },
    { id: 'g-2', url: 'https://images.pexels.com/photos/169193/pexels-photo-169193.jpeg', caption: 'Engagement day' },
    { id: 'g-3', url: 'https://images.pexels.com/photos/1468379/pexels-photo-1468379.jpeg', caption: 'City sunset walk' },
    { id: 'g-4', url: 'https://images.pexels.com/photos/265947/pexels-photo-265947.jpeg', caption: 'Celebrating with family' },
    { id: 'g-5', url: 'https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg', caption: 'Weekend market tradition' },
    { id: 'g-6', url: 'https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg', caption: 'Countdown mode' },
  ];

  data.theme.preset = 'elegant';
  data.meta.updatedAtISO = new Date().toISOString();
  return data;
}
