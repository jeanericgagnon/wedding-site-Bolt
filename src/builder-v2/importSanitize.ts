import { BUILDER_V2_BLOCK_TYPES, type BuilderV2BlockType } from './contracts';

export function sanitizeImportedBlockType(type: unknown): BuilderV2BlockType {
  if (typeof type === 'string' && (BUILDER_V2_BLOCK_TYPES as readonly string[]).includes(type)) {
    return type as BuilderV2BlockType;
  }
  return 'text';
}
