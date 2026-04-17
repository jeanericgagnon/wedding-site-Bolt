import { z } from 'zod';
import { isOpenAiConfigured, runOpenAiStructuredPrompt } from './openai';

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

export const buildClarifyingQuestionSystemPrompt = () => `You are helping decide whether a wedding website setup flow should ask any clarifying questions before drafting the site.

Your job is not to collect every missing detail.
Your job is to identify whether any missing information would materially improve the final site.

Rules:
- Ask 0 to 3 questions maximum.
- If the current information is already strong enough to build a believable first draft, ask 0 questions.
- Only ask questions whose answers would materially improve the site.
- Prefer questions that improve multiple sections at once.
- Respect unresolved or TBD details as valid.
- Do not ask for details the couple likely has not finalized yet.
- Avoid trivia, biography-mining, or low-value cleanup.
- If asking about events, batch them cleanly.
- Questions should be concise, natural, and skippable when relevant.

Priority order:
1. guest clarity
2. event structure
3. emotional depth
4. decision clarity
5. location meaning

Return JSON with:
- shouldAskFollowUps: boolean
- questions: string[]
- whyTheseQuestions: string[]`;

export const buildClarifyingQuestionUserPrompt = (input: ClarifyingQuestionInput) => `Current intake summary:\n${input.intakeSummary}\n\nResolved:\n${input.knownResolved.join('\n') || '- none listed'}\n\nUnresolved / TBD:\n${input.knownUnresolved.join('\n') || '- none listed'}\n\nReadiness:\n${input.readinessSummary}\n\nDecide whether we should ask any clarifying questions before drafting the site.`;

export const fallbackClarifyingQuestionDecision = (input: ClarifyingQuestionInput): ClarifyingQuestionDecision => {
  const unresolved = input.knownUnresolved.join(' ').toLowerCase();
  const questions: string[] = [];
  const whyTheseQuestions: string[] = [];

  if (/event|weekend|welcome|brunch|schedule/.test(unresolved)) {
    questions.push('What events are actually happening across the weekend, even if rough?');
    whyTheseQuestions.push('Improves schedule, FAQ, and travel clarity.');
  }

  if (questions.length < 3 && /guest|travel|local|confus|unclear/.test(unresolved)) {
    questions.push('What should guests expect from the weekend overall?');
    whyTheseQuestions.push('Improves homepage tone, FAQ usefulness, and guest guidance.');
  }

  if (questions.length < 3 && /registry|gifts|cash|meal|plus-one/.test(unresolved)) {
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
  if (!isOpenAiConfigured()) {
    return fallbackClarifyingQuestionDecision(input);
  }

  try {
    return await runOpenAiStructuredPrompt({
      system: buildClarifyingQuestionSystemPrompt(),
      user: buildClarifyingQuestionUserPrompt(input),
      schemaName: 'wedding_clarifying_questions',
      schema: clarifyingQuestionDecisionSchema,
    });
  } catch (error) {
    console.warn('[aiClarifyingQuestions] falling back to deterministic clarifying-question decision', error);
    return fallbackClarifyingQuestionDecision(input);
  }
};
