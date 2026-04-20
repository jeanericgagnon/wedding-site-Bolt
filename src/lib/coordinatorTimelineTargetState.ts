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
      ? 'Working board event'
      : boardTargetId
        ? 'Board event available'
        : activeTimelineEventId
          ? 'Working custom event'
          : null,
  };
};
