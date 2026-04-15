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

export const buildWeddingCopyUserPrompt = (profile: WeddingProfile) => {
  const emotionalContext = {
    names: profile.couple.displayNames,
    storySummary: profile.story.summary,
    storyTone: profile.couple.storyTone,
    designTheme: profile.design.theme,
    designVibe: profile.design.vibe,
    guestFeeling: profile.story.welcomeNote,
    faqTone: profile.guestExperience.faqTone,
    travelSupportLevel: profile.guestExperience.travelSupportLevel,
    eventDate: profile.event.date,
    venueName: profile.event.venueName,
    venueLocation: profile.event.venueLocation,
    ceremonyTime: profile.event.ceremonyTime,
    receptionTime: profile.event.receptionTime,
    rsvpDeadline: profile.event.rsvpDeadline,
  };

  return `Couple profile:
${JSON.stringify(profile, null, 2)}

Emotional context:
${JSON.stringify(emotionalContext, null, 2)}`;
};

export const buildSectionInstructionMap = (profile: WeddingProfile) => ({
  heroTitle: `Write the main hero title for ${names(profile)}. Usually this is just the names, unless a more elegant headline is clearly better.`,
  heroSubtitle: `Generate 3 possible premium but concise hero subtitle options mentally, then return only the strongest one. It should help guests immediately understand the event feeling and key context without sounding templated.`,
  storyTitle: `Write a tasteful title for the story section. Usually short and classic.`,
  storyBody: `Generate 3 possible story paragraph options mentally, then return only the strongest one. Write a warm, specific short story paragraph for the couple. Avoid generic celebration filler. Use details from their profile if available.`,
  countdownTitle: `Write the countdown section title. Keep it short and elegant.`,
  countdownMessage: `Write one short line under the countdown that builds anticipation without sounding cheesy.`,
  venueTitle: `Write the venue section title. It should feel premium and clear.`,
  venueIntro: `Write one short line introducing the venue/details section. It should help guests feel oriented and welcomed, not sound like brochure filler.`,
  scheduleTitle: `Write the schedule section title. It should feel elegant, not corporate.`,
  scheduleIntro: `Write one short line introducing the schedule so guests understand the flow of the event without stiffness.`,
  galleryTitle: `Write the gallery section title. It should feel warm and memory-driven.`,
  galleryIntro: `Write one short line framing the photo/gallery section in a warm, tasteful way.`,
  rsvpTitle: `Write the RSVP section title. It should feel inviting and human.`,
  rsvpIntro: `Write one short line encouraging guests to reply. It should feel gracious and easy, not robotic.`,
  registryTitle: `Write the registry section title. It should feel gracious and tasteful, not transactional.`,
  faqHeadline: `Write the FAQ section title. It should feel clear, calm, and guest-friendly.`,
  faqIntro: `Write one short line introducing the FAQ section. It should feel helpful and reassuring, not robotic.`,
  travelTitle: `Write the travel section title. It should feel useful and guest-centered.`,
  travelIntro: `Write one short line introducing travel details. It should help guests plan without sounding generic.`,
  accommodationsTitle: `Write the accommodations section title. It should feel clean, useful, and welcoming.`,
  accommodationsIntro: `Write one short line introducing accommodations or hotel guidance. It should be helpful and warm.`,
  eventHeadline: `Write a concise event detail line for venue/date framing. It should be clean and useful.`,
  rsvpCallToAction: `Generate 3 possible RSVP invitation lines mentally, then return only the strongest one. It should feel gracious and polished, not robotic.`,
});

export const buildWeddingCopyCriticPrompt = () => `You are editing wedding website copy to make it stronger.

Rules:
- Remove clichés, filler, and startup/product language
- Keep the tone warm, elegant, and human
- Keep facts intact
- Make copy more specific and graceful when possible
- Keep outputs concise and directly usable on a wedding website`;
