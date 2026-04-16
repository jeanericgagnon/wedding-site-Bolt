export type CanonicalSectionProps = Record<string, unknown>;

export type CanonicalSectionBindings = {
  venueIds?: string[];
  scheduleItemIds?: string[];
  linkIds?: string[];
  faqIds?: string[];
};

export interface CanonicalSectionInstance {
  id: string;
  type: string;
  variant: string;
  props: CanonicalSectionProps;
  bindings?: CanonicalSectionBindings;
  visible?: boolean;
  locked?: boolean;
  schemaVersion?: number;
  meta?: Record<string, unknown>;
}

export interface CanonicalPage {
  id: string;
  title?: string;
  sections: CanonicalSectionInstance[];
}

export interface CanonicalPageDocument {
  version: 'canonical-page-v1';
  templateId?: string;
  pages: CanonicalPage[];
  meta?: {
    createdAtISO?: string;
    updatedAtISO?: string;
    source?: string;
  };
}
