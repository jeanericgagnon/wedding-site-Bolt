import { z } from 'zod';
import { runOpenAiStructuredPrompt, isOpenAiConfigured, getOpenAiRuntimeConfig } from './openai';
import { WeddingProfile, buildWeddingDataPatchFromProfile, mergeWeddingDataFromProfile } from './weddingProfile';
import { buildWeddingCopySystemPrompt, buildWeddingCopyUserPrompt, buildSectionInstructionMap, buildWeddingCopyCriticPrompt } from './aiDraftPrompts';

export type DraftGenerationResult = {
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
  faqHeadline: string;
  faqIntro: string;
  travelTitle: string;
  travelIntro: string;
  accommodationsTitle: string;
  accommodationsIntro: string;
  weddingPartyTitle: string;
  weddingPartyIntro: string;
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
  venueIntro: z.string().min(1),
  scheduleTitle: z.string().min(1),
  scheduleIntro: z.string().min(1),
  galleryTitle: z.string().min(1),
  galleryIntro: z.string().min(1),
  rsvpTitle: z.string().min(1),
  rsvpIntro: z.string().min(1),
  registryTitle: z.string().min(1),
  faqHeadline: z.string().min(1),
  faqIntro: z.string().min(1),
  travelTitle: z.string().min(1),
  travelIntro: z.string().min(1),
  accommodationsTitle: z.string().min(1),
  accommodationsIntro: z.string().min(1),
  weddingPartyTitle: z.string().min(1),
  weddingPartyIntro: z.string().min(1),
  eventHeadline: z.string().min(1),
  rsvpCallToAction: z.string().min(1),
});

const deterministicDraftFromWeddingProfile = (profile: WeddingProfile): DraftGenerationResult => {
  const names = profile.couple.displayNames || 'Our Wedding';
  const location = profile.event.venueLocation || profile.event.venueName || 'the place we love most';
  const date = profile.event.date || 'our celebration weekend';
  const storyBody = profile.story.summary?.trim()
    ? profile.story.summary.trim()
    : `${names} are excited to gather everyone they love for a celebration that feels warm, personal, and easy to enjoy.`;
  const eventHeadline = profile.event.venueName
    ? `${profile.event.venueName} · ${profile.event.venueLocation || date}`
    : profile.event.venueLocation
      ? `${profile.event.venueLocation} · ${date}`
      : `Celebration details to come`;
  const hasVenue = Boolean(profile.event.venueName || profile.event.venueLocation);
  const hasDeadline = Boolean(profile.event.rsvpDeadline);

  return {
    heroTitle: names,
    heroSubtitle: hasVenue ? `Join us in ${location} on ${date}` : `Celebrate with us soon`,
    storyTitle: 'Our Story',
    storyBody,
    countdownTitle: names,
    countdownMessage: hasVenue ? `We can't wait to celebrate with you in ${location}.` : `We can't wait to celebrate together.`,
    venueTitle: 'Venue Details',
    venueIntro: hasVenue ? `Everything you need to know for celebrating with us at ${location}.` : 'Everything you need to know for the celebration.',
    scheduleTitle: 'The Plan',
    scheduleIntro: 'A simple look at how the day will unfold.',
    galleryTitle: 'Moments to Remember',
    galleryIntro: 'A few favorite moments, all in one place.',
    rsvpTitle: 'Will You Be There?',
    rsvpIntro: 'Let us know if we’ll get to celebrate with you.',
    registryTitle: 'Registry',
    faqHeadline: 'Frequently Asked Questions',
    faqIntro: 'A few helpful answers before the weekend begins.',
    travelTitle: 'Travel & Stay',
    travelIntro: hasVenue ? `A few planning details to make getting to ${location} feel easy.` : 'A few planning details to make the weekend feel easy.',
    accommodationsTitle: 'Accommodations',
    accommodationsIntro: 'A few stay options and planning notes for the weekend.',
    weddingPartyTitle: 'Wedding Party',
    weddingPartyIntro: 'The people who have loved us, supported us, and helped shape this season of our lives.',
    eventHeadline,
    rsvpCallToAction: hasDeadline
      ? `Please reply by ${profile.event.rsvpDeadline}`
      : 'We would love to hear from you',
    weddingDataPatch: buildWeddingDataPatchFromProfile(profile),
  };
};

const buildDraftPrompt = (profile: WeddingProfile) => {
  const instructions = buildSectionInstructionMap(profile);
  return `${buildWeddingCopyUserPrompt(profile)}\n\nWrite these fields with section-specific intent:\n${JSON.stringify(instructions, null, 2)}`;
};

const buildDraftCriticPrompt = (profile: WeddingProfile, draft: Omit<DraftGenerationResult, 'weddingDataPatch'>) => {
  return `${buildWeddingCopyUserPrompt(profile)}\n\nImprove this draft where needed:\n${JSON.stringify(draft, null, 2)}\n\nFocus especially on heroSubtitle, storyBody, and rsvpCallToAction.`;
};

export const generateDraftFromWeddingProfile = async (profile: WeddingProfile): Promise<DraftGenerationResult> => {
  const deterministic = deterministicDraftFromWeddingProfile(profile);

  if (!isOpenAiConfigured()) {
    console.info('[aiDraftGenerator] using deterministic fallback: OpenAI not configured');
    return deterministic;
  }

  try {
    const generated = await runOpenAiStructuredPrompt({
      system: buildWeddingCopySystemPrompt(),
      user: buildDraftPrompt(profile),
      schemaName: 'wedding_homepage_draft',
      schema: draftGenerationSchema,
      model: getOpenAiRuntimeConfig().model,
    });

    const refined = await runOpenAiStructuredPrompt({
      system: buildWeddingCopyCriticPrompt(),
      user: buildDraftCriticPrompt(profile, generated),
      schemaName: 'wedding_homepage_draft_refined',
      schema: draftGenerationSchema,
      model: getOpenAiRuntimeConfig().model,
    });

    console.info('[aiDraftGenerator] using OpenAI draft generation', getOpenAiRuntimeConfig());
    return {
      ...refined,
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
