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

  it('returns partner-name guidance when blocker copy says both partners instead of both names', () => {
    const hints = getPublishBlockedHints('Add both partners before going live.');
    expect(hints[0]).toContain('couple details');
  });

  it('returns partner-name guidance when blocker copy says couple names instead of partner names', () => {
    const hints = getPublishBlockedHints('Add both couple names before going live.');
    expect(hints[0]).toContain('couple details');
  });

  it('does not mistake the names readiness label for a blocker', () => {
    expect(getPublishBlockedHints('Couple names are filled in')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
  });

  it('still routes real names blockers after tightening generic names matching', () => {
    expect(getPublishBlockedHints('Add both partner names before going live.')).toEqual([
      'Open your couple details.',
      'Add both names exactly how you want guests to see them.',
    ]);
    expect(getPublishBlockedHints('Add both couple names before going live.')).toEqual([
      'Open your couple details.',
      'Add both names exactly how you want guests to see them.',
    ]);
    expect(getPublishBlockedHints('Add both names exactly how you want them shown.')).toEqual([
      'Open your couple details.',
      'Add both names exactly how you want guests to see them.',
    ]);
    expect(getPublishBlockedHints('Add both names exactly how you want them shown before going live.')).toEqual([
      'Open your couple details.',
      'Add both names exactly how you want guests to see them.',
    ]);
    expect(getPublishBlockedHints('Add both names exactly how you want them shown\n before going live.')).toEqual([
      'Open your couple details.',
      'Add both names exactly how you want guests to see them.',
    ]);
    expect(getPublishBlockedHints('add both names exactly how you want them shown.')).toEqual([
      'Open your couple details.',
      'Add both names exactly how you want guests to see them.',
    ]);
    expect(getPublishBlockedHints('Add both partner names exactly how you want them shown.')).toEqual([
      'Open your couple details.',
      'Add both names exactly how you want guests to see them.',
    ]);
    expect(getPublishBlockedHints('Partner names exactly how you want them shown.')).toEqual([
      'Open your couple details.',
      'Add both names exactly how you want guests to see them.',
    ]);
    expect(getPublishBlockedHints('Couple names exactly how you want them shown.')).toEqual([
      'Open your couple details.',
      'Add both names exactly how you want guests to see them.',
    ]);
    expect(getPublishBlockedHints('Both couple names exactly how you want them shown.')).toEqual([
      'Open your couple details.',
      'Add both names exactly how you want guests to see them.',
    ]);
    expect(getPublishBlockedHints('Partner names exactly how you want them shown.')).toEqual([
      'Open your couple details.',
      'Add both names exactly how you want guests to see them.',
    ]);
    expect(getPublishBlockedHints('Names exactly how you want them shown.')).toEqual([
      'Open your couple details.',
      'Add both names exactly how you want guests to see them.',
    ]);
    expect(getPublishBlockedHints('Names exactly as you want them shown.')).toEqual([
      'Open your couple details.',
      'Add both names exactly how you want guests to see them.',
    ]);
  });

  it('does not mistake the names success detail for a blocker', () => {
    expect(getPublishBlockedHints('Names are ready for guests.')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
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

  it('returns wedding-date guidance when blocker copy says event date instead of wedding date', () => {
    const hints = getPublishBlockedHints('Add your event date before going live.');
    expect(hints[0]).toContain('event details');
  });

  it('does not mistake the date readiness label for a blocker', () => {
    expect(getPublishBlockedHints('Wedding date is set')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
  });

  it('still routes real date blockers after tightening generic date matching', () => {
    expect(getPublishBlockedHints('Add your wedding date before going live.')).toEqual([
      'Open event details.',
      'Add your wedding date before sharing with guests.',
    ]);
    expect(getPublishBlockedHints('Add your event date before going live.')).toEqual([
      'Open event details.',
      'Add your wedding date before sharing with guests.',
    ]);
    expect(getPublishBlockedHints('Add your date before going live.')).toEqual([
      'Open event details.',
      'Add your wedding date before sharing with guests.',
    ]);
    expect(getPublishBlockedHints('Set your wedding date before going live.')).toEqual([
      'Open event details.',
      'Add your wedding date before sharing with guests.',
    ]);
    expect(getPublishBlockedHints('Set your date before going live.')).toEqual([
      'Open event details.',
      'Add your wedding date before sharing with guests.',
    ]);
    expect(getPublishBlockedHints('Choose your wedding date before going live.')).toEqual([
      'Open event details.',
      'Add your wedding date before sharing with guests.',
    ]);
    expect(getPublishBlockedHints('Choose your date before going live.')).toEqual([
      'Open event details.',
      'Add your wedding date before sharing with guests.',
    ]);
    expect(getPublishBlockedHints('Choose your wedding date\n before going live.')).toEqual([
      'Open event details.',
      'Add your wedding date before sharing with guests.',
    ]);
  });

  it('keeps RSVP follow-up framed as share-readiness instead of go-live urgency', () => {
    expect(getPublishBlockedHints('Turn RSVP on before going live.')).toEqual([
      'Turn RSVP back on before sharing with guests.',
      'If you are not collecting replies yet, remove RSVP calls to action first.',
    ]);
  });

  it('understands the newer share-with-guests blocker phrasing from publish readiness', () => {
    expect(getPublishBlockedHints('Save your latest draft changes before sharing with guests.')).toEqual([
      'Save your draft before trying again.',
      'Then re-open publish and review the remaining checks.',
    ]);
    expect(getPublishBlockedHints('Add your wedding date before sharing with guests.')).toEqual([
      'Open event details.',
      'Add your wedding date before sharing with guests.',
    ]);
  });

  it('does not mistake the date success detail for a blocker', () => {
    expect(getPublishBlockedHints('Date is ready.')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
  });

  it('returns wedding-date guidance when blocker copy shortens to add your date', () => {
    const hints = getPublishBlockedHints('Add your date before going live.');
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

  it('returns venue guidance when the real blocker copy is lowercased by upstream formatting', () => {
    const hints = getPublishBlockedHints('add at least one venue before going live.');
    expect(hints[0]).toContain('venue');
  });

  it('returns venue guidance when blocker copy focuses on venue name or address wording', () => {
    const hints = getPublishBlockedHints('Venue name or address is still missing.');
    expect(hints[0]).toContain('venue');
  });

  it('normalizes multiline venue blocker copy before matching', () => {
    const hints = getPublishBlockedHints('Venue name or address\n is still missing.');
    expect(hints[0]).toContain('venue');
  });

  it('returns venue guidance when blocker copy focuses on venue name wording', () => {
    const hints = getPublishBlockedHints('Venue name is still missing.');
    expect(hints[0]).toContain('venue');
  });

  it('returns venue guidance when blocker copy focuses on venue address wording', () => {
    const hints = getPublishBlockedHints('Venue address is still missing.');
    expect(hints[0]).toContain('venue');
  });

  it('returns venue guidance for whitespace-padded venue message', () => {
    const hints = getPublishBlockedHints('   Add at least one venue before publishing.   ');
    expect(hints[0]).toContain('venue');
  });

  it('returns venue guidance when blocker copy uses the venue readiness detail prompt', () => {
    expect(getPublishBlockedHints('Add at least one venue name or address.')).toEqual([
      'Add at least one venue name or address.',
      'Make sure guests can tell where they are meant to go.',
    ]);
    expect(getPublishBlockedHints('Set at least one venue name or address.')).toEqual([
      'Add at least one venue name or address.',
      'Make sure guests can tell where they are meant to go.',
    ]);
  });

  it('returns venue guidance when blocker copy says location instead of venue', () => {
    const hints = getPublishBlockedHints('Add at least one location before going live.');
    expect(hints[0]).toContain('venue');
  });

  it('does not mistake unrelated generic location copy for a venue blocker', () => {
    expect(getPublishBlockedHints('Location services unavailable.')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
  });

  it('does not mistake the venue readiness label for a blocker', () => {
    expect(getPublishBlockedHints('Venue details are set')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
  });

  it('still routes real venue detail blockers after tightening generic venue matching', () => {
    expect(getPublishBlockedHints('Venue details missing before going live.')).toEqual([
      'Add at least one venue name or address.',
      'Make sure guests can tell where they are meant to go.',
    ]);
  });

  it('does not mistake venue success labels for blockers after tightening generic venue matching', () => {
    expect(getPublishBlockedHints('Venue details are set')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('Venue details are ready.')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
  });

  it('does not mistake the venue success detail for a blocker', () => {
    expect(getPublishBlockedHints('Venue details are ready.')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
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

  it('does not mistake the RSVP readiness label for a blocker', () => {
    expect(getPublishBlockedHints('RSVP is turned on')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
  });

  it('does not mistake the RSVP success detail for a blocker', () => {
    expect(getPublishBlockedHints('Guests can reply.')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
  });

  it('does not mistake the saved success detail for a blocker', () => {
    expect(getPublishBlockedHints('Everything is saved.')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('All changes saved.')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
  });

  it('does not mistake the saved readiness label for a blocker', () => {
    expect(getPublishBlockedHints('Latest edits are saved')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
  });

  it('does not mistake final-share-review progress copy for a blocker', () => {
    expect(getPublishBlockedHints('Ready for final share review')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
  });

  it('does not mistake remaining-progress copy for a blocker', () => {
    expect(getPublishBlockedHints('1 thing left before guest-facing launch')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('2 things left before guest-facing launch')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('2 things left before guest-facing launch!!!')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
  });

  it('does not mistake empty-progress copy for a blocker', () => {
    expect(getPublishBlockedHints('No checks yet')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
  });

  it('returns save guidance when blocker copy comes from the unsaved readiness detail', () => {
    expect(getPublishBlockedHints('Save your latest draft changes before going live.')).toEqual([
      'Save your draft before trying again.',
      'Then re-open publish and review the remaining checks.',
    ]);
    expect(getPublishBlockedHints('Save your latest draft changes before going live!!!')).toEqual([
      'Save your draft before trying again.',
      'Then re-open publish and review the remaining checks.',
    ]);
    expect(getPublishBlockedHints('Save your latest changes before going live.')).toEqual([
      'Save your draft before trying again.',
      'Then re-open publish and review the remaining checks.',
    ]);
  });

  it('does not mistake the live-up-to-date status copy for a blocker', () => {
    expect(getPublishBlockedHints('Live site is up to date')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
  });

  it('does not mistake draft-only status copy for a blocker', () => {
    expect(getPublishBlockedHints('Draft only')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
  });

  it('does not mistake unsaved draft status copy for a blocker', () => {
    expect(getPublishBlockedHints('Draft has unsaved changes')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('Draft has unsaved changes.')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('Draft has unsaved changes!!!')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('Shared site unchanged — you have new draft edits')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('Shared site unchanged — you have new draft edits.')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('Shared site unchanged - you have new draft edits')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('Shared site unchanged\n— you have new draft edits!!!')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('Shared site unchanged')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('Shared site unchanged.')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('Shared site unchanged!!!')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('Shared site unchanged:')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('Current page has visible sections;')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
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

  it('returns page guidance when blocker copy keeps the real message but drops punctuation', () => {
    const hints = getPublishBlockedHints('Add at least one page before going live');
    expect(hints[0]).toContain('Designs');
  });

  it('does not mistake the page readiness label for a blocker', () => {
    expect(getPublishBlockedHints('A page exists')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
  });

  it('does not mistake plural page-count readiness detail for a blocker', () => {
    expect(getPublishBlockedHints('2 pages ready')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('2 pages ready!!!')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
  });

  it('does not mistake singular page-count readiness detail for a blocker', () => {
    expect(getPublishBlockedHints('1 page ready')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
  });

  it('does not mistake the current-page readiness label for a page blocker', () => {
    expect(getPublishBlockedHints('Current page has visible content')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
  });

  it('does not mistake generic current-page copy for a blocker', () => {
    expect(getPublishBlockedHints('Current page')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
  });

  it('still returns section guidance when current-page blocker copy says to turn on content for the current page', () => {
    expect(getPublishBlockedHints('Turn on content for the current page.')).toEqual([
      'Select a section on the canvas.',
      'Turn it on in the right panel, then save and review the guest-facing draft again.',
    ]);
  });

  it('does not mistake the current-page success detail for a page blocker', () => {
    expect(getPublishBlockedHints('Current page has visible sections.')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('Current page has visible sections!!!')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
  });

  it('returns section guidance when blocker copy comes from current-page readiness detail', () => {
    const hints = getPublishBlockedHints('Turn on content for Details.');
    expect(hints[0]).toContain('Select a section on the canvas');
  });

  it('does not mistake visible-sections success detail for a blocker', () => {
    expect(getPublishBlockedHints('Details has visible sections.')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
  });

  it('does not mistake section-count success details for blockers', () => {
    expect(getPublishBlockedHints('1 section visible')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('2 sections visible')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
  });

  it('returns section guidance even when blocker copy is lowercased by upstream formatting', () => {
    const hints = getPublishBlockedHints('turn on at least one section before going live.');
    expect(hints[0]).toContain('Select a section on the canvas');
  });

  it('returns section guidance when blocker copy keeps the real message but drops punctuation', () => {
    const hints = getPublishBlockedHints('Turn on at least one section before going live');
    expect(hints[0]).toContain('Select a section on the canvas');
  });

  it('returns section guidance when blocker copy drops the article from the short section wording', () => {
    const hints = getPublishBlockedHints('Turn on section before going live.');
    expect(hints[0]).toContain('Select a section on the canvas');
  });

  it('returns section guidance when blocker copy pluralizes the short section wording', () => {
    const hints = getPublishBlockedHints('Turn on sections before going live.');
    expect(hints[0]).toContain('Select a section on the canvas');
  });

  it('does not mistake the sections readiness label for a blocker', () => {
    expect(getPublishBlockedHints('At least one section is turned on')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
  });

  it('does not mistake plural section-count readiness detail for a blocker', () => {
    expect(getPublishBlockedHints('2 sections visible')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
  });

  it('returns partner guidance even when blocker copy is lowercased by upstream formatting', () => {
    const hints = getPublishBlockedHints('add both partner names before going live.');
    expect(hints[0]).toContain('couple details');
  });

  it('returns partner guidance when blocker copy keeps the real message but drops punctuation', () => {
    const hints = getPublishBlockedHints('Add both partner names before going live');
    expect(hints[0]).toContain('couple details');
  });

  it('returns date guidance even when blocker copy is lowercased by upstream formatting', () => {
    const hints = getPublishBlockedHints('add your wedding date before going live.');
    expect(hints[0]).toContain('event details');
  });

  it('returns date guidance when blocker copy keeps the real message but drops punctuation', () => {
    const hints = getPublishBlockedHints('Add your wedding date before going live');
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
    expect(getPublishCtaLabel(false)).toBe('Share with guests');
    expect(getPublishCtaLabel(true)).toBe('Update guest-facing site');
  });

  it('does not mistake publish CTA copy for a blocker', () => {
    expect(getPublishBlockedHints('Share with guests')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('Share with guests.')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('Update guest-facing site')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('Update guest-facing site.')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('Guest-facing site')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('Guest-facing site.')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
  });

  it('treats exact non-blocking progress and status copy as safe while keeping blocker routing for real publish errors', () => {
    expect(getPublishBlockedHints('2 things left before guest-facing launch')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('2 things left before guest-facing launch.')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('1 page ready')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('1 section visible')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('Shared site unchanged — you have new draft edits')).toEqual([
      'Use Fix next to move through the last blockers before the guest-facing launch.',
    ]);
    expect(getPublishBlockedHints('Add at least one venue before going live.')).toEqual([
      'Add at least one venue name or address.',
      'Make sure guests can tell where they are meant to go.',
    ]);
    expect(getPublishBlockedHints('Add at least one venue name or address before going live.')).toEqual([
      'Add at least one venue name or address.',
      'Make sure guests can tell where they are meant to go.',
    ]);
  });

  it('still returns venue guidance for publishing-era venue blockers after CTA guard tightening', () => {
    expect(getPublishBlockedHints('Add at least one venue before publishing.')[0]).toContain('venue');
  });

  it('labels publish status across draft and live states', () => {
    expect(getPublishStatusLabel(false, true)).toBe('Draft has unsaved changes');
    expect(getPublishStatusLabel(false, false)).toBe('Draft only');
    expect(getPublishStatusLabel(true, true)).toBe('Shared site unchanged — you have new draft edits');
    expect(getPublishStatusLabel(true, false)).toBe('Shared site is up to date');
    expect(getPublishStatusLabel(false, false)).not.toBe('Shared site is up to date');
    expect(getPublishStatusLabel(false, true)).not.toBe('Draft only');
    expect(getPublishStatusLabel(true, true)).not.toBe('Live site is up to date');
  });

  it('labels publish progress for empty, partial, and complete readiness', () => {
    expect(getPublishProgressLabel(0, 0)).toBe('No checks yet');
    expect(getPublishProgressLabel(3, 5)).toBe('2 things left before guest-facing launch');
    expect(getPublishProgressLabel(4, 5)).toBe('1 thing left before guest-facing launch');
    expect(getPublishProgressLabel(5, 5)).toBe('Ready for final share review');
    expect(getPublishProgressLabel(0, 2)).toBe('2 things left before guest-facing launch');
    expect(getPublishProgressLabel(1, 2)).toBe('1 thing left before guest-facing launch');
    expect(getPublishProgressLabel(2, 2)).toBe('Ready for final share review');
    expect(getPublishProgressLabel(6, 6)).toBe('Ready for final share review');
    expect(getPublishProgressLabel(7, 6)).toBe('Ready for final share review');
    expect(getPublishProgressLabel(-1, 2)).toBe('2 things left before guest-facing launch');
  });

  it('treats over-complete progress as ready for final share review', () => {
    expect(getPublishProgressLabel(9, 5)).toBe('Ready for final share review');
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

  it('treats positive infinity done counts as zero so progress copy never claims impossible readiness', () => {
    expect(getPublishProgressLabel(Number.POSITIVE_INFINITY, 2)).toBe('2 things left before guest-facing launch');
  });

  it('treats NaN totals as no checks yet so progress copy never shows impossible remaining counts', () => {
    expect(getPublishProgressLabel(1, Number.NaN)).toBe('No checks yet');
  });

  it('treats NaN done counts with a finite total as zero remaining progress input', () => {
    expect(getPublishProgressLabel(Number.NaN, 1)).toBe('1 thing left before guest-facing launch');
  });

  it('treats fractional progress counts as whole checks so the UI never shows impossible decimals', () => {
    expect(getPublishProgressLabel(1.9, 3)).toBe('2 things left before guest-facing launch');
    expect(getPublishProgressLabel(2.1, 3.9)).toBe('1 thing left before guest-facing launch');
  });

  it('treats negative infinity totals as no checks yet so progress copy stays grounded', () => {
    expect(getPublishProgressLabel(1, Number.NEGATIVE_INFINITY)).toBe('No checks yet');
  });
});
