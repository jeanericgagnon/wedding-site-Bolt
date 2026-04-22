import type { InitialSetupAnswers } from './initialSetupAnswers';
import type { ClarifyingPersistenceEnvelope, ClarifyingQuestionStatus, StoredClarifyingQuestion } from './aiClarifyingPersistence';

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
    case 'partnerLabels':
      if (normalizedDelimitedValue === 'bride|groom') next.labelPreference = 'bride-groom';
      else if (normalizedDelimitedValue === 'bride|bride') next.labelPreference = 'bride-bride';
      else if (normalizedDelimitedValue === 'groom|groom') next.labelPreference = 'groom-groom';
      else next.labelPreference = 'names-only';
      break;
    case 'venueLocation':
      next.whenWhere = value;
      break;
    case 'venueName':
      next.venueNameOrTbd = value;
      break;
    case 'theme':
      next.style = value;
      break;
    case 'guestFeel':
      next.guestFeel = value;
      break;
    case 'weekendEvents':
      next.weekendEventsRaw = value;
      break;
    case 'ceremonyTime':
      next.ceremonyArrivalTime = value;
      break;
    case 'guestCount':
      next.guestCountBand = normalizedLowerValue as InitialSetupAnswers['guestCountBand'];
      break;
    case 'plusOnePolicy':
      next.plusOnePolicy = normalizedLowerValue as InitialSetupAnswers['plusOnePolicy'];
      break;
    case 'childrenAllowed':
      next.childrenAllowed = normalizedLowerValue as InitialSetupAnswers['childrenAllowed'];
      break;
    case 'rsvpDeadline':
      next.rsvpDeadline = value;
      break;
    case 'mealChoice':
      next.mealChoice = normalizedLowerValue as InitialSetupAnswers['mealChoice'];
      break;
    case 'registryIntent':
      next.registryIntent = normalizedLowerValue as InitialSetupAnswers['registryIntent'];
      break;
    case 'story':
      next.optionalStory = value;
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
