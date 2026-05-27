import type { TemplateCatalogItem } from '../builder/constants/templateCatalog';
import type { SetupDraft } from './setupDraft';
import { deriveSetupMode } from './setupDraftRecommendations';
import type { WeddingDataV1 } from '../types/weddingData';

export interface ConciergeChecklistItem {
  id: string;
  title: string;
  detail: string;
}

export interface ConciergeSequenceItem {
  id: string;
  status: 'current' | 'next' | 'then';
  title: string;
  detail: string;
}

export interface SetupReviewModel {
  heading: string;
  summary: string;
  confidenceLabel: string;
  nextBestMove: string;
  decisionRule: string;
  watchouts: string[];
  launchSequence: ConciergeSequenceItem[];
  starterChecklist: ConciergeChecklistItem[];
  builderChecklist: ConciergeChecklistItem[];
}

export interface BuilderConciergeModel {
  heading: string;
  summary: string;
  confidenceLabel: string;
  nextBestMove: string;
  decisionRule: string;
  guestPromise: string;
  watchouts: string[];
  launchSequence: ConciergeSequenceItem[];
  checklist: ConciergeChecklistItem[];
}

const humanizeGuestEstimate = (value: SetupDraft['guestEstimateBand']): string => {
  switch (value) {
    case 'lt50':
      return 'an intimate guest list';
    case '50to100':
      return 'a mid-size guest list';
    case '100to200':
      return 'a fuller guest list';
    case '200plus':
      return 'a large guest list';
    default:
      return 'your guest list';
  }
};

export const deriveSetupUseCasePacks = (
  draft: Pick<SetupDraft, 'stylePreferences' | 'guestEstimateBand'>,
): Array<'destination' | 'bilingual' | 'interfaith'> => {
  const mode = deriveSetupMode(draft);
  return [
    mode.destination ? 'destination' : null,
    mode.bilingual ? 'bilingual' : null,
    mode.interfaith ? 'interfaith' : null,
  ].filter((value): value is 'destination' | 'bilingual' | 'interfaith' => Boolean(value));
};

export const buildSetupTemplateReason = (
  template: TemplateCatalogItem,
  draft: Pick<SetupDraft, 'stylePreferences' | 'guestEstimateBand'>,
): string => {
  const styles = new Set(draft.stylePreferences.map((value) => value.trim().toLowerCase()).filter(Boolean));
  const matchingTags = template.styleTags.filter((tag) => styles.has(tag.toLowerCase()));
  const packs = new Set(deriveSetupUseCasePacks(draft));
  const source = `${template.id} ${template.name} ${template.description} ${template.bestFor.join(' ')} ${template.defaultSectionOrder.join(' ')}`;

  if (packs.has('destination') && /travel|weekend|hotel|coastal|destination/i.test(source)) {
    return 'Fits a destination-style weekend because it keeps travel, schedule, and guest logistics closer to the top.';
  }

  if (packs.has('destination')) {
    return 'Fits your destination direction while still keeping the guest path calm and easy to follow.';
  }

  if (packs.has('interfaith') && /story|details|schedule|faq|ceremony/i.test(source)) {
    return 'Fits an interfaith celebration because it leaves room for story, ceremony context, and guest guidance without feeling heavy.';
  }

  if (packs.has('bilingual') && /details|faq|guide|schedule|guest/i.test(source)) {
    return 'Fits a bilingual guest experience because it keeps guidance-heavy sections easy to find and easier to translate well.';
  }

  if (matchingTags.length > 0) {
    return `Fits your ${matchingTags.slice(0, 2).join(' + ').toLowerCase()} direction while keeping the guest path straightforward.`;
  }

  if (template.defaultSectionOrder.includes('Travel') || template.defaultSectionOrder.includes('Schedule')) {
    return 'Fits couples who want the first draft to feel clear for guests before it feels overly designed.';
  }

  return 'Fits as a strong first draft with a calm structure you can refine later.';
};

export const buildSetupReviewModel = (
  draft: SetupDraft,
  selectedTemplate: TemplateCatalogItem | null,
): SetupReviewModel => {
  const mode = deriveSetupMode(draft);
  const packs = deriveSetupUseCasePacks(draft);
  const destinationMode = mode.destination;
  const weekendMode = mode.weekend;
  const templateName = selectedTemplate?.name ?? 'this template';
  const guestEstimate = humanizeGuestEstimate(draft.guestEstimateBand);

  const heading = destinationMode
    ? 'DayOf will start this as a destination-first draft'
    : weekendMode
      ? 'DayOf will start this as a weekend-aware draft'
      : 'DayOf will start this as a calm first draft';
  const confidenceLabel = destinationMode || weekendMode ? 'High-confidence first draft' : 'Strong first draft';

  const summary = destinationMode
    ? `${templateName} is a good base for ${guestEstimate}, with extra weight on travel, arrival, and the weekend flow.`
    : weekendMode
      ? `${templateName} is a good base for ${guestEstimate}, with enough structure for more than one event without making the site feel busy.`
      : `${templateName} is a good base for ${guestEstimate}, with the essentials guests need first and plenty of room to polish later.`;
  const nextBestMove = destinationMode
    ? 'Next, make the travel path and weekend rhythm feel undeniably real before chasing design polish.'
    : weekendMode
      ? 'Next, lock the real event flow so the site feels trustworthy before it tries to feel finished.'
      : 'Next, make the welcome, RSVP, and core guest guidance feel real before touching smaller visual details.';
  const decisionRule = destinationMode
    ? 'If a change helps a guest arrive, orient, or follow the weekend faster, it beats visual polish right now.'
    : weekendMode
      ? 'If a change makes the event flow easier to trust in one scan, it beats extra styling right now.'
      : 'If a change strengthens guest basics or removes uncertainty, it wins over cosmetic refinement right now.';
  const watchouts = [
    !draft.weddingCity.trim() ? 'Guests still do not have a clear city anchor yet.' : null,
    !draft.guestEstimateBand ? 'Guest scale is still fuzzy, so the first draft may feel too light or too big.' : null,
    destinationMode ? 'Destination guests will judge clarity faster than style.' : null,
    draft.migrationSource && draft.migrationSource !== 'other' ? 'If you are migrating, keep the first move focused on trusted basics, not a full redesign.' : null,
  ].filter((value): value is string => Boolean(value));

  const starterChecklist: ConciergeChecklistItem[] = [
    {
      id: 'hero',
      title: 'A first welcome and couple intro',
      detail: 'The first draft will carry your names, a cleaner welcome note, and a template that already matches the mood you picked.',
    },
    {
      id: 'venue',
      title: 'Location and event anchors',
      detail: destinationMode
        ? 'DayOf will bias the first draft toward city, arrival context, and weekend structure so the move feels grounded right away.'
        : 'DayOf will anchor the first draft around your date, city, and venue context so guests can orient quickly.',
    },
    {
      id: 'guest-guidance',
      title: 'Guest-facing guidance in the right places',
      detail: packs.length > 0
        ? `The first draft will also lean into ${packs.join(', ')} guidance so guests get the context they need sooner.`
        : 'The first draft will keep RSVP, guest guidance, and the main event path easy to follow from the start.',
    },
  ];

  const builderChecklist: ConciergeChecklistItem[] = [
    {
      id: 'headline-pass',
      title: 'Confirm the welcome tone first',
      detail: 'Start by making sure the hero, names, and opening note sound like you before touching smaller design details.',
    },
    {
      id: 'guest-path',
      title: destinationMode || weekendMode ? 'Fill in the weekend flow next' : 'Lock in the guest path next',
      detail: destinationMode
        ? 'Add the real hotel, airport, and weekend schedule details before spending energy on visual polish.'
        : weekendMode
          ? 'Add the actual event sequence and guest timing next so the draft becomes trustworthy fast.'
          : 'Check venue, RSVP, and FAQ details next so the site becomes useful before it becomes fancy.',
    },
    {
      id: 'mobile-proof',
      title: 'Do one quick mobile pass before publish',
      detail: 'The right finish line is “guests can follow this easily on their phone,” not just “the desktop page looks done.”',
    },
  ];

  const launchSequence: ConciergeSequenceItem[] = [
    {
      id: 'anchors',
      status: 'current',
      title: 'Lock the real anchors first',
      detail: destinationMode
        ? 'Names, date, city, and travel context should feel undeniably real before anything looks polished.'
        : 'Names, date, location, and RSVP basics should feel trustworthy before you chase visual polish.',
    },
    {
      id: 'guest-path',
      status: 'next',
      title: destinationMode || weekendMode ? 'Then shape the guest path' : 'Then shape the guest guidance',
      detail: destinationMode
        ? 'Make hotel, arrival, and weekend flow easy to skim on a phone.'
        : weekendMode
          ? 'Make the multi-event flow easy to follow in one scan.'
          : 'Make RSVP, FAQs, and core event details feel complete enough that guests do not have to ask for basics.',
    },
    {
      id: 'polish',
      status: 'then',
      title: 'Only then spend energy on polish',
      detail: 'Once the draft is trustworthy, design tweaks and tone refinements start paying off instead of hiding missing basics.',
    },
  ];

  return { heading, summary, confidenceLabel, nextBestMove, decisionRule, watchouts, launchSequence, starterChecklist, builderChecklist };
};

export const buildBuilderConciergeModel = (
  data: WeddingDataV1,
  options?: { templateName?: string | null },
): BuilderConciergeModel => {
  const packs = new Set(data.meta.useCasePacks ?? []);
  const templateName = options?.templateName?.trim() || 'your current template';
  const checklist: ConciergeChecklistItem[] = [];

  const hasStory = Boolean(data.couple.story?.trim());
  const hasVenue = data.venues.some((venue) => Boolean(venue.name?.trim() || venue.address?.trim()));
  const hasWeekendFlow = (data.schedule?.length ?? 0) > 1;
  const hasTravelCoverage = Boolean(
    data.travel.hotelInfo?.trim() ||
    data.travel.flightInfo?.trim() ||
    data.travel.parkingInfo?.trim() ||
    data.travel.notes?.trim(),
  );
  const hasFaq = data.faq.some((item) => item.q?.trim() && item.a?.trim());
  const hasDeadline = Boolean(data.rsvp.deadlineISO);

  if (packs.has('destination') && !hasTravelCoverage) {
    checklist.push({
      id: 'travel',
      title: 'Fill in travel guidance early',
      detail: 'Hotel, airport, and arrival notes matter more than extra visual polish for destination guests.',
    });
  }

  if ((packs.has('destination') || packs.has('interfaith') || packs.has('bilingual') || hasTravelCoverage) && !hasWeekendFlow) {
    checklist.push({
      id: 'schedule',
      title: 'Shape the guest-facing flow next',
      detail: packs.has('destination')
        ? 'Add the real welcome, wedding, and travel rhythm so guests can understand the weekend in one scan.'
        : 'Add the ceremony and guest-facing sequence next so the draft feels clear instead of generic.',
    });
  }

  if (!hasStory) {
    checklist.push({
      id: 'story',
      title: 'Personalize the welcome first',
      detail: 'Make the hero and intro sound like you before adjusting smaller design details.',
    });
  }

  if (!hasVenue) {
    checklist.push({
      id: 'venue',
      title: 'Lock in the venue details',
      detail: 'Guests trust the site faster once the real venue and location details are grounded in the draft.',
    });
  }

  if (!hasDeadline || !hasFaq) {
    checklist.push({
      id: 'guest-guidance',
      title: 'Tighten RSVP and guest guidance',
      detail: !hasDeadline
        ? 'Set the RSVP deadline and answer the obvious guest questions before you think about launch.'
        : 'Answer the obvious guest questions now so people do not have to text you for basics.',
    });
  }

  if (checklist.length === 0) {
    checklist.push(
      {
        id: 'mobile',
        title: 'Run a phone-first pass',
        detail: 'Use the builder preview sizes and make sure the most important guest information lands cleanly on mobile.',
      },
      {
        id: 'publish',
        title: 'Check go-live readiness calmly',
        detail: 'At this point the work is less about adding features and more about making sure the current draft is complete and trustworthy.',
      },
    );
  }

  const heading = 'Your first draft has a plan';
  const summary = packs.has('destination')
    ? `${templateName} is now leaning toward a destination-weekend guest journey, so the next wins are clarity, travel confidence, and the real event flow.`
    : packs.has('interfaith')
      ? `${templateName} is now carrying more ceremony and guest-context potential, so the next wins are clarity and warmth rather than more complexity.`
      : packs.has('bilingual')
      ? `${templateName} is now set up to support a more bilingual guest path, so the next wins are clear guidance and cleaner translation-friendly copy.`
        : `${templateName} is now a real first draft. The next wins are making it feel personal, useful, and easy for guests to follow.`;
  const confidenceLabel = checklist.some((item) => item.id === 'publish') ? 'Ready for polish' : 'Guided next moves';
  const nextBestMove = checklist[0]?.detail ?? 'Keep the next move guest-facing and practical before polishing extras.';
  const decisionRule = packs.has('destination')
    ? 'If the change helps guests travel, orient, or follow the weekend with less friction, it wins over design polish.'
    : packs.has('bilingual')
      ? 'If the change makes the guest path easier to understand on first read, it wins over adding more surface area.'
      : packs.has('interfaith')
        ? 'If the change explains the flow or ceremony context more clearly, it wins over decorative refinement.'
        : 'If the change makes the draft more useful or trustworthy for guests, it wins over extra polish.';
  const guestPromise = packs.has('destination')
    ? 'Guests should understand where to go, where to stay, and what happens next without texting you.'
    : packs.has('bilingual')
      ? 'Guests should feel guided even if they only skim the key sections in one language first.'
      : packs.has('interfaith')
        ? 'Guests should understand the flow and ceremony context without needing a private explanation.'
        : 'Guests should understand the weekend flow quickly from a phone without hunting for basics.';
  const watchouts = [
    !hasTravelCoverage && packs.has('destination') ? 'Travel still feels thin for a destination-style weekend.' : null,
    !hasFaq ? 'The obvious guest questions are still mostly living in your head.' : null,
    !hasDeadline ? 'RSVP still lacks a clear deadline, which weakens guest confidence fast.' : null,
  ].filter((value): value is string => Boolean(value));
  const launchSequence: ConciergeSequenceItem[] = [
    {
      id: 'trust',
      status: 'current',
      title: 'Make the site trustworthy first',
      detail: !hasVenue || !hasDeadline
        ? 'Real venue details and a clear RSVP path still matter more than cosmetic changes.'
        : 'The basics are in place, so the job now is making the guest path feel undeniably real.',
    },
    {
      id: 'guidance',
      status: 'next',
      title: packs.has('destination') ? 'Then strengthen travel confidence' : 'Then strengthen guest guidance',
      detail: packs.has('destination')
        ? 'Travel, schedule, and weekend logistics should feel easier than texting you.'
        : !hasFaq
          ? 'FAQ and timing clarity should answer the obvious questions before guests ask them.'
          : 'Use the next pass to make the guest-facing sections feel easy to trust on mobile.',
    },
    {
      id: 'launch',
      status: 'then',
      title: 'Then use launch polish intentionally',
      detail: 'Once the guest path is calm, publish checks and visual polish become the right final pass instead of a distraction.',
    },
  ];

  return {
    heading,
    summary,
    confidenceLabel,
    nextBestMove,
    decisionRule,
    guestPromise,
    watchouts,
    launchSequence,
    checklist: checklist.slice(0, 3),
  };
};
