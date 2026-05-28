import { describe, expect, it } from 'vitest';

import {
  BUILDER_V2_DOCUMENT_VERSION,
  BUILDER_V2_DOCUMENT_VERSION_ALIAS,
  BUILDER_V2_LEGACY_DOCUMENT_VERSION,
  classifyBuilderV2ImportVersion,
} from './contracts';

describe('classifyBuilderV2ImportVersion', () => {
  it('accepts the current v2 document version and known alias drift', () => {
    expect(classifyBuilderV2ImportVersion(BUILDER_V2_DOCUMENT_VERSION)).toEqual({
      kind: 'current',
      normalized: false,
    });
    expect(classifyBuilderV2ImportVersion(BUILDER_V2_DOCUMENT_VERSION_ALIAS)).toEqual({
      kind: 'alias',
      normalized: true,
    });
  });

  it('keeps legacy v1 imports explicit instead of treating them like native v2 docs', () => {
    expect(classifyBuilderV2ImportVersion(BUILDER_V2_LEGACY_DOCUMENT_VERSION)).toEqual({
      kind: 'legacy-v1',
      normalized: false,
    });
  });

  it('flags missing versions for recovery and rejects future or unsupported version tokens', () => {
    expect(classifyBuilderV2ImportVersion(undefined)).toEqual({
      kind: 'missing',
      normalized: true,
    });
    expect(classifyBuilderV2ImportVersion('v3')).toEqual({
      kind: 'future',
      normalized: false,
      raw: 'v3',
    });
    expect(classifyBuilderV2ImportVersion('preview')).toEqual({
      kind: 'unsupported',
      normalized: false,
      raw: 'preview',
    });
  });
});
