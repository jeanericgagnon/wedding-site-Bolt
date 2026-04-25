import { normalizeRsvpDeadlineForCopy } from './rsvpDeadlineCopy';

export interface FaqDraftInput {
  weddingCity?: string;
  venue?: string;
  attire?: string;
  parking?: string;
  hotelRecommendations?: string;
  rsvpDeadline?: string;
  useCasePacks?: string[];
}

export interface FaqDraftItem {
  question: string;
  answer: string;
}

function pushUnique(items: FaqDraftItem[], item: FaqDraftItem | null) {
  if (!item) return;
  if (items.some((existing) => existing.question.toLowerCase() === item.question.toLowerCase())) return;
  items.push(item);
}

export function buildSuggestedFaqDrafts(input: FaqDraftInput): FaqDraftItem[] {
  const items: FaqDraftItem[] = [];
  const packs = new Set(input.useCasePacks ?? []);
  const rsvpDeadline = normalizeRsvpDeadlineForCopy(input.rsvpDeadline);

  pushUnique(items, input.attire?.trim() ? { question: 'What should I wear?', answer: input.attire.trim() } : null);
  pushUnique(items, input.parking?.trim() ? { question: 'Will there be parking?', answer: input.parking.trim() } : null);
  pushUnique(items, input.hotelRecommendations?.trim() ? { question: 'Where should I stay?', answer: input.hotelRecommendations.trim() } : null);
  pushUnique(items, rsvpDeadline ? { question: 'When should I RSVP by?', answer: `Please reply by ${rsvpDeadline} if you can.` } : null);

  if (packs.has('destination')) {
    pushUnique(items, {
      question: 'When should guests arrive?',
      answer: `If you are traveling in${input.weddingCity ? ` to ${input.weddingCity}` : ''}, we recommend arriving at least one day early so the weekend feels easy and unrushed.`,
    });
  }

  if (packs.has('bilingual')) {
    pushUnique(items, {
      question: 'Will information be shared in more than one language?',
      answer: 'Yes. We are planning this with bilingual guests in mind, so the key details will be shared clearly for both sides of the family.',
    });
  }

  if (packs.has('interfaith')) {
    pushUnique(items, {
      question: 'What should guests know about the ceremony?',
      answer: 'We will share a short ceremony note here so guests understand the traditions being honored and what to expect.',
    });
  }

  pushUnique(items, input.venue?.trim() ? {
    question: 'Will the ceremony and reception be at the same location?',
    answer: `Yes — both parts of the celebration are currently planned around ${input.venue.trim()}. We will update this if anything changes.`,
  } : null);

  return items;
}
