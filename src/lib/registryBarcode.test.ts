import { describe, expect, it } from 'vitest';

import { mapDetectorFormat, normalizeRegistryBarcode } from './registryBarcode';

describe('normalizeRegistryBarcode', () => {
  it('accepts valid UPC-A codes', () => {
    expect(normalizeRegistryBarcode('036000291452')).toEqual({
      ok: true,
      raw: '036000291452',
      normalized: '036000291452',
      format: 'upc_a',
      digits: '036000291452',
    });
  });

  it('accepts valid EAN-13 and ISBN-13 codes', () => {
    expect(normalizeRegistryBarcode('4006381333931')).toEqual(expect.objectContaining({
      ok: true,
      normalized: '4006381333931',
      format: 'ean_13',
    }));

    expect(normalizeRegistryBarcode('9780143127741')).toEqual(expect.objectContaining({
      ok: true,
      normalized: '9780143127741',
      format: 'isbn_13',
    }));
  });

  it('accepts ISBN-10 values with X check digits', () => {
    expect(normalizeRegistryBarcode('0306406152')).toEqual(expect.objectContaining({
      ok: true,
      normalized: '0306406152',
      format: 'isbn_10',
    }));
  });

  it('rejects invalid barcodes', () => {
    expect(normalizeRegistryBarcode('123456789013')).toEqual({
      ok: false,
      reason: 'Use a valid UPC, EAN, GTIN, or ISBN barcode.',
    });
    expect(normalizeRegistryBarcode('11111111')).toEqual({
      ok: false,
      reason: 'That barcode does not look valid.',
    });
  });
});

describe('mapDetectorFormat', () => {
  it('maps browser detector formats onto registry formats', () => {
    expect(mapDetectorFormat('upc_a')).toBe('upc_a');
    expect(mapDetectorFormat('ean_13')).toBe('ean_13');
    expect(mapDetectorFormat('itf-14')).toBe('gtin_14');
    expect(mapDetectorFormat('isbn')).toBe('isbn_13');
    expect(mapDetectorFormat('qr_code')).toBeNull();
  });
});
