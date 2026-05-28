import { afterEach, describe, expect, it } from 'vitest';

import {
  LEGACY_PHOTO_BUCKET_LINKS_STORAGE_KEY,
  PHOTO_BUCKET_LINKS_STORAGE_KEY,
  readStoredPhotoBucketLinkList,
  readStoredPhotoBucketLinks,
  writeStoredPhotoBucketLinks,
} from './photoBucketLinksStorage';

describe('photoBucketLinksStorage', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('reads the current storage key first', () => {
    localStorage.setItem(PHOTO_BUCKET_LINKS_STORAGE_KEY, JSON.stringify({ a: 'https://new.example/a' }));
    localStorage.setItem(LEGACY_PHOTO_BUCKET_LINKS_STORAGE_KEY, JSON.stringify({ b: 'https://old.example/b' }));

    expect(readStoredPhotoBucketLinks()).toEqual({ a: 'https://new.example/a' });
  });

  it('falls back to the legacy storage key when the new key is empty', () => {
    localStorage.setItem(LEGACY_PHOTO_BUCKET_LINKS_STORAGE_KEY, JSON.stringify({ b: 'https://old.example/b' }));

    expect(readStoredPhotoBucketLinks()).toEqual({ b: 'https://old.example/b' });
    expect(readStoredPhotoBucketLinkList()).toEqual(['https://old.example/b']);
  });

  it('writes both the current and legacy storage keys for continuity', () => {
    writeStoredPhotoBucketLinks({ a: 'https://new.example/a' });

    expect(localStorage.getItem(PHOTO_BUCKET_LINKS_STORAGE_KEY)).toBe(JSON.stringify({ a: 'https://new.example/a' }));
    expect(localStorage.getItem(LEGACY_PHOTO_BUCKET_LINKS_STORAGE_KEY)).toBe(JSON.stringify({ a: 'https://new.example/a' }));
  });
});
