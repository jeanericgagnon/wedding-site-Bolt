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
      ? 'Working board question'
      : boardTargetId
        ? 'Board question available'
        : activeQnaId
          ? 'Working custom question'
          : null,
  };
};
