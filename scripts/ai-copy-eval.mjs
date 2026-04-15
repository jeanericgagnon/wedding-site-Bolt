import { createEmptyWeddingProfile } from '../src/lib/weddingProfile.ts';
import { generateDraftFromWeddingProfile } from '../src/lib/aiDraftGenerator.ts';

const profiles = [
  {
    label: 'rich-garden',
    profile: {
      ...createEmptyWeddingProfile(),
      couple: { ...createEmptyWeddingProfile().couple, displayNames: 'Alex & Jordan', storyTone: 'warm and elegant' },
      event: { ...createEmptyWeddingProfile().event, date: '2027-06-12', venueName: 'Grand Estate', venueLocation: 'San Diego, CA', rsvpDeadline: '2027-05-01' },
      story: { ...createEmptyWeddingProfile().story, summary: 'We met in college and kept choosing each other through every season that followed.', welcomeNote: 'We want guests to feel relaxed, celebrated, and genuinely welcomed all weekend.' },
      design: { ...createEmptyWeddingProfile().design, theme: 'garden', vibe: 'romantic but unfussy' },
      guestExperience: { ...createEmptyWeddingProfile().guestExperience, faqTone: 'clear and warm', travelSupportLevel: 'standard' },
    },
  },
  {
    label: 'medium-destination',
    profile: {
      ...createEmptyWeddingProfile(),
      couple: { ...createEmptyWeddingProfile().couple, displayNames: 'Maya & Chris', storyTone: 'laid-back and modern' },
      event: { ...createEmptyWeddingProfile().event, date: '2026-10-04', venueLocation: 'Ojai, California' },
      design: { ...createEmptyWeddingProfile().design, theme: 'coastal', vibe: 'sunny and intimate' },
      story: { ...createEmptyWeddingProfile().story, welcomeNote: 'We want the site to feel easy, warm, and helpful for guests traveling in.' },
      guestExperience: { ...createEmptyWeddingProfile().guestExperience, faqTone: 'easygoing', travelSupportLevel: 'high' },
    },
  },
  {
    label: 'sparse',
    profile: {
      ...createEmptyWeddingProfile(),
      couple: { ...createEmptyWeddingProfile().couple, displayNames: 'Taylor & Sam' },
    },
  },
];

for (const entry of profiles) {
  const draft = await generateDraftFromWeddingProfile(entry.profile);
  console.log(`\n=== ${entry.label.toUpperCase()} ===`);
  console.log(JSON.stringify({
    heroSubtitle: draft.heroSubtitle,
    storyBody: draft.storyBody,
    countdownMessage: draft.countdownMessage,
    eventHeadline: draft.eventHeadline,
    rsvpCallToAction: draft.rsvpCallToAction,
  }, null, 2));
}
