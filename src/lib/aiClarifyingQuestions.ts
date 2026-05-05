import { z } from 'zod';
import { OpenAiNotConfiguredError, runOpenAiStructuredPrompt } from './openai';

export type ClarifyingQuestionObject = {
  id: string;
  category: 'guest_clarity' | 'event_structure' | 'emotional_depth' | 'location_meaning' | 'guest_guidance';
  question: string;
  expectedAnswerType: 'short_text' | 'multi_line';
  targetFields: string[];
  affectedSections: string[];
  skippable: boolean;
};

export type ClarifyingDraftOutputs = {
  hero: {
    headline: string;
    subheadline: string;
    toneNote: string;
  };
  schedule: {
    intro: string;
    eventSummary: string;
  };
  faq: {
    guidance: string[];
  };
  travel: {
    intro: string;
  };
  story: {
    intro: string;
  };
  guestGuidance: {
    dressCode: string;
    children: string;
    lodging: string;
    transport: string;
  };
  siteTone: {
    summary: string;
  };
};

export type ClarifyingQuestionDecision = {
  mode: 'ask' | 'draft';
  questions: ClarifyingQuestionObject[];
  draftOutputs?: ClarifyingDraftOutputs;
  why: string[];
  confidence: 'low' | 'medium' | 'high';
};

export type ClarifyingQuestionInput = {
  intakeSummary: string;
  knownResolved: string[];
  knownUnresolved: string[];
  readinessSummary: string;
};

const clarifyingQuestionObjectSchema = z.object({
  id: z.string(),
  category: z.enum(['guest_clarity', 'event_structure', 'emotional_depth', 'location_meaning', 'guest_guidance']),
  question: z.string(),
  expectedAnswerType: z.enum(['short_text', 'multi_line']),
  targetFields: z.array(z.string()),
  affectedSections: z.array(z.string()),
  skippable: z.boolean(),
});

const clarifyingDraftOutputsSchema = z.object({
  hero: z.object({
    headline: z.string().default(''),
    subheadline: z.string().default(''),
    toneNote: z.string().default(''),
  }),
  schedule: z.object({
    intro: z.string().default(''),
    eventSummary: z.string().default(''),
  }),
  faq: z.object({
    guidance: z.array(z.string()).default([]),
  }),
  travel: z.object({
    intro: z.string().default(''),
  }),
  story: z.object({
    intro: z.string().default(''),
  }),
  guestGuidance: z.object({
    dressCode: z.string().default(''),
    children: z.string().default(''),
    lodging: z.string().default(''),
    transport: z.string().default(''),
  }),
  siteTone: z.object({
    summary: z.string().default(''),
  }),
});

const clarifyingQuestionDecisionSchema = z.object({
  mode: z.enum(['ask', 'draft']),
  questions: z.array(clarifyingQuestionObjectSchema).max(3).default([]),
  draftOutputs: z.union([clarifyingDraftOutputsSchema, z.null()]),
  why: z.array(z.string()).default([]),
  confidence: z.enum(['low', 'medium', 'high']).default('medium'),
});

export const buildClarifyingQuestionSystemPrompt = () => `You are deciding whether a wedding website setup flow should ask clarifying questions before generating the first draft of the site.

You must do one of two things:
1. ask a very small number of high-value, structured clarifying questions
2. return draft-ready structured website outputs if the intake is already strong enough

Your job is not to gather every missing field.
Your job is to do the minimum work needed to produce a better website.

Core decision rule:
- If the current intake already supports a clear, useful, believable site, return mode = draft.
- Ask questions only when the answer would materially improve guest clarity, site usefulness, emotional believability, or operational guidance.
- Missing details alone are not enough to justify a question.
- Do not ask a question just because the site could be a little nicer.
- Do not ask registry, gift, or gift-guidance questions in this phase.

Ask mode rules:
- Ask 0 to 3 questions maximum.
- Strongly prefer 0 or 1 when possible.
- Every question must be structured and mappable.
- Prefer broader questions that improve multiple sections at once.
- Respect unresolved or TBD details as valid.
- If the event list is already clear enough and the site is already useful, do not ask a broad guest-expectation question.
- Ask at most one emotional-depth question.
- Prefer guest-facing tone questions over relationship-story questions.

Draft mode rules:
- If mode = draft, return usable section-ready outputs.
- Outputs should be good enough to map into templates.
- Do not leave draftOutputs empty when mode = draft.

Priority order:
1. guest clarity
2. event structure
3. emotional depth
4. location meaning
5. guest guidance

Strong question patterns:
- What events are actually happening across the weekend, even if rough?
- What should guests expect from the weekend overall?
- Is there anything guests might be confused about or need extra guidance on?
- What should guests understand right away about the kind of wedding this is?
- Why did you pick this location?
- What should guests know about dress code or whether children are welcome?

Return JSON matching the schema exactly.`;

export const buildClarifyingQuestionUserPrompt = (input: ClarifyingQuestionInput) => `Current intake summary:\n${input.intakeSummary}\n\nResolved:\n${input.knownResolved.join('\n') || '- none listed'}\n\nUnresolved / TBD:\n${input.knownUnresolved.join('\n') || '- none listed'}\n\nReadiness:\n${input.readinessSummary}\n\nDecide whether to ask structured clarifying questions or return draft-ready outputs.`;

export const generateClarifyingQuestionDecision = async (input: ClarifyingQuestionInput): Promise<ClarifyingQuestionDecision> => {
  try {
    const result = await runOpenAiStructuredPrompt({
      system: buildClarifyingQuestionSystemPrompt(),
      user: buildClarifyingQuestionUserPrompt(input),
      schemaName: 'wedding_clarifying_questions_v2',
      schema: clarifyingQuestionDecisionSchema,
    });

    return {
      ...result,
      draftOutputs: result.draftOutputs ?? undefined,
    };
  } catch (error) {
    if (error instanceof OpenAiNotConfiguredError) {
      throw error;
    }
    throw new Error('Clarifying-question generation failed. Please use the deterministic setup flow.');
  }
};
