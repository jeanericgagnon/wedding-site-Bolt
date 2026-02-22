import type { BuilderV2BlockType, BuilderV2Document } from './contracts';

const BLOCK_TYPES: BuilderV2BlockType[] = [
  'title','text','qna','photo','story','timelineItem','event','travelTip','hotelCard','registryItem','fundHighlight','rsvpNote','faqItem','divider',
];

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isString = (v: unknown): v is string => typeof v === 'string';

export function isBuilderV2BlockType(v: unknown): v is BuilderV2BlockType {
  return isString(v) && (BLOCK_TYPES as string[]).includes(v);
}

export function validateBuilderV2Document(input: unknown): { ok: true; doc: BuilderV2Document } | { ok: false; error: string } {
  if (!isObject(input)) return { ok: false, error: 'Document must be an object' };
  if (input.version !== 'v2') return { ok: false, error: 'Unsupported version (expected v2)' };
  if (!Array.isArray(input.sections)) return { ok: false, error: 'sections must be an array' };

  for (let i = 0; i < input.sections.length; i += 1) {
    const sec = input.sections[i];
    if (!isObject(sec)) return { ok: false, error: `sections[${i}] must be an object` };
    if (!isString(sec.id) || !sec.id) return { ok: false, error: `sections[${i}].id is required` };
    if (!isString(sec.type) || !sec.type) return { ok: false, error: `sections[${i}].type is required` };
    if (!isString(sec.variant) || !sec.variant) return { ok: false, error: `sections[${i}].variant is required` };
    if (typeof sec.enabled !== 'boolean') return { ok: false, error: `sections[${i}].enabled must be boolean` };
    if (!Array.isArray(sec.blocks)) return { ok: false, error: `sections[${i}].blocks must be an array` };

    for (let j = 0; j < sec.blocks.length; j += 1) {
      const b = sec.blocks[j];
      if (!isObject(b)) return { ok: false, error: `sections[${i}].blocks[${j}] must be an object` };
      if (!isString(b.id) || !b.id) return { ok: false, error: `sections[${i}].blocks[${j}].id is required` };
      if (!isBuilderV2BlockType(b.type)) return { ok: false, error: `sections[${i}].blocks[${j}].type is invalid` };
      if (b.data !== undefined && !isObject(b.data)) return { ok: false, error: `sections[${i}].blocks[${j}].data must be an object` };
    }
  }

  if (!isString(input.updatedAtISO) || !input.updatedAtISO) return { ok: false, error: 'updatedAtISO is required' };

  const doc = input as unknown as BuilderV2Document;
  return { ok: true, doc };
}
