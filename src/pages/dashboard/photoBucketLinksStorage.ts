export const PHOTO_BUCKET_LINKS_STORAGE_KEY = 'dayof.photoBucketLinks';
export const LEGACY_PHOTO_BUCKET_LINKS_STORAGE_KEY = 'dayof.photoAlbumLinks';

const parseStoredPhotoBucketLinks = (raw: string | null): Record<string, string> => {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const readStoredPhotoBucketLinks = (): Record<string, string> => {
  const nextLinks = parseStoredPhotoBucketLinks(localStorage.getItem(PHOTO_BUCKET_LINKS_STORAGE_KEY));
  if (Object.keys(nextLinks).length > 0) return nextLinks;
  return parseStoredPhotoBucketLinks(localStorage.getItem(LEGACY_PHOTO_BUCKET_LINKS_STORAGE_KEY));
};

export const readStoredPhotoBucketLinkList = (): string[] =>
  Object.values(readStoredPhotoBucketLinks()).filter((value): value is string => typeof value === 'string' && value.length > 0);

export const writeStoredPhotoBucketLinks = (value: Record<string, string>) => {
  const serialized = JSON.stringify(value);

  try {
    localStorage.setItem(PHOTO_BUCKET_LINKS_STORAGE_KEY, serialized);
  } catch {
    // ignore
  }

  try {
    localStorage.setItem(LEGACY_PHOTO_BUCKET_LINKS_STORAGE_KEY, serialized);
  } catch {
    // ignore
  }
};
