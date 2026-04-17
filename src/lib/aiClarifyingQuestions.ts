import { z } from 'zod';
import { OpenAiNotConfiguredError, runOpenAiStructuredPrompt } from './openai';

export type ClarifyingQuestionDecision = {
  shouldAskFollowUps: boolean;
  questions: string[];
  whyTheseQuestions?: string[];
};

export type ClarifyingQuestionInput = {
  intakeSummary: string;
  knownResolved: string[];
  knownUnresolved: string[];
  readinessSummary: string;
};

const clarifyingQuestionDecisionSchema = z.object({
  shouldAskFollowUps: z.boolean(),
  questions: z.array(z.string()).max(3).default([]),
  whyTheseQuestions: z.array(z.string()).max(3).default([]),
});

export const buildClarifyingQuestionSystemPrompt = () => `You are deciding whether a wedding website setup flow should ask any clarifying questions before generating the first draft of the site.

Your job is not to gather every missing field.
Your job is to ask only the smallest number of questions that would materially improve the final site.

Core decision rule:
- If the current intake is already coherent enough to draft a believable, useful site, ask 0 questions.
- Missing details alone are not a reason to ask follow-ups.
- Ask a question only when the answer would noticeably improve guest understanding, site usefulness, or the emotional believability of the draft.

Rules:
- Ask 0 to 3 questions maximum.
- Strongly prefer 0 or 1 question when possible.
- Only ask questions whose answers materially improve the final site.
- Prefer broader questions that improve multiple sections at once.
- Respect unresolved, tentative, or TBD details as valid.
- Do not ask for details the couple likely has not finalized yet.
- Do not ask narrow logistics cleanup when a broader framing question would do.
- Avoid trivia, biography-mining, or questions that only improve one tiny line of copy.
- Ask at most one emotional/story question.
- Only ask a story question if the site is already operationally coherent enough that emotional texture is the real missing piece.
- If guest clarity and event structure overlap, prefer the single broader question instead of asking both.
- Questions should be concise, natural, easy to answer, and okay to answer partially.

Priority order:
1. guest clarity
2. event structure
3. emotional depth
4. decision clarity
5. location meaning

Strong question patterns:
- What should guests expect from the weekend overall?
- What events are actually happening across the weekend, even if rough?
- Is there anything guests might be confused about or need extra guidance on?
- What’s one thing that feels very “you two” that you’d want reflected on the site?
- Do you want to guide guests at all on gifts or keep it open?
- Why did you pick this location?

Weak question patterns:
- overly narrow event-by-event cleanup
- asking for details the couple likely has not decided yet
- repetitive story-mining
- low-value trivia
- overlapping questions that could have been combined

Return JSON with:
- shouldAskFollowUps: boolean
- questions: string[]
- whyTheseQuestions: string[]`;

export const buildClarifyingQuestionUserPrompt = (input: ClarifyingQuestionInput) => `Current intake summary:\n${input.intakeSummary}\n\nResolved:\n${input.knownResolved.join('\n') || '- none listed'}\n\nUnresolved / TBD:\n${input.knownUnresolved.join('\n') || '- none listed'}\n\nReadiness:\n${input.readinessSummary}\n\nDecide whether we should ask any clarifying questions before drafting the site.`;

export const simulateClarifyingQuestionDecision = (input: ClarifyingQuestionInput): ClarifyingQuestionDecision => {
  const unresolved = input.knownUnresolved.join(' ').toLowerCase();
  const readiness = input.readinessSummary.toLowerCase();
  const questions: string[] = [];
  const whyTheseQuestions: string[] = [];

  const hasEventUncertainty = /event|weekend|welcome|brunch|schedule|timeline/.test(unresolved);
  const hasGuestClarityNeed = /guest|travel|local|confus|unclear|expect|guidance|faq/.test(unresolved);
  const hasGiftDecisionGap = /registry|gifts|cash|meal|plus-one/.test(unresolved);
  const mostlyReady = /strong enough|coherent|ready|believable first draft|draftable/.test(readiness);
  const onlyMinorDetailGaps = /timing details only|location details only|minor detail|small gap/.test(readiness + ' ' + unresolved);

  if (mostlyReady && onlyMinorDetailGaps && !hasGuestClarityNeed && !hasGiftDecisionGap) {
    return {
      shouldAskFollowUps: false,
      questions: [],
      whyTheseQuestions: [],
    };
  }

  if (hasGuestClarityNeed) {
    questions.push('What should guests expect from the weekend overall?');
    whyTheseQuestions.push('Improves homepage framing, FAQ usefulness, and guest guidance.');
  } else if (hasEventUncertainty) {
    questions.push('What events are actually happening across the weekend, even if rough?');
    whyTheseQuestions.push('Improves schedule, FAQ, and travel clarity without over-asking for exact details.');
  }

  if (questions.length < 3 && hasGiftDecisionGap) {
    questions.push('Do you want to guide guests at all on gifts or keep it open?');
    whyTheseQuestions.push('Improves decision clarity in guest-facing sections.');
  }

  return {
    shouldAskFollowUps: questions.length > 0,
    questions,
    whyTheseQuestions,
  };
};

export const generateClarifyingQuestionDecision = async (input: ClarifyingQuestionInput): Promise<ClarifyingQuestionDecision> => {
  try {
    return await runOpenAiStructuredPrompt({
      system: buildClarifyingQuestionSystemPrompt(),
      user: buildClarifyingQuestionUserPrompt(input),
      schemaName: 'wedding_clarifying_questions',
      schema: clarifyingQuestionDecisionSchema,
    });
  } catch (error) {
    if (error instanceof OpenAiNotConfiguredError) {
      throw error;
    }
    throw new Error(`[aiClarifyingQuestions] OpenAI clarifying-question generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};
