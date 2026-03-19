import { WeddingDataV1 } from '../types/weddingData';

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
  const selectedVenues = pickByIds(weddingData.venues, section.bindings?.venueIds)
    .filter((v) => !!v.name || !!v.address);

  if (selectedVenues.length === 0) return section.data;

  const dateText = formatDate(weddingData.event.weddingDateISO);
  const timeText = weddingData.event.weddingDateISO ? formatTime(weddingData.event.weddingDateISO) : '';

  const venues = selectedVenues.map((venue, index) => ({
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
    venues,
  };
}

function bindSchedule(section: BindableSection, weddingData: WeddingDataV1): Record<string, unknown> {
  const selectedItems = pickByIds(weddingData.schedule, section.bindings?.scheduleItemIds)
    .filter((item) => !!item.label);

  if (selectedItems.length === 0) return section.data;

  const venueLookup = new Map(weddingData.venues.map((v) => [v.id, v]));

  const events = selectedItems.map((item, index) => {
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

  const dayLabel = formatDate(weddingData.event.weddingDateISO);

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

function bindRegistry(section: BindableSection, weddingData: WeddingDataV1): Record<string, unknown> {
  const selectedLinks = pickByIds(weddingData.registry.links, section.bindings?.linkIds)
    .filter((link) => !!link.url);

  if (selectedLinks.length === 0) return section.data;

  const storeLinks = selectedLinks.map((link) => ({
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
    viewAllUrl: selectedLinks[0]?.url ?? '',
    cashFundUrl: safeCashFundUrl,
    cashFundEnabled: safeCashFundUrl ? !!section.data.cashFundEnabled : false,
  };
}

function bindRsvp(section: BindableSection, weddingData: WeddingDataV1): Record<string, unknown> {
  const venueLookup = new Map(weddingData.venues.map((v) => [v.id, v]));
  const events = weddingData.schedule
    .filter((item) => !!item.label)
    .map((item) => ({
      id: item.id,
      label: item.label,
      description: item.notes ?? '',
      date: formatDate(item.startTimeISO) || formatDate(weddingData.event.weddingDateISO),
      location: (item.venueId ? venueLookup.get(item.venueId)?.name : '') ?? '',
    }));

  const deadline = weddingData.rsvp.deadlineISO ? formatDate(weddingData.rsvp.deadlineISO) : '';

  return {
    ...section.data,
    deadline: deadline || section.data.deadline,
    events: events.length > 0 ? events : section.data.events,
  };
}

export function applyWeddingDataBindings(section: BindableSection, weddingData?: WeddingDataV1 | null): Record<string, unknown> {
  if (!weddingData) return section.data;

  switch (section.type) {
    case 'venue':
      return bindVenue(section, weddingData);
    case 'schedule':
      return bindSchedule(section, weddingData);
    case 'registry':
      return bindRegistry(section, weddingData);
    case 'rsvp':
      return bindRsvp(section, weddingData);
    default:
      return section.data;
  }
}
