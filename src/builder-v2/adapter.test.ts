import { describe, it, expect } from 'vitest';
import type { SectionInstance } from '../types/layoutConfig';
import { toBuilderV2Document } from './adapter';

describe('toBuilderV2Document', () => {
  it('maps section instances into a v2 document with defaults', () => {
    const instances: SectionInstance[] = [
      {
        id: 'hero-1',
        type: 'hero',
        variant: 'default',
        enabled: true,
        bindings: {},
        settings: { title: 'Welcome', subtitle: 'Join us' },
      },
      {
        id: 'faq-1',
        type: 'faq',
        variant: 'iconGrid',
        enabled: false,
        bindings: {},
        settings: { title: 'FAQ' },
      },
    ];

    const out = toBuilderV2Document(instances);

    expect(out.version).toBe('v2');
    expect(out.sections).toHaveLength(2);
    expect(out.sections[0]).toMatchObject({
      id: 'hero-1',
      type: 'hero',
      variant: 'default',
      enabled: true,
      title: 'Welcome',
      subtitle: 'Join us',
    });
    expect(out.sections[0].blocks[0]?.type).toBe('title');
    expect(out.sections[1].blocks[0]?.type).toBe('text');
    expect(typeof out.updatedAtISO).toBe('string');
  });
});
