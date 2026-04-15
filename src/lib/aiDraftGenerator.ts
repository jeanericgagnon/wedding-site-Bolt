import { z } from 'zod';
import { runOpenAiStructuredPrompt, isOpenAiConfigured, getOpenAiRuntimeConfig } from './openai';
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

const draftGenerationSchema = z.object({
  heroTitle: z.string().min(1),
  heroSubtitle: z.string().min(1),
  storyTitle: z.string().min(1),
  storyBody: z.string().min(1),
  countdownTitle: z.string().min(1),
  countdownMessage: z.string().min(1),
  venueTitle: z.string().min(1),
  scheduleTitle: z.string().min(1),
  galleryTitle: z.string().min(1),
  rsvpTitle: z.string().min(1),
  eventHeadline: z.string().min(1),
  rsvpCallToAction: z.string().min(1),
});

const deterministicDraftFromWeddingProfile = (profile: WeddingProfile): DraftGenerationResult => {
  const names = profile.couple.displayNames || 'Our Wedding';
  const location = profile.event.venueLocation || profile.event.venueName || 'the place we love most';
  const date = profile.event.date || 'our wedding weekend';
  const storyBody = profile.story.summary?.trim()
    ? profile.story.summary.trim()
    : `${names} are getting ready to celebrate with the people who know and love them best.`;
  const eventHeadline = profile.event.venueName
    ? `${profile.event.venueName} · ${profile.event.venueLocation || date}`
    : profile.event.venueLocation
      ? `${profile.event.venueLocation} · ${date}`
      : `${date} · celebration details coming soon`;
  const hasVenue = Boolean(profile.event.venueName || profile.event.venueLocation);
  const hasDeadline = Boolean(profile.event.rsvpDeadline);

  return {
    heroTitle: names,
    heroSubtitle: hasVenue ? `Join us in ${location} on ${date}` : `Celebrate with us on ${date}`,
    storyTitle: 'Our Story',
    storyBody,
    countdownTitle: names,
    countdownMessage: hasVenue ? `We can't wait to celebrate with you in ${location}.` : `We can't wait to celebrate with our favorite people.`,
    venueTitle: 'Venue Details',
    scheduleTitle: 'The Plan',
    galleryTitle: 'Moments to Remember',
    rsvpTitle: 'Will You Be There?',
    eventHeadline,
    rsvpCallToAction: hasDeadline
      ? `Please reply by ${profile.event.rsvpDeadline}`
      : 'Reply when you are ready',
    weddingDataPatch: buildWeddingDataPatchFromProfile(profile),
  };
};

const buildDraftPrompt = (profile: WeddingProfile) => {
  const names = profile.couple.displayNames || 'Our Wedding';
  return `Create elegant wedding website homepage copy for this couple. Return concise, tasteful, non-cheesy copy.\n\nProfile:\n${JSON.stringify(profile, null, 2)}\n\nRules:\n- Keep each field short and usable on a wedding website\n- Avoid generic filler and startup-sounding copy\n- Make sparse profiles still sound human and warm\n- Do not invent factual specifics beyond tasteful framing\n- Use the couple's names naturally when available\n- RSVP call-to-action should feel polished, not robotic\n- Venue/schedule/gallery titles should feel premium, not placeholder-ish\n\nCouple: ${names}`;
};

export const generateDraftFromWeddingProfile = async (profile: WeddingProfile): Promise<DraftGenerationResult> => {
  const deterministic = deterministicDraftFromWeddingProfile(profile);

  if (!isOpenAiConfigured()) {
    console.info('[aiDraftGenerator] using deterministic fallback: OpenAI not configured');
    return deterministic;
  }

  try {
    const generated = await runOpenAiStructuredPrompt({
      system: 'You write polished wedding website copy and return strictly valid structured JSON.',
      user: buildDraftPrompt(profile),
      schemaName: 'wedding_homepage_draft',
      schema: draftGenerationSchema,
      model: getOpenAiRuntimeConfig().model,
    });

    console.info('[aiDraftGenerator] using OpenAI draft generation', getOpenAiRuntimeConfig());
    return {
      ...generated,
      weddingDataPatch: buildWeddingDataPatchFromProfile(profile),
    };
  } catch (error) {
    console.warn('[aiDraftGenerator] OpenAI draft generation failed, falling back to deterministic generator', error);
    return deterministic;
  }
};

export const mergeGeneratedDraftIntoWeddingData = async (
  existingWeddingData: Record<string, unknown> | null,
  profile: WeddingProfile
) => {
  const generated = await generateDraftFromWeddingProfile(profile);
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
