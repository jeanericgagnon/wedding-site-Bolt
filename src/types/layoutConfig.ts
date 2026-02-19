export type SectionType =
  | 'hero'
  | 'story'
  | 'venue'
  | 'schedule'
  | 'travel'
  | 'registry'
  | 'faq'
  | 'rsvp'
  | 'gallery'
  | 'countdown'
  | 'wedding-party'
  | 'dress-code'
  | 'accommodations'
  | 'contact'
  | 'footer-cta';

export interface SectionInstance {
  id: string;
  type: SectionType;
  variant: string;
  enabled: boolean;
  bindings: {
    venueIds?: string[];
    scheduleItemIds?: string[];
    linkIds?: string[];
    faqIds?: string[];
  };
  settings: {
    showTitle?: boolean;
    title?: string;
    subtitle?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  overrides?: Record<string, any>;
  locked?: boolean;
}

export interface PageConfig {
  id: string;
  title: string;
  sections: SectionInstance[];
}

export interface LayoutConfigV1 {
  version: '1';
  templateId: string;
  pages: PageConfig[];
  meta: {
    createdAtISO: string;
    updatedAtISO: string;
  };
}

export function createEmptyLayoutConfig(templateId: string = 'base'): LayoutConfigV1 {
  const now = new Date().toISOString();
  return {
    version: '1',
    templateId,
    pages: [
      {
        id: 'home',
        title: 'Home',
        sections: [],
      },
    ],
    meta: {
      createdAtISO: now,
      updatedAtISO: now,
    },
  };
}
