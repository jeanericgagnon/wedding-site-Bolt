type BuilderV2ReviewBlockInput = {
  type: string;
  content: string;
  data?: Record<string, unknown>;
};

type BuilderV2ReviewSectionInput = {
  title: string;
  subtitle?: string;
  type: string;
  variant?: string;
  enabled: boolean;
  density?: string;
};

export const buildBuilderV2SectionReviewSignature = ({
  section,
  blocks,
}: {
  section: BuilderV2ReviewSectionInput;
  blocks: BuilderV2ReviewBlockInput[];
}): string => JSON.stringify({
  title: section.title,
  subtitle: section.subtitle ?? '',
  type: section.type,
  variant: section.variant ?? 'default',
  enabled: section.enabled,
  density: section.density ?? 'comfortable',
  blocks: blocks.map((block) => ({
    type: block.type,
    content: block.content,
    data: block.data ?? {},
  })),
});
