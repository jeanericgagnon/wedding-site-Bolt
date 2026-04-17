import { buildOnboardingUpdateData } from './onboardingMapper';
import type { ClarifyingPersistenceEnvelope } from './aiClarifyingPersistence';
import { buildClarifyingOnboardingAugmentation } from './clarifyingOnboardingMapper';

export type BuildOnboardingUpdateWithClarifyingInput = Parameters<typeof buildOnboardingUpdateData>[0] & {
  clarifying?: ClarifyingPersistenceEnvelope;
};

export const buildOnboardingUpdateWithClarifying = (input: BuildOnboardingUpdateWithClarifyingInput) => {
  const augmentation = buildClarifyingOnboardingAugmentation(input.clarifying);

  return buildOnboardingUpdateData({
    ...input,
    ourStory: augmentation.ourStory || input.ourStory,
    attire: augmentation.attire || input.attire,
    hotelRecommendations: augmentation.hotelRecommendations || input.hotelRecommendations,
    parking: augmentation.parking || input.parking,
    customFaqs: augmentation.customFaqs || input.customFaqs,
  });
};
