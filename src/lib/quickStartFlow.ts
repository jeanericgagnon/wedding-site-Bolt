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
  | 'story';

export const applyQuickStartAnswer = (
  answers: InitialSetupAnswers,
  questionKey: ConciergeQuestion,
  rawValue: string,
): InitialSetupAnswers => {
  const value = rawValue.trim();
  const next = { ...answers };

  switch (questionKey) {
    case 'partnerNames':
      next.names = value;
      break;
    case 'partnerLabels':
      if (value === 'bride|groom') next.labelPreference = 'bride-groom';
      else if (value === 'bride|bride') next.labelPreference = 'bride-bride';
      else if (value === 'groom|groom') next.labelPreference = 'groom-groom';
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
      next.guestCountBand = value as InitialSetupAnswers['guestCountBand'];
      break;
    case 'plusOnePolicy':
      next.plusOnePolicy = value as InitialSetupAnswers['plusOnePolicy'];
      break;
    case 'childrenAllowed':
      next.childrenAllowed = value as InitialSetupAnswers['childrenAllowed'];
      break;
    case 'rsvpDeadline':
      next.rsvpDeadline = value;
      break;
    case 'mealChoice':
      next.mealChoice = value as InitialSetupAnswers['mealChoice'];
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
