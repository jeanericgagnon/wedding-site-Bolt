export interface SiteConfig {
  version: '1';
  template_id: string;
  couple: {
    partner1_name: string;
    partner2_name: string;
    display_name: string;
  };
  event: {
    wedding_date_iso: string | null;
    timezone?: string;
  };
  locations: {
    primary?: {
      name?: string;
      address?: string;
      place_id?: string;
      lat?: number;
      lng?: number;
    };
  };
  rsvp: {
    deadline_iso?: string | null;
    enabled: boolean;
  };
  sections: SectionConfig[];
  content: Record<string, any>;
  theme: {
    preset?: string;
    tokens?: Record<string, string>;
  };
  meta: {
    created_at_iso: string;
    updated_at_iso: string;
  };
}

export interface SectionConfig {
  id: string;
  type: 'hero' | 'details' | 'schedule' | 'travel' | 'registry' | 'faq' | 'rsvp' | 'gallery';
  enabled: boolean;
  props_key: string;
  variant?: string;
  locked?: boolean;
}

export interface HeroContent {
  headline: string;
  subheadline?: string;
  background_image?: string;
}

export interface DetailsContent {
  venue_name: string;
  venue_address: string;
  ceremony_time?: string;
  reception_time?: string;
  attire?: string;
  notes?: string;
}

export interface ScheduleContent {
  items: Array<{
    id: string;
    time: string;
    title: string;
    description?: string;
    location?: string;
  }>;
}

export interface TravelContent {
  hotels?: Array<{
    name: string;
    address?: string;
    phone?: string;
    url?: string;
    notes?: string;
  }>;
  parking?: string;
  transportation?: string;
}

export interface RegistryContent {
  message?: string;
  links?: Array<{
    name: string;
    url: string;
  }>;
}

export interface FaqContent {
  items: Array<{
    id: string;
    question: string;
    answer: string;
  }>;
}

export interface RsvpContent {
  deadline_text?: string;
  meal_options?: string[];
  message?: string;
}

export interface GalleryContent {
  photos: Array<{
    id: string;
    url: string;
    caption?: string;
  }>;
}
