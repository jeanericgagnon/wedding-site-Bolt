import { simulateClarifyingQuestionDecision } from '../src/lib/aiClarifyingQuestions.ts';

const cases = [
  {
    name: 'Rich baseline',
    input: {
      intakeSummary: 'Destination wedding in Sayulita with welcome drinks, wedding, and brunch. Story and registry are already clear.',
      knownResolved: ['Names', 'Date', 'Venue', 'Guest count', 'Registry posture'],
      knownUnresolved: ['Welcome drinks time/location', 'Wedding time/location'],
      readinessSummary: 'Strong enough to draft the site now.',
    },
  },
  {
    name: 'Sparse baseline',
    input: {
      intakeSummary: 'Spring wedding in California. Wedding and maybe brunch. Very little guest framing so far.',
      knownResolved: ['Names', 'Approximate location'],
      knownUnresolved: ['Weekend events are rough', 'Guest expectations are unclear'],
      readinessSummary: 'Can draft a rough shell, but output would still feel generic.',
    },
  },
  {
    name: 'Registry unclear',
    input: {
      intakeSummary: 'Nashville wedding with basics mostly set. Gifts guidance is unclear.',
      knownResolved: ['Names', 'Date', 'Venue'],
      knownUnresolved: ['Registry posture unclear'],
      readinessSummary: 'Guest-facing gift wording would be generic without one more answer.',
    },
  },
];

for (const item of cases) {
  const decision = simulateClarifyingQuestionDecision(item.input);
  console.log(`\n## ${item.name}`);
  console.log(JSON.stringify(decision, null, 2));
}
