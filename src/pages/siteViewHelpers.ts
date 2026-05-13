import { buildCoupleDisplayName } from '../lib/coupleDisplayName';
import { demoWeddingSite } from '../lib/demoData';
import { type WeddingDataV1, createEmptyWeddingData } from '../types/weddingData';

export function toIsoDateOrUndefined(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined;

  const date = new Date(`${trimmed}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return undefined;

  return date.toISOString().slice(0, 10) === trimmed ? date.toISOString() : undefined;
}

export function combineDateAndTime(date?: string, time?: string | null): string | undefined {
  const safeDateIso = toIsoDateOrUndefined(date);
  if (!safeDateIso) return undefined;
  if (!time) return undefined;
  const trimmedTime = time.trim();
  if (!trimmedTime) return undefined;
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(trimmedTime)) return undefined;

  const safeDate = safeDateIso.slice(0, 10);
  const normalizedTime = trimmedTime.length === 5 ? `${trimmedTime}:00` : trimmedTime;
  const iso = `${safeDate}T${normalizedTime}`;
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? undefined : dt.toISOString();
}

export function createAlexJordanDemoWeddingData(overrides: Partial<typeof demoWeddingSite> = {}): WeddingDataV1 {
  const site = { ...demoWeddingSite, ...overrides };
  const data = createEmptyWeddingData();
  data.couple.partner1Name = site.couple_name_1;
  data.couple.partner2Name = site.couple_name_2;
  data.couple.displayName = buildCoupleDisplayName(site.couple_name_1, site.couple_name_2, 'The couple');
  data.couple.story = 'We met through friends, got lost in a long first conversation, and somehow the rest of the evening became the beginning of this next chapter. We cannot wait to gather everyone we love in one place.';
  data.event.weddingDateISO = toIsoDateOrUndefined(site.wedding_date);
  data.venues = [{ id: 'demo-venue-1', name: site.venue_name, address: site.venue_location }];
  data.schedule = [
    { id: 'demo-welcome', label: 'Welcome Drinks', startTimeISO: '2026-06-14T18:00:00', venueId: 'demo-venue-1', notes: 'A relaxed hello before the wedding day.' },
    { id: 'demo-ceremony', label: 'Ceremony', startTimeISO: '2026-06-15T16:00:00', venueId: 'demo-venue-1', notes: 'Garden ceremony followed by cocktails nearby.' },
    { id: 'demo-reception', label: 'Dinner and Dancing', startTimeISO: '2026-06-15T18:00:00', venueId: 'demo-venue-1', notes: 'Dinner, speeches, and a full dance floor.' },
  ];
  data.travel = {
    notes: 'Napa evenings cool down quickly. Bring a light layer for the garden and plan rideshare pickup near the main estate entrance.',
    parkingInfo: 'Complimentary valet will be available at the venue entrance.',
    hotelInfo: 'A small room block is available nearby under the Thompson Rivera wedding.',
  };
  data.registry = {
    links: [
      { id: 'demo-registry-1', label: 'Honeymoon Fund', url: 'https://dayof.love' },
      { id: 'demo-registry-2', label: 'Home Registry', url: 'https://dayof.love' },
    ],
    notes: 'Your presence is enough. For anyone who has asked, we added a few ways to celebrate this next chapter.',
  };
  data.faq = [
    { id: 'demo-faq-1', q: 'What should I wear?', a: 'Cocktail attire works perfectly. The ceremony is outside, so block heels or comfortable shoes are recommended.' },
    { id: 'demo-faq-2', q: 'Can I bring a plus one?', a: 'Please check your RSVP. If a guest is included, their name will appear with your invitation.' },
  ];
  data.media.heroImageUrl = site.hero_image_url;
  data.media.gallery = [
    { id: 'demo-gallery-1', url: 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg', caption: 'Garden celebration' },
    { id: 'demo-gallery-2', url: 'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg', caption: 'Dinner under soft light' },
    { id: 'demo-gallery-3', url: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg', caption: 'A quiet moment together' },
  ];
  data.theme.preset = 'elegant';
  return data;
}
