export interface WeddingDataV1 {
  version: '1';
  couple: {
    partner1Name: string;
    partner2Name: string;
    displayName?: string;
    story?: string;
    lastNameDisplay?: string;
  };
  event: {
    weddingDateISO?: string;
    timezone?: string;
  };
  venues: Array<{
    id: string;
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
    enabled: boolean;
    deadlineISO?: string;
  };
  travel: {
    notes?: string;
    parkingInfo?: string;
    hotelInfo?: string;
    flightInfo?: string;
  };
  registry: {
    links: Array<{
      id: string;
      label?: string;
      url: string;
    }>;
    notes?: string;
  };
  faq: Array<{
    id: string;
    q: string;
    a: string;
  }>;
  theme: {
    preset?: string;
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
