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

  it('extracts quoted registry links from purchase-annotated notes', () => {
    expect(carryOverRegistryLinks('Purchased already: "https://amazon.com/shop/list-3"')).toEqual([
      { url: 'https://amazon.com/shop/list-3', sourceLabel: 'Amazon' },
    ]);
  });

  it('preserves multiple imported registry links when they share one line', () => {
    expect(carryOverRegistryLinks('Amazon Registry | amazon.com/shop; Target Registry | target.com/list')).toEqual([
      { url: 'https://amazon.com/shop', sourceLabel: 'Amazon' },
      { url: 'https://target.com/list', sourceLabel: 'Target' },
    ]);
  });

  it('does not duplicate a single extracted registry link across labeled fragments', () => {
    expect(carryOverRegistryLinks('Amazon Registry | Purchased | https://amazon.com/shop')).toEqual([
      { url: 'https://amazon.com/shop', sourceLabel: 'Amazon' },
    ]);
  });

  it('preserves multiple markdown registry links that share one line', () => {
    expect(carryOverRegistryLinks('[Amazon](https://amazon.com/shop) and [Target](https://target.com/list)')).toEqual([
      { url: 'https://amazon.com/shop', sourceLabel: 'Amazon' },
      { url: 'https://target.com/list', sourceLabel: 'Target' },
    ]);
  });
});
