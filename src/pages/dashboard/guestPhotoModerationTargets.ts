export type GuestPhotoModerationUpload = {
  id: string;
  is_hidden: boolean;
  is_flagged: boolean;
};

export type GuestPhotoModerationFilters = {
  showHidden: boolean;
  showFlaggedOnly: boolean;
};

export type GuestPhotoModerationAction =
  | { type: 'flag'; flagged: boolean }
  | { type: 'hide'; hidden: boolean };

export const getVisibleGuestPhotoUploads = <T extends GuestPhotoModerationUpload>(
  uploads: T[],
  filters: GuestPhotoModerationFilters,
): T[] =>
  uploads.filter((upload) => (filters.showHidden || !upload.is_hidden) && (!filters.showFlaggedOnly || upload.is_flagged));

export const getBulkGuestPhotoModerationTargets = <T extends GuestPhotoModerationUpload>(
  uploads: T[],
  filters: GuestPhotoModerationFilters,
  action: GuestPhotoModerationAction,
): T[] => {
  const visibleUploads = getVisibleGuestPhotoUploads(uploads, filters);

  if (action.type === 'flag') {
    return visibleUploads.filter((upload) => upload.is_flagged !== action.flagged);
  }

  return visibleUploads.filter((upload) => upload.is_hidden !== action.hidden);
};
