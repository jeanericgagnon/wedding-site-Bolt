import { describe, expect, it } from 'vitest';
import { carryOverRegistryLinks } from './registryLinkCarryover';

describe('carryOverRegistryLinks', () => {
  it('extracts registry urls from labeled imported lines', () => {
    expect(carryOverRegistryLinks('Amazon Registry | amazon.com/shop\nTarget: https://target.com/list')).toEqual([
      { url: 'https://amazon.com/shop', sourceLabel: 'Amazon' },
      { url: 'https://target.com/list', sourceLabel: 'Target' },
    ]);
  });

  it('dedupes repeated imported registry urls after token extraction', () => {
    expect(carryOverRegistryLinks('Amazon Registry | amazon.com/shop\nhttps://amazon.com/shop/')).toEqual([
      { url: 'https://amazon.com/shop', sourceLabel: 'Amazon' },
    ]);
  });
});
