const NON_BLOCKING_PUBLISH_COPY = new Set([
  'current page',
  'current page has visible content',
  'at least one section is turned on',
  'a page exists',
  'couple names are filled in',
  'names are ready for guests',
  'wedding date is set',
  'date is ready',
  'venue details are set',
  'venue details are ready',
  'rsvp is turned on',
  'guests can reply',
  'latest edits are saved',
  'everything is saved',
  'ready to go live',
  'no checks yet',
  'draft only',
  'live site unchanged',
  'live site unchanged — you have new draft edits',
  'live site is up to date',
  'guest-facing site',
  'go live',
  'update guest-facing site',
]);

const isNonBlockingPublishCopy = (normalizedErrorLower: string): boolean => {
  const normalizedStatusCopy = normalizedErrorLower.replace(/[.!?]+$/g, '');
  if (NON_BLOCKING_PUBLISH_COPY.has(normalizedStatusCopy)) return true;
  if (/^.+ has visible sections\.?$/.test(normalizedErrorLower)) return true;
  if (/^\d+ sections? visible\.?$/.test(normalizedErrorLower)) return true;
  if (/^\d+ pages? ready\.?$/.test(normalizedErrorLower)) return true;
  if (/^\d+ things? left before guest-facing launch\.?$/.test(normalizedErrorLower)) return true;
  if (/^draft has unsaved changes[.!?]*$/.test(normalizedErrorLower)) return true;
  if (/^live site unchanged(?: — you have new draft edits)?[.!?]*$/.test(normalizedErrorLower)) return true;
  return false;
};

export const getPublishBlockedHints = (publishValidationError?: string | null): string[] => {
  if (!publishValidationError) return [];
  const normalizedError = publishValidationError.trim();
  const normalizedErrorLower = normalizedError.toLowerCase();
  if (isNonBlockingPublishCopy(normalizedErrorLower)) {
    return ['Use Fix next to move through the last blockers before the guest-facing launch.'];
  }
  if (
    normalizedErrorLower.includes('add at least one page')
    || normalizedErrorLower.includes('add a page')
    || normalizedErrorLower.includes('apply a starting design')
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
  ) {
    return [
      'Select a section on the canvas.',
      'Turn it on in the right panel, then save and go live again.',
    ];
  }
  if (
    normalizedErrorLower.includes('partner names')
    || normalizedErrorLower.includes('couple names')
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
    || normalizedErrorLower.includes('add your date')
  ) {
    return [
      'Open event details.',
      'Add your wedding date before going live.',
    ];
  }
  if (
    normalizedErrorLower.includes('add at least one venue name or address')
    || normalizedErrorLower.includes('add at least one venue')
    || normalizedErrorLower.includes('venue name or address')
    || normalizedErrorLower.includes('venue address')
    || normalizedErrorLower.includes('venue')
    || normalizedErrorLower.includes('location')
  ) {
    return [
      'Add at least one venue name or address.',
      'Make sure guests can tell where they are meant to go.',
    ];
  }
  if (normalizedErrorLower.includes('save your latest draft changes before going live')) {
    return [
      'Save your draft before trying again.',
      'Then re-open publish and review the remaining checks.',
    ];
  }
  if (
    normalizedErrorLower.includes('rsvp')
    || normalizedErrorLower.includes('turn rsvp on')
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
