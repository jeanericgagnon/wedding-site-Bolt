export type AiCanonicalSectionContent = {
  hero: {
    title: string;
    subtitle: string;
    eventHeadline: string;
  };
  story: {
    title: string;
    body: string;
  };
  countdown: {
    title: string;
    message: string;
  };
  venue: {
    title: string;
    intro: string;
  };
  schedule: {
    title: string;
    intro: string;
  };
  gallery: {
    title: string;
    intro: string;
  };
  rsvp: {
    title: string;
    intro: string;
    callToAction: string;
  };
  registry: {
    title: string;
    intro: string;
  };
  faq: {
    title: string;
    intro: string;
  };
  travel: {
    title: string;
    intro: string;
  };
  accommodations: {
    title: string;
    intro: string;
  };
  weddingParty: {
    title: string;
    intro: string;
  };
  dressCode: {
    title: string;
    intro: string;
  };
  directions: {
    title: string;
    intro: string;
  };
  contact: {
    title: string;
    intro: string;
  };
  footerCta: {
    headline: string;
    subtext: string;
  };
};

export const createCanonicalContentFromDraft = (draft: {
  heroTitle: string;
  heroSubtitle: string;
  storyTitle: string;
  storyBody: string;
  countdownTitle: string;
  countdownMessage: string;
  venueTitle: string;
  venueIntro: string;
  scheduleTitle: string;
  scheduleIntro: string;
  galleryTitle: string;
  galleryIntro: string;
  rsvpTitle: string;
  rsvpIntro: string;
  registryTitle: string;
  registryIntro: string;
  faqHeadline: string;
  faqIntro: string;
  travelTitle: string;
  travelIntro: string;
  accommodationsTitle: string;
  accommodationsIntro: string;
  dressCodeTitle: string;
  dressCodeIntro: string;
  contactTitle: string;
  contactIntro: string;
  directionsTitle: string;
  directionsIntro: string;
  weddingPartyTitle: string;
  weddingPartyIntro: string;
  eventHeadline: string;
  rsvpCallToAction: string;
  ctaHeadline?: string;
  ctaSubtext?: string;
}): AiCanonicalSectionContent => ({
  hero: {
    title: draft.heroTitle,
    subtitle: draft.heroSubtitle,
    eventHeadline: draft.eventHeadline,
  },
  story: {
    title: draft.storyTitle,
    body: draft.storyBody,
  },
  countdown: {
    title: draft.countdownTitle,
    message: draft.countdownMessage,
  },
  venue: {
    title: draft.venueTitle,
    intro: draft.venueIntro,
  },
  schedule: {
    title: draft.scheduleTitle,
    intro: draft.scheduleIntro,
  },
  gallery: {
    title: draft.galleryTitle,
    intro: draft.galleryIntro,
  },
  rsvp: {
    title: draft.rsvpTitle,
    intro: draft.rsvpIntro,
    callToAction: draft.rsvpCallToAction,
  },
  registry: {
    title: draft.registryTitle,
    intro: draft.registryIntro,
  },
  faq: {
    title: draft.faqHeadline,
    intro: draft.faqIntro,
  },
  travel: {
    title: draft.travelTitle,
    intro: draft.travelIntro,
  },
  accommodations: {
    title: draft.accommodationsTitle,
    intro: draft.accommodationsIntro,
  },
  weddingParty: {
    title: draft.weddingPartyTitle,
    intro: draft.weddingPartyIntro,
  },
  dressCode: {
    title: draft.dressCodeTitle,
    intro: draft.dressCodeIntro,
  },
  directions: {
    title: draft.directionsTitle,
    intro: draft.directionsIntro,
  },
  contact: {
    title: draft.contactTitle,
    intro: draft.contactIntro,
  },
  footerCta: {
    headline: draft.ctaHeadline ?? '',
    subtext: draft.ctaSubtext ?? '',
  },
});
