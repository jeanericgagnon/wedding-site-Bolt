export const getPublishBlockedHints = (publishValidationError?: string | null): string[] => {
  if (!publishValidationError) return [];
  if (publishValidationError.includes('page')) {
    return ['Open Templates and apply a starter layout.', 'Or add a page/section from the Add panel.'];
  }
  if (publishValidationError.includes('Enable at least one section')) {
    return ['Select any section on canvas.', 'Enable it in the inspector panel.'];
  }
  if (publishValidationError.includes('partner names')) {
    return ['Open couple details.', 'Fill both partner names exactly as you want them shown.'];
  }
  if (publishValidationError.includes('wedding date')) {
    return ['Open event settings.', 'Set the wedding date before publishing.'];
  }
  if (publishValidationError.includes('venue')) {
    return ['Add at least one venue name or address.', 'Confirm the venue appears in your details section.'];
  }
  if (publishValidationError.includes('Enable RSVP')) {
    return ['Turn RSVP back on in settings.', 'Or remove RSVP CTAs if you are not collecting responses yet.'];
  }
  return ['Use Fix blockers to jump to the right place.'];
};

export const shouldAutoPublishFromSearch = (search: string): boolean => {
  const params = new URLSearchParams(search);
  return params.get('publishNow') === '1';
};

export const shouldOpenPhotoTipsFromSearch = (search: string): boolean => {
  const params = new URLSearchParams(search);
  return params.get('photoTips') === '1';
};
