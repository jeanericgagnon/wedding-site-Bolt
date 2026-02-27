export const getPublishBlockedHints = (publishValidationError?: string | null): string[] => {
  if (!publishValidationError) return [];
  if (publishValidationError.includes('page')) {
    return ['Open Templates and apply a starter layout.', 'Or add a page/section from the Add panel.'];
  }
  if (publishValidationError.includes('Enable at least one section')) {
    return ['Select any section on canvas.', 'Enable it in the inspector panel.'];
  }
  return ['Use Fix blockers to jump to the right place.'];
};

export const shouldAutoPublishFromSearch = (search: string): boolean => {
  const params = new URLSearchParams(search);
  return params.get('publishNow') === '1';
};
