export type CoordinatorActiveWorkState = {
  activeQnaId: string | null;
};

export const normalizeCoordinatorActiveWorkState = (value: unknown): CoordinatorActiveWorkState => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { activeQnaId: null };
  }
  const parsed = value as Partial<CoordinatorActiveWorkState>;
  return {
    activeQnaId: typeof parsed.activeQnaId === 'string' && parsed.activeQnaId.trim().length > 0 ? parsed.activeQnaId : null,
  };
};
