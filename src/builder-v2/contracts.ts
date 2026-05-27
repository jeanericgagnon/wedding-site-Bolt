export const BUILDER_V2_BLOCK_TYPES = [
  'title',
  'text',
  'qna',
  'photo',
  'story',
  'timelineItem',
  'event',
  'travelTip',
  'hotelCard',
  'registryItem',
  'fundHighlight',
  'rsvpNote',
  'faqItem',
  'divider',
] as const;

export type BuilderV2BlockType = typeof BUILDER_V2_BLOCK_TYPES[number];

export type BuilderV2BlockData = {
  text?: string;
  question?: string;
  answer?: string;
  imageUrl?: string;
  caption?: string;
  title?: string;
  subtitle?: string;
  time?: string;
  location?: string;
  note?: string;
  url?: string;
  phone?: string;
  email?: string;
  role?: string;
  bookingCode?: string;
  blockDeadline?: string;
  priceRange?: string;
  distance?: string;
  rideshareNote?: string;
};

export interface BuilderV2Block {
  id: string;
  type: BuilderV2BlockType;
  data: BuilderV2BlockData;
}

export interface BuilderV2Section {
  id: string;
  type: string;
  variant: string;
  enabled: boolean;
  title?: string;
  subtitle?: string;
  bindings?: {
    venueIds?: string[];
    scheduleItemIds?: string[];
    linkIds?: string[];
    faqIds?: string[];
    mediaAssetIds?: string[];
  };
  blocks: BuilderV2Block[];
}

export interface BuilderV2Page {
  id: string;
  title: string;
  slug: string;
  isHome: boolean;
  hidden?: boolean;
  sections: BuilderV2Section[];
}

export interface BuilderV2Document {
  version: 'v2';
  pages?: BuilderV2Page[];
  sections?: BuilderV2Section[];
  updatedAtISO: string;
}

export const getBuilderV2Pages = (document: BuilderV2Document): BuilderV2Page[] => {
  if (Array.isArray(document.pages) && document.pages.length > 0) {
    return document.pages;
  }

  const sections = Array.isArray(document.sections) ? document.sections : [];
  return [
    {
      id: 'home',
      title: 'Home',
      slug: 'home',
      isHome: true,
      hidden: false,
      sections,
    },
  ];
};
