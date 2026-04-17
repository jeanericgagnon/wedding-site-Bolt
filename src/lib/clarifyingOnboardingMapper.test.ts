import { describe, expect, it } from 'vitest';
import { buildClarifyingOnboardingAugmentation } from './clarifyingOnboardingMapper';

describe('clarifyingOnboardingMapper', () => {
  it('maps clarifying persistence into onboarding mapper augmentation fields', () => {
    const value = buildClarifyingOnboardingAugmentation({
      clarifying: {
        mode: 'draft',
        questions: [],
        history: [],
      },
      draftOutputs: {
        story: { intro: 'We wanted this weekend to feel easy and welcoming.' },
        guestGuidance: {
          dressCode: 'Black tie optional',
          lodging: 'Hotel block at Chileno Bay',
          transport: 'Shuttles from the hotel',
        },
        faq: { guidance: ['Adults only', 'Please arrive early'] },
      },
    });

    expect(value.ourStory).toContain('welcoming');
    expect(value.attire).toBe('Black tie optional');
    expect(value.hotelRecommendations).toContain('Chileno Bay');
    expect(value.parking).toContain('Shuttles');
    expect(value.customFaqs).toContain('Guidance::Adults only');
  });
});
