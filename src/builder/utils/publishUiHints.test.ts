import { describe, expect, it } from 'vitest';
import {
  getPublishBlockedHints,
  getPublishProgressLabel,
  getPublishStatusLabel,
  shouldAutoPublishFromSearch,
  shouldOpenPhotoTipsFromSearch,
} from './publishUiHints';

describe('publishUiHints', () => {
  it('returns page guidance for no-page message', () => {
    const hints = getPublishBlockedHints('Add at least one page before publishing.');
    expect(hints[0]).toContain('Designs');
  });

  it('returns page guidance for the real publish readiness blocker copy', () => {
    const hints = getPublishBlockedHints('Add at least one page before going live.');
    expect(hints[0]).toContain('Designs');
  });

  it('returns section guidance for no-enabled-sections message', () => {
    const hints = getPublishBlockedHints('Turn on at least one section before publishing.');
    expect(hints[0]).toContain('Select a section on the canvas');
  });

  it('returns section guidance for the real publish readiness blocker copy', () => {
    const hints = getPublishBlockedHints('Turn on at least one section before going live.');
    expect(hints[0]).toContain('Select a section on the canvas');
  });

  it('returns section guidance for whitespace-padded no-enabled-sections message', () => {
    const hints = getPublishBlockedHints('   Turn on at least one section before publishing.   ');
    expect(hints[0]).toContain('Select a section on the canvas');
  });

  it('returns section guidance when blocker copy uses the shorter readiness detail wording', () => {
    const hints = getPublishBlockedHints('Turn on a section before going live.');
    expect(hints[0]).toContain('Select a section on the canvas');
  });

  it('returns section guidance when short blocker copy is lowercased by upstream formatting', () => {
    const hints = getPublishBlockedHints('turn on a section before going live.');
    expect(hints[0]).toContain('Select a section on the canvas');
  });

  it('returns partner-name guidance', () => {
    const hints = getPublishBlockedHints('Add both partner names before publishing.');
    expect(hints[0]).toContain('couple details');
  });

  it('returns partner-name guidance for the real publish readiness blocker copy', () => {
    const hints = getPublishBlockedHints('Add both partner names before going live.');
    expect(hints[0]).toContain('couple details');
  });

  it('returns partner-name guidance for whitespace-padded partner message', () => {
    const hints = getPublishBlockedHints('   Add both partner names before publishing.   ');
    expect(hints[0]).toContain('couple details');
  });

  it('returns partner-name guidance when blocker copy says both names instead of partner names', () => {
    const hints = getPublishBlockedHints('Add both names exactly how you want them shown.');
    expect(hints[0]).toContain('couple details');
  });

  it('returns partner-name guidance when both-names blocker copy is lowercased by upstream formatting', () => {
    const hints = getPublishBlockedHints('add both names exactly how you want them shown.');
    expect(hints[0]).toContain('couple details');
  });

  it('returns wedding-date guidance', () => {
    const hints = getPublishBlockedHints('Add your wedding date before publishing.');
    expect(hints[0]).toContain('event details');
  });

  it('returns wedding-date guidance for the real publish readiness blocker copy', () => {
    const hints = getPublishBlockedHints('Add your wedding date before going live.');
    expect(hints[0]).toContain('event details');
  });

  it('returns wedding-date guidance for whitespace-padded date message', () => {
    const hints = getPublishBlockedHints('   Add your wedding date before publishing.   ');
    expect(hints[0]).toContain('event details');
  });

  it('returns wedding-date guidance when blocker copy uses the shorter date wording from readiness detail', () => {
    const hints = getPublishBlockedHints('Add your wedding date.');
    expect(hints[0]).toContain('event details');
  });

  it('returns venue guidance', () => {
    const hints = getPublishBlockedHints('Add at least one venue before publishing.');
    expect(hints[0]).toContain('venue');
  });

  it('returns venue guidance for the real publish readiness blocker copy', () => {
    const hints = getPublishBlockedHints('Add at least one venue before going live.');
    expect(hints[0]).toContain('venue');
  });

  it('returns venue guidance for whitespace-padded venue message', () => {
    const hints = getPublishBlockedHints('   Add at least one venue before publishing.   ');
    expect(hints[0]).toContain('venue');
  });

  it('returns venue guidance when blocker copy uses the shorter readiness detail wording', () => {
    const hints = getPublishBlockedHints('Add at least one venue name or address.');
    expect(hints[0]).toContain('venue');
  });

  it('returns partner-name guidance when blocker copy uses the shorter readiness detail wording', () => {
    const hints = getPublishBlockedHints('Add both names exactly how you want them shown.');
    expect(hints[0]).toContain('couple details');
  });

  it('returns RSVP guidance', () => {
    const hints = getPublishBlockedHints('Enable RSVP before publishing.');
    expect(hints[0]).toContain('RSVP');
  });

  it('returns RSVP guidance for the real publish readiness blocker copy', () => {
    const hints = getPublishBlockedHints('Turn RSVP on before going live.');
    expect(hints[0]).toContain('RSVP');
  });

  it('returns RSVP guidance for whitespace-padded RSVP message', () => {
    const hints = getPublishBlockedHints('   Enable RSVP before publishing.   ');
    expect(hints[0]).toContain('RSVP');
  });

  it('returns fallback guidance for unknown message', () => {
    const hints = getPublishBlockedHints('Something else');
    expect(hints).toEqual(['Use Fix next to move through the last blockers before the guest-facing launch.']);
  });

  it('returns fallback guidance for unknown whitespace-padded message', () => {
    const hints = getPublishBlockedHints('   Something else   ');
    expect(hints).toEqual(['Use Fix next to move through the last blockers before the guest-facing launch.']);
  });

  it('returns fallback guidance for unknown multiline-padded message', () => {
    const hints = getPublishBlockedHints('\nSomething else\n');
    expect(hints).toEqual(['Use Fix next to move through the last blockers before the guest-facing launch.']);
  });

  it('returns page guidance even when blocker copy is lowercased by upstream formatting', () => {
    const hints = getPublishBlockedHints('add at least one page before going live.');
    expect(hints[0]).toContain('Designs');
  });

  it('returns section guidance even when blocker copy is lowercased by upstream formatting', () => {
    const hints = getPublishBlockedHints('turn on at least one section before going live.');
    expect(hints[0]).toContain('Select a section on the canvas');
  });

  it('returns partner guidance even when blocker copy is lowercased by upstream formatting', () => {
    const hints = getPublishBlockedHints('add both partner names before going live.');
    expect(hints[0]).toContain('couple details');
  });

  it('returns date guidance even when blocker copy is lowercased by upstream formatting', () => {
    const hints = getPublishBlockedHints('add your wedding date before going live.');
    expect(hints[0]).toContain('event details');
  });

  it('returns venue guidance even when blocker copy is lowercased by upstream formatting', () => {
    const hints = getPublishBlockedHints('add at least one venue before going live.');
    expect(hints[0]).toContain('venue');
  });

  it('returns RSVP guidance even when blocker copy is lowercased by upstream formatting', () => {
    const hints = getPublishBlockedHints('turn rsvp on before going live.');
    expect(hints[0]).toContain('RSVP');
  });

  it('falls back to generic guidance for whitespace-only blocker copy', () => {
    expect(getPublishBlockedHints('   ')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
  });

  it('returns page guidance for whitespace-padded no-page message', () => {
    const hints = getPublishBlockedHints('   Add at least one page before publishing.   ');
    expect(hints[0]).toContain('Designs');
  });

  it('detects publishNow from querystring', () => {
    expect(shouldAutoPublishFromSearch('?publishNow=1')).toBe(true);
    expect(shouldAutoPublishFromSearch('?foo=bar&publishNow=1')).toBe(true);
    expect(shouldAutoPublishFromSearch('?publishNow=0')).toBe(false);
    expect(shouldAutoPublishFromSearch('?publishNow=1&foo=bar')).toBe(true);
    expect(shouldAutoPublishFromSearch('?publishNow=true')).toBe(false);
    expect(shouldAutoPublishFromSearch('?publishNow=01')).toBe(false);
    expect(shouldAutoPublishFromSearch('?publishNow=1#ignored')).toBe(false);
    expect(shouldAutoPublishFromSearch('?publishNow=1&publishNow=0')).toBe(true);
    expect(shouldAutoPublishFromSearch('')).toBe(false);
  });

  it('detects photoTips from querystring', () => {
    expect(shouldOpenPhotoTipsFromSearch('?photoTips=1')).toBe(true);
    expect(shouldOpenPhotoTipsFromSearch('?foo=bar&photoTips=1')).toBe(true);
    expect(shouldOpenPhotoTipsFromSearch('?photoTips=1&foo=bar')).toBe(true);
    expect(shouldOpenPhotoTipsFromSearch('?photoTips=0')).toBe(false);
    expect(shouldOpenPhotoTipsFromSearch('?photoTips=true')).toBe(false);
    expect(shouldOpenPhotoTipsFromSearch('?photoTips=01')).toBe(false);
    expect(shouldOpenPhotoTipsFromSearch('?photoTips=1#ignored')).toBe(false);
    expect(shouldOpenPhotoTipsFromSearch('?photoTips=1&photoTips=0')).toBe(true);
    expect(shouldOpenPhotoTipsFromSearch('')).toBe(false);
  });

  it('labels publish status across draft and live states', () => {
    expect(getPublishStatusLabel(false, true)).toBe('Draft has unsaved changes');
    expect(getPublishStatusLabel(false, false)).toBe('Draft only');
    expect(getPublishStatusLabel(true, true)).toBe('Live site unchanged — you have new draft edits');
    expect(getPublishStatusLabel(true, false)).toBe('Live site is up to date');
    expect(getPublishStatusLabel(false, false)).not.toBe('Live site is up to date');
    expect(getPublishStatusLabel(false, true)).not.toBe('Draft only');
    expect(getPublishStatusLabel(true, true)).not.toBe('Live site is up to date');
  });

  it('labels publish progress for empty, partial, and complete readiness', () => {
    expect(getPublishProgressLabel(0, 0)).toBe('No checks yet');
    expect(getPublishProgressLabel(3, 5)).toBe('2 things left before guest-facing launch');
    expect(getPublishProgressLabel(4, 5)).toBe('1 thing left before guest-facing launch');
    expect(getPublishProgressLabel(5, 5)).toBe('Ready to go live');
    expect(getPublishProgressLabel(0, 2)).toBe('2 things left before guest-facing launch');
    expect(getPublishProgressLabel(1, 2)).toBe('1 thing left before guest-facing launch');
    expect(getPublishProgressLabel(2, 2)).toBe('Ready to go live');
    expect(getPublishProgressLabel(6, 6)).toBe('Ready to go live');
    expect(getPublishProgressLabel(7, 6)).toBe('Ready to go live');
  });

  it('treats over-complete progress as ready to go live', () => {
    expect(getPublishProgressLabel(9, 5)).toBe('Ready to go live');
  });

  it('keeps the fallback blocker copy when the error is blank', () => {
    expect(getPublishBlockedHints('')).toEqual([]);
    expect(getPublishBlockedHints(null)).toEqual([]);
    expect(getPublishBlockedHints(undefined)).toEqual([]);
  });

  it('keeps singular grammar when one blocker remains even if done exceeds total by one after clamping elsewhere', () => {
    expect(getPublishProgressLabel(0, 1)).toBe('1 thing left before guest-facing launch');
  });
});
