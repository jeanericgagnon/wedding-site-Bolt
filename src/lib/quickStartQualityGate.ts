import type { InitialSetupAnswers } from './initialSetupAnswers';
import type { ClarifyingQuestionDecision, ClarifyingQuestionObject } from './aiClarifyingQuestions';

export type QuickStartQualityGateResult = {
  score: number;
  ready: boolean;
  flags: string[];
  questions: ClarifyingQuestionObject[];
};

const hasText = (value: unknown) => typeof value === 'string' && value.trim().length > 0;

const hasAnsweredFollowUpFor = (
  followUpAnswers: Record<string, string>,
  targets: string[],
) => Object.entries(followUpAnswers).some(([key, value]) => (
  targets.some((target) => key.toLowerCase().includes(target.toLowerCase()))
  && hasText(value)
));

const buildQuestion = (
  id: string,
  category: ClarifyingQuestionObject['category'],
  question: string,
  targetFields: string[],
  affectedSections: string[],
  expectedAnswerType: ClarifyingQuestionObject['expectedAnswerType'] = 'short_text',
): ClarifyingQuestionObject => ({
  id,
  category,
  question,
  expectedAnswerType,
  targetFields,
  affectedSections,
  skippable: true,
});

export const evaluateQuickStartDraftQuality = (
  answers: InitialSetupAnswers,
  followUpAnswers: Record<string, string> = {},
): QuickStartQualityGateResult => {
  const questions: ClarifyingQuestionObject[] = [];
  const flags: string[] = [];

  if (!hasText(answers.names)) flags.push('couple names');
  if (!hasText(answers.whenWhere)) flags.push('date and location');
  if (!hasText(answers.style) && !hasText(answers.guestFeel)) flags.push('site tone');

  if (
    !hasText(answers.weekendEventsRaw)
    && !hasAnsweredFollowUpFor(followUpAnswers, ['event', 'schedule', 'weekend'])
  ) {
    flags.push('event structure');
    questions.push(buildQuestion(
      'quality-event-structure',
      'event_structure',
      'What are the main moments guests should know about, even if the timing is still rough?',
      ['event.weekendEvents'],
      ['schedule', 'rsvp'],
      'multi_line',
    ));
  }

  if (
    (!hasText(answers.ceremonyArrivalTime) || !hasText(answers.rsvpDeadline))
    && !hasAnsweredFollowUpFor(followUpAnswers, ['rsvp', 'ceremony', 'arrival', 'time'])
  ) {
    flags.push('guest timing');
    questions.push(buildQuestion(
      'quality-guest-timing',
      'guest_clarity',
      'What timing should guests see first, such as ceremony arrival time or the RSVP deadline?',
      ['event.ceremonyTime', 'event.rsvpDeadline'],
      ['hero', 'schedule', 'rsvp'],
    ));
  }

  if (
    (!answers.plusOnePolicy || !answers.childrenAllowed)
    && !hasAnsweredFollowUpFor(followUpAnswers, ['plus', 'children', 'kids'])
  ) {
    flags.push('guest rules');
    questions.push(buildQuestion(
      'quality-guest-rules',
      'guest_guidance',
      'Anything guests should know about plus-ones or children before they RSVP?',
      ['guestExperience.plusOnePolicy', 'guestExperience.childrenAllowed'],
      ['faq', 'rsvp'],
    ));
  }

  if (
    !hasText(answers.venueNameOrTbd)
    && !hasAnsweredFollowUpFor(followUpAnswers, ['venue', 'travel', 'parking', 'hotel', 'shuttle'])
  ) {
    flags.push('arrival guidance');
    questions.push(buildQuestion(
      'quality-arrival-guidance',
      'guest_guidance',
      'What arrival detail would help guests most, like venue, parking, shuttle, hotel, or neighborhood?',
      ['event.venueName', 'guestGuidance.transport'],
      ['travel', 'faq'],
    ));
  }

  const criticalPenalty = Math.min(flags.length, 5) * 14;
  const answerBonus = [
    answers.names,
    answers.whenWhere,
    answers.style,
    answers.guestFeel,
    answers.weekendEventsRaw,
    answers.ceremonyArrivalTime,
    answers.rsvpDeadline,
    answers.optionalStory,
  ].filter(hasText).length * 4;
  const score = Math.max(0, Math.min(100, 72 + answerBonus - criticalPenalty));

  return {
    score,
    ready: flags.length === 0 || score >= 82,
    flags,
    questions: questions.slice(0, 3),
  };
};

export const applyQuickStartQualityGate = (
  decision: ClarifyingQuestionDecision,
  answers: InitialSetupAnswers,
  followUpAnswers: Record<string, string> = {},
  loopCount = 0,
): { decision: ClarifyingQuestionDecision; gate: QuickStartQualityGateResult } => {
  const gate = evaluateQuickStartDraftQuality(answers, followUpAnswers);
  if (decision.mode === 'ask' && decision.questions.length > 0) return { decision, gate };
  if (gate.ready || gate.questions.length === 0 || loopCount > 0) return { decision, gate };

  return {
    gate,
    decision: {
      ...decision,
      mode: 'ask',
      questions: gate.questions,
      why: [
        ...(decision.why || []),
        `Quality gate found missing ${gate.flags.slice(0, 3).join(', ')}.`,
      ],
      confidence: decision.confidence === 'high' ? 'medium' : decision.confidence,
    },
  };
};
