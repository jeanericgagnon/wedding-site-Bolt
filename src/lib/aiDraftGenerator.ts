import { WeddingProfile, buildWeddingDataPatchFromProfile, mergeWeddingDataFromProfile } from './weddingProfile';

export type DraftGenerationResult = {
  heroTitle: string;
  heroSubtitle: string;
  storyTitle: string;
  storyBody: string;
  eventHeadline: string;
  rsvpCallToAction: string;
  weddingDataPatch: Record<string, unknown>;
};

export const generateDraftFromWeddingProfile = (profile: WeddingProfile): DraftGenerationResult => {
  const names = profile.couple.displayNames || 'Our Wedding';
  const location = profile.event.venueLocation || profile.event.venueName || 'our favorite place';
  const date = profile.event.date || 'our wedding weekend';
  const storyBody = profile.story.summary?.trim()
    ? profile.story.summary.trim()
    : `${names} are so excited to celebrate with the people they love most.`;

  return {
    heroTitle: names,
    heroSubtitle: `Join us in ${location} on ${date}`,
    storyTitle: 'Our Story',
    storyBody,
    eventHeadline: profile.event.venueName
      ? `${profile.event.venueName} · ${profile.event.venueLocation || date}`
      : `${location} · ${date}`,
    rsvpCallToAction: profile.event.rsvpDeadline
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
