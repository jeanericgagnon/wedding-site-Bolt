import { WeddingProfile } from './weddingProfile';

const names = (profile: WeddingProfile) => profile.couple.displayNames || 'The couple';

export const buildWeddingCopySystemPrompt = () => `You write elegant, warm wedding website copy.

Rules:
- Write like a thoughtful human, not a marketing team
- Avoid cheesy wedding clichés and startup/product language
- Be concise, polished, and emotionally warm
- Do not invent detailed facts that are not in the input
- Prefer tasteful specificity over generic filler
- Return copy that can be placed directly on a wedding website`;

export const buildWeddingCopyUserPrompt = (profile: WeddingProfile) => `Couple profile:
${JSON.stringify(profile, null, 2)}`;

export const buildSectionInstructionMap = (profile: WeddingProfile) => ({
  heroTitle: `Write the main hero title for ${names(profile)}. Usually this is just the names, unless a more elegant headline is clearly better.`,
  heroSubtitle: `Write a premium but concise hero subtitle. It should help guests immediately understand the event feeling and key context without sounding templated.`,
  storyTitle: `Write a tasteful title for the story section. Usually short and classic.`,
  storyBody: `Write a warm, specific short story paragraph for the couple. Avoid generic celebration filler. Use details from their profile if available.`,
  countdownTitle: `Write the countdown section title. Keep it short and elegant.`,
  countdownMessage: `Write one short line under the countdown that builds anticipation without sounding cheesy.`,
  venueTitle: `Write the venue section title. It should feel premium and clear.`,
  scheduleTitle: `Write the schedule section title. It should feel elegant, not corporate.`,
  galleryTitle: `Write the gallery section title. It should feel warm and memory-driven.`,
  rsvpTitle: `Write the RSVP section title. It should feel inviting and human.`,
  eventHeadline: `Write a concise event detail line for venue/date framing. It should be clean and useful.`,
  rsvpCallToAction: `Write a short RSVP prompt that feels gracious and polished, not robotic.`,
});
