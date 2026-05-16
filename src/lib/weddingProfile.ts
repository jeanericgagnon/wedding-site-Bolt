export type WeddingProfileFieldSource = 'user-confirmed' | 'ai-inferred' | 'generated' | 'imported' | 'unknown';

export type WeddingProfileField<T> = {
  value: T;
  source: WeddingProfileFieldSource;
  confidence?: number;
  updatedAt?: string;
  confirmedAt?: string;
};

export type StructuredWeekendEvent = {
  id: string;
  title: string;
  dateLabel: string;
  locationName?: string;
  locationAddress?: string;
  timeLabel?: string;
  notes?: string;
  rsvpEnabled?: boolean;
};

const slugifyEventId = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'event';

export const parseWeekendEvents = (input: string): StructuredWeekendEvent[] => input
  .split(/\n|,|\band\b|\bthen\b/i)
  .map((part) => part.trim())
  .filter(Boolean)
  .map((part, index) => {
    const normalized = part.replace(/^and\s+/i, '').trim();
    const dayMatch = normalized.match(/^(friday|saturday|sunday|thursday|monday|tuesday|wednesday)\b/i);
    const dateLabel = dayMatch ? `${dayMatch[1][0].toUpperCase()}${dayMatch[1].slice(1).toLowerCase()}` : '';
    const title = normalized
      .replace(/^(friday|saturday|sunday|thursday|monday|tuesday|wednesday)\b[:,\-\s]*/i, '')
      .replace(/^(welcome\s+)?(drinks|dinner|party|ceremony|reception|brunch)\s+and\s+/i, '$1$2 ')
      .replace(/^(then|and|definitely|probably|maybe)\s+/i, '')
      .replace(/\s+if people stay$/i, '')
      .replace(/^wedding\s+(friday|saturday|sunday|thursday|monday|tuesday|wednesday)$/i, 'wedding')
      .replace(/^something\s+(friday|saturday|sunday|thursday|monday|tuesday|wednesday)$/i, '')
      .replace(/^something$/i, '')
      .trim();
    return {
      id: `${slugifyEventId(title || normalized)}-${index + 1}`,
      title: title || '',
      dateLabel,
      rsvpEnabled: true,
    };
  });

export type WeddingProfile = {
  couple: {
    displayNames: string;
    partnerOne: string;
    partnerTwo: string;
    partnerOneLabel?: 'bride' | 'groom' | 'partner' | 'none';
    partnerTwoLabel?: 'bride' | 'groom' | 'partner' | 'none';
    storyTone: string;
  };
  event: {
    date: string;
    timezone: string;
    venueName: string;
    venueLocation: string;
    weekendEvents: string;
    structuredWeekendEvents: StructuredWeekendEvent[];
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
    summary: string;
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


export type WeddingProfileFieldSpec = {
  path: string;
  label: string;
  requiredForDraft: boolean;
  inferredAllowed: boolean;
};

export const WEDDING_PROFILE_FIELD_SPECS: WeddingProfileFieldSpec[] = [
  { path: 'couple.displayNames', label: 'Couple names', requiredForDraft: true, inferredAllowed: false },
  { path: 'event.date', label: 'Wedding date', requiredForDraft: true, inferredAllowed: false },
  { path: 'event.venueLocation', label: 'Venue location', requiredForDraft: true, inferredAllowed: true },
  { path: 'event.venueName', label: 'Venue name', requiredForDraft: false, inferredAllowed: true },
  { path: 'design.theme', label: 'Style', requiredForDraft: false, inferredAllowed: true },
  { path: 'story.summary', label: 'Story', requiredForDraft: false, inferredAllowed: true },
  { path: 'event.weekendEvents', label: 'Weekend events', requiredForDraft: false, inferredAllowed: true },
  { path: 'event.ceremonyTime', label: 'Ceremony arrival time', requiredForDraft: false, inferredAllowed: true },
  { path: 'event.rsvpDeadline', label: 'RSVP deadline', requiredForDraft: false, inferredAllowed: true },
];

const getProfileValueByPath = (profile: WeddingProfile, path: string): string => {
  const value = path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return '';
    return (current as Record<string, unknown>)[key];
  }, profile);

  return typeof value === 'string' ? value : '';
};

export const getWeddingProfileFieldStatus = (profile: WeddingProfile) =>
  WEDDING_PROFILE_FIELD_SPECS.map((spec) => ({
    ...spec,
    value: getProfileValueByPath(profile, spec.path),
    complete: Boolean(getProfileValueByPath(profile, spec.path).trim()),
  }));

export const createEmptyWeddingProfile = (): WeddingProfile => ({
  couple: {
    displayNames: '',
    partnerOne: '',
    partnerTwo: '',
    partnerOneLabel: 'none',
    partnerTwoLabel: 'none',
    storyTone: '',
  },
  event: {
    date: '',
    timezone: 'America/Los_Angeles',
    venueName: '',
    venueLocation: '',
    weekendEvents: '',
    structuredWeekendEvents: [],
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
    summary: '',
    faqTone: '',
    travelSupportLevel: 'minimal',
  },
  meta: {
    readinessScore: 0,
  },
});

export const evaluateWeddingProfileReadiness = (profile: WeddingProfile): WeddingProfileReadiness => {
  const fieldStatuses = getWeddingProfileFieldStatus(profile);
  const missingCriticalFields = fieldStatuses.filter((field) => field.requiredForDraft && !field.complete).map((field) => field.label.toLowerCase());
  const missingRecommendedFields = fieldStatuses.filter((field) => !field.requiredForDraft && !field.complete).map((field) => field.label.toLowerCase());

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
    profile.guestExperience.summary ? { id: 'guest-count', label: 'Guest count', value: profile.guestExperience.summary, questionKey: 'guestCount' } : null,
    profile.event.structuredWeekendEvents.length ? { id: 'weekend-events', label: 'Weekend events', value: profile.event.structuredWeekendEvents.map((event) => `${event.dateLabel ? `${event.dateLabel}: ` : ''}${event.title}${event.locationName ? ` @ ${event.locationName}` : ''}`).join('; '), questionKey: 'weekendEvents' } : profile.event.weekendEvents ? { id: 'weekend-events', label: 'Weekend events', value: profile.event.weekendEvents, questionKey: 'weekendEvents' } : null,
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
  { id: 'guest-count', label: 'Guest count', questionIndex: 7, value: profile.guestExperience.summary },
  { id: 'weekend-events', label: 'Weekend events', questionIndex: 7, value: profile.event.weekendEvents },
  { id: 'rsvp', label: 'RSVP deadline', questionIndex: 8, value: profile.event.rsvpDeadline },
  { id: 'registry', label: 'Registry', questionIndex: 11, value: profile.registry.url },
];


export const buildDraftSitePatchFromProfile = (profile: WeddingProfile) => ({
  couple_name_1: profile.couple.partnerOne || null,
  couple_name_2: profile.couple.partnerTwo || null,
  wedding_date: profile.event.date || null,
  venue_name: profile.event.venueName || null,
  wedding_location: profile.event.venueLocation || null,
});





const dayToOffset: Record<string, number> = { friday: -2, saturday: -1, sunday: 0, monday: 1, thursday: -3 };

const normalizeWeddingDate = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

  const date = new Date(`${trimmed}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10) === trimmed ? trimmed : null;
};

const inferDressCode = (profile: WeddingProfile) => {
  const notes = `${profile.story.welcomeNote} ${profile.design.theme}`.toLowerCase();
  if (notes.includes('tropical formal')) return 'Tropical formal';
  if (notes.includes('formal')) return 'Formal';
  if (notes.includes('cocktail')) return 'Cocktail';
  return null;
};

const getSeedEventDate = (weddingDate: string, dateLabel: string) => {
  const safeWeddingDate = normalizeWeddingDate(weddingDate);
  if (!safeWeddingDate) return null;
  const match = dateLabel.trim().toLowerCase();
  const offset = dayToOffset[match];
  if (offset === undefined) return safeWeddingDate;
  const date = new Date(`${safeWeddingDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

export const buildRsvpEventSeedFromStructuredEvents = (profile: WeddingProfile) => (profile.event.structuredWeekendEvents || []).map((event, index) => ({
  id: event.id || `weekend-event-${index + 1}`,
  label: event.title,
  dateLabel: event.dateLabel || '',
  locationName: event.locationName || null,
  locationAddress: event.locationAddress || null,
  rsvpEnabled: event.rsvpEnabled !== false,
}));

export const buildItinerarySeedFromStructuredEvents = (profile: WeddingProfile) => (profile.event.structuredWeekendEvents || []).map((event, index) => ({
  event_name: event.title,
  description: `${event.dateLabel ? `${event.dateLabel} ` : ''}${event.title}`.trim(),
  event_date: getSeedEventDate(profile.event.date, event.dateLabel) || normalizeWeddingDate(profile.event.date),
  start_time: null,
  end_time: null,
  location_name: event.locationName || null,
  location_address: event.locationAddress || null,
  dress_code: inferDressCode(profile),
  notes: [event.dateLabel, event.notes].filter(Boolean).join(' — ') || null,
  is_visible: true,
  display_order: index,
  onboarding_seeded: true,
  rsvp_enabled: event.rsvpEnabled !== false,
}));

export const buildWeddingScheduleFromStructuredEvents = (profile: WeddingProfile) => (profile.event.structuredWeekendEvents || [])
  .map((event, index) => ({
    id: event.id || `weekend-event-${index + 1}`,
    label: event.title,
    startTimeISO: '',
    notes: [event.dateLabel, event.locationName, event.notes].filter(Boolean).join(' — ') || undefined,
  }))
  .filter((event) => event.label);

export const buildSiteContentPatchFromProfile = (profile: WeddingProfile) => ({
  home: {
    hero: {
      title: profile.couple.displayNames || 'Our Wedding',
      subtitle: normalizeWeddingDate(profile.event.date)
        ? `Join us on ${normalizeWeddingDate(profile.event.date)}${profile.event.venueLocation ? ` in ${profile.event.venueLocation}` : ''}`
        : 'Celebrate with us',
    },
    story: {
      title: 'Our Story',
      content: profile.story.summary || 'We are so excited to celebrate with the people we love most.',
    },
    event: {
      title: 'Wedding Details',
      date: normalizeWeddingDate(profile.event.date) || '',
      venueName: profile.event.venueName || '',
      venueLocation: profile.event.venueLocation || '',
      ceremonyTime: profile.event.ceremonyTime || '',
      receptionTime: '',
      guestExperience: '',
      weekendEvents: profile.event.weekendEvents || '',
      structuredWeekendEvents: profile.event.structuredWeekendEvents || [],
      rsvpDeadline: normalizeWeddingDate(profile.event.rsvpDeadline) || '',
    },
  },
  schedule: buildWeddingScheduleFromStructuredEvents(profile),
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
  const resolveStringFallback = (candidate: T): T => {
    if (typeof candidate === 'string' && typeof fallback === 'string' && fallback.trim().length > 0) {
      return candidate.trim().length > 0 ? candidate : fallback;
    }
    return candidate;
  };

  if (isProvenanceValue<T>(value)) {
    return resolveStringFallback((value.value ?? fallback) as T);
  }
  return resolveStringFallback((value ?? fallback) as T);
};

const toIsoDateOrEmpty = (value?: string | null): string => {
  const normalizedDate = normalizeWeddingDate(value);
  if (!normalizedDate) return '';

  const date = new Date(`${normalizedDate}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};


export const buildWeddingDataPatchFromProfile = (profile: WeddingProfile) => ({
  couple: {
    partner1Name: profile.couple.partnerOne || '',
    partner2Name: profile.couple.partnerTwo || '',
    displayName: profile.couple.displayNames || '',
    story: profile.story.summary || '',
  },
  event: {
    weddingDateISO: toIsoDateOrEmpty(profile.event.date),
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


import type { InitialSetupAnswers } from './initialSetupAnswers';
import { interpretInitialSetupAnswers } from './initialSetupInterpreter';

export const applyInitialSetupAnswersToWeddingProfile = (answers: InitialSetupAnswers): WeddingProfile => {
  const interpreted = interpretInitialSetupAnswers(answers);
  const displayNames = answers.names.trim();
  const [partnerOne = '', partnerTwo = ''] = interpreted.names;
  const guestPolicyNotes = [
    answers.plusOnePolicy ? `plus-ones:${answers.plusOnePolicy}` : '',
    answers.childrenAllowed ? `children:${answers.childrenAllowed}` : '',
  ].filter(Boolean).join(' | ');

  return {
    ...createEmptyWeddingProfile(),
    couple: {
      displayNames,
      partnerOne,
      partnerTwo: partnerTwo || partnerOne,
      partnerOneLabel: answers.labelPreference === 'bride-groom' ? 'groom' : answers.labelPreference === 'bride-bride' ? 'bride' : answers.labelPreference === 'groom-groom' ? 'groom' : 'none',
      partnerTwoLabel: answers.labelPreference === 'bride-groom' ? 'bride' : answers.labelPreference === 'bride-bride' ? 'bride' : answers.labelPreference === 'groom-groom' ? 'groom' : 'none',
      storyTone: answers.style,
    },
    event: {
      date: interpreted.weddingDate,
      timezone: 'America/Los_Angeles',
      venueName: answers.venueNameOrTbd,
      venueLocation: interpreted.weddingLocation,
      weekendEvents: answers.weekendEventsRaw,
      structuredWeekendEvents: interpreted.structuredWeekendEvents,
      ceremonyTime: answers.ceremonyArrivalTime,
      receptionTime: '',
      rsvpDeadline: interpreted.rsvpDeadline,
    },
    venue: {
      city: interpreted.weddingLocation,
      state: '',
      country: '',
    },
    story: {
      summary: answers.optionalStory,
      welcomeNote: '',
    },
    registry: {
      url: answers.registryIntent,
      status: answers.registryIntent ? 'linked' : 'missing',
    },
    design: {
      theme: answers.style || 'garden',
      vibe: answers.style,
    },
    guestExperience: {
      summary: answers.guestCountBand,
      faqTone: guestPolicyNotes,
      travelSupportLevel: answers.mealChoice === 'yes' ? 'high' : 'minimal',
    },
    meta: {
      readinessScore: 0,
    },
  };
};
