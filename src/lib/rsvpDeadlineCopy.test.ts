import { describe, expect, it } from 'vitest';
import { buildSuggestedFaqDrafts } from './faqDraftHelper';
import { buildRsvpReminderDraft } from './reminderDraftHelper';
import { normalizeRsvpDeadlineForCopy } from './rsvpDeadlineCopy';

describe('normalizeRsvpDeadlineForCopy', () => {
  it('drops impossible RSVP deadlines instead of leaking fake date truth into copy', () => {
    expect(normalizeRsvpDeadlineForCopy('2027-02-31')).toBe('');
    expect(normalizeRsvpDeadlineForCopy('not-a-date')).toBe('');
  });

  it('keeps valid RSVP deadlines intact', () => {
    expect(normalizeRsvpDeadlineForCopy('2027-02-14')).toBe('2027-02-14');
  });
});

describe('RSVP deadline copy helpers', () => {
  it('falls back cleanly in reminder drafts when the persisted deadline is invalid', () => {
    const draft = buildRsvpReminderDraft({
      rsvpDeadline: '2027-02-31',
      venue: 'Casa Lucero',
    });

    expect(draft.body).toContain('Please RSVP when you have a moment.');
    expect(draft.body).not.toContain('2027-02-31');
  });

  it('omits RSVP faq answers when the persisted deadline is invalid', () => {
    const items = buildSuggestedFaqDrafts({
      rsvpDeadline: '2027-02-31',
    });

    expect(items.find((item) => item.question === 'When should I RSVP by?')).toBeUndefined();
  });
});
