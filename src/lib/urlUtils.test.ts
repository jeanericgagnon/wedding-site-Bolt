import { describe, it, expect } from 'vitest';
import { normalizeUrl, extractDomain, isValidUrl, parsePrice } from './urlUtils';

describe('normalizeUrl', () => {
  it('returns url unchanged when https scheme present', () => {
    expect(normalizeUrl('https://amazon.com/dp/B001')).toBe('https://amazon.com/dp/B001');
  });

  it('returns url unchanged when http scheme present', () => {
    expect(normalizeUrl('http://example.com/item')).toBe('http://example.com/item');
  });

  it('adds https scheme when missing', () => {
    expect(normalizeUrl('amazon.com/dp/B001')).toBe('https://amazon.com/dp/B001');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeUrl('  https://example.com  ')).toBe('https://example.com/');
  });

  it('handles schemeless url with path', () => {
    expect(normalizeUrl('target.com/p/kettle/-/A-123')).toBe('https://target.com/p/kettle/-/A-123');
  });

  it('normalizes url with query params', () => {
    const result = normalizeUrl('amazon.com/dp/B001?tag=abc');
    expect(result).toBe('https://amazon.com/dp/B001?tag=abc');
  });

  it('returns raw input with scheme if URL parsing fails', () => {
    const junk = '://not valid at all!!!';
    const result = normalizeUrl(junk);
    expect(typeof result).toBe('string');
  });
});

describe('extractDomain', () => {
  it('extracts hostname without www', () => {
    expect(extractDomain('https://www.amazon.com/dp/B001')).toBe('amazon.com');
  });

  it('extracts hostname without www when already missing', () => {
    expect(extractDomain('https://target.com/item')).toBe('target.com');
  });

  it('returns input as-is for invalid url', () => {
    expect(extractDomain('not-a-url')).toBe('not-a-url');
  });

  it('extracts subdomain correctly', () => {
    expect(extractDomain('https://shop.nordstrom.com/item')).toBe('shop.nordstrom.com');
  });
});

describe('isValidUrl', () => {
  it('returns true for valid https url', () => {
    expect(isValidUrl('https://amazon.com/item')).toBe(true);
  });

  it('returns true for valid http url', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
  });

  it('returns true for schemeless url that normalizes to https', () => {
    expect(isValidUrl('target.com/p/item')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(isValidUrl('')).toBe(false);
  });

  it('returns false for plain text', () => {
    expect(isValidUrl('not a url at all')).toBe(false);
  });
});

describe('parsePrice', () => {
  it('parses integer price', () => {
    expect(parsePrice('50')).toBe(50);
  });

  it('parses decimal price', () => {
    expect(parsePrice('49.99')).toBe(49.99);
  });

  it('parses price with currency symbol', () => {
    expect(parsePrice('$49.99')).toBe(49.99);
  });

  it('parses price with commas', () => {
    expect(parsePrice('1,299.00')).toBe(1299);
  });

  it('returns null for non-numeric string', () => {
    expect(parsePrice('free')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parsePrice('')).toBeNull();
  });

  it('parses price with leading text', () => {
    expect(parsePrice('USD 75.00')).toBe(75);
  });
});
