export interface WeddingDataV1 {
  // Legacy imported/demo site configs still carry older top-level keys.
  // Runtime normalizers decide which of these are meaningful.
  [key: string]: any;
  version?: '1';
  couple: {
    [key: string]: any;
    partner1Name?: string;
    partner2Name?: string;
    partner1?: string;
    partner2?: string;
    displayName?: string;
    story?: string;
    lastNameDisplay?: string;
  };
  event: {
    [key: string]: any;
    weddingDateISO?: string;
    date?: string;
    timezone?: string;
  };
  venues: Array<{
    id: string;
    orderIndex?: number;
    name?: string;
    address?: string;
    placeId?: string;
    lat?: number;
    lng?: number;
    notes?: string;
  }>;
  schedule: Array<{
    id: string;
    label: string;
    startTimeISO?: string;
    endTimeISO?: string;
    venueId?: string;
    notes?: string;
  }>;
  rsvp: {
    [key: string]: any;
    enabled: boolean;
    deadlineISO?: string;
  };
  travel: {
    [key: string]: any;
    notes?: string;
    accommodations?: string | unknown[];
    parkingInfo?: string;
    hotelInfo?: string;
    flightInfo?: string;
    hotels?: Array<{
      id?: string;
      name?: string;
      distance?: string;
      address?: string;
      phone?: string;
      url?: string;
      notes?: string;
      priceRange?: string;
      bookingCode?: string;
      bookingDeadline?: string;
      shuttleInfo?: string;
    }>;
    roomBlocks?: Array<{
      id?: string;
      hotelName?: string;
      hotel?: string;
      bookingCode?: string;
      bookingDeadline?: string;
      detail?: string;
      url?: string;
    }>;
    shuttles?: Array<{
      id?: string;
      label?: string;
      route?: string;
      departureTime?: string;
      returnTime?: string;
      notes?: string;
    }>;
    visaTips?: string[];
    culturalTips?: string[];
  };
  registry: any;
  faq: Array<{
    id: string;
    q: string;
    a: string;
  }>;
  theme: {
    [key: string]: any;
    preset?: string;
    primaryColor?: string;
    tokens?: Record<string, string>;
  };
  media: {
    heroImageUrl?: string;
    gallery: Array<{
      id: string;
      url: string;
      caption?: string;
    }>;
  };
  weddingParty?: unknown;
  meta: {
    createdAtISO: string;
    updatedAtISO: string;
    useCasePacks?: string[];
  };
}

export function createEmptyWeddingData(): WeddingDataV1 {
  const now = new Date().toISOString();
  return {
    version: '1',
    couple: {
      partner1Name: '',
      partner2Name: '',
    },
    event: {},
    venues: [],
    schedule: [],
    rsvp: {
      enabled: true,
    },
    travel: {},
    registry: {
      links: [],
    },
    faq: [],
    theme: {},
    media: {
      gallery: [],
    },
    meta: {
      createdAtISO: now,
      updatedAtISO: now,
    },
  };
}

export function normalizeWeddingData(input: unknown): WeddingDataV1 {
  const fallback = createEmptyWeddingData();
  if (!input || typeof input !== 'object') return fallback;

  const source = input as Partial<WeddingDataV1>;
  const couple = (source.couple ?? {}) as Partial<WeddingDataV1['couple']>;
  const event = (source.event ?? {}) as Partial<WeddingDataV1['event']>;
  const rsvp = (source.rsvp ?? {}) as Partial<WeddingDataV1['rsvp']>;
  const travel = (source.travel ?? {}) as Partial<WeddingDataV1['travel']>;
  const registry = (source.registry ?? {}) as Partial<WeddingDataV1['registry']>;
  const theme = (source.theme ?? {}) as Partial<WeddingDataV1['theme']>;
  const media = (source.media ?? {}) as Partial<WeddingDataV1['media']>;
  const meta = (source.meta ?? {}) as Partial<WeddingDataV1['meta']>;

  return {
    ...fallback,
    ...source,
    couple: {
      ...fallback.couple,
      ...couple,
    },
    event: {
      ...fallback.event,
      ...event,
    },
    rsvp: {
      ...fallback.rsvp,
      ...rsvp,
    },
    travel: {
      ...fallback.travel,
      ...travel,
    },
    registry: {
      ...fallback.registry,
      ...registry,
      links: Array.isArray(registry.links) ? registry.links : fallback.registry.links,
    },
    theme: {
      ...fallback.theme,
      ...theme,
    },
    media: {
      ...fallback.media,
      ...media,
      gallery: Array.isArray(media.gallery) ? media.gallery : fallback.media.gallery,
    },
    venues: Array.isArray(source.venues) ? source.venues : fallback.venues,
    schedule: Array.isArray(source.schedule) ? source.schedule : fallback.schedule,
    faq: Array.isArray(source.faq) ? source.faq : fallback.faq,
    meta: {
      ...fallback.meta,
      ...meta,
    },
  };
}
