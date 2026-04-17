import { describe, expect, it } from 'vitest';
import { mapDraftOutputsToTemplateSeed } from './aiClarifyingMapper';

describe('aiClarifyingMapper', () => {
  it('maps draft outputs into template seed fields', () => {
    const value = mapDraftOutputsToTemplateSeed({
      hero: { headline: 'A', subheadline: 'Warm weekend in Cabo', toneNote: 'warm' },
      schedule: { intro: 'Join us all weekend', eventSummary: 'Friday welcome party, Saturday wedding' },
      faq: { guidance: ['Adults only', 'Black tie optional'] },
      travel: { intro: 'Most guests are flying in' },
      story: { intro: 'We wanted the weekend to feel easy and joyful.' },
      guestGuidance: {
        dressCode: 'Black tie optional',
        children: 'Adults only',
        lodging: 'Hotel block at Chileno Bay',
        transport: 'Shuttles provided on wedding day',
      },
      siteTone: { summary: 'Warm and celebratory' },
    });

    expect(value.heroSubtitle).toBe('Warm weekend in Cabo');
    expect(value.scheduleSummary).toContain('Saturday wedding');
    expect(value.faqGuidance).toHaveLength(2);
    expect(value.transportGuidance).toContain('Shuttles');
    expect(value.siteToneSummary).toBe('Warm and celebratory');
  });
});
