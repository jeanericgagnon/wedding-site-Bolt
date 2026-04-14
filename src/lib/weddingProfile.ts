export type WeddingProfileFieldSource = 'user-confirmed' | 'ai-inferred' | 'generated' | 'imported' | 'unknown';

export type WeddingProfileField<T> = {
  value: T;
  source: WeddingProfileFieldSource;
  confidence?: number;
  updatedAt?: string;
  confirmedAt?: string;
};

export type WeddingProfile = {
  couple: {
    displayNames: string;
    partnerOne: string;
    partnerTwo: string;
    storyTone: string;
  };
  event: {
    date: string;
    timezone: string;
    venueName: string;
    venueLocation: string;
    ceremonyTime: string;
    receptionTime: string;
    rsvpDeadline: string;
  };
  venue: {
    city: string;
    state: string;
    country: string;
  };
  story: {
    summary: string;
    welcomeNote: string;
  };
  registry: {
    url: string;
    status: 'missing' | 'linked';
  };
  design: {
    theme: string;
    vibe: string;
  };
  guestExperience: {
    faqTone: string;
    travelSupportLevel: 'minimal' | 'standard' | 'high';
  };
  meta: {
    readinessScore: number;
  };
};

export type WeddingProfileReadiness = {
  score: number;
  hasEnoughToDraft: boolean;
  missingCriticalFields: string[];
  missingRecommendedFields: string[];
};

export const createEmptyWeddingProfile = (): WeddingProfile => ({
  couple: {
    displayNames: '',
    partnerOne: '',
    partnerTwo: '',
    storyTone: '',
  },
  event: {
    date: '',
    timezone: 'America/Los_Angeles',
    venueName: '',
    venueLocation: '',
    ceremonyTime: '',
    receptionTime: '',
    rsvpDeadline: '',
  },
  venue: {
    city: '',
    state: '',
    country: '',
  },
  story: {
    summary: '',
    welcomeNote: '',
  },
  registry: {
    url: '',
    status: 'missing',
  },
  design: {
    theme: 'garden',
    vibe: '',
  },
  guestExperience: {
    faqTone: '',
    travelSupportLevel: 'minimal',
  },
  meta: {
    readinessScore: 0,
  },
});

export const evaluateWeddingProfileReadiness = (profile: WeddingProfile): WeddingProfileReadiness => {
  const missingCriticalFields: string[] = [];
  const missingRecommendedFields: string[] = [];

  if (!profile.couple.displayNames.trim()) missingCriticalFields.push('couple names');
  if (!profile.event.date) missingCriticalFields.push('wedding date');
  if (!profile.event.venueLocation.trim()) missingCriticalFields.push('venue location');

  if (!profile.design.theme) missingRecommendedFields.push('theme');
  if (!profile.story.summary.trim()) missingRecommendedFields.push('story summary');
  if (!profile.event.ceremonyTime) missingRecommendedFields.push('ceremony time');
  if (!profile.event.receptionTime) missingRecommendedFields.push('reception time');
  if (!profile.event.rsvpDeadline) missingRecommendedFields.push('RSVP deadline');
  if (!profile.registry.url.trim()) missingRecommendedFields.push('registry link');

  const score = Math.max(
    0,
    Math.min(
      100,
      (3 - missingCriticalFields.length) * 20 + (5 - Math.min(missingRecommendedFields.length, 5)) * 8 + (profile.story.summary.trim() ? 10 : 0)
    )
  );

  return {
    score,
    hasEnoughToDraft: missingCriticalFields.length === 0,
    missingCriticalFields,
    missingRecommendedFields,
  };
};

export const profileToOnboardingForm = (profile: WeddingProfile) => ({
  partnerNames: profile.couple.displayNames,
  weddingDate: profile.event.date,
  venueName: profile.event.venueName,
  venueLocation: profile.event.venueLocation,
  story: profile.story.summary,
  ceremonyTime: profile.event.ceremonyTime,
  receptionTime: profile.event.receptionTime,
  rsvpDeadline: profile.event.rsvpDeadline,
  registryLink: profile.registry.url,
  theme: profile.design.theme,
});

export const onboardingFormToProfile = (formData: {
  partnerNames: string;
  weddingDate: string;
  venueName: string;
  venueLocation: string;
  story: string;
  ceremonyTime: string;
  receptionTime: string;
  rsvpDeadline: string;
  registryLink: string;
  theme: string;
}): WeddingProfile => {
  const [partnerOne = '', partnerTwo = ''] = formData.partnerNames
    .split('&')
    .map((value) => value.trim())
    .filter(Boolean);

  const [city = '', state = ''] = formData.venueLocation.split(',').map((value) => value.trim());

  const profile: WeddingProfile = {
    couple: {
      displayNames: formData.partnerNames,
      partnerOne,
      partnerTwo: partnerTwo || partnerOne,
      storyTone: '',
    },
    event: {
      date: formData.weddingDate,
      timezone: 'America/Los_Angeles',
      venueName: formData.venueName,
      venueLocation: formData.venueLocation,
      ceremonyTime: formData.ceremonyTime,
      receptionTime: formData.receptionTime,
      rsvpDeadline: formData.rsvpDeadline,
    },
    venue: {
      city,
      state,
      country: '',
    },
    story: {
      summary: formData.story,
      welcomeNote: '',
    },
    registry: {
      url: formData.registryLink,
      status: formData.registryLink.trim() ? 'linked' : 'missing',
    },
    design: {
      theme: formData.theme,
      vibe: '',
    },
    guestExperience: {
      faqTone: '',
      travelSupportLevel: 'minimal',
    },
    meta: {
      readinessScore: 0,
    },
  };

  const readiness = evaluateWeddingProfileReadiness(profile);
  profile.meta.readinessScore = readiness.score;
  return profile;
};


export const isWeddingProfile = (value: unknown): value is WeddingProfile => {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Record<string, unknown>;
  return Boolean(
    candidate.couple &&
    candidate.event &&
    candidate.story &&
    candidate.registry &&
    candidate.design &&
    candidate.meta
  );
};


export type WeddingProfileSummaryItem = {
  id: string;
  label: string;
  value: string;
  questionKey: string;
};

export const getWeddingProfileSummary = (profile: WeddingProfile): WeddingProfileSummaryItem[] => {
  return [
    profile.couple.displayNames ? { id: 'couple', label: 'Couple', value: profile.couple.displayNames, questionKey: 'partnerNames' } : null,
    profile.event.date ? { id: 'date', label: 'Date', value: profile.event.date, questionKey: 'weddingDate' } : null,
    profile.event.venueName ? { id: 'venue', label: 'Venue', value: profile.event.venueName, questionKey: 'venueName' } : null,
    profile.event.venueLocation ? { id: 'location', label: 'Location', value: profile.event.venueLocation, questionKey: 'venueLocation' } : null,
    profile.design.theme ? { id: 'theme', label: 'Theme', value: profile.design.theme, questionKey: 'theme' } : null,
    profile.story.summary ? { id: 'story', label: 'Story', value: profile.story.summary, questionKey: 'story' } : null,
    profile.event.rsvpDeadline ? { id: 'rsvp', label: 'RSVP by', value: profile.event.rsvpDeadline, questionKey: 'rsvpDeadline' } : null,
  ].filter(Boolean) as WeddingProfileSummaryItem[];
};


export const getWeddingProfileRefineTargets = (profile: WeddingProfile) => [
  { id: 'names', label: 'Couple names', questionIndex: 0, value: profile.couple.displayNames },
  { id: 'date', label: 'Wedding date', questionIndex: 1, value: profile.event.date },
  { id: 'location', label: 'Location', questionIndex: 2, value: profile.event.venueLocation },
  { id: 'venue', label: 'Venue name', questionIndex: 3, value: profile.event.venueName },
  { id: 'theme', label: 'Theme', questionIndex: 4, value: profile.design.theme },
  { id: 'story', label: 'Story', questionIndex: 5, value: profile.story.summary },
  { id: 'ceremony', label: 'Ceremony time', questionIndex: 6, value: profile.event.ceremonyTime },
  { id: 'reception', label: 'Reception time', questionIndex: 7, value: profile.event.receptionTime },
  { id: 'rsvp', label: 'RSVP deadline', questionIndex: 8, value: profile.event.rsvpDeadline },
  { id: 'registry', label: 'Registry', questionIndex: 9, value: profile.registry.url },
];


export const buildDraftSitePatchFromProfile = (profile: WeddingProfile) => ({
  couple_name_1: profile.couple.partnerOne || null,
  couple_name_2: profile.couple.partnerTwo || null,
  wedding_date: profile.event.date || null,
  venue_name: profile.event.venueName || null,
  wedding_location: profile.event.venueLocation || null,
});


export const buildSiteContentPatchFromProfile = (profile: WeddingProfile) => ({
  home: {
    hero: {
      title: profile.couple.displayNames || 'Our Wedding',
      subtitle: profile.event.date
        ? `Join us on ${profile.event.date}${profile.event.venueLocation ? ` in ${profile.event.venueLocation}` : ''}`
        : 'Celebrate with us',
    },
    story: {
      title: 'Our Story',
      content: profile.story.summary || 'We are so excited to celebrate with the people we love most.',
    },
    event: {
      title: 'Wedding Details',
      date: profile.event.date || '',
      venueName: profile.event.venueName || '',
      venueLocation: profile.event.venueLocation || '',
      ceremonyTime: profile.event.ceremonyTime || '',
      receptionTime: profile.event.receptionTime || '',
      rsvpDeadline: profile.event.rsvpDeadline || '',
    },
  },
});


export const mergeSiteContentFromProfile = (
  existingSiteJson: Record<string, unknown> | null,
  profile: WeddingProfile
) => {
  const generated = buildSiteContentPatchFromProfile(profile);
  const existingHome = ((existingSiteJson ?? {}).home as Record<string, unknown> | undefined) ?? {};
  const generatedHome = generated.home as Record<string, unknown>;

  return {
    ...(existingSiteJson ?? {}),
    home: {
      ...existingHome,
      hero: {
        ...(((existingHome.hero as Record<string, unknown> | undefined) ?? {})),
        ...((generatedHome.hero as Record<string, unknown> | undefined) ?? {}),
      },
      story: {
        ...(((existingHome.story as Record<string, unknown> | undefined) ?? {})),
        ...((generatedHome.story as Record<string, unknown> | undefined) ?? {}),
      },
      event: {
        ...(((existingHome.event as Record<string, unknown> | undefined) ?? {})),
        ...((generatedHome.event as Record<string, unknown> | undefined) ?? {}),
      },
    },
  };
};


type GeneratedContentEnvelope = {
  value?: unknown;
  source?: string;
  updatedAt?: string;
};

const shouldOverwriteGeneratedField = (existing: unknown) => {
  if (!existing || typeof existing !== 'object') return true;
  const envelope = existing as GeneratedContentEnvelope;
  return !envelope.source || envelope.source === 'concierge-brief';
};

const wrapGeneratedField = (value: unknown) => ({
  value,
  source: 'concierge-brief',
  updatedAt: new Date().toISOString(),
});


export const mergeSiteContentWithProvenance = (
  existingSiteJson: Record<string, unknown> | null,
  profile: WeddingProfile
) => {
  const merged = mergeSiteContentFromProfile(existingSiteJson, profile);
  const existingHome = (((existingSiteJson ?? {}).home as Record<string, unknown> | undefined) ?? {});
  const home = ((merged.home as Record<string, unknown> | undefined) ?? {});

  const protectSection = (sectionKey: 'hero' | 'story' | 'event') => {
    const existingSection = ((existingHome[sectionKey] as Record<string, unknown> | undefined) ?? {});
    const mergedSection = ((home[sectionKey] as Record<string, unknown> | undefined) ?? {});
    const nextSection: Record<string, unknown> = {};

    Object.entries(mergedSection).forEach(([key, value]) => {
      const existingValue = existingSection[key];
      nextSection[key] = shouldOverwriteGeneratedField(existingValue) ? wrapGeneratedField(value) : existingValue;
    });

    return {
      ...existingSection,
      ...nextSection,
    };
  };

  return {
    ...(merged ?? {}),
    home: {
      ...home,
      hero: protectSection('hero'),
      story: protectSection('story'),
      event: protectSection('event'),
    },
  };
};


export const unwrapGeneratedFieldValue = <T>(value: unknown, fallback: T): T => {
  if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
    return ((value as { value?: T }).value ?? fallback) as T;
  }
  return (value as T) ?? fallback;
};


export const markFieldAsUserEdited = (value: unknown) => {
  const currentValue = unwrapGeneratedFieldValue(value, value);
  return {
    value: currentValue,
    source: 'user-edited',
    updatedAt: new Date().toISOString(),
  };
};


export type ProvenanceValue<T> = {
  value: T;
  source?: string;
  updatedAt?: string;
};

export const isProvenanceValue = <T>(value: unknown): value is ProvenanceValue<T> => {
  return Boolean(value && typeof value === 'object' && 'value' in (value as Record<string, unknown>));
};

export const readBuilderValue = <T>(value: T | ProvenanceValue<T> | undefined | null, fallback: T): T => {
  if (isProvenanceValue<T>(value)) {
    return value.value ?? fallback;
  }
  return (value ?? fallback) as T;
};


export const buildWeddingDataPatchFromProfile = (profile: WeddingProfile) => ({
  couple: {
    partner1Name: profile.couple.partnerOne || '',
    partner2Name: profile.couple.partnerTwo || '',
    displayName: profile.couple.displayNames || '',
    story: profile.story.summary || '',
  },
  event: {
    weddingDateISO: profile.event.date ? new Date(profile.event.date).toISOString() : '',
  },
  venues: profile.event.venueName || profile.event.venueLocation
    ? [{ id: 'primary', name: profile.event.venueName || 'Main Venue', address: profile.event.venueLocation || undefined }]
    : [],
  theme: {
    preset: profile.design.theme || 'garden',
  },
  registry: {
    externalUrl: profile.registry.url || '',
  },
});

export const mergeWeddingDataFromProfile = (
  existingWeddingData: Record<string, unknown> | null,
  profile: WeddingProfile
) => {
  const patch = buildWeddingDataPatchFromProfile(profile) as Record<string, unknown>;
  const existing = (existingWeddingData ?? {}) as Record<string, unknown>;
  return {
    ...existing,
    couple: {
      ...((existing.couple as Record<string, unknown> | undefined) ?? {}),
      ...((patch.couple as Record<string, unknown> | undefined) ?? {}),
    },
    event: {
      ...((existing.event as Record<string, unknown> | undefined) ?? {}),
      ...((patch.event as Record<string, unknown> | undefined) ?? {}),
    },
    theme: {
      ...((existing.theme as Record<string, unknown> | undefined) ?? {}),
      ...((patch.theme as Record<string, unknown> | undefined) ?? {}),
    },
    registry: {
      ...((existing.registry as Record<string, unknown> | undefined) ?? {}),
      ...((patch.registry as Record<string, unknown> | undefined) ?? {}),
    },
    venues: (patch.venues as unknown[]) ?? ((existing.venues as unknown[]) ?? []),
  };
};
