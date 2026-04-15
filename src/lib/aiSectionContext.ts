import { WeddingProfile } from './weddingProfile';

export type SectionPromptMode = 'fill' | 'light-fill' | 'skip';

export type SectionPromptPayload = {
  section: string;
  mode: SectionPromptMode;
  facts: Record<string, unknown>;
  tone: Record<string, unknown>;
  rules: string[];
};

const hasValue = (value?: string | null) => Boolean(value && value.trim());

export const buildSectionPromptPayloads = (profile: WeddingProfile): Record<string, SectionPromptPayload> => {
  const hasVenue = hasValue(profile.event.venueName) || hasValue(profile.event.venueLocation);
  const hasRegistry = hasValue(profile.registry.url);
  const hasStory = hasValue(profile.story.summary);
  const highTravelSupport = profile.guestExperience.travelSupportLevel === 'high';

  return {
    registryIntro: {
      section: 'registryIntro',
      mode: hasRegistry ? 'fill' : 'light-fill',
      facts: {
        registryExists: hasRegistry,
        registryUrlPresent: hasRegistry,
        coupleNames: profile.couple.displayNames,
      },
      tone: {
        vibe: profile.design.vibe,
      },
      rules: [
        'Do not say there is no registry if this section is present.',
        'Do not sound transactional or gift-grabby.',
      ],
    },
    faqIntro: {
      section: 'faqIntro',
      mode: highTravelSupport || hasVenue ? 'fill' : 'light-fill',
      facts: {
        venueLocation: profile.event.venueLocation,
        travelSupportLevel: profile.guestExperience.travelSupportLevel,
        faqTone: profile.guestExperience.faqTone,
      },
      tone: {
        faqTone: profile.guestExperience.faqTone,
      },
      rules: [
        'Keep it guest-helpful.',
        'Avoid support-center phrasing.',
      ],
    },
    travelIntro: {
      section: 'travelIntro',
      mode: hasVenue ? 'fill' : 'light-fill',
      facts: {
        venueName: profile.event.venueName,
        venueLocation: profile.event.venueLocation,
        travelSupportLevel: profile.guestExperience.travelSupportLevel,
      },
      tone: {
        guestFeeling: profile.story.welcomeNote,
      },
      rules: [
        'Keep it practical and calm.',
        'Do not sound like destination marketing copy.',
      ],
    },
    accommodationsIntro: {
      section: 'accommodationsIntro',
      mode: highTravelSupport ? 'fill' : 'light-fill',
      facts: {
        venueLocation: profile.event.venueLocation,
        travelSupportLevel: profile.guestExperience.travelSupportLevel,
      },
      tone: {
        vibe: profile.design.vibe,
      },
      rules: [
        'Keep it practical and welcoming.',
        'Do not sound like hotel brochure copy.',
      ],
    },
    storyBody: {
      section: 'storyBody',
      mode: hasStory ? 'fill' : 'light-fill',
      facts: {
        coupleNames: profile.couple.displayNames,
        storySummary: profile.story.summary,
      },
      tone: {
        storyTone: profile.couple.storyTone,
        vibe: profile.design.vibe,
      },
      rules: [
        'Do not invent backstory.',
        'If details are sparse, be restrained and honest.',
      ],
    },
  };
};

