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


export const getWeddingProfileSummary = (profile: WeddingProfile) => {
  const lines = [
    profile.couple.displayNames ? `Couple: ${profile.couple.displayNames}` : null,
    profile.event.date ? `Date: ${profile.event.date}` : null,
    profile.event.venueName ? `Venue: ${profile.event.venueName}` : null,
    profile.event.venueLocation ? `Location: ${profile.event.venueLocation}` : null,
    profile.design.theme ? `Theme: ${profile.design.theme}` : null,
    profile.story.summary ? `Story: ${profile.story.summary}` : null,
    profile.event.rsvpDeadline ? `RSVP by: ${profile.event.rsvpDeadline}` : null,
  ].filter(Boolean);

  return lines as string[];
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
