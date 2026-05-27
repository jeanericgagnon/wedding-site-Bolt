export type BuilderV2SectionSettingsBlock = {
  id: string;
  type: string;
  content?: string;
  data?: {
    question?: string;
    answer?: string;
    [key: string]: unknown;
  };
};

export type BuilderV2SectionSettingField = {
  key: string;
  label: string;
  kind: 'text' | 'boolean';
  value: string | boolean;
};

const normalize = (value: string) => value.trim().toLowerCase();

const getNamedSettingBlock = (
  blocks: BuilderV2SectionSettingsBlock[],
  label: string,
) => {
  const normalizedLabel = normalize(label);
  return blocks.find((block) => {
    if (block.type !== 'qna' && block.type !== 'faqItem') return false;
    const candidate = typeof block.data?.question === 'string' ? block.data.question.trim() : '';
    return normalize(candidate) === normalizedLabel;
  });
};

export const getBuilderV2NamedSettingValue = (
  blocks: BuilderV2SectionSettingsBlock[],
  label: string,
) => {
  const block = getNamedSettingBlock(blocks, label);
  return typeof block?.data?.answer === 'string' ? block.data.answer.trim() : '';
};

export const getBuilderV2NamedSettingBoolean = (
  blocks: BuilderV2SectionSettingsBlock[],
  label: string,
): boolean | undefined => {
  const value = getBuilderV2NamedSettingValue(blocks, label).toLowerCase();
  if (!value) return undefined;
  if (['true', 'yes', '1', 'on'].includes(value)) return true;
  if (['false', 'no', '0', 'off'].includes(value)) return false;
  return undefined;
};

const sectionSettingDefinitions: Record<string, Array<{ key: string; label: string; kind: 'text' | 'boolean' }>> = {
  accommodations: [
    { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
    { key: 'showTitle', label: 'Show title', kind: 'boolean' },
  ],
  contact: [
    { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
    { key: 'showTitle', label: 'Show title', kind: 'boolean' },
    { key: 'emailSubject', label: 'Email subject', kind: 'text' },
  ],
  'dress-code': [
    { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
    { key: 'showTitle', label: 'Show title', kind: 'boolean' },
    { key: 'presetCode', label: 'Preset code', kind: 'text' },
    { key: 'colorNote', label: 'Color note', kind: 'text' },
  ],
  directions: [
    { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
  ],
  menu: [
    { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
    { key: 'showDietaryIcons', label: 'Show dietary icons', kind: 'boolean' },
  ],
  music: [
    { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
    { key: 'showRequestNote', label: 'Show request note', kind: 'boolean' },
  ],
  quotes: [
    { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
    { key: 'columns', label: 'Columns', kind: 'text' },
    { key: 'background', label: 'Background', kind: 'text' },
  ],
  video: [
    { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
    { key: 'background', label: 'Background', kind: 'text' },
  ],
  'wedding-party': [
    { key: 'showTitle', label: 'Show title', kind: 'boolean' },
    { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
  ],
};

export const buildBuilderV2SectionSettingFields = (
  sectionType: string,
  blocks: BuilderV2SectionSettingsBlock[],
): BuilderV2SectionSettingField[] => {
  const definitions = sectionSettingDefinitions[sectionType] ?? [];
  return definitions.map((definition) => ({
    key: definition.key,
    label: definition.label,
    kind: definition.kind,
    value: definition.kind === 'boolean'
      ? (getBuilderV2NamedSettingBoolean(blocks, definition.label) ?? true)
      : getBuilderV2NamedSettingValue(blocks, definition.label),
  }));
};

export const updateBuilderV2SectionSetting = (
  blocks: BuilderV2SectionSettingsBlock[],
  label: string,
  value: string | boolean,
) => {
  const existing = getNamedSettingBlock(blocks, label);
  const serialized = typeof value === 'boolean' ? String(value) : value.trim();

  if (!serialized) {
    return existing
      ? blocks.filter((block) => block.id !== existing.id)
      : blocks;
  }

  if (existing) {
    return blocks.map((block) => (
      block.id === existing.id
        ? {
          ...block,
          type: 'qna',
          data: {
            ...(block.data ?? {}),
            question: label,
            answer: serialized,
          },
        }
        : block
    ));
  }

  return [
    {
      id: `setting-${normalize(label).replace(/[^a-z0-9]+/g, '-')}`,
      type: 'qna',
      content: label,
      data: {
        question: label,
        answer: serialized,
      },
    },
    ...blocks,
  ];
};
