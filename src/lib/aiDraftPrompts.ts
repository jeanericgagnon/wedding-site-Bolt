import { WeddingProfile } from './weddingProfile';
import { buildSectionPromptPayloads } from './aiSectionContext';

const names = (profile: WeddingProfile) => profile.couple.displayNames || 'The couple';

export const buildWeddingCopySystemPrompt = () => `You write elegant, warm wedding website copy.

Rules:
- Write like a thoughtful human, not a marketing team
- Avoid cheesy wedding clichés and startup/product language
- Be concise, polished, and emotionally warm
- Default to first-person voice (we / our / us) for couple-facing copy unless a section clearly needs third-person labeling
- Do not sound corporate, hospitality-branded, concierge-like, or brochure-written
- Do not invent detailed facts that are not in the input
- Never output bracket placeholders, template variables, or fill-in-the-blank text like [Venue], [City], or TBD-style stand-ins
- If a fact is missing, write around the absence cleanly instead of fabricating or inserting a placeholder
- Prefer tasteful specificity over generic filler
- Avoid vague luxury language like "meaningful day," "serene embrace," "cherished friends," "journey," "quiet elegance," or "special day" unless the profile clearly earns it
- Avoid generic bridal-magazine phrasing and default mush
- When details are sparse, be simple and clean instead of poetic
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

  const sectionPayloads = buildSectionPromptPayloads(profile);

  return `Couple profile:
${JSON.stringify(profile, null, 2)}

Emotional context:
${JSON.stringify(emotionalContext, null, 2)}

Section prompt payloads:
${JSON.stringify(sectionPayloads, null, 2)}`;
};

export const buildWeddingCopySectionPayloadPrompt = (profile: WeddingProfile) => {
  const sectionPayloads = buildSectionPromptPayloads(profile);
  return `Section prompt payloads:
${JSON.stringify(sectionPayloads, null, 2)}

Only use facts found in these payloads. If a section is marked light-fill, keep the copy modest and restrained. If context is thin, write simply instead of trying to sound profound.`;
};

export const buildWeddingCopyCriticPayloadPrompt = (profile: WeddingProfile) => {
  const sectionPayloads = buildSectionPromptPayloads(profile);
  return `Section prompt payloads for critique:
${JSON.stringify(sectionPayloads, null, 2)}

When revising, keep each field aligned with its section mode and rules. Do not add facts outside these payloads. If a light-fill field sounds over-written, simplify it.`;
};

export const buildSectionInstructionMap = (profile: WeddingProfile) => ({
  heroTitle: `Write the main hero title for ${names(profile)}. Usually this is just the names, unless a more elegant headline is clearly better.`,
  heroSubtitle: `Generate 3 possible concise hero subtitle options mentally, then return only the strongest one. It should quickly orient guests to the celebration without sounding airy, luxury-generic, or over-written. Prefer plain elegance over poetic mush.`,
  storyTitle: `Write a tasteful title for the story section. Usually short and classic.`,
  storyBody: `Generate 3 possible story paragraph options mentally, then return only the strongest one. Write in first person when possible. Write a warm, specific short story paragraph for the couple. Avoid invented backstory, romance-novel language, generic celebration filler, and third-person copywriter narration. If details are sparse, be restrained and honest rather than decorative.`,
  countdownTitle: `Write the countdown section title. Keep it short and elegant.`,
  countdownMessage: `Write one short line under the countdown that builds anticipation without sounding cheesy, grand, sentimental-forced, or corporate. Prefer first person where it feels natural.`,
  venueTitle: `Write the venue section title. It should feel premium and clear.`,
  venueIntro: `Write one short line introducing the venue/details section. It should help guests feel oriented and welcomed, not sound like brochure filler or destination-marketing copy.`,
  scheduleTitle: `Write the schedule section title. It should feel elegant, not corporate.`,
  scheduleIntro: `Write one short line introducing the schedule so guests understand the flow of the event without stiffness or event-planner jargon.`,
  galleryTitle: `Write the gallery section title. It should feel warm and memory-driven.`,
  galleryIntro: `Write one short line framing the photo/gallery section in a warm, tasteful way. Keep it grounded and avoid memory-book cliché language.`,
  rsvpTitle: `Write the RSVP section title. It should feel inviting and human.`,
  rsvpIntro: `Write one short line encouraging guests to reply. It should feel gracious and easy, not robotic, overly formal, or corporate. Prefer first person where it feels natural.`,
  registryTitle: `Write the registry section title. It should feel gracious and tasteful, not transactional.`,
  registryIntro: `Write one short registry note. It should feel gracious, warm, and non-transactional. Prefer first person. Avoid sounding gift-grabby, apologetic, stiff, corporate, or like generic etiquette copy. Prefer simple sincerity over polished sameness.`,
  faqHeadline: `Write the FAQ section title. It should feel clear, calm, and guest-friendly.`,
  faqIntro: `Write one short line introducing the FAQ section. It should feel helpful and reassuring, not robotic or blandly corporate. Prefer plainspoken first-person framing when appropriate. Avoid generic support-center language like "answers to common questions" unless there is truly nothing better.`,
  travelTitle: `Write the travel section title. It should feel useful and guest-centered.`,
  travelIntro: `Write one short line introducing travel details. It should help guests plan without sounding generic, tourism-board polished, filler-heavy, or like venue concierge copy. Prefer plainspoken first-person framing when appropriate.`,
  accommodationsTitle: `Write the accommodations section title. It should feel clean, useful, and welcoming.`,
  accommodationsIntro: `Write one short line introducing accommodations or hotel guidance. It should be helpful and warm, not hotel-brochure copy. Prefer plainspoken first-person framing when appropriate. Avoid generic phrases like "nearby lodging options" unless the profile is extremely sparse.`,
  dressCodeTitle: `Write the dress code section title. It should feel clear, tasteful, and guest-friendly.`,
  dressCodeIntro: `Write one short dress code note. It should help guests understand what to wear without sounding stiff, vague, or overly fashion-editorial.`,
  contactTitle: `Write the contact section title. It should feel warm, clear, and useful.`,
  contactIntro: `Write one short contact/help note. It should make guests feel comfortable reaching out without sounding like customer support copy.`,
  directionsTitle: `Write the directions section title. It should feel practical, clear, and guest-friendly.`,
  directionsIntro: `Write one short directions/location note. It should help guests feel oriented without sounding like map-app copy.`,
  weddingPartyTitle: `Write the wedding party section title. It should feel warm, personal, and human.`,
  weddingPartyIntro: `Write one short line introducing the wedding party section. It should feel affectionate and specific without sounding cheesy, ceremonial, or overblown. Avoid default lines like "meet the friends and family standing with us" unless there is no better grounded option.`,
  eventHeadline: `Write a concise event detail line for venue/date framing. It should be clean and useful. Use only known facts. If date or venue details are missing, do not invent them and do not use placeholders—write a clean generic line instead.`,
  rsvpCallToAction: `Generate 3 possible RSVP invitation lines mentally, then return only the strongest one. Prefer first person. It should feel gracious and polished, not robotic, wedding-industry canned, excessively formal, or corporate. Avoid generic lines like "please RSVP when you can" if a warmer, cleaner line is possible.`,
});

export const buildWeddingCopyCriticPrompt = () => `You are editing wedding website copy to make it stronger.

Rules:
- Remove clichés, filler, and startup/product language
- Keep the tone warm, elegant, and human
- Prefer first-person couple voice where appropriate
- Remove corporate, concierge, hospitality, or brochure-like phrasing
- Keep facts intact
- Remove any invented detail, placeholder, bracket text, or fake-specific phrasing
- Make copy more specific and graceful when possible
- Cut vague soft-luxury phrasing and bridal-magazine mush
- Prefer grounded specificity over abstract beauty words
- Cut generic etiquette copy and default wedding-site filler when a cleaner human line is possible
- Keep outputs concise and directly usable on a wedding website`;
