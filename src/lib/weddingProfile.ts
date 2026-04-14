export type WeddingProfile = {
  couple: {
    displayNames: string;
    partnerOne: string;
    partnerTwo: string;
  };
  event: {
    date: string;
    venueName: string;
    venueLocation: string;
    ceremonyTime: string;
    receptionTime: string;
    rsvpDeadline: string;
  };
  story: {
    summary: string;
  };
  registry: {
    url: string;
  };
  design: {
    theme: string;
  };
};

export const createEmptyWeddingProfile = (): WeddingProfile => ({
  couple: {
    displayNames: '',
    partnerOne: '',
    partnerTwo: '',
  },
  event: {
    date: '',
    venueName: '',
    venueLocation: '',
    ceremonyTime: '',
    receptionTime: '',
    rsvpDeadline: '',
  },
  story: {
    summary: '',
  },
  registry: {
    url: '',
  },
  design: {
    theme: 'garden',
  },
});

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

  return {
    couple: {
      displayNames: formData.partnerNames,
      partnerOne,
      partnerTwo: partnerTwo || partnerOne,
    },
    event: {
      date: formData.weddingDate,
      venueName: formData.venueName,
      venueLocation: formData.venueLocation,
      ceremonyTime: formData.ceremonyTime,
      receptionTime: formData.receptionTime,
      rsvpDeadline: formData.rsvpDeadline,
    },
    story: {
      summary: formData.story,
    },
    registry: {
      url: formData.registryLink,
    },
    design: {
      theme: formData.theme,
    },
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
    candidate.design
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
