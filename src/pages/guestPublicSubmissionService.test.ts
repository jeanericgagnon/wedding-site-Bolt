import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  callGuestContactFunction,
  hasGuestPublicSubmissionRuntime,
  submitGuestbookEntry,
  uploadGuestPhotos,
} from './guestPublicSubmissionService';

describe('guestPublicSubmissionService', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('exposes guest public runtime state', () => {
    expect(hasGuestPublicSubmissionRuntime()).toBe(true);
  });

  it('uploads guest photos through the shared service', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ uploaded: [{ name: 'photo.jpg' }], failed: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const form = new FormData();
    form.append('token', 'abc');

    await expect(uploadGuestPhotos(form)).resolves.toEqual({ uploaded: [{ name: 'photo.jpg' }], failed: [] });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/photo-upload'),
      expect.objectContaining({ method: 'POST', body: form }),
    );
  });

  it('submits guestbook notes through the shared service', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(submitGuestbookEntry({ siteSlug: 'maya-leo', message: 'Congrats' })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/guestbook-submit'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('routes guest contact calls through the shared service', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ matches: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(callGuestContactFunction('guest-contact-lookup', { site_ref: 'maya-leo', query: 'Maya Leo' })).resolves.toEqual({ matches: [] });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/guest-contact-lookup'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
