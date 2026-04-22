import { describe, expect, it } from 'vitest';
import { buildOnboardingUpdateData } from './onboardingMapper';

describe('buildOnboardingUpdateData registry carryover', () => {
  it('prefers raw carryover labels but preserves unmatched saved registry links', () => {
    const result = buildOnboardingUpdateData({
      coupleNames: { name1: 'Alex', name2: 'Sam' },
      planningStatus: 'guided_setup_complete',
      template: 'base',
      registryLinksRaw: 'Custom Honeymoon Fund | https://zola.com/registry/alex-and-sam',
      registryLinks: 'Zola | https://zola.com/registry/alex-and-sam\nTarget | https://target.com/gift-registry/list',
    });

    const weddingData = result.wedding_data as { registry?: { links?: Array<{ url: string; label?: string }> } };
    expect(weddingData.registry?.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: 'https://zola.com/registry/alex-and-sam', label: 'Custom Honeymoon Fund' }),
        expect.objectContaining({ url: 'https://target.com/gift-registry/list', label: 'Target' }),
      ]),
    );
  });

  it('normalizes saved registry urls before merging carryover labels', () => {
    const result = buildOnboardingUpdateData({
      coupleNames: { name1: 'Alex', name2: 'Sam' },
      planningStatus: 'guided_setup_complete',
      template: 'base',
      registryLinksRaw: 'Custom Honeymoon Fund | https://zola.com/registry/alex-and-sam',
      registryLinks: 'Zola | https://zola.com/registry/alex-and-sam/\nTarget | target.com/gift-registry/list).',
    });

    const weddingData = result.wedding_data as { registry?: { links?: Array<{ url: string; label?: string }> } };
    expect(weddingData.registry?.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: 'https://zola.com/registry/alex-and-sam', label: 'Custom Honeymoon Fund' }),
        expect.objectContaining({ url: 'https://target.com/gift-registry/list', label: 'Target' }),
      ]),
    );
  });
});
