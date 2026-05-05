export type ClarifyingQuestionStatus = 'pending' | 'answered' | 'skipped' | 'unresolved';

export type StoredClarifyingQuestion = {
  id: string;
  category: string;
  question: string;
  expectedAnswerType: string;
  targetFields: string[];
  affectedSections: string[];
  skippable: boolean;
  round: number;
  status: ClarifyingQuestionStatus;
  answer: string;
};

export type ClarifyingDraftOutputs = {
  hero?: {
    headline?: string;
    subheadline?: string;
    toneNote?: string;
  };
  schedule?: {
    intro?: string;
    eventSummary?: string;
  };
  faq?: {
    guidance?: string[];
  };
  travel?: {
    intro?: string;
  };
  story?: {
    intro?: string;
  };
  guestGuidance?: {
    dressCode?: string;
    children?: string;
    lodging?: string;
    transport?: string;
  };
  siteTone?: {
    summary?: string;
  };
};

export type ClarifyingPersistenceEnvelope = {
  clarifying: {
    mode: 'ask' | 'draft';
    questions: StoredClarifyingQuestion[];
    history: StoredClarifyingQuestion[];
  };
  draftOutputs: ClarifyingDraftOutputs;
  meta?: {
    qualityScore?: number;
    confidence?: 'low' | 'medium' | 'high';
    loopCount?: number;
    maxLoopCount?: number;
    fallbackUsed?: boolean;
  };
};

export const createEmptyClarifyingPersistence = (): ClarifyingPersistenceEnvelope => ({
  clarifying: {
    mode: 'ask',
    questions: [],
    history: [],
  },
  draftOutputs: {},
});
