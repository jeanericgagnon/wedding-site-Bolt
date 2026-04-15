import { WeddingProfile } from './weddingProfile';

export type SectionPromptMode = 'fill' | 'light-fill' | 'skip';

export type SectionPromptPayload = {
  section: string;
  mode: SectionPromptMode;
  facts: Record<string, unknown>;
  tone: Record<string, unknown>;
  rules: string[];
  examples?: {
    good?: string[];
    avoid?: string[];
  };
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
      examples: {
        good: [
          'Many of you are traveling across the globe to celebrate with us, so your presence means the world to us and is all we ask for.',
          'Your presence and prayers on our big day are all we ask for.',
        ],
        avoid: [
          'Your presence is the greatest gift.',
          'We appreciate your thoughtfulness.',
        ],
      },
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
      examples: {
        good: [
          'You have questions, we have answers.',
          'This site has everything you’ll need leading up to the big day.',
        ],
        avoid: [
          'Answers to common questions.',
          'A few helpful details.',
        ],
      },
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
      examples: {
        good: [
          'Pack your bags, we’re going to Mexico!',
          'Join us in Tuscany for a weekend of celebration.',
        ],
        avoid: [
          'Local planning help.',
          'Arrival details and information.',
        ],
      },
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
      examples: {
        good: [
          'We’ve gathered a few places to stay nearby for the weekend.',
        ],
        avoid: [
          'Comfortable nearby lodging options.',
        ],
      },
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
      examples: {
        good: [
          'We met at the Library in San Luis Obispo, CA.',
          'Our journey began in a way I never expected — at a wedding!',
        ],
        avoid: [
          'We knew we wanted to spend the rest of our lives together from the very start.',
        ],
      },
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
      examples: {
        avoid: [
          'The people who mean the most to us.',
          'Standing with us on this special day.',
        ],
      },
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
      examples: {
        good: [
          'Will we see you in Italy? Let’s make it official :)',
          'We hope you can celebrate with us!',
        ],
        avoid: [
          'Kindly confirm your attendance.',
          'Please RSVP when you can.',
        ],
      },
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
