import { createEmptyInitialSetupAnswers, type InitialSetupAnswers } from './initialSetupAnswers';

const hasValue = (value: unknown) => typeof value === 'string' ? value.trim().length > 0 : Boolean(value);

export const hasMeaningfulQuickStartAnswers = (answers: InitialSetupAnswers | null | undefined) => {
  if (!answers) return false;
  const empty = createEmptyInitialSetupAnswers();
  return (Object.keys(empty) as Array<keyof InitialSetupAnswers>).some((key) => {
    const current = answers[key];
    const baseline = empty[key];
    return hasValue(current) && current !== baseline;
  });
};

export const mergeQuickStartSeedIntoDraft = (
  draft: InitialSetupAnswers,
  seed: Partial<InitialSetupAnswers>,
): InitialSetupAnswers => {
  const base = { ...createEmptyInitialSetupAnswers(), ...draft };
  const next = { ...base };

  for (const [key, value] of Object.entries(seed) as Array<[keyof InitialSetupAnswers, InitialSetupAnswers[keyof InitialSetupAnswers]]>) {
    if (!hasValue(next[key]) && hasValue(value)) {
      (next as Record<string, unknown>)[key] = value;
    }
  }

  return next;
};
