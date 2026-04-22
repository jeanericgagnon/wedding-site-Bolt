import type { InitialSetupAnswers } from './initialSetupAnswers';
import type { ClarifyingPersistenceEnvelope, ClarifyingQuestionStatus, StoredClarifyingQuestion } from './aiClarifyingPersistence';



const normalizeSparseFreeformText = (rawValue: string, emptyPhrases: ReadonlyArray<string> = []) => {
  const trimmed = rawValue.trim();
  const normalized = trimmed.toLowerCase();
  if (!trimmed) return '';
  if (emptyPhrases.includes(normalized)) return '';
  return trimmed;
};

const normalizeSparseEnumAnswer = <T extends string>(
  rawValue: string,
  options: ReadonlyArray<T>,
  aliases: Record<string, T> = {},
): T | '' => {
  const normalized = rawValue.trim().toLowerCase();
  if (!normalized) return '';
  if (options.includes(normalized as T)) return normalized as T;
  if (normalized in aliases) return aliases[normalized];

  const collapsed = normalized.replace(/[^a-z0-9]+/g, ' ').trim();
  if (collapsed in aliases) return aliases[collapsed];

  for (const [alias, value] of Object.entries(aliases).sort((a, b) => b[0].length - a[0].length)) {
    if (collapsed.includes(alias)) return value;
  }

  return '';
};

const normalizeSparseGuestCountBand = (rawValue: string): InitialSetupAnswers['guestCountBand'] => {
  const normalized = rawValue.trim().toLowerCase();
  if (!normalized) return '';
  if (['under-50', '50-100', '100-150', '150-250', '250-plus'].includes(normalized)) {
    return normalized as InitialSetupAnswers['guestCountBand'];
  }

  if (/(tiny|small|intimate|few|micro wedding)/.test(normalized)) return 'under-50';
  if (/(very large|huge|two hundred|200)/.test(normalized)) return '150-250';
  if (/(medium|moderate|around one hundred|about one hundred)/.test(normalized)) return '50-100';
  if (/(large|big crowd|one hundred and fifty|around 150)/.test(normalized)) return '100-150';
  if (/(massive|300|three hundred|250\+)/.test(normalized)) return '250-plus';

  const numericMatch = normalized.match(/\d+/g);
  if (!numericMatch || numericMatch.length === 0) return '';
  const numbers = numericMatch.map(Number).filter((value) => Number.isFinite(value));
  const highest = Math.max(...numbers);
  if (highest < 50) return 'under-50';
  if (highest <= 100) return '50-100';
  if (highest <= 150) return '100-150';
  if (highest <= 250) return '150-250';
  return '250-plus';
};

export type ConciergeQuestion =
  | 'partnerNames'
  | 'partnerLabels'
  | 'venueLocation'
  | 'venueName'
  | 'theme'
  | 'guestFeel'
  | 'weekendEvents'
  | 'ceremonyTime'
  | 'guestCount'
  | 'plusOnePolicy'
  | 'childrenAllowed'
  | 'rsvpDeadline'
  | 'mealChoice'
  | 'registryIntent'
  | 'story';

export const applyQuickStartAnswer = (
  answers: InitialSetupAnswers,
  questionKey: ConciergeQuestion,
  rawValue: string,
): InitialSetupAnswers => {
  const value = rawValue.trim();
  const normalizedLowerValue = value.toLowerCase();
  const normalizedDelimitedValue = normalizedLowerValue.split('|').map((part) => part.trim()).join('|');
  const next = { ...answers };

  switch (questionKey) {
    case 'partnerNames':
      next.names = value;
      break;
    case 'partnerLabels': {
      const normalizedPartnerLabel = normalizedDelimitedValue.replace(/[^a-z|]+/g, '');
      if (
        normalizedPartnerLabel === 'bride|groom'
        || normalizedLowerValue.includes('bride and groom')
        || normalizedLowerValue.includes('groom and bride')
      ) {
        next.labelPreference = 'bride-groom';
      } else if (
        normalizedPartnerLabel === 'bride|bride'
        || normalizedLowerValue.includes('bride and bride')
        || normalizedLowerValue.includes('two brides')
      ) {
        next.labelPreference = 'bride-bride';
      } else if (
        normalizedPartnerLabel === 'groom|groom'
        || normalizedLowerValue.includes('groom and groom')
        || normalizedLowerValue.includes('two grooms')
      ) {
        next.labelPreference = 'groom-groom';
      } else {
        next.labelPreference = 'names-only';
      }
      break;
    }
    case 'venueLocation':
      next.whenWhere = value;
      break;
    case 'venueName':
      next.venueNameOrTbd = normalizeSparseFreeformText(value, ['tbd', 'to be decided', 'to be determined', 'not sure yet']);
      break;
    case 'theme':
      next.style = value;
      break;
    case 'guestFeel':
      next.guestFeel = value;
      break;
    case 'weekendEvents':
      next.weekendEventsRaw = normalizeSparseFreeformText(value, ['none', 'none yet', 'no extra events', 'no weekend events', 'nothing yet']);
      break;
    case 'ceremonyTime': {
      const timeMatch = value.match(/(?:^|[^\d])(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
      if (timeMatch) {
        const [, hours, minutes = '00', meridiem] = timeMatch;
        next.ceremonyArrivalTime = `${hours}:${minutes.padStart(2, '0')} ${meridiem.toUpperCase()}`;
      } else {
        next.ceremonyArrivalTime = value;
      }
      break;
    }
    case 'guestCount':
      next.guestCountBand = normalizeSparseGuestCountBand(value);
      break;
    case 'plusOnePolicy':
      next.plusOnePolicy = normalizeSparseEnumAnswer(value, ['none', 'some', 'all'], {
        'no': 'none',
        'none': 'none',
        'no plus ones': 'none',
        'not offering plus ones': 'none',
        'plus ones by invite only': 'some',
        'invite only': 'some',
        'limited': 'some',
        'some': 'some',
        'select': 'some',
        'select guests': 'some',
        'close friends and family only': 'some',
        'everyone': 'all',
        'all': 'all',
        'yes': 'all',
        'all guests': 'all',
      });
      break;
    case 'childrenAllowed':
      next.childrenAllowed = normalizeSparseEnumAnswer(value, ['yes', 'no', 'unsure'], {
        'yes': 'yes',
        'kids welcome': 'yes',
        'children welcome': 'yes',
        'family friendly': 'yes',
        'yes kids': 'yes',
        'no': 'no',
        'adults only': 'no',
        'no kids': 'no',
        'child free': 'no',
        'not sure': 'unsure',
        'unsure': 'unsure',
        'maybe': 'unsure',
        'tbd': 'unsure',
      });
      break;
    case 'rsvpDeadline':
      next.rsvpDeadline = value;
      break;
    case 'mealChoice':
      next.mealChoice = normalizeSparseEnumAnswer(value, ['yes', 'no'], {
        'yes': 'yes',
        'collect meal choices': 'yes',
        'ask for meal choices': 'yes',
        'need meal choices': 'yes',
        'dietary selections': 'yes',
        'dietary restrictions': 'yes',
        'no': 'no',
        'no meal choices': 'no',
        'skip meals': 'no',
        'buffet only': 'no',
      });
      break;
    case 'registryIntent':
      next.registryIntent = normalizeSparseEnumAnswer(value, ['cash', 'gifts', 'both', 'unsure', 'none-for-now'], {
        'cash': 'cash',
        'cash fund': 'cash',
        'honeymoon fund': 'cash',
        'gifts': 'gifts',
        'physical gifts': 'gifts',
        'registry gifts': 'gifts',
        'both': 'both',
        'cash and gifts': 'both',
        'honeymoon fund and gifts': 'both',
        'both please': 'both',
        'unsure': 'unsure',
        'not sure': 'unsure',
        'maybe later': 'unsure',
        'none for now': 'none-for-now',
        'no registry yet': 'none-for-now',
        'skip registry for now': 'none-for-now',
      });
      break;
    case 'story':
      next.optionalStory = normalizeSparseFreeformText(value, ['none', 'none for now', 'skip', 'skip for now', 'n/a']);
      break;
  }

  return next;
};

export const mergeClarifyingAnswer = (
  persistence: ClarifyingPersistenceEnvelope | null,
  questionId: string,
  answer: string,
) => {
  if (!persistence) return null;

  const nextAnswer = answer;
  const nextStatus: ClarifyingQuestionStatus = nextAnswer.trim() ? 'answered' : 'unresolved';
  const questions: StoredClarifyingQuestion[] = persistence.clarifying.questions.map((question) =>
    question.id === questionId
      ? { ...question, answer: nextAnswer, status: nextStatus }
      : question,
  );

  const updatedQuestion = questions.find((question) => question.id === questionId);
  const history: StoredClarifyingQuestion[] = updatedQuestion
    ? [
        ...persistence.clarifying.history.filter((question) => question.id !== questionId),
        updatedQuestion,
      ]
    : persistence.clarifying.history;

  return {
    ...persistence,
    clarifying: {
      ...persistence.clarifying,
      questions,
      history,
    },
  } satisfies ClarifyingPersistenceEnvelope;
};
