import { describe, expect, it } from 'vitest';
import { getPublishBlockedHints, shouldAutoPublishFromSearch, shouldOpenPhotoTipsFromSearch } from './publishUiHints';

describe('publishUiHints', () => {
  it('returns page guidance for no-page message', () => {
    const hints = getPublishBlockedHints('Add at least one page before publishing.');
    expect(hints[0]).toContain('Designs');
  });

  it('returns section guidance for no-enabled-sections message', () => {
    const hints = getPublishBlockedHints('Turn on at least one section before publishing.');
    expect(hints[0]).toContain('Select a section on the canvas');
  });

  it('returns partner-name guidance', () => {
    const hints = getPublishBlockedHints('Add both partner names before publishing.');
    expect(hints[0]).toContain('couple details');
  });

  it('returns wedding-date guidance', () => {
    const hints = getPublishBlockedHints('Add your wedding date before publishing.');
    expect(hints[0]).toContain('event details');
  });

  it('returns venue guidance', () => {
    const hints = getPublishBlockedHints('Add at least one venue before publishing.');
    expect(hints[0]).toContain('venue');
  });

  it('returns RSVP guidance', () => {
    const hints = getPublishBlockedHints('Enable RSVP before publishing.');
    expect(hints[0]).toContain('RSVP');
  });

  it('returns fallback guidance for unknown message', () => {
    const hints = getPublishBlockedHints('Something else');
    expect(hints).toEqual(['Use Fix next to move through the last blockers before the guest-facing launch.']);
  });

  it('detects publishNow from querystring', () => {
    expect(shouldAutoPublishFromSearch('?publishNow=1')).toBe(true);
    expect(shouldAutoPublishFromSearch('?foo=bar&publishNow=1')).toBe(true);
    expect(shouldAutoPublishFromSearch('?publishNow=0')).toBe(false);
    expect(shouldAutoPublishFromSearch('')).toBe(false);
  });

  it('detects photoTips from querystring', () => {
    expect(shouldOpenPhotoTipsFromSearch('?photoTips=1')).toBe(true);
    expect(shouldOpenPhotoTipsFromSearch('?foo=bar&photoTips=1')).toBe(true);
    expect(shouldOpenPhotoTipsFromSearch('?photoTips=0')).toBe(false);
    expect(shouldOpenPhotoTipsFromSearch('')).toBe(false);
  });
});
