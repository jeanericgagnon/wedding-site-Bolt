import { supabase } from './supabase';
import type { InitialSetupAnswers } from './initialSetupAnswers';
import type { ClarifyingQuestionDecision } from './aiClarifyingQuestions';
import type { ClarifyingPersistenceEnvelope, StoredClarifyingQuestion } from './aiClarifyingPersistence';
import { applyQuickStartQualityGate } from './quickStartQualityGate';

type OrchestratorResponse = ClarifyingQuestionDecision & {
  success?: boolean;
  qualityScore?: number;
  loopCount?: number;
  maxLoopCount?: number;
  fallbackUsed?: boolean;
};

const normalizeDecision = (value: OrchestratorResponse): ClarifyingQuestionDecision => ({
  mode: value.mode === 'ask' ? 'ask' : 'draft',
  questions: Array.isArray(value.questions) ? value.questions.slice(0, 3) : [],
  draftOutputs: value.draftOutputs || undefined,
  why: Array.isArray(value.why) ? value.why : [],
  confidence: value.confidence === 'high' || value.confidence === 'medium' || value.confidence === 'low' ? value.confidence : 'medium',
});

export async function runOnboardingAiOrchestration(input: {
  answers: InitialSetupAnswers;
  clarifyingState?: ClarifyingPersistenceEnvelope | null;
  followUpAnswers?: Record<string, string>;
  loopCount?: number;
  siteId?: string | null;
}): Promise<{ decision: ClarifyingQuestionDecision; meta: OrchestratorResponse }> {
  const previousQuestions: StoredClarifyingQuestion[] = [
    ...(input.clarifyingState?.clarifying.questions ?? []),
    ...(input.clarifyingState?.clarifying.history ?? []),
  ];

  const { data, error } = await supabase.functions.invoke('onboarding-ai-orchestrate', {
    body: {
      answers: input.answers,
      previousQuestions,
      followUpAnswers: input.followUpAnswers ?? {},
      loopCount: input.loopCount ?? 0,
      siteId: input.siteId || undefined,
    },
  });

  if (error) throw error;

  const meta = (data || {}) as OrchestratorResponse;
  const gated = applyQuickStartQualityGate(
    normalizeDecision(meta),
    input.answers,
    input.followUpAnswers ?? {},
    input.loopCount ?? 0,
  );

  return {
    decision: gated.decision,
    meta: {
      ...meta,
      qualityScore: typeof meta.qualityScore === 'number' ? Math.min(meta.qualityScore, gated.gate.score) : gated.gate.score,
    },
  };
}
