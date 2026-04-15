import { generateDraftFromWeddingProfile } from '../src/lib/aiDraftGenerator.ts';
import { createEmptyWeddingProfile } from '../src/lib/weddingProfile.ts';

const rich = {
  ...createEmptyWeddingProfile(),
  couple: { ...createEmptyWeddingProfile().couple, displayNames: 'Alex & Jordan' },
  event: { ...createEmptyWeddingProfile().event, date: '2027-06-12', venueName: 'Grand Estate', venueLocation: 'San Diego, CA', rsvpDeadline: '2027-05-01' },
  story: { ...createEmptyWeddingProfile().story, summary: 'We met in college and kept choosing each other through every season that followed.' },
};

const medium = {
  ...createEmptyWeddingProfile(),
  couple: { ...createEmptyWeddingProfile().couple, displayNames: 'Maya & Chris' },
  event: { ...createEmptyWeddingProfile().event, date: '2026-10-04', venueLocation: 'Ojai, California' },
  story: { ...createEmptyWeddingProfile().story },
};

const sparse = {
  ...createEmptyWeddingProfile(),
  couple: { ...createEmptyWeddingProfile().couple, displayNames: 'Taylor & Sam' },
};

for (const [label, profile] of [['rich', rich], ['medium', medium], ['sparse', sparse]]) {
  console.log(`\n=== ${label.toUpperCase()} ===`);
  console.log(JSON.stringify(generateDraftFromWeddingProfile(profile), null, 2));
}
