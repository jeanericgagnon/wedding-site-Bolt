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
  'all changes saved',
  'ready for final share review',
  'no checks yet',
  'draft only',
  'live site unchanged',
  'live site unchanged - you have new draft edits',
  'live site is up to date',
  'guest-facing site',
  'go live',
  'update guest-facing site',
]);

const normalizePublishCopyForMatch = (value: string) =>
  value
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,:;!?]+$/g, '');

const normalizePublishErrorForMatch = (value: string) =>
  value
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const isNonBlockingPublishCopy = (normalizedErrorLower: string): boolean => {
  const normalizedStatusCopy = normalizePublishCopyForMatch(normalizedErrorLower);
  if (NON_BLOCKING_PUBLISH_COPY.has(normalizedStatusCopy)) return true;
  if (/^.+ has visible sections$/.test(normalizedStatusCopy)) return true;
  if (/^\d+ sections? visible$/.test(normalizedStatusCopy)) return true;
  if (/^\d+ pages? ready$/.test(normalizedStatusCopy)) return true;
  if (/^\d+ things? left before guest-facing launch$/.test(normalizedStatusCopy)) return true;
  if (/^draft has unsaved changes$/.test(normalizedStatusCopy)) return true;
  if (/^live site unchanged(?: — you have new draft edits)?$/.test(normalizedStatusCopy)) return true;
  if (/^guest-facing site$/.test(normalizedStatusCopy)) return true;
  return false;
};

export const getPublishBlockedHints = (publishValidationError?: string | null): string[] => {
  if (!publishValidationError) return [];
  const normalizedError = publishValidationError.trim();
  const normalizedErrorLower = normalizePublishErrorForMatch(normalizedError);
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
      'Turn it on in the right panel, then save and review the guest-facing draft again.',
    ];
  }
  if (
    normalizedErrorLower.includes('add both partner names')
    || normalizedErrorLower.includes('add both couple names')
    || normalizedErrorLower.includes('add both names')
    || normalizedErrorLower.includes('add both partners')
    || normalizedErrorLower.includes('partner names exactly how you want')
    || normalizedErrorLower.includes('couple names exactly how you want')
    || normalizedErrorLower.includes('names exactly how you want')
    || normalizedErrorLower.includes('names exactly as you want')
    || normalizedErrorLower.includes('partner names exactly how you want them shown')
    || normalizedErrorLower.includes('couple names exactly how you want them shown')
    || normalizedErrorLower.includes('both partner names exactly how you want')
    || normalizedErrorLower.includes('both couple names exactly how you want')
    || normalizedErrorLower.includes('both names exactly how you want')
    || normalizedErrorLower.includes('add both names exactly how you want')
  ) {
    return [
      'Open your couple details.',
      'Add both names exactly how you want guests to see them.',
    ];
  }
  if (
    normalizedErrorLower.includes('add your wedding date')
    || normalizedErrorLower.includes('add your event date')
    || normalizedErrorLower.includes('add your date')
    || normalizedErrorLower.includes('set your wedding date')
    || normalizedErrorLower.includes('set your event date')
    || normalizedErrorLower.includes('set your date')
    || normalizedErrorLower.includes('choose your wedding date')
    || normalizedErrorLower.includes('choose your event date')
    || normalizedErrorLower.includes('choose your date')
    || normalizedErrorLower.includes('wedding date before going live')
    || normalizedErrorLower.includes('event date before going live')
  ) {
    return [
      'Open event details.',
      'Add your wedding date before sharing with guests.',
    ];
  }
  if (
    normalizedErrorLower.includes('add at least one venue name or address')
    || normalizedErrorLower.includes('set at least one venue name or address')
    || normalizedErrorLower.includes('add at least one venue')
    || normalizedErrorLower.includes('venue name or address')
    || normalizedErrorLower.includes('venue name is still missing')
    || normalizedErrorLower.includes('venue address')
    || normalizedErrorLower.includes('venue details missing')
    || normalizedErrorLower.includes('add at least one location')
  ) {
    return [
      'Add at least one venue name or address.',
      'Make sure guests can tell where they are meant to go.',
    ];
  }
  if (
    normalizedErrorLower.includes('save your latest draft changes before going live')
    || normalizedErrorLower.includes('save your latest changes before going live')
  ) {
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
      'Turn RSVP back on before sharing with guests.',
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
  if (normalizedDone >= normalizedTotal) return 'Ready for final share review';

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
