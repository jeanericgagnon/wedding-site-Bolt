type SectionLike = {
  id: string;
  type: string;
  title: string;
  enabled: boolean;
  variant: string;
};

type BlockLike = {
  id: string;
  type: string;
};

type GuidanceStep = {
  label: 'Current' | 'Next' | 'Then';
  detail: string;
};

export type BuilderV2SectionEditingGuidance = {
  title: string;
  detail: string;
  blockCount: number;
  warningCount: number;
  suggestedBlockTypes: string[];
  mainFocus: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  steps: GuidanceStep[];
};

export type BuilderV2AddBlockEntry = {
  type: string;
  label: string;
  description: string;
  recommended: boolean;
  allowed: boolean;
  disabledReason: string;
};

export type BuilderV2AddBlockLibrary = {
  entries: BuilderV2AddBlockEntry[];
  visibleCount: number;
  recommendedVisibleCount: number;
  empty: boolean;
  headline: string;
  detail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
};

type BuildSectionEditingGuidanceParams = {
  section: SectionLike;
  blocks: BlockLike[];
  warningCount: number;
  availableBlockTypes: string[];
  recommendedBlockTypes: string[];
  limitTotal: number;
};

type BuildAddBlockLibraryParams = {
  query: string;
  availableBlockTypes: string[];
  currentBlockTypes: string[];
  recommendedBlockTypes: string[];
  labels: Record<string, string>;
  descriptions: Record<string, string>;
  availability: Record<string, { ok: boolean; reason: string }>;
};

const normalize = (value: string) => value.trim().toLowerCase();

export const getRecommendedBlockTypes = (
  sectionType: string,
  availableBlockTypes: string[],
) => {
  const normalizedSectionType = normalize(sectionType);
  const preferredBySection: Record<string, string[]> = {
    hero: ['title', 'text', 'photo'],
    story: ['story', 'timelineItem', 'photo'],
    schedule: ['event', 'title', 'text'],
    travel: ['travelTip', 'hotelCard', 'text'],
    registry: ['registryItem', 'fundHighlight', 'title'],
    rsvp: ['rsvpNote', 'title', 'qna'],
    faq: ['faqItem', 'qna', 'title'],
    venue: ['photo', 'text', 'title'],
    gallery: ['photo', 'title', 'text'],
    'wedding-party': ['photo', 'text', 'title'],
    'dress-code': ['photo', 'text', 'title'],
    directions: ['travelTip', 'text', 'title'],
    accommodations: ['hotelCard', 'travelTip', 'text'],
  };

  const fallback = ['title', 'text', 'photo'];
  const preferred = preferredBySection[normalizedSectionType] ?? fallback;
  return preferred.filter((type) => availableBlockTypes.includes(type));
};

export const buildBuilderV2SectionEditingGuidance = ({
  section,
  blocks,
  warningCount,
  recommendedBlockTypes,
  limitTotal,
}: BuildSectionEditingGuidanceParams): BuilderV2SectionEditingGuidance => {
  const blockTypes = blocks.map((block) => block.type);
  const missingRecommended = recommendedBlockTypes.filter((type) => !blockTypes.includes(type));
  const closeToLimit = blocks.length >= Math.max(limitTotal - 1, 1);

  if (!section.enabled) {
    return {
      title: `${section.title} is hidden from preview`,
      detail: 'This section is out of the live reading flow until you show it again.',
      blockCount: blocks.length,
      warningCount,
      suggestedBlockTypes: recommendedBlockTypes.slice(0, 2),
      mainFocus: 'Decide whether this section belongs in the live page right now.',
      bestNextMove: 'Show the section again, then check that its first visible blocks earn the space they take up.',
      decisionRule: 'Unhide the section only if it adds a real guest-facing job, not just extra content density.',
      watchout: 'A hidden section with stale content becomes easy to forget and easy to ship half-finished later.',
      steps: [
        { label: 'Current', detail: 'Hidden section with no live visibility.' },
        { label: 'Next', detail: 'Show it again or leave it intentionally out of the page.' },
        { label: 'Then', detail: 'Trim or strengthen the first blocks so the section feels worth keeping.' },
      ],
    };
  }

  if (blocks.length === 0) {
    return {
      title: `${section.title} needs a first content spine`,
      detail: 'The section shell is present, but there is no block structure to tell guests what this lane is for.',
      blockCount: 0,
      warningCount,
      suggestedBlockTypes: recommendedBlockTypes.slice(0, 3),
      mainFocus: 'Give the section one clear anchor block before layering on polish.',
      bestNextMove: `Start with ${recommendedBlockTypes.slice(0, 2).join(' + ') || 'a title and one supporting block'} so the section has a readable job immediately.`,
      decisionRule: 'Build the minimum useful structure first: one anchor, one supporting detail, then preview it before adding more.',
      watchout: 'An empty section invites random block thrash and makes the preview look more complete than the structure really is.',
      steps: [
        { label: 'Current', detail: 'Section exists without any internal content blocks.' },
        { label: 'Next', detail: 'Add the first anchor block and one supporting block.' },
        { label: 'Then', detail: 'Preview the lane before you add optional extras.' },
      ],
    };
  }

  if (warningCount > 0) {
    return {
      title: `${section.title} has incomplete block details`,
      detail: `${warningCount} block${warningCount === 1 ? '' : 's'} still need required or strongly recommended content.`,
      blockCount: blocks.length,
      warningCount,
      suggestedBlockTypes: missingRecommended.slice(0, 2),
      mainFocus: 'Tighten the blocks that already exist before adding more structure.',
      bestNextMove: 'Finish the incomplete blocks first so the preview reflects real content instead of placeholders or missing details.',
      decisionRule: 'When the section already has structure, close its content gaps before expanding its scope.',
      watchout: 'Adding more blocks on top of incomplete ones makes the section feel busy without getting more trustworthy.',
      steps: [
        { label: 'Current', detail: 'Existing blocks are carrying validation warnings.' },
        { label: 'Next', detail: 'Resolve the required fields on the incomplete blocks.' },
        { label: 'Then', detail: 'Only add new blocks if the section still feels structurally thin.' },
      ],
    };
  }

  if (missingRecommended.length > 0) {
    return {
      title: `${section.title} is missing one of its signature blocks`,
      detail: `The section works, but it is still missing ${missingRecommended.slice(0, 2).join(' and ')} that would make the lane read more clearly.`,
      blockCount: blocks.length,
      warningCount,
      suggestedBlockTypes: missingRecommended.slice(0, 3),
      mainFocus: 'Add the missing block type that makes this section read like itself.',
      bestNextMove: `Add ${missingRecommended[0]} next so the section stops feeling generic and starts doing its real job.`,
      decisionRule: 'Prefer the block type that changes the section meaning the most, not the one that is merely easiest to add.',
      watchout: 'A section can look populated while still missing the block that makes guests understand why it exists.',
      steps: [
        { label: 'Current', detail: 'The section has usable content but not its strongest structural signal yet.' },
        { label: 'Next', detail: `Add ${missingRecommended[0]} or the closest equivalent block.` },
        { label: 'Then', detail: 'Preview the section and stop if the lane now reads cleanly.' },
      ],
    };
  }

  if (closeToLimit) {
    return {
      title: `${section.title} is close to its block cap`,
      detail: `This lane already has ${blocks.length} block${blocks.length === 1 ? '' : 's'} and is nearly at its section limit of ${limitTotal}.`,
      blockCount: blocks.length,
      warningCount,
      suggestedBlockTypes: [],
      mainFocus: 'Consolidate or trim before you add anything else.',
      bestNextMove: 'Read down the section and combine repeated ideas before you add another block.',
      decisionRule: 'When a section is near its cap, every new block should replace clutter or sharpen meaning.',
      watchout: 'A nearly full section gets noisy fast, and the preview may hide that until mobile spacing starts to suffer.',
      steps: [
        { label: 'Current', detail: 'High block density with little room for safe expansion.' },
        { label: 'Next', detail: 'Merge repeated ideas or remove low-value filler blocks.' },
        { label: 'Then', detail: 'Only add a final block if the section still has a real structural gap.' },
      ],
    };
  }

  return {
    title: `${section.title} is in a healthy editing state`,
    detail: 'The structure is coherent, the core blocks are present, and there are no active validation warnings.',
    blockCount: blocks.length,
    warningCount,
    suggestedBlockTypes: [],
    mainFocus: 'Refine wording, order, and preview quality instead of expanding the section.',
    bestNextMove: 'Review the current block order in preview and only add more if a guest would still miss something important.',
    decisionRule: 'Once a section has its anchor blocks, polish beats expansion.',
    watchout: 'This is the point where “just one more block” often makes the section weaker instead of better.',
    steps: [
      { label: 'Current', detail: 'Stable structure with the core block types already in place.' },
      { label: 'Next', detail: 'Polish copy, order, and spacing cues in preview.' },
      { label: 'Then', detail: 'Stop when the lane feels clear; do not add filler just because there is room.' },
    ],
  };
};

export const buildBuilderV2AddBlockLibrary = ({
  query,
  availableBlockTypes,
  currentBlockTypes,
  recommendedBlockTypes,
  labels,
  descriptions,
  availability,
}: BuildAddBlockLibraryParams): BuilderV2AddBlockLibrary => {
  const trimmedQuery = query.trim().toLowerCase();
  const currentSet = new Set(currentBlockTypes);
  const recommendedSet = new Set(recommendedBlockTypes);

  const entries = availableBlockTypes
    .filter((type) => {
      if (!trimmedQuery) return true;
      const haystack = `${labels[type] ?? type} ${descriptions[type] ?? ''} ${type}`.toLowerCase();
      return haystack.includes(trimmedQuery);
    })
    .map((type) => ({
      type,
      label: labels[type] ?? type,
      description: descriptions[type] ?? '',
      recommended: recommendedSet.has(type) && !currentSet.has(type),
      allowed: availability[type]?.ok ?? true,
      disabledReason: availability[type]?.reason ?? '',
    }))
    .sort((left, right) => {
      if (left.recommended !== right.recommended) return left.recommended ? -1 : 1;
      if (left.allowed !== right.allowed) return left.allowed ? -1 : 1;
      return left.label.localeCompare(right.label);
    });

  const recommendedVisibleCount = entries.filter((entry) => entry.recommended).length;

  if (!entries.length) {
    return {
      entries,
      visibleCount: 0,
      recommendedVisibleCount: 0,
      empty: true,
      headline: 'No matching block types',
      detail: 'The current search is narrower than the section really needs.',
      bestNextMove: 'Clear or widen the search so you can compare the recommended anchor blocks first.',
      decisionRule: 'When the picker goes empty, broaden the search before assuming the section lacks a good block option.',
      watchout: 'A narrow search can make the section feel more constrained than it actually is.',
    };
  }

  if (recommendedVisibleCount > 0) {
    return {
      entries,
      visibleCount: entries.length,
      recommendedVisibleCount,
      empty: false,
      headline: 'Recommended structural blocks are visible',
      detail: 'The picker still contains the block types most likely to strengthen this section next.',
      bestNextMove: 'Start with a recommended block before you add optional supporting content.',
      decisionRule: 'Prefer the recommended block that adds a new job to the section, not one that repeats content already present.',
      watchout: 'It is easy to grab a familiar text block and miss the block type that gives the section its real shape.',
    };
  }

  return {
    entries,
    visibleCount: entries.length,
    recommendedVisibleCount,
    empty: false,
    headline: 'Filtered block list is now in refinement mode',
    detail: 'You have narrowed the picker to supporting options, not the section’s primary structural moves.',
    bestNextMove: 'Add one of these only if the core section blocks are already in place.',
    decisionRule: 'Use filtered supporting blocks after the section already reads clearly without them.',
    watchout: 'Support blocks can add noise quickly if the section still lacks its anchor structure.',
  };
};
