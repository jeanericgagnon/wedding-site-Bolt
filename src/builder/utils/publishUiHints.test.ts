import { describe, expect, it } from 'vitest';
import {
  getPublishBlockedHints,
  getPublishCtaLabel,
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

  it('returns section guidance when the shorter blocker copy is whitespace-padded', () => {
    const hints = getPublishBlockedHints('   Turn on a section before going live.   ');
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

  it('returns wedding-date guidance when short date blocker copy is lowercased by upstream formatting', () => {
    const hints = getPublishBlockedHints('add your wedding date.');
    expect(hints[0]).toContain('event details');
  });

  it('returns wedding-date guidance when the shorter blocker copy is whitespace-padded', () => {
    const hints = getPublishBlockedHints('   Add your wedding date.   ');
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

  it('returns venue guidance when short venue blocker copy is lowercased by upstream formatting', () => {
    const hints = getPublishBlockedHints('add at least one venue name or address.');
    expect(hints[0]).toContain('venue');
  });

  it('returns venue guidance when the shorter blocker copy is whitespace-padded', () => {
    const hints = getPublishBlockedHints('   Add at least one venue name or address.   ');
    expect(hints[0]).toContain('venue');
  });

  it('returns partner-name guidance when blocker copy uses the shorter readiness detail wording', () => {
    const hints = getPublishBlockedHints('Add both names exactly how you want them shown.');
    expect(hints[0]).toContain('couple details');
  });

  it('returns partner-name guidance when the shorter blocker copy is whitespace-padded', () => {
    const hints = getPublishBlockedHints('   Add both names exactly how you want them shown.   ');
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

  it('returns RSVP guidance when blocker copy uses the shorter readiness detail wording', () => {
    const hints = getPublishBlockedHints('Turn RSVP on or remove RSVP calls to action.');
    expect(hints[0]).toContain('RSVP');
  });

  it('returns RSVP guidance when short blocker copy is lowercased by upstream formatting', () => {
    const hints = getPublishBlockedHints('turn rsvp on or remove rsvp calls to action.');
    expect(hints[0]).toContain('RSVP');
  });

  it('returns RSVP guidance when the shorter blocker copy is whitespace-padded', () => {
    const hints = getPublishBlockedHints('   Turn RSVP on or remove RSVP calls to action.   ');
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

  it('returns fallback guidance when blocker copy is punctuation-only after trimming', () => {
    const hints = getPublishBlockedHints(' ... ');
    expect(hints).toEqual(['Use Fix next to move through the last blockers before the guest-facing launch.']);
  });

  it('returns fallback guidance when blocker copy is newline-padded punctuation-only noise', () => {
    const hints = getPublishBlockedHints('\n ... \n');
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

  it('returns page guidance when blocker copy uses the shorter readiness detail wording', () => {
    const hints = getPublishBlockedHints('Add a page or apply a starting design.');
    expect(hints[0]).toContain('Designs');
  });

  it('returns page guidance when short page blocker copy is lowercased by upstream formatting', () => {
    const hints = getPublishBlockedHints('add a page or apply a starting design.');
    expect(hints[0]).toContain('Designs');
  });

  it('returns page guidance when the shorter blocker copy is whitespace-padded', () => {
    const hints = getPublishBlockedHints('   Add a page or apply a starting design.   ');
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

  it('labels publish CTA across draft and live states', () => {
    expect(getPublishCtaLabel(false)).toBe('Go live');
    expect(getPublishCtaLabel(true)).toBe('Update guest-facing site');
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
    expect(getPublishProgressLabel(-1, 2)).toBe('2 things left before guest-facing launch');
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

  it('keeps empty progress copy when total is negative even if done is positive', () => {
    expect(getPublishProgressLabel(3, -1)).toBe('No checks yet');
  });

  it('keeps empty progress copy when total is zero even if done is negative', () => {
    expect(getPublishProgressLabel(-3, 0)).toBe('No checks yet');
  });

  it('treats non-finite done counts as zero so progress copy stays truthful', () => {
    expect(getPublishProgressLabel(Number.NaN, 2)).toBe('2 things left before guest-facing launch');
  });

  it('treats non-finite totals as no checks yet so progress copy never shows impossible counts', () => {
    expect(getPublishProgressLabel(1, Number.POSITIVE_INFINITY)).toBe('No checks yet');
  });

  it('treats negative infinity done counts as zero so progress copy never goes past total', () => {
    expect(getPublishProgressLabel(Number.NEGATIVE_INFINITY, 2)).toBe('2 things left before guest-facing launch');
  });
});
