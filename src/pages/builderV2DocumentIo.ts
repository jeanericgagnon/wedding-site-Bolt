import type { BuilderV2Block, BuilderV2BlockType, BuilderV2Document, BuilderV2Section } from '../builder-v2/contracts';
import { prepareImportedBuilderV2Document } from '../builder-v2/importPrepare';
import { buildBuilderV2DocumentPages, type LabPage } from './builderV2PageState';

type ExportBlockLike = {
  id: string;
  type: BuilderV2BlockType;
  content: string;
  data?: Record<string, unknown>;
};

export type BuilderV2SectionBlocksMap<TBlock extends ExportBlockLike> = Record<string, TBlock[]>;

export function buildBuilderV2ExportDocument<TBlock extends ExportBlockLike>(
  pages: LabPage[],
  sectionBlocks: BuilderV2SectionBlocksMap<TBlock>,
): BuilderV2Document {
  return {
    version: 'v2',
    updatedAtISO: new Date().toISOString(),
    pages: buildBuilderV2DocumentPages(
      pages,
      (page) => page.sections.map<BuilderV2Section>((section) => ({
        id: section.id,
        type: section.type,
        variant: section.variant,
        enabled: section.enabled,
        title: section.title,
        subtitle: section.subtitle,
        blocks: (sectionBlocks[section.id] ?? []).map<BuilderV2Block>((block) => ({
          id: block.id,
          type: block.type,
          data: block.data ?? { text: block.content },
        })),
      })),
    ),
  };
}

type BuilderV2ImportPreparedResult = Extract<
  ReturnType<typeof prepareImportedBuilderV2Document>,
  { ok: true }
>;

export type BuilderV2ImportDraftPreview =
  | { state: 'idle' }
  | { state: 'invalid'; error: string }
  | { state: 'ready'; prepared: BuilderV2ImportPreparedResult };

export function resolveBuilderV2ImportDraftPreview(importDraft: string): BuilderV2ImportDraftPreview {
  if (!importDraft.trim()) {
    return { state: 'idle' };
  }

  try {
    const parsed = JSON.parse(importDraft) as unknown;
    const prepared = prepareImportedBuilderV2Document(parsed);
    if (!prepared.ok) {
      return { state: 'invalid', error: prepared.error };
    }

    return { state: 'ready', prepared };
  } catch {
    return { state: 'invalid', error: 'We could not parse that JSON. Check the formatting and try again.' };
  }
}
