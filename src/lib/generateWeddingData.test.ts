import { describe, expect, it } from 'vitest';
import { fromOnboarding } from './generateWeddingData';

describe('fromOnboarding registry carryover', () => {
  it('merges raw carryover labels with saved registry links', () => {
    const weddingData = fromOnboarding({
      partner1Name: 'Alex',
      partner2Name: 'Sam',
      registryLinksRaw: 'Custom Honeymoon Fund | https://zola.com/registry/alex-and-sam',
      registryLinks: 'Zola | https://zola.com/registry/alex-and-sam\nTarget | https://target.com/gift-registry/list',
    });

    expect(weddingData.registry.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: 'https://zola.com/registry/alex-and-sam', label: 'Custom Honeymoon Fund' }),
        expect.objectContaining({ url: 'https://target.com/gift-registry/list', label: 'Target' }),
      ]),
    );
  });
});
