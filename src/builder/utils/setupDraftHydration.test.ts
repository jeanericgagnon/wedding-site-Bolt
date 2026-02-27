import { describe, expect, it } from 'vitest';
import { emptySetupDraft, type SetupDraft } from '../../lib/setupDraft';
import { createEmptyWeddingData } from '../../types/weddingData';
import { applySetupDraftToWeddingData, hasMeaningfulSetupDraft } from './setupDraftHydration';

const draft = (overrides?: Partial<SetupDraft>): SetupDraft => ({ ...emptySetupDraft, ...overrides });

describe('setupDraftHydration', () => {
  it('detects meaningful setup draft', () => {
    expect(hasMeaningfulSetupDraft(draft())).toBe(false);
    expect(hasMeaningfulSetupDraft(draft({ partnerOneFirstName: 'Eric' }))).toBe(true);
  });

  it('hydrates names/date/location and smart defaults', () => {
    const source = createEmptyWeddingData();
    source.couple.story = '';
    source.wedding.message = '';
    source.rsvp.message = '';
    source.travel.notes = '';

    const result = applySetupDraftToWeddingData(
      source,
      draft({
        partnerOneFirstName: 'Eric',
        partnerTwoFirstName: 'Alex',
        weddingDate: '2026-10-10',
        weddingCity: 'San Diego',
        weddingRegion: 'CA',
        stylePreferences: ['modern', 'romantic'],
      })
    );

    expect(result.couple.partner1Name).toContain('Eric');
    expect(result.couple.partner2Name).toContain('Alex');
    expect(result.wedding.date).toBe('2026-10-10');
    expect(result.countdown.targetDate).toBe('2026-10-10');
    expect(result.wedding.location).toBe('San Diego, CA');
    expect(result.metadata.tags).toEqual(expect.arrayContaining(['modern', 'romantic']));
    expect(result.couple.story).toContain('Eric & Alex');
    expect(result.wedding.message).toContain('Join us in San Diego, CA');
    expect(result.rsvp.message).toContain("Please RSVP");
    expect(result.travel.notes).toContain('hotel and travel recommendations');
  });

  it('does not override existing authored fields', () => {
    const source = createEmptyWeddingData();
    source.couple.story = 'Custom story';
    source.wedding.message = 'Custom message';
    source.rsvp.message = 'Custom RSVP';
    source.travel.notes = 'Custom travel';

    const result = applySetupDraftToWeddingData(source, draft({ partnerOneFirstName: 'Eric' }));
    expect(result.couple.story).toBe('Custom story');
    expect(result.wedding.message).toBe('Custom message');
    expect(result.rsvp.message).toBe('Custom RSVP');
    expect(result.travel.notes).toBe('Custom travel');
  });
});
