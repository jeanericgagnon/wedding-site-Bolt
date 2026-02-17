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
