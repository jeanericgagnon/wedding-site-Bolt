export const getCoordinatorQnaTargetState = ({
  boardTargetId,
  activeQnaId,
}: {
  boardTargetId: string | null;
  activeQnaId: string | null;
}) => {
  const isBoardTargetActive = !!boardTargetId && boardTargetId === activeQnaId;

  return {
    boardTargetId,
    activeQnaId,
    isBoardTargetActive,
    label: isBoardTargetActive
      ? 'Suggested question in progress'
      : boardTargetId
        ? 'Suggested question waiting'
        : activeQnaId
          ? 'Selected question in progress'
          : null,
  };
};
