export const getPublishBlockedHints = (publishValidationError?: string | null): string[] => {
  if (!publishValidationError) return [];
  const normalizedError = publishValidationError.trim();
  const normalizedErrorLower = normalizedError.toLowerCase();
  if (normalizedErrorLower.includes('page')) {
    return [
      'Open Designs and apply a starting layout.',
      'Or add a page and turn on at least one section.',
    ];
  }
  if (normalizedErrorLower.includes('turn on at least one section') || normalizedErrorLower.includes('turn on a section')) {
    return [
      'Select a section on the canvas.',
      'Turn it on in the right panel, then save and go live again.',
    ];
  }
  if (normalizedErrorLower.includes('partner names') || normalizedErrorLower.includes('both names')) {
    return [
      'Open your couple details.',
      'Add both names exactly how you want guests to see them.',
    ];
  }
  if (normalizedErrorLower.includes('wedding date')) {
    return [
      'Open event details.',
      'Add your wedding date before going live.',
    ];
  }
  if (normalizedErrorLower.includes('venue')) {
    return [
      'Add at least one venue name or address.',
      'Make sure guests can tell where they are meant to go.',
    ];
  }
  if (normalizedErrorLower.includes('rsvp') || normalizedErrorLower.includes('turn rsvp on')) {
    return [
      'Turn RSVP back on before going live.',
      'If you are not collecting replies yet, remove RSVP calls to action first.',
    ];
  }
  return ['Use Fix next to move through the last blockers before the guest-facing launch.'];
};

export const getPublishCtaLabel = (isPublished: boolean): string =>
  isPublished ? 'Update guest-facing site' : 'Go live';

export const getPublishStatusLabel = (isPublished: boolean, hasUnsavedChanges: boolean): string => {
  if (!isPublished && hasUnsavedChanges) return 'Draft has unsaved changes';
  if (!isPublished) return 'Draft only';
  if (hasUnsavedChanges) return 'Live site unchanged — you have new draft edits';
  return 'Live site is up to date';
};

export const getPublishProgressLabel = (done: number, total: number): string => {
  if (!Number.isFinite(total) || total <= 0) return 'No checks yet';
  const normalizedDone = Number.isFinite(done) ? Math.max(0, done) : 0;
  if (normalizedDone >= total) return 'Ready to go live';
  return `${total - normalizedDone} thing${total - normalizedDone === 1 ? '' : 's'} left before guest-facing launch`;
};

export const shouldAutoPublishFromSearch = (search: string): boolean => {
  const params = new URLSearchParams(search);
  return params.get('publishNow') === '1';
};

export const shouldOpenPhotoTipsFromSearch = (search: string): boolean => {
  const params = new URLSearchParams(search);
  return params.get('photoTips') === '1';
};
