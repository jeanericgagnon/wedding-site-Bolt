import { createEmptyWeddingProfile } from '../src/lib/weddingProfile.ts';
import {
  buildWeddingCopySystemPrompt,
  buildWeddingCopySectionPayloadPrompt,
  buildWeddingCopyCriticPayloadPrompt,
  buildSectionInstructionMap,
} from '../src/lib/aiDraftPrompts.ts';

const richProfile = {
  ...createEmptyWeddingProfile(),
  couple: { ...createEmptyWeddingProfile().couple, displayNames: 'Alex & Jordan', storyTone: 'warm and grounded' },
  event: { ...createEmptyWeddingProfile().event, date: '2027-06-12', venueName: 'Grand Estate', venueLocation: 'San Diego, CA', rsvpDeadline: '2027-05-01' },
  story: { ...createEmptyWeddingProfile().story, summary: 'We met in college and kept choosing each other through every season that followed.', welcomeNote: 'We want guests to feel relaxed, informed, and genuinely welcomed.' },
  registry: { ...createEmptyWeddingProfile().registry, url: 'https://registry.example.com/alex-jordan' },
  design: { ...createEmptyWeddingProfile().design, theme: 'garden', vibe: 'practical with emotional undertone' },
  guestExperience: { ...createEmptyWeddingProfile().guestExperience, faqTone: 'calm and helpful', travelSupportLevel: 'high' },
};

const sparseProfile = {
  ...createEmptyWeddingProfile(),
  couple: { ...createEmptyWeddingProfile().couple, displayNames: 'Taylor & Sam' },
};

for (const [label, profile] of Object.entries({ rich: richProfile, sparse: sparseProfile })) {
  console.log(`\n=== ${label.toUpperCase()} SYSTEM ===\n`);
  console.log(buildWeddingCopySystemPrompt());

  console.log(`\n=== ${label.toUpperCase()} DRAFT PAYLOAD ===\n`);
  console.log(buildWeddingCopySectionPayloadPrompt(profile));

  console.log(`\n=== ${label.toUpperCase()} SECTION INSTRUCTIONS ===\n`);
  console.log(JSON.stringify(buildSectionInstructionMap(profile), null, 2));

  console.log(`\n=== ${label.toUpperCase()} CRITIC PAYLOAD ===\n`);
  console.log(buildWeddingCopyCriticPayloadPrompt(profile));
}
