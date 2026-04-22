export const getPublishBlockedHints = (publishValidationError?: string | null): string[] => {
  if (!publishValidationError) return [];
  const normalizedError = publishValidationError.trim();
  const normalizedErrorLower = normalizedError.toLowerCase();
  if (
    normalizedErrorLower.includes('current page has visible content')
    || normalizedErrorLower.includes('has visible sections')
    || normalizedErrorLower.includes('names are ready for guests')
    || normalizedErrorLower.includes('date is ready')
    || normalizedErrorLower.includes('venue details are ready')
    || normalizedErrorLower.includes('guests can reply')
    || normalizedErrorLower.includes('everything is saved')
    || normalizedErrorLower.includes('draft only')
    || normalizedErrorLower.includes('draft has unsaved changes')
    || normalizedErrorLower.includes('live site unchanged — you have new draft edits')
    || normalizedErrorLower.includes('live site is up to date')
  ) {
    return ['Use Fix next to move through the last blockers before the guest-facing launch.'];
  }
  if (
    normalizedErrorLower.includes('add at least one page')
    || normalizedErrorLower.includes('add a page')
    || normalizedErrorLower.includes('apply a starting design')
    || normalizedErrorLower.includes('a page exists')
    || normalizedErrorLower.includes('page ready')
    || normalizedErrorLower.includes('pages ready')
  ) {
    return [
      'Open Designs and apply a starting layout.',
      'Or add a page and turn on at least one section.',
    ];
  }
  if (
    normalizedErrorLower.includes('turn on at least one section')
    || normalizedErrorLower.includes('turn on a section')
    || normalizedErrorLower.includes('turn on section')
    || normalizedErrorLower.includes('turn on sections')
    || normalizedErrorLower.includes('turn on content for')
    || normalizedErrorLower.includes('visible sections')
    || normalizedErrorLower.includes('section is turned on')
    || normalizedErrorLower.includes('sections are turned on')
    || normalizedErrorLower.includes('section visible')
    || normalizedErrorLower.includes('sections visible')
  ) {
    return [
      'Select a section on the canvas.',
      'Turn it on in the right panel, then save and go live again.',
    ];
  }
  if (
    normalizedErrorLower.includes('partner names')
    || normalizedErrorLower.includes('couple names')
    || normalizedErrorLower.includes('couple names are filled in')
    || normalizedErrorLower.includes('names are ready for guests')
    || normalizedErrorLower.includes('both names')
    || normalizedErrorLower.includes('both partners')
  ) {
    return [
      'Open your couple details.',
      'Add both names exactly how you want guests to see them.',
    ];
  }
  if (
    normalizedErrorLower.includes('wedding date')
    || normalizedErrorLower.includes('event date')
    || normalizedErrorLower.includes('date is set')
    || normalizedErrorLower.includes('date is ready')
    || normalizedErrorLower.includes('add your date')
  ) {
    return [
      'Open event details.',
      'Add your wedding date before going live.',
    ];
  }
  if (
    normalizedErrorLower.includes('venue')
    || normalizedErrorLower.includes('location')
    || normalizedErrorLower.includes('venue details are set')
    || normalizedErrorLower.includes('venue details are ready')
  ) {
    return [
      'Add at least one venue name or address.',
      'Make sure guests can tell where they are meant to go.',
    ];
  }
  if (
    normalizedErrorLower.includes('rsvp')
    || normalizedErrorLower.includes('turn rsvp on')
    || normalizedErrorLower.includes('rsvp is turned on')
    || normalizedErrorLower.includes('guests can reply')
  ) {
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
  const normalizedTotal = Math.max(0, Math.floor(total));
  if (normalizedTotal <= 0) return 'No checks yet';

  const normalizedDone = Number.isFinite(done)
    ? Math.min(normalizedTotal, Math.max(0, Math.floor(done)))
    : 0;
  if (normalizedDone >= normalizedTotal) return 'Ready to go live';

  const remaining = normalizedTotal - normalizedDone;
  return `${remaining} thing${remaining === 1 ? '' : 's'} left before guest-facing launch`;
};

export const shouldAutoPublishFromSearch = (search: string): boolean => {
  const params = new URLSearchParams(search);
  return params.get('publishNow') === '1';
};

export const shouldOpenPhotoTipsFromSearch = (search: string): boolean => {
  const params = new URLSearchParams(search);
  return params.get('photoTips') === '1';
};
