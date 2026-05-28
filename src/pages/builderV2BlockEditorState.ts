import type { BuilderV2BlockType } from '../builder-v2/contracts';

type BlockLike<TType extends string = string> = {
  id: string;
  type: TType;
};

export type BuilderV2BlockAddAllowance = {
  ok: boolean;
  reason: string;
};

export const BUILDER_V2_SECTION_BLOCK_LIMITS: Record<string, { total: number; perType?: Partial<Record<BuilderV2BlockType, number>> }> = {
  hero: { total: 6, perType: { fundHighlight: 0 } },
  story: { total: 10 },
  schedule: { total: 10, perType: { event: 6 } },
  travel: { total: 10, perType: { hotelCard: 4, travelTip: 6 } },
  registry: { total: 10, perType: { fundHighlight: 1 } },
  rsvp: { total: 8, perType: { rsvpNote: 2 } },
  faq: { total: 12, perType: { faqItem: 10, qna: 10 } },
  venue: { total: 8 },
  gallery: { total: 14, perType: { photo: 10 } },
  'wedding-party': { total: 12 },
  'dress-code': { total: 8 },
  directions: { total: 8 },
  accommodations: { total: 10, perType: { hotelCard: 5 } },
  contact: { total: 10, perType: { travelTip: 5, qna: 3 } },
  quotes: { total: 12, perType: { photo: 8 } },
  menu: { total: 14, perType: { travelTip: 10, title: 5 } },
  music: { total: 16, perType: { travelTip: 12, title: 4 } },
  video: { total: 12, perType: { photo: 6, travelTip: 6 } },
  custom: { total: 12 },
};

export const getBuilderV2SectionLimitConfig = (sectionType: string) =>
  BUILDER_V2_SECTION_BLOCK_LIMITS[sectionType] ?? { total: 10, perType: {} };

export function getBuilderV2BlockAddAllowance<TBlock extends BlockLike<BuilderV2BlockType>>({
  sectionType,
  blockType,
  blocks,
  labels,
}: {
  sectionType: string;
  blockType: BuilderV2BlockType;
  blocks: TBlock[];
  labels: Record<BuilderV2BlockType, string>;
}): BuilderV2BlockAddAllowance {
  const cfg = getBuilderV2SectionLimitConfig(sectionType);
  if (blocks.length >= cfg.total) {
    return { ok: false, reason: `Max ${cfg.total} blocks for this section` };
  }

  const perType = cfg.perType?.[blockType];
  if (typeof perType === 'number') {
    const count = blocks.filter((block) => block.type === blockType).length;
    if (count >= perType) {
      return { ok: false, reason: `Max ${perType} ${labels[blockType]} block(s)` };
    }
  }

  return { ok: true, reason: '' };
}

export const toggleBuilderV2CollapsedBlockState = (
  current: Record<string, boolean>,
  blockId: string,
): Record<string, boolean> => ({
  ...current,
  [blockId]: !current[blockId],
});
