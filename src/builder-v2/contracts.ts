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
  blocks: BuilderV2Block[];
}

export interface BuilderV2Document {
  version: 'v2';
  sections: BuilderV2Section[];
  updatedAtISO: string;
}
