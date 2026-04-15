import { createEmptyWeddingProfile } from '../src/lib/weddingProfile.ts';
import { buildSectionPromptPayloads } from '../src/lib/aiSectionContext.ts';
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

const mediumProfile = {
  ...createEmptyWeddingProfile(),
  couple: { ...createEmptyWeddingProfile().couple, displayNames: 'Maya & Chris', storyTone: 'easygoing and warm' },
  event: { ...createEmptyWeddingProfile().event, date: '2026-10-04', venueLocation: 'Ojai, California' },
  story: { ...createEmptyWeddingProfile().story, welcomeNote: 'We want people to feel relaxed and taken care of through the weekend.' },
  design: { ...createEmptyWeddingProfile().design, vibe: 'practical with emotional undertone' },
  guestExperience: { ...createEmptyWeddingProfile().guestExperience, faqTone: 'easygoing', travelSupportLevel: 'high' },
};

const targetSection = process.argv[2] || '';

for (const [label, profile] of Object.entries({ rich: richProfile, medium: mediumProfile, sparse: sparseProfile })) {
  const payloads = buildSectionPromptPayloads(profile);

  console.log(`\n=== ${label.toUpperCase()} SYSTEM ===\n`);
  console.log(buildWeddingCopySystemPrompt());

  console.log(`\n=== ${label.toUpperCase()} DRAFT PAYLOAD ===\n`);
  if (targetSection) {
    console.log(JSON.stringify({ [targetSection]: payloads[targetSection] ?? null }, null, 2));
  } else {
    console.log(buildWeddingCopySectionPayloadPrompt(profile));
  }

  console.log(`\n=== ${label.toUpperCase()} SECTION INSTRUCTIONS ===\n`);
  if (targetSection) {
    const instructions = buildSectionInstructionMap(profile);
    console.log(JSON.stringify({ [targetSection]: instructions[targetSection] ?? null }, null, 2));
  } else {
    console.log(JSON.stringify(buildSectionInstructionMap(profile), null, 2));
  }

  console.log(`\n=== ${label.toUpperCase()} CRITIC PAYLOAD ===\n`);
  if (targetSection) {
    console.log(JSON.stringify({ [targetSection]: payloads[targetSection] ?? null }, null, 2));
  } else {
    console.log(buildWeddingCopyCriticPayloadPrompt(profile));
  }
}
