export type CoordinatorGuestWorkState = {
  activeGuestId: string | null;
};

export const normalizeCoordinatorGuestWorkState = (value: unknown): CoordinatorGuestWorkState => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { activeGuestId: null };
  }
  const parsed = value as Partial<CoordinatorGuestWorkState>;
  return {
    activeGuestId: typeof parsed.activeGuestId === 'string' && parsed.activeGuestId.trim().length > 0
      ? parsed.activeGuestId
      : null,
  };
};
