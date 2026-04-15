import { WeddingProfile, buildWeddingDataPatchFromProfile, mergeWeddingDataFromProfile } from './weddingProfile';

export type DraftGenerationResult = {
  heroTitle: string;
  heroSubtitle: string;
  storyTitle: string;
  storyBody: string;
  countdownTitle: string;
  countdownMessage: string;
  venueTitle: string;
  scheduleTitle: string;
  galleryTitle: string;
  rsvpTitle: string;
  eventHeadline: string;
  rsvpCallToAction: string;
  weddingDataPatch: Record<string, unknown>;
};

export const generateDraftFromWeddingProfile = (profile: WeddingProfile): DraftGenerationResult => {
  const names = profile.couple.displayNames || 'Our Wedding';
  const location = profile.event.venueLocation || profile.event.venueName || 'the place we love most';
  const date = profile.event.date || 'our wedding weekend';
  const storyBody = profile.story.summary?.trim()
    ? profile.story.summary.trim()
    : `${names} are excited to celebrate this season with the people who know them best.`;
  const eventHeadline = profile.event.venueName
    ? `${profile.event.venueName} · ${profile.event.venueLocation || date}`
    : `${location} · ${date}`;
  const hasVenue = Boolean(profile.event.venueName || profile.event.venueLocation);
  const hasDeadline = Boolean(profile.event.rsvpDeadline);

  return {
    heroTitle: names,
    heroSubtitle: hasVenue ? `Join us in ${location} on ${date}` : `Celebrate with us on ${date}`,
    storyTitle: 'Our Story',
    storyBody,
    countdownTitle: names,
    countdownMessage: hasVenue ? `We can't wait to celebrate in ${location}.` : `We can't wait to celebrate together.`,
    venueTitle: 'Venue',
    scheduleTitle: 'Schedule',
    galleryTitle: 'Photos',
    rsvpTitle: 'RSVP',
    eventHeadline,
    rsvpCallToAction: hasDeadline
      ? `Please RSVP by ${profile.event.rsvpDeadline}`
      : 'Please RSVP when you can',
    weddingDataPatch: buildWeddingDataPatchFromProfile(profile),
  };
};

export const mergeGeneratedDraftIntoWeddingData = (
  existingWeddingData: Record<string, unknown> | null,
  profile: WeddingProfile
) => {
  const generated = generateDraftFromWeddingProfile(profile);
  const merged = mergeWeddingDataFromProfile(existingWeddingData, profile) as Record<string, unknown>;

  return {
    ...merged,
    couple: {
      ...((merged.couple as Record<string, unknown> | undefined) ?? {}),
      headline: generated.heroTitle,
      subheadline: generated.heroSubtitle,
      story: generated.storyBody,
    },
    event: {
      ...((merged.event as Record<string, unknown> | undefined) ?? {}),
      headline: generated.eventHeadline,
      rsvpCallToAction: generated.rsvpCallToAction,
    },
  };
};
