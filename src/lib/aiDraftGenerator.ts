import { z } from 'zod';
import { runOpenAiStructuredPrompt, isOpenAiConfigured, getOpenAiRuntimeConfig } from './openai';
import { WeddingProfile, buildWeddingDataPatchFromProfile, mergeWeddingDataFromProfile } from './weddingProfile';
import { buildWeddingCopySystemPrompt, buildWeddingCopySectionPayloadPrompt, buildWeddingCopyCriticPayloadPrompt, buildSectionInstructionMap, buildWeddingCopyCriticPrompt } from './aiDraftPrompts';
import { scoreCopyLine } from './aiCopyScore';

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
  weddingDataPatch: Record<string, unknown>;
};

export const draftGenerationSchema = z.object({
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
  registryIntro: z.string().min(1),
  faqHeadline: z.string().min(1),
  faqIntro: z.string().min(1),
  travelTitle: z.string().min(1),
  travelIntro: z.string().min(1),
  accommodationsTitle: z.string().min(1),
  accommodationsIntro: z.string().min(1),
  dressCodeTitle: z.string().min(1),
  dressCodeIntro: z.string().min(1),
  contactTitle: z.string().min(1),
  contactIntro: z.string().min(1),
  directionsTitle: z.string().min(1),
  directionsIntro: z.string().min(1),
  weddingPartyTitle: z.string().min(1),
  weddingPartyIntro: z.string().min(1),
  eventHeadline: z.string().min(1),
  rsvpCallToAction: z.string().min(1),
});

const normalizeDraftDateInput = (value?: string | null): string => {
  const trimmed = value?.trim() || '';
  if (!trimmed) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return '';

  const date = new Date(`${trimmed}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 10) === trimmed ? trimmed : '';
};

const deterministicDraftFromWeddingProfile = (profile: WeddingProfile): DraftGenerationResult => {
  const names = profile.couple.displayNames || 'Our Wedding';
  const location = profile.event.venueLocation || profile.event.venueName || 'the place we love most';
  const date = normalizeDraftDateInput(profile.event.date) || 'our celebration weekend';
  const rsvpDeadline = normalizeDraftDateInput(profile.event.rsvpDeadline);
  const storyBody = profile.story.summary?.trim()
    ? profile.story.summary.trim()
    : `${names} are excited to gather everyone they love for a celebration that feels warm, personal, and easy to enjoy.`;
  const eventHeadline = profile.event.venueName
    ? `${profile.event.venueName} · ${profile.event.venueLocation || date}`
    : profile.event.venueLocation
      ? `${profile.event.venueLocation} · ${date}`
      : `Celebration details to come`;
  const hasVenue = Boolean(profile.event.venueName || profile.event.venueLocation);
  const hasDeadline = Boolean(rsvpDeadline);
  const hasRegistry = Boolean(profile.registry.url);
  const hasTravelSupport = profile.guestExperience.travelSupportLevel === 'high';
  const hasStory = Boolean(profile.story.summary?.trim());

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
    registryIntro: hasRegistry
      ? 'For anyone who asked, our registry is gathered here with a few things we would genuinely use and enjoy.'
      : 'Your presence is gift enough, but for those who have asked, a few ideas are gathered here.',
    faqHeadline: 'Frequently Asked Questions',
    faqIntro: hasTravelSupport
      ? 'A few quick answers to make travel, timing, and weekend plans easier.'
      : 'A few quick answers before the celebration begins.',
    travelTitle: 'Travel & Stay',
    travelIntro: hasVenue
      ? `Travel notes, arrival details, and local planning help for getting to ${location}.`
      : 'Travel notes and planning details for the weekend.',
    accommodationsTitle: 'Accommodations',
    accommodationsIntro: hasTravelSupport
      ? 'A few stay options to make the weekend feel easy from check-in to celebration.'
      : 'A few nearby places to stay for the weekend.',
    dressCodeTitle: 'Dress Code',
    dressCodeIntro: 'A few notes to help you choose something that feels right for the celebration.',
    contactTitle: 'Questions?',
    contactIntro: 'If you need anything before the celebration, we’re happy to help.',
    directionsTitle: 'Location & Directions',
    directionsIntro: hasVenue
      ? `A few details to help you find your way to ${location}.`
      : 'A few details to help you find your way on the day.',
    weddingPartyTitle: 'Wedding Party',
    weddingPartyIntro: hasStory
      ? 'The people who have been part of our story and will be standing with us on the day.'
      : 'The people we are lucky to have beside us on this day.',
    eventHeadline,
    rsvpCallToAction: hasDeadline
      ? `Please reply by ${rsvpDeadline}`
      : 'We would love to hear from you',
    weddingDataPatch: buildWeddingDataPatchFromProfile(profile),
  };
};

const buildDraftPrompt = (profile: WeddingProfile) => {
  const instructions = buildSectionInstructionMap(profile);
  return `${buildWeddingCopySectionPayloadPrompt(profile)}\n\nWrite these fields with section-specific intent:\n${JSON.stringify(instructions, null, 2)}`;
};

const buildDraftCriticPrompt = (profile: WeddingProfile, draft: Omit<DraftGenerationResult, 'weddingDataPatch'>) => {
  return `${buildWeddingCopyCriticPayloadPrompt(profile)}\n\nCurrent draft to improve:\n${JSON.stringify(draft, null, 2)}\n\nImprove this draft where needed. Focus especially on heroSubtitle, storyBody, and rsvpCallToAction.`;
};

const hasPlaceholderLikeText = (value: string) => /\[[^\]]+\]|\bTBD\b|to be confirmed/i.test(value);
const normalizeForScoring = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const preferDeterministicField = (generated: string, fallback: string, invalidPatterns: RegExp[]) => {
  const value = (generated || '').trim();
  if (!value) return fallback;
  if (hasPlaceholderLikeText(value)) return fallback;
  if (invalidPatterns.some((pattern) => pattern.test(value))) return fallback;
  return value;
};

const rejectIfTooGeneric = (generated: string, fallback: string, genericPatterns: RegExp[]) => {
  const value = (generated || '').trim();
  if (!value) return fallback;
  const normalized = normalizeForScoring(value);
  if (genericPatterns.some((pattern) => pattern.test(normalized))) return fallback;
  return value;
};

const rejectIfLowScore = (generated: string, fallback: string, minimumScore: number) => {
  return scoreCopyLine(generated) >= minimumScore ? generated : fallback;
};

const guardGeneratedDraft = (
  generated: Omit<DraftGenerationResult, 'weddingDataPatch'>,
  deterministic: DraftGenerationResult,
  profile: WeddingProfile
): DraftGenerationResult => {
  const hasVenue = Boolean(profile.event.venueName || profile.event.venueLocation);
  const hasRegistry = Boolean(profile.registry.url);
  const safeEventHeadline = preferDeterministicField(
    generated.eventHeadline,
    deterministic.eventHeadline,
    hasVenue ? [] : [/venue city/i, /date to be/i, /details will be updated/i]
  );

  const safeWeddingPartyIntro = preferDeterministicField(
    generated.weddingPartyIntro,
    deterministic.weddingPartyIntro,
    [/dear friends and family standing with us/i]
  );

  const safeDressCodeIntro = preferDeterministicField(
    generated.dressCodeIntro,
    deterministic.dressCodeIntro,
    [/fashion-editorial/i, /dress to impress/i, /what to wear for our special day/i]
  );

  const safeContactIntro = preferDeterministicField(
    generated.contactIntro,
    deterministic.contactIntro,
    [/customer support/i, /reach out to our team/i]
  );

  const safeDirectionsIntro = preferDeterministicField(
    generated.directionsIntro,
    deterministic.directionsIntro,
    [/map-app/i, /google maps/i, /use the address below/i]
  );

  const safeHeroSubtitle = rejectIfLowScore(
    rejectIfTooGeneric(
      generated.heroSubtitle,
      deterministic.heroSubtitle,
      [/celebrating together with those we hold dear/i, /we look forward to celebrating with you/i]
    ),
    deterministic.heroSubtitle,
    80
  );

  const safeStoryBody = rejectIfLowScore(
    rejectIfTooGeneric(
      generated.storyBody,
      deterministic.storyBody,
      [/this day is about sharing a special moment/i, /cherish their time together/i]
    ),
    deterministic.storyBody,
    82
  );

  const safeRegistryIntro = rejectIfLowScore(rejectIfTooGeneric(
    preferDeterministicField(
      generated.registryIntro,
      deterministic.registryIntro,
      hasRegistry ? [/don'?t have a registry/i, /registry details will follow soon/i] : [/don'?t have a registry/i]
    ),
    deterministic.registryIntro,
    [/your presence is the greatest gift/i, /grateful for your support and kindness/i, /appreciate your thoughtfulness/i]
  ), deterministic.registryIntro, 68);

  const safeFaqIntro = rejectIfLowScore(rejectIfTooGeneric(
    preferDeterministicField(
      generated.faqIntro,
      deterministic.faqIntro,
      [/answers to common questions/i, /helpful info/i]
    ),
    deterministic.faqIntro,
    [/here are some answers/i, /we ve shared a few details/i, /a few notes to help make your visit comfortable and clear/i]
  ), deterministic.faqIntro, 68);

  const safeTravelIntro = rejectIfLowScore(rejectIfTooGeneric(
    preferDeterministicField(
      generated.travelIntro,
      deterministic.travelIntro,
      [/key details to help you plan your trip/i, /information to assist with your trip/i, /useful details to support your trip/i]
    ),
    deterministic.travelIntro,
    [/information to help you prepare/i, /details to make your trip/i, /information to assist with your travel plans/i]
  ), deterministic.travelIntro, 68);

  const safeAccommodationsIntro = rejectIfLowScore(rejectIfTooGeneric(
    preferDeterministicField(
      generated.accommodationsIntro,
      deterministic.accommodationsIntro,
      [/nearby lodging options/i, /recommended nearby lodging options/i, /suggestions and information for lodging/i]
    ),
    deterministic.accommodationsIntro,
    [/we ve provided some lodging information/i, /recommendations to make your stay/i, /comfortable lodging/i]
  ), deterministic.accommodationsIntro, 68);

  const safeRsvpCallToAction = rejectIfLowScore(rejectIfTooGeneric(
    preferDeterministicField(
      generated.rsvpCallToAction,
      deterministic.rsvpCallToAction,
      [/please rsvp when you can/i]
    ),
    deterministic.rsvpCallToAction,
    [/kindly respond/i, /kindly let us know/i, /kindly rsvp/i, /your reply means a great deal/i]
  ), deterministic.rsvpCallToAction, 70);

  const safeCountdownMessage = rejectIfLowScore(
    generated.countdownMessage,
    deterministic.countdownMessage,
    82
  );

  return {
    ...deterministic,
    ...generated,
    heroSubtitle: safeHeroSubtitle,
    storyBody: safeStoryBody,
    countdownMessage: safeCountdownMessage,
    eventHeadline: safeEventHeadline,
    registryIntro: safeRegistryIntro,
    faqIntro: safeFaqIntro,
    travelIntro: safeTravelIntro,
    accommodationsIntro: safeAccommodationsIntro,
    dressCodeIntro: safeDressCodeIntro,
    contactIntro: safeContactIntro,
    directionsIntro: safeDirectionsIntro,
    weddingPartyIntro: safeWeddingPartyIntro,
    rsvpCallToAction: safeRsvpCallToAction,
    weddingDataPatch: deterministic.weddingDataPatch,
  };
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
    return guardGeneratedDraft(refined, deterministic, profile);
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
