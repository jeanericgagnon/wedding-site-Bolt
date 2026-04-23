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

  it('normalizes saved registry urls before merging carryover labels', () => {
    const weddingData = fromOnboarding({
      partner1Name: 'Alex',
      partner2Name: 'Sam',
      registryLinksRaw: 'Custom Honeymoon Fund | https://zola.com/registry/alex-and-sam',
      registryLinks: 'Zola | https://zola.com/registry/alex-and-sam/\nTarget | target.com/gift-registry/list).',
    });

    expect(weddingData.registry.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: 'https://zola.com/registry/alex-and-sam', label: 'Custom Honeymoon Fund' }),
        expect.objectContaining({ url: 'https://target.com/gift-registry/list', label: 'Target' }),
      ]),
    );
  });

  it('preserves raw imported custom labels when markdown link text only mirrors the domain', () => {
    const weddingData = fromOnboarding({
      partner1Name: 'Alex',
      partner2Name: 'Sam',
      registryLinksRaw: 'Custom Boutique | [Example](example.com/list) and <https://target.com/gift-registry/list>',
    });

    expect(weddingData.registry.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: 'https://example.com/list', label: 'Custom Boutique' }),
        expect.objectContaining({ url: 'https://target.com/gift-registry/list', label: 'Target' }),
      ]),
    );
  });

  it('preserves stronger imported custom labels when a saved markdown domain label already exists', () => {
    const weddingData = fromOnboarding({
      partner1Name: 'Alex',
      partner2Name: 'Sam',
      registryLinks: '[Example](example.com/list)',
      registryLinksRaw: 'Custom Boutique | https://example.com/list',
    });

    expect(weddingData.registry.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: 'https://example.com/list', label: 'Custom Boutique' }),
      ]),
    );
  });
});
