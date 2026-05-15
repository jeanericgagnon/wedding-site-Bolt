import { describe, expect, it } from 'vitest';
import {
  formatEventHubCoupleLabel,
  friendlyGuestHubError,
  safeGuestHubFunctionError,
  shouldOpenHubDetailsByDefault,
} from './eventHubPageHelpers';

describe('formatEventHubCoupleLabel', () => {
  it('uses configured couple names when available', () => {
    expect(formatEventHubCoupleLabel('maya-and-leo', 'Maya', 'Leo')).toBe('Maya & Leo');
  });

  it('formats common slug fallback names with an ampersand', () => {
    expect(formatEventHubCoupleLabel('maya-and-leo')).toBe('Maya & Leo');
  });

  it('title-cases single-name or non-couple slugs', () => {
    expect(formatEventHubCoupleLabel('spring-wedding-weekend')).toBe('Spring Wedding Weekend');
  });

  it('keeps demo guest-hub couple labels aligned with the seeded couple names instead of the raw demo slug', () => {
    expect(formatEventHubCoupleLabel('alex-jordan-demo', 'Alex', 'Jordan')).toBe('Alex & Jordan');
  });
});

describe('friendlyGuestHubError', () => {
  it('hides implementation details from guest opt-in failures', () => {
    expect(friendlyGuestHubError(new Error('Supabase function policy denied token'), 'Please try again.')).toBe('Please try again.');
    expect(safeGuestHubFunctionError('Supabase function policy denied token', 'Please try again.')).toBe('Please try again.');
  });

  it('keeps plain guest-safe copy', () => {
    expect(friendlyGuestHubError(new Error('Add an email or phone first.'), 'Please try again.')).toBe('Add an email or phone first.');
    expect(safeGuestHubFunctionError('Add an email or phone first.', 'Please try again.')).toBe('Add an email or phone first.');
  });
});

describe('shouldOpenHubDetailsByDefault', () => {
  it('keeps proof-only hub details open for mobile smoke and explicit review links', () => {
    expect(shouldOpenHubDetailsByDefault(new URLSearchParams('mobileSmoke=1'))).toBe(true);
    expect(shouldOpenHubDetailsByDefault(new URLSearchParams('hubDetails=1'))).toBe(true);
  });

  it('keeps guest hub details collapsed by default for normal guest links', () => {
    expect(shouldOpenHubDetailsByDefault(new URLSearchParams(''))).toBe(false);
    expect(shouldOpenHubDetailsByDefault(new URLSearchParams('guestLang=es'))).toBe(false);
  });
});
