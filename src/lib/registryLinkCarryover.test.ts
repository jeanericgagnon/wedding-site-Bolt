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

  it('keeps purchased-status annotations from breaking imported registry urls', () => {
    expect(carryOverRegistryLinks('Amazon Registry (Purchased) https://amazon.com/shop).')).toEqual([
      { url: 'https://amazon.com/shop', sourceLabel: 'Amazon' },
    ]);
  });

  it('extracts markdown registry links without losing purchase annotations', () => {
    expect(carryOverRegistryLinks('[Amazon Registry — Purchased](https://amazon.com/shop)')).toEqual([
      { url: 'https://amazon.com/shop', sourceLabel: 'Amazon' },
    ]);
  });

  it('extracts bracketed registry links without losing purchase annotations', () => {
    expect(carryOverRegistryLinks('Purchased later <https://target.com/list>.')).toEqual([
      { url: 'https://target.com/list', sourceLabel: 'Target' },
    ]);
  });

  it('extracts bare-domain registry links from purchase-annotated notes', () => {
    expect(carryOverRegistryLinks('Already purchased — amazon.com/shop/list-1')).toEqual([
      { url: 'https://amazon.com/shop/list-1', sourceLabel: 'Amazon' },
    ]);
  });

  it('extracts markdown bare-domain registry links from purchase-annotated notes', () => {
    expect(carryOverRegistryLinks('[Target Registry](target.com/list-2)')).toEqual([
      { url: 'https://target.com/list-2', sourceLabel: 'Target' },
    ]);
  });
});
