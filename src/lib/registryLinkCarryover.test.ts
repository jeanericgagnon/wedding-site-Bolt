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

  it('preserves explicit source labels from imported carryover text', () => {
    expect(carryOverRegistryLinks('Crate & Barrel Registry | crateandbarrel.com/gift-registry/jane')).toEqual([
      { url: 'https://crateandbarrel.com/gift-registry/jane', sourceLabel: 'Crate & Barrel' },
    ]);
  });

  it('infers source labels from plain registry urls without inline labels', () => {
    expect(carryOverRegistryLinks('https://crateandbarrel.com/gift-registry/jane\nhttps://zola.com/registry/jane')).toEqual([
      { url: 'https://crateandbarrel.com/gift-registry/jane', sourceLabel: 'Crate & Barrel' },
      { url: 'https://zola.com/registry/jane', sourceLabel: 'Zola' },
    ]);
  });

  it('infers west elm source labels from carryover text and urls', () => {
    expect(carryOverRegistryLinks('West Elm Registry | westelm.com/registry/jane')).toEqual([
      { url: 'https://westelm.com/registry/jane', sourceLabel: 'West Elm' },
    ]);
  });

  it('does not leak one source label across multiple carryover links on the same line', () => {
    expect(carryOverRegistryLinks('Amazon Registry | amazon.com/shop; target.com/list')).toEqual([
      { url: 'https://amazon.com/shop', sourceLabel: 'Amazon' },
      { url: 'https://target.com/list', sourceLabel: 'Target' },
    ]);
  });

  it('preserves explicit non-domain source labels across adjacent carryover links', () => {
    expect(carryOverRegistryLinks('Custom Boutique Registry | example.com/list')).toEqual([
      { url: 'https://example.com/list', sourceLabel: 'Custom Boutique' },
    ]);
  });

  it('does not leak one custom carryover label across multiple unlabeled links', () => {
    expect(carryOverRegistryLinks('Custom Boutique Registry | example.com/list | second-shop.com/list-2')).toEqual([
      { url: 'https://example.com/list', sourceLabel: 'Custom Boutique' },
      { url: 'https://second-shop.com/list-2' },
    ]);
  });

  it('upgrades duplicate carryover links when a later import includes a source label', () => {
    expect(carryOverRegistryLinks('https://crateandbarrel.com/gift-registry/jane\nCrate & Barrel Registry | crateandbarrel.com/gift-registry/jane')).toEqual([
      { url: 'https://crateandbarrel.com/gift-registry/jane', sourceLabel: 'Crate & Barrel' },
    ]);
  });

  it('upgrades inferred duplicate registry labels when a later explicit label is stronger', () => {
    expect(carryOverRegistryLinks('https://zola.com/registry/jane\nCustom Honeymoon Fund | https://zola.com/registry/jane')).toEqual([
      { url: 'https://zola.com/registry/jane', sourceLabel: 'Custom Honeymoon Fund' },
    ]);
  });

  it('does not leak internal carryover label metadata to callers', () => {
    expect(carryOverRegistryLinks('https://zola.com/registry/jane')).toEqual([
      { url: 'https://zola.com/registry/jane', sourceLabel: 'Zola' },
    ]);
    expect(carryOverRegistryLinks('https://zola.com/registry/jane')[0]).not.toHaveProperty('sourceLabelMode');
  });
});
