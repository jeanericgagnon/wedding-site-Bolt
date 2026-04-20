export const getCoordinatorActiveTargetLabel = (kind: 'guest' | 'timeline' | 'qna' | 'alert') => {
  switch (kind) {
    case 'guest':
      return 'Active guest';
    case 'timeline':
      return 'Active event';
    case 'qna':
      return 'Active question';
    case 'alert':
      return 'Active alert lane';
    default:
      return 'Active target';
  }
};
