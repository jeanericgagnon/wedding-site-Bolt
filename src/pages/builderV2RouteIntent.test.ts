import { describe, expect, it } from 'vitest';

import { resolveBuilderV2RouteIntent } from './builderV2RouteIntent';

describe('resolveBuilderV2RouteIntent', () => {
  it('opens the export handoff for publishNow intents and strips the query flag', () => {
    expect(resolveBuilderV2RouteIntent('?publishNow=1', '')).toEqual({
      shouldOpenExportHandoff: true,
      shouldFocusLaunchGate: true,
      normalizedSearch: '',
      normalizedHash: '',
    });
  });

  it('preserves unrelated search params while clearing publishNow', () => {
    expect(resolveBuilderV2RouteIntent('?panel=design&publishNow=1', '')).toEqual({
      shouldOpenExportHandoff: true,
      shouldFocusLaunchGate: true,
      normalizedSearch: '?panel=design',
      normalizedHash: '',
    });
  });

  it('focuses launch confidence without opening export handoff for the hash-only route', () => {
    expect(resolveBuilderV2RouteIntent('', '#launch-confidence')).toEqual({
      shouldOpenExportHandoff: false,
      shouldFocusLaunchGate: true,
      normalizedSearch: '',
      normalizedHash: '#launch-confidence',
    });
  });
});
