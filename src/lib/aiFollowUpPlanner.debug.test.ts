import { describe, expect, it } from 'vitest';
import { buildInitialSetupSnapshot } from './initialSetupSnapshot';
import { planFollowUpQuestions } from './aiFollowUpPlanner';
import type { InitialSetupAnswers } from './initialSetupAnswers';

type EvalCase = {
  name: string;
  answers: Partial<InitialSetupAnswers>;
  expectedOverall?: 'good' | 'bad';
  notes?: string;
};

const cases: EvalCase[] = [
  {
    name: 'Eric + Kara rich baseline',
    expectedOverall: 'good',
    notes: 'Should ask per-event logistics only, no junk phrasing.',
    answers: {
      names: 'Eric & Kara',
      labelPreference: 'names-only',
      whenWhere: 'January 17, 2027 — Sayulita, Mexico',
      venueNameOrTbd: 'Amor Boutique Hotel',
      style: 'Tropical, relaxed',
      weekendEventsRaw: 'Friday welcome drinks, Saturday wedding, Sunday brunch',
      ceremonyArrivalTime: '4:30 PM',
      guestCountBand: '100-150',
      plusOnePolicy: 'some',
      rsvpDeadline: '2026-12-01',
      mealChoice: 'yes',
      registryIntent: 'cash',
      optionalStory: 'We met online and hit it off instantly.',
    },
  },
  {
    name: 'Nina + Eli courthouse + dinner',
    expectedOverall: 'good',
    notes: 'Should maybe ask dinner logistics only if missing, not story nitpicks.',
    answers: {
      names: 'Nina & Eli',
      labelPreference: 'names-only',
      whenWhere: 'March 4, 2027 — San Francisco, California',
      venueNameOrTbd: 'City Hall',
      style: 'Simple, modern, intimate',
      weekendEventsRaw: 'Ceremony and dinner',
      ceremonyArrivalTime: '2:00 PM',
      guestCountBand: 'under-50',
      plusOnePolicy: 'none',
      rsvpDeadline: '2027-01-25',
      mealChoice: 'no',
      registryIntent: 'none',
      optionalStory: 'We met at a friend’s birthday dinner and kept talking after everyone else left.',
    },
  },
  {
    name: 'Brooke + Emma strong anchor no story',
    expectedOverall: 'good',
    notes: 'Should ask for story texture, not operational junk.',
    answers: {
      names: 'Brooke & Emma',
      labelPreference: 'bride-bride',
      whenWhere: 'July 10, 2027 — Sonoma, California',
      venueNameOrTbd: 'Beltane Ranch',
      style: 'Warm, outdoor, elegant',
      weekendEventsRaw: 'Friday welcome dinner, Saturday wedding',
      ceremonyArrivalTime: '4:00 PM',
      guestCountBand: '100-150',
      plusOnePolicy: 'some',
      rsvpDeadline: '2027-05-20',
      mealChoice: 'yes',
      registryIntent: 'gifts',
      optionalStory: '',
    },
  },
  {
    name: 'Maya + Jules medium completeness',
    answers: {
      names: 'Maya & Jules',
      labelPreference: 'names-only',
      whenWhere: 'September 20, 2026 — New York, New York',
      venueNameOrTbd: 'Wythe Hotel',
      style: 'Editorial, modern',
      weekendEventsRaw: 'Ceremony and dinner Saturday night',
      ceremonyArrivalTime: '5:00 PM',
      guestCountBand: '50-100',
      plusOnePolicy: 'none',
      rsvpDeadline: '2026-08-15',
      mealChoice: 'yes',
      registryIntent: 'gifts',
    },
  },
  {
    name: 'Leah + Sofia venue TBD',
    answers: {
      names: 'Leah & Sofia',
      labelPreference: 'bride-bride',
      whenWhere: 'June 12, 2027 — Santa Barbara, California',
      venueNameOrTbd: 'TBD',
      style: 'Garden party, romantic',
      weekendEventsRaw: 'Welcome drinks Friday, wedding Saturday',
      ceremonyArrivalTime: '3:30 PM',
      guestCountBand: '150-250',
      plusOnePolicy: 'some',
      rsvpDeadline: '2027-04-30',
      mealChoice: 'yes',
      registryIntent: 'both',
      optionalStory: 'We met in college and stayed friends for years before finally dating.',
    },
  },
  {
    name: 'Ava + Ben sparse baseline',
    answers: {
      names: 'Ava & Ben',
      labelPreference: 'names-only',
      whenWhere: 'Spring 2027 — California',
      venueNameOrTbd: 'TBD',
      style: 'Relaxed',
      weekendEventsRaw: 'Wedding and maybe brunch',
      guestCountBand: '100-150',
      plusOnePolicy: 'some',
      registryIntent: 'unsure',
    },
  },
  {
    name: 'Olivia + Harper messy freeform',
    expectedOverall: 'bad',
    notes: 'This should expose parsing weakness and cleanup pressure.',
    answers: {
      names: 'Olivia + Harper',
      whenWhere: 'Labor Day weekend somewhere outside Portland, probably the vineyard if it works out',
      venueNameOrTbd: 'maybe Stoller, still deciding',
      style: 'elevated but not stuffy',
      weekendEventsRaw: 'definitely welcome dinner, wedding Saturday, maybe something Sunday if people stay',
      ceremonyArrivalTime: 'probably 4:00',
      guestCountBand: '100-150',
      plusOnePolicy: 'some',
      mealChoice: 'yes',
      optionalStory: 'We met on Hinge, texted forever, then finally met for coffee and stayed until closing.',
    },
  },
  {
    name: 'Zane + Luca vague destination',
    expectedOverall: 'bad',
    notes: 'Should reveal missing anchor/ops problems clearly.',
    answers: {
      names: 'Zane & Luca',
      labelPreference: 'groom-groom',
      whenWhere: 'Fall 2027 — Italy',
      venueNameOrTbd: 'TBD',
      style: 'romantic but not cheesy',
      weekendEventsRaw: 'welcome thing, wedding, maybe pool day',
      guestCountBand: '50-100',
      plusOnePolicy: 'some',
      mealChoice: 'yes',
      registryIntent: 'cash',
      optionalStory: 'We met traveling.',
    },
  },
  {
    name: 'Chloe + Ben long story missing ops',
    expectedOverall: 'good',
    notes: 'Should focus on ops gaps, not ask weak story questions.',
    answers: {
      names: 'Chloe & Ben',
      labelPreference: 'names-only',
      whenWhere: 'April 30, 2027 — Charleston, South Carolina',
      venueNameOrTbd: 'The Dewberry',
      style: 'classic southern, polished',
      weekendEventsRaw: 'rehearsal dinner Friday, wedding Saturday, brunch Sunday',
      guestCountBand: '150-250',
      registryIntent: 'both',
      optionalStory: 'We met at work, became close friends, broke every rule about office dating, and have basically been making each other laugh ever since.',
    },
  },
  {
    name: 'Aaliyah + Marcus city but venue uncertain',
    expectedOverall: 'good',
    notes: 'Should ask event details or venue certainty cleanly.',
    answers: {
      names: 'Aaliyah & Marcus',
      labelPreference: 'bride-groom',
      whenWhere: 'August 21, 2027 — Chicago, Illinois',
      venueNameOrTbd: 'maybe The Joinery',
      style: 'black tie but fun',
      weekendEventsRaw: 'welcome cocktails Friday, wedding Saturday',
      ceremonyArrivalTime: '5:00 PM',
      guestCountBand: '150-250',
      plusOnePolicy: 'all',
      rsvpDeadline: '2027-06-15',
      mealChoice: 'yes',
      registryIntent: 'gifts',
      optionalStory: 'We met through cousins.',
    },
  },
  {
    name: 'Hannah + Drew no weekend events',
    expectedOverall: 'good',
    notes: 'Should ask for useful event/logistics detail, not random copy polish.',
    answers: {
      names: 'Hannah & Drew',
      labelPreference: 'names-only',
      whenWhere: 'May 18, 2027 — Scottsdale, Arizona',
      venueNameOrTbd: 'Andaz Scottsdale',
      style: 'desert, modern, relaxed',
      guestCountBand: '50-100',
      plusOnePolicy: 'some',
      mealChoice: 'no',
      registryIntent: 'unsure',
      optionalStory: 'We met on Bumble.',
    },
  },
  {
    name: 'Keira + Alex lots of guests',
    expectedOverall: 'good',
    notes: 'Should probably ask event logistics, maybe travel tone.',
    answers: {
      names: 'Keira & Alex',
      labelPreference: 'names-only',
      whenWhere: 'June 5, 2027 — Cabo San Lucas, Mexico',
      venueNameOrTbd: 'Chileno Bay Resort',
      style: 'elevated beach, celebratory',
      weekendEventsRaw: 'Friday welcome party, Saturday wedding',
      ceremonyArrivalTime: '4:30 PM',
      guestCountBand: '250+',
      plusOnePolicy: 'all',
      rsvpDeadline: '2027-03-30',
      mealChoice: 'yes',
      registryIntent: 'cash',
      optionalStory: 'We met in grad school.',
    },
  },
];

const withDefaults = (answers: Partial<InitialSetupAnswers>): InitialSetupAnswers => ({
  names: '',
  labelPreference: 'names-only',
  whenWhere: '',
  venueNameOrTbd: '',
  style: '',
  weekendEventsRaw: '',
  ceremonyArrivalTime: '',
  guestCountBand: 'unknown',
  plusOnePolicy: 'unknown',
  rsvpDeadline: '',
  mealChoice: 'unknown',
  registryIntent: '',
  optionalStory: '',
  ...answers,
});

describe('aiFollowUpPlanner eval bank', () => {
  it('shows current follow-up needs across completeness levels', () => {
    const outputs = cases.map((testCase) => {
      const snapshot = buildInitialSetupSnapshot(withDefaults(testCase.answers));
      const followUpPlan = planFollowUpQuestions(snapshot, 0);
      return {
        name: testCase.name,
        expectedOverall: testCase.expectedOverall,
        notes: testCase.notes,
        followUps: followUpPlan.questions.map((item) => ({
          key: item.key,
          prompt: item.variants[0],
          affects: item.affects,
        })),
      };
    });

    const summary = {
      good: outputs.filter((item) => item.expectedOverall === 'good').map((item) => item.name),
      bad: outputs.filter((item) => item.expectedOverall === 'bad').map((item) => item.name),
    };

    console.log(JSON.stringify({ summary, outputs }, null, 2));
    expect(outputs.length).toBeGreaterThan(0);
  });
});
