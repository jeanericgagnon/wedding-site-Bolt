export type CoordinatorTimelineWorkState = {
  activeTimelineEventId: string | null;
};

export const normalizeCoordinatorTimelineWorkState = (value: unknown): CoordinatorTimelineWorkState => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { activeTimelineEventId: null };
  }
  const parsed = value as Partial<CoordinatorTimelineWorkState>;
  return {
    activeTimelineEventId: typeof parsed.activeTimelineEventId === 'string' && parsed.activeTimelineEventId.trim().length > 0
      ? parsed.activeTimelineEventId
      : null,
  };
};
