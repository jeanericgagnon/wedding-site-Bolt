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
    source.travel.notes = '';

    const result = applySetupDraftToWeddingData(
      source,
      draft({
        partnerOneFirstName: 'Eric',
        partnerTwoFirstName: 'Alex',
        weddingDate: '2026-10-10',
        dateKnown: true,
        weddingCity: 'San Diego',
        weddingRegion: 'CA',
        stylePreferences: ['modern', 'romantic'],
      })
    );

    expect(result.couple.partner1Name).toContain('Eric');
    expect(result.couple.partner2Name).toContain('Alex');
    expect(result.couple.displayName).toContain('Eric & Alex');
    expect(result.event.weddingDateISO).toBe(new Date('2026-10-10').toISOString());
    expect(result.venues[0]?.address).toBe('San Diego, CA');
    expect(result.theme.tokens?.style_preferences).toContain('modern');
    expect(result.couple.story).toContain('Eric & Alex');
    expect(result.travel.notes).toContain('hotel and travel recommendations');
    expect(result.meta.useCasePacks).toEqual([]);
    expect(result.rsvp.deadlineISO).toBe(new Date('2026-09-10').toISOString());
    expect(result.schedule[0]?.label).toBe('Ceremony');
    expect(result.faq.some((item) => item.q.includes('RSVP'))).toBe(true);
  });

  it('does not override existing authored fields', () => {
    const source = createEmptyWeddingData();
    source.couple.story = 'Custom story';
    source.travel.notes = 'Custom travel';

    const result = applySetupDraftToWeddingData(source, draft({ partnerOneFirstName: 'Eric' }));
    expect(result.couple.story).toBe('Custom story');
    expect(result.travel.notes).toBe('Custom travel');
  });

  it('skips invalid setup draft wedding dates instead of crashing hydration', () => {
    const source = createEmptyWeddingData();

    const result = applySetupDraftToWeddingData(
      source,
      draft({
        partnerOneFirstName: 'Eric',
        weddingDate: 'not-a-date',
        dateKnown: true,
      })
    );

    expect(result.event.weddingDateISO).toBeUndefined();
  });

  it('keeps hydrated couple display truth clean when restored names contain only whitespace', () => {
    const source = createEmptyWeddingData();
    source.couple.partner1Name = '   ';
    source.couple.partner2Name = 'Alex';
    source.couple.story = '';

    const result = applySetupDraftToWeddingData(source, draft());

    expect(result.couple.displayName).toBe('Alex');
    expect(result.couple.story).toContain('Alex');
  });

  it('hydrates destination-aware travel, schedule, and faq scaffolding', () => {
    const source = createEmptyWeddingData();

    const result = applySetupDraftToWeddingData(
      source,
      draft({
        partnerOneFirstName: 'Alex',
        partnerTwoFirstName: 'Jordan',
        weddingDate: '2026-11-15',
        dateKnown: true,
        weddingCity: 'Sayulita',
        guestEstimateBand: '200plus',
        stylePreferences: ['Destination'],
      })
    );

    expect(result.meta.useCasePacks).toEqual(['destination']);
    expect(result.travel.hotelInfo).toContain('room-block');
    expect(result.travel.flightInfo).toContain('Sayulita');
    expect(result.schedule[0]?.label).toBe('Welcome gathering');
    expect(result.faq.some((item) => item.q.includes('When should guests arrive'))).toBe(true);
  });
});
