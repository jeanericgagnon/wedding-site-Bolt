export const clampQuickStartQuestionIndex = (index: number, questionCount: number) => {
  if (!Number.isFinite(index) || !Number.isInteger(index) || !Number.isSafeInteger(index) || questionCount <= 0) {
    return 0;
  }

  return Math.min(Math.max(0, index), questionCount - 1);
};
