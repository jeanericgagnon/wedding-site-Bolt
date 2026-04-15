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
    weddingPartyIntro: {
      section: 'weddingPartyIntro',
      mode: hasStory ? 'fill' : 'light-fill',
      facts: {
        coupleNames: profile.couple.displayNames,
        storySummary: profile.story.summary,
      },
      tone: {
        storyTone: profile.couple.storyTone,
      },
      rules: [
        'Keep it affectionate and grounded.',
        'Do not sound ceremonial or generic.',
      ],
    },
    rsvpCallToAction: {
      section: 'rsvpCallToAction',
      mode: hasValue(profile.event.rsvpDeadline) ? 'fill' : 'light-fill',
      facts: {
        rsvpDeadline: profile.event.rsvpDeadline,
        eventDate: profile.event.date,
      },
      tone: {
        guestFeeling: profile.story.welcomeNote,
      },
      rules: [
        'Keep it gracious and direct.',
        'Do not sound canned or passive.',
      ],
    },
    contactIntro: {
      section: 'contactIntro',
      mode: 'light-fill',
      facts: {
        coupleNames: profile.couple.displayNames,
        faqTone: profile.guestExperience.faqTone,
      },
      tone: {
        guestFeeling: profile.story.welcomeNote,
      },
      rules: [
        'Make guests feel comfortable reaching out.',
        'Do not sound like support copy.',
      ],
    },
    directionsIntro: {
      section: 'directionsIntro',
      mode: hasVenue ? 'fill' : 'light-fill',
      facts: {
        venueName: profile.event.venueName,
        venueLocation: profile.event.venueLocation,
      },
      tone: {
        vibe: profile.design.vibe,
      },
      rules: [
        'Keep it orienting and practical.',
        'Do not sound like map-app UI copy.',
      ],
    },
    dressCodeIntro: {
      section: 'dressCodeIntro',
      mode: 'light-fill',
      facts: {
        designTheme: profile.design.theme,
        designVibe: profile.design.vibe,
      },
      tone: {
        vibe: profile.design.vibe,
      },
      rules: [
        'Help guests choose something appropriate.',
        'Do not sound stiff or fashion-editorial.',
      ],
    },
  };
};
