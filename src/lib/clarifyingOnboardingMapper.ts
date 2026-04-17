import type { ClarifyingPersistenceEnvelope } from './aiClarifyingPersistence';
import { mapClarifyingPersistenceToTemplateSeed } from './aiClarifyingMapper';

export type OnboardingMapperAugmentation = {
  ourStory?: string;
  attire?: string;
  hotelRecommendations?: string;
  parking?: string;
  customFaqs?: string;
};

export const buildClarifyingOnboardingAugmentation = (
  clarifying?: ClarifyingPersistenceEnvelope,
): OnboardingMapperAugmentation => {
  if (!clarifying) return {};

  const seed = mapClarifyingPersistenceToTemplateSeed(clarifying);
  const faqLines = seed.faqGuidance.map((line) => `Guidance::${line}`).join('\n');

  return {
    ourStory: seed.storyIntro || undefined,
    attire: seed.dressCode || undefined,
    hotelRecommendations: seed.lodgingGuidance || undefined,
    parking: seed.transportGuidance || undefined,
    customFaqs: faqLines || undefined,
  };
};
