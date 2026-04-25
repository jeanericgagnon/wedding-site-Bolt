import { WeddingDataV1 } from '../types/weddingData';
import { buildCoupleDisplayName } from '../lib/coupleDisplayName';

interface SectionBindings {
  venueIds?: string[];
  scheduleItemIds?: string[];
  linkIds?: string[];
  faqIds?: string[];
}

interface BindableSection {
  type: string;
  variant: string;
  data: Record<string, unknown>;
  bindings?: SectionBindings;
}

function hasMeaningfulString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function preferMeaningfulString(value: unknown, fallback: string): string {
  return hasMeaningfulString(value) ? value : fallback;
}

function preferMeaningfulArray<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) && value.length > 0 ? value as T[] : fallback;
}

function normalizeBindableSectionType(type: string): string {
  const normalizedType = type.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  switch (normalizedType) {
    case 'registrysection':
      return 'registry';
    case 'venuesection':
      return 'venue';
    case 'schedulesection':
      return 'schedule';
    case 'faqsection':
      return 'faq';
    default:
      return normalizedType;
  }
}

const DEFAULT_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});

const DEFAULT_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

function formatTime(iso?: string): string {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  return DEFAULT_TIME_FORMATTER.format(dt);
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  return DEFAULT_DATE_FORMATTER.format(dt);
}

function toMapsUrl(name?: string, address?: string): string {
  const q = [name, address].filter(Boolean).join(' ');
  if (!q) return '';
  return `https://maps.google.com/?q=${encodeURIComponent(q)}`;
}

function pickByIds<T extends { id: string }>(items: T[], ids?: string[]): T[] {
  if (!ids || ids.length === 0) return items;
  const idSet = new Set(ids);
  return items.filter((item) => idSet.has(item.id));
}

function bindVenue(section: BindableSection, weddingData: WeddingDataV1): Record<string, unknown> {
  const venues = Array.isArray((weddingData as Partial<WeddingDataV1>).venues)
    ? (weddingData as Partial<WeddingDataV1>).venues!
    : [];
  const weddingDateISO = (weddingData as Partial<WeddingDataV1>).event?.weddingDateISO;

  const selectedVenues = pickByIds(venues, section.bindings?.venueIds)
    .filter((v) => !!v.name || !!v.address);
  const fallbackVenues = venues.filter((v) => !!v.name || !!v.address);
  const venuesToUse = selectedVenues.length > 0 ? selectedVenues : fallbackVenues;

  if (venuesToUse.length === 0) return section.data;

  const dateText = formatDate(weddingDateISO);
  const timeText = weddingDateISO ? formatTime(weddingDateISO) : '';

  const mappedVenues = venuesToUse.map((venue, index) => ({
    id: venue.id,
    name: venue.name ?? '',
    role: index === 0 ? 'Ceremony & Reception' : 'Venue',
    address: venue.address ?? '',
    city: '',
    time: timeText,
    date: dateText,
    notes: venue.notes ?? '',
    mapUrl: toMapsUrl(venue.name, venue.address),
    mapEmbedUrl: '',
    description: venue.notes ?? '',
    image: '',
    details: [
      venue.address ? { id: `${venue.id}-address`, icon: 'mapPin', label: 'Address', value: venue.address } : null,
      timeText ? { id: `${venue.id}-time`, icon: 'clock', label: 'Time', value: timeText } : null,
      dateText ? { id: `${venue.id}-date`, icon: 'calendar', label: 'Date', value: dateText } : null,
    ].filter(Boolean),
  }));

  return {
    ...section.data,
    venues: mappedVenues,
  };
}

function bindSchedule(section: BindableSection, weddingData: WeddingDataV1): Record<string, unknown> {
  const schedule = Array.isArray((weddingData as Partial<WeddingDataV1>).schedule)
    ? (weddingData as Partial<WeddingDataV1>).schedule!
    : [];
  const venues = Array.isArray((weddingData as Partial<WeddingDataV1>).venues)
    ? (weddingData as Partial<WeddingDataV1>).venues!
    : [];
  const weddingDateISO = (weddingData as Partial<WeddingDataV1>).event?.weddingDateISO;

  const selectedItems = pickByIds(schedule, section.bindings?.scheduleItemIds)
    .filter((item) => !!item.label);
  const fallbackItems = schedule.filter((item) => !!item.label);
  const itemsToUse = selectedItems.length > 0 ? selectedItems : fallbackItems;

  if (itemsToUse.length === 0) return section.data;

  const venueLookup = new Map(venues.map((v) => [v.id, v]));

  const events = itemsToUse.map((item, index) => {
    const venue = item.venueId ? venueLookup.get(item.venueId) : null;
    return {
      id: item.id,
      time: formatTime(item.startTimeISO),
      endTime: formatTime(item.endTimeISO),
      label: item.label,
      description: item.notes ?? '',
      location: venue?.name ?? venue?.address ?? '',
      category: index === 0 ? 'other' : 'other',
      image: '',
      icon: '',
      highlight: index === 0,
    };
  });

  const dayLabel = formatDate(weddingDateISO);

  return {
    ...section.data,
    date: dayLabel || section.data.date,
    events,
    days: [
      {
        id: 'day-1',
        label: dayLabel ? dayLabel.split(',')[0] : 'Day 1',
        date: dayLabel,
        events: events.map((e) => ({
          id: e.id,
          time: e.time,
          label: e.label,
          description: e.description,
          location: e.location,
          highlight: e.highlight,
        })),
      },
    ],
  };
}

function bindFaq(section: BindableSection, weddingData: WeddingDataV1): Record<string, unknown> {
  const faqItems = Array.isArray((weddingData as Partial<WeddingDataV1>).faq)
    ? (weddingData as Partial<WeddingDataV1>).faq!
    : [];

  const selectedItems = pickByIds(faqItems, section.bindings?.faqIds)
    .filter((item) => !!item.q || !!item.a);
  const fallbackItems = faqItems.filter((item) => !!item.q || !!item.a);
  const itemsToUse = selectedItems.length > 0 ? selectedItems : fallbackItems;

  if (itemsToUse.length === 0) return section.data;

  return {
    ...section.data,
    items: itemsToUse.map((item) => ({
      id: item.id,
      question: item.q,
      answer: item.a,
    })),
  };
}

function bindRegistry(section: BindableSection, weddingData: WeddingDataV1): Record<string, unknown> {
  const registryLinks = Array.isArray((weddingData as Partial<WeddingDataV1>).registry?.links)
    ? (weddingData as Partial<WeddingDataV1>).registry!.links
    : [];

  const selectedLinks = pickByIds(registryLinks, section.bindings?.linkIds)
    .filter((link) => !!link.url);
  const fallbackLinks = registryLinks.filter((link) => !!link.url);
  const linksToUse = selectedLinks.length > 0 ? selectedLinks : fallbackLinks;

  if (linksToUse.length === 0) return section.data;

  const storeLinks = linksToUse.map((link) => ({
    id: link.id,
    store: link.label ?? 'Registry',
    url: link.url,
    description: '',
    logo: '',
  }));

  const safeCashFundUrl = typeof section.data.cashFundUrl === 'string' && section.data.cashFundUrl !== '#'
    ? section.data.cashFundUrl
    : '';

  return {
    ...section.data,
    links: storeLinks,
    storeLinks,
    viewAllUrl: linksToUse[0]?.url ?? '',
    cashFundUrl: safeCashFundUrl,
    cashFundEnabled: safeCashFundUrl ? !!section.data.cashFundEnabled : false,
  };
}

function bindRsvp(section: BindableSection, weddingData: WeddingDataV1): Record<string, unknown> {
  const venues = Array.isArray((weddingData as Partial<WeddingDataV1>).venues)
    ? (weddingData as Partial<WeddingDataV1>).venues!
    : [];
  const schedule = Array.isArray((weddingData as Partial<WeddingDataV1>).schedule)
    ? (weddingData as Partial<WeddingDataV1>).schedule!
    : [];
  const weddingDateISO = (weddingData as Partial<WeddingDataV1>).event?.weddingDateISO;
  const rsvpDeadlineISO = (weddingData as Partial<WeddingDataV1>).rsvp?.deadlineISO;

  const venueLookup = new Map(venues.map((v) => [v.id, v]));
  const events = schedule
    .filter((item) => !!item.label)
    .map((item) => ({
      id: item.id,
      label: item.label,
      description: item.notes ?? '',
      date: formatDate(item.startTimeISO) || formatDate(weddingDateISO),
      location: (item.venueId ? venueLookup.get(item.venueId)?.name : '') ?? '',
    }));

  const deadline = rsvpDeadlineISO ? formatDate(rsvpDeadlineISO) : '';

  return {
    ...section.data,
    deadline: deadline || section.data.deadline,
    events: events.length > 0 ? events : section.data.events,
  };
}

function bindCommon(section: BindableSection, weddingData: WeddingDataV1): Record<string, unknown> {
  const coupleName = weddingData.couple.displayName || buildCoupleDisplayName(weddingData.couple.partner1Name, weddingData.couple.partner2Name);
  const weddingDate = formatDate(weddingData.event?.weddingDateISO);
  const primaryVenue = (weddingData.venues || [])[0];
  const venueName = primaryVenue?.name || '';
  const venueAddress = primaryVenue?.address || '';
  const locationLine = [venueName, venueAddress].filter(Boolean).join(' · ');
  const hero = weddingData.media?.heroImageUrl || '';
  const gallery = (weddingData.media?.gallery || []).filter((g) => Boolean(g.url?.trim()));
  const galleryUrls = gallery.map((g) => g.url);
  const galleryObjects = gallery.map((g, index) => ({
    id: g.id || `gallery-${index}`,
    url: g.url,
    caption: g.caption || '',
    alt: g.caption || '',
  }));

  return {
    ...section.data,
    // Core names/text
    headline: preferMeaningfulString(section.data.headline, coupleName),
    title: preferMeaningfulString(section.data.title, coupleName),
    coupleName: preferMeaningfulString(section.data.coupleName, coupleName),
    names: preferMeaningfulString(section.data.names, coupleName),
    subheadline: preferMeaningfulString(section.data.subheadline, weddingDate || ''),

    // Date/time/location
    weddingDate: preferMeaningfulString(section.data.weddingDate, weddingDate),
    date: preferMeaningfulString(section.data.date, weddingDate),
    eventDate: preferMeaningfulString(section.data.eventDate, weddingDate),
    location: preferMeaningfulString(section.data.location, locationLine),
    venueName: preferMeaningfulString(section.data.venueName, venueName),
    venueAddress: preferMeaningfulString(section.data.venueAddress, venueAddress),
    address: preferMeaningfulString(section.data.address, venueAddress),

    // Images/media (content only, no style changes)
    heroImage: preferMeaningfulString(section.data.heroImage, hero),
    heroImageUrl: preferMeaningfulString(section.data.heroImageUrl, hero),
    backgroundImage: preferMeaningfulString(section.data.backgroundImage, hero),
    image: preferMeaningfulString(section.data.image, hero),
    coverImage: preferMeaningfulString(section.data.coverImage, hero),
    images: preferMeaningfulArray(section.data.images, galleryObjects),
    photos: preferMeaningfulArray(section.data.photos, galleryUrls),
    galleryImages: preferMeaningfulArray(section.data.galleryImages, galleryObjects),

    // Footer defaults
    copyrightText: preferMeaningfulString(
      section.data.copyrightText,
      coupleName && weddingDate ? `${coupleName} · ${weddingDate}` : '',
    ),
  };
}

export function applyWeddingDataBindings(section: BindableSection, weddingData?: WeddingDataV1 | null): Record<string, unknown> {
  if (!weddingData) return section.data;

  const normalizedSection = { ...section, type: normalizeBindableSectionType(section.type) };
  const withCommon = { ...normalizedSection, data: bindCommon(normalizedSection, weddingData) };

  switch (normalizedSection.type) {
    case 'venue':
      return bindVenue(withCommon, weddingData);
    case 'schedule':
      return bindSchedule(withCommon, weddingData);
    case 'faq':
      return bindFaq(withCommon, weddingData);
    case 'registry':
      return bindRegistry(withCommon, weddingData);
    case 'rsvp':
      return bindRsvp(withCommon, weddingData);
    default:
      return withCommon.data;
  }
}
