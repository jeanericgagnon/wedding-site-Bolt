import type { StoredClarifyingQuestion } from './aiClarifyingPersistence';

export type ClarifyingFieldPatch = Record<string, string | string[]>;

export const mapClarifyingAnswerToFieldPatch = (question: StoredClarifyingQuestion): ClarifyingFieldPatch => {
  if (!question.answer.trim()) return {};

  const patch: ClarifyingFieldPatch = {};
  for (const field of question.targetFields) {
    patch[field] = question.answer;
  }
  return patch;
};

export const mergeClarifyingFieldPatches = (patches: ClarifyingFieldPatch[]): ClarifyingFieldPatch => {
  return patches.reduce<ClarifyingFieldPatch>((acc, patch) => {
    for (const [key, value] of Object.entries(patch)) {
      acc[key] = value;
    }
    return acc;
  }, {});
};
