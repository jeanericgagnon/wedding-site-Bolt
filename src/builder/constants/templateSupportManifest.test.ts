import { describe, expect, it } from 'vitest';

import { getTemplateSupportManifest } from './templateSupportManifest';

describe('templateSupportManifest', () => {
  it('reports compatibility normalization truth for shipped templates', () => {
    const manifest = getTemplateSupportManifest('destination-adventure');

    expect(manifest).not.toBeNull();
    expect(manifest?.compatibilityStatus).toBe('normalized');
    expect(manifest?.compatibilityLabel).toMatch(/compatibility/i);
    expect(manifest?.compatibilityDetail).toMatch(/launch-safe|builder-native/i);
    expect(manifest?.normalizedVariantCount).toBeGreaterThan(0);
    expect(manifest?.supportNotes.join(' ')).toMatch(/variant/i);
  });

  it('stays null for unknown templates', () => {
    expect(getTemplateSupportManifest('not-a-real-template')).toBeNull();
  });
});
