import { describe, expect, it } from 'vitest';
import { parseExpectedGuestCount } from './weddingStatusGuestCount';

describe('weddingStatusGuestCount', () => {
  it('accepts positive whole-number guest counts', () => {
    expect(parseExpectedGuestCount('150')).toBe(150);
    expect(parseExpectedGuestCount(' 42 ')).toBe(42);
  });

  it('rejects blank, zero, negative, and mixed guest counts', () => {
    expect(parseExpectedGuestCount('')).toBeNull();
    expect(parseExpectedGuestCount('0')).toBeNull();
    expect(parseExpectedGuestCount('-5')).toBeNull();
    expect(parseExpectedGuestCount('120 guests')).toBeNull();
  });
});
