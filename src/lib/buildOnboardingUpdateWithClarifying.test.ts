import { describe, expect, it } from 'vitest';
import { buildOnboardingUpdateWithClarifying } from './buildOnboardingUpdateWithClarifying';

describe('buildOnboardingUpdateWithClarifying', () => {
  it('applies clarifying augmentation before building onboarding update data', () => {
    const value = buildOnboardingUpdateWithClarifying({
      coupleNames: { name1: 'Keira', name2: 'Alex' },
      planningStatus: 'quick_start_complete',
      template: 'generated-modern-luxe',
      weddingDate: '2027-06-05',
      venue: 'Chileno Bay Resort',
      location: 'Cabo San Lucas',
      city: 'Cabo San Lucas',
      clarifying: {
        clarifying: {
          mode: 'draft',
          questions: [],
          history: [],
        },
        draftOutputs: {
          story: { intro: 'We wanted the weekend to feel easy and joyful.' },
          guestGuidance: {
            dressCode: 'Black tie optional',
            lodging: 'Hotel block at Chileno Bay',
            transport: 'Shuttles from the hotel',
          },
          faq: { guidance: ['Adults only'] },
        },
      },
    });

    expect(value.wedding_data).toBeTruthy();
    expect(value.planning_status).toBe('quick_start_complete');
  });
});
