export const getCoordinatorTimelineBoardTargetId = ({
  liveEventId,
  upNextEventId,
}: {
  liveEventId: string | null;
  upNextEventId: string | null;
}) => liveEventId ?? upNextEventId ?? null;

export const getCoordinatorTimelineTargetState = ({
  boardTargetId,
  activeTimelineEventId,
}: {
  boardTargetId: string | null;
  activeTimelineEventId: string | null;
}) => {
  const isBoardTargetActive = !!boardTargetId && boardTargetId === activeTimelineEventId;

  return {
    boardTargetId,
    activeTimelineEventId,
    isBoardTargetActive,
    label: isBoardTargetActive
      ? 'Suggested event in progress'
      : boardTargetId
        ? 'Suggested event waiting'
        : activeTimelineEventId
          ? 'Selected event in progress'
          : null,
  };
};
