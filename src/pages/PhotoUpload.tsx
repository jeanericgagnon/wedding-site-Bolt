import React, { useMemo, useState } from 'react';
import { GuestJourneyCompanion } from '../components/guest/GuestJourneyCompanion';
import { readInviteTokenFromParams } from '../lib/inviteTokenParams';
import {
  mapPhotoUploadError,
  mapPhotoUploadRuntimeError,
  PHOTO_UPLOAD_ACCESS_LABEL,
  PHOTO_UPLOAD_ACCESS_PLACEHOLDER,
  PHOTO_UPLOAD_MISSING_ACCESS_ERROR,
  PHOTO_UPLOAD_UNAVAILABLE_ERROR,
} from './photoUploadCopy';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

const readPhotoUploadAlbumLabel = (params: URLSearchParams): string => {
  const raw = params.get('albumName')?.trim() ?? '';
  return raw.length > 0 ? raw.slice(0, 120) : '';
};

export const PhotoUpload: React.FC = () => {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialToken = readInviteTokenFromParams(params);
  const siteSlug = params.get('site')?.trim().toLowerCase() ?? '';
  const albumLabel = readPhotoUploadAlbumLabel(params);
  const previewGuest = params.get('previewGuest')?.trim() ?? '';
  const inviteToken = initialToken;
  const hasInviteAccess = initialToken.trim().length > 0;
  const isHubEntry = params.get('hub') === '1';

  const [token, setToken] = useState(initialToken);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadedNames, setUploadedNames] = useState<string[]>([]);
  const [failedNames, setFailedNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const resetUploadFeedback = (options?: { clearFiles?: boolean }) => {
    setMessage(null);
    setUploadedNames([]);
    setFailedNames([]);
    setError(null);

    if (options?.clearFiles) {
      setFiles([]);
      setFileInputKey((current) => current + 1);
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    resetUploadFeedback();

    if (!supabaseUrl || !supabaseAnonKey) {
      setError(PHOTO_UPLOAD_UNAVAILABLE_ERROR);
      return;
    }

    if (!token.trim()) {
      setError(PHOTO_UPLOAD_MISSING_ACCESS_ERROR);
      return;
    }

    if (files.length === 0) {
      setError('Please choose at least one file.');
      return;
    }

    try {
      setIsUploading(true);
      const form = new FormData();
      if (token.trim()) form.append('token', token.trim());
      if (siteSlug) form.append('siteSlug', siteSlug);
      if (guestName.trim()) form.append('guestName', guestName.trim());
      if (guestEmail.trim()) form.append('guestEmail', guestEmail.trim());
      if (note.trim()) form.append('note', note.trim());
      form.append('website', ''); // honeypot field for basic bot filtering
      files.forEach((file) => form.append('files', file));

      const res = await fetch(`${supabaseUrl}/functions/v1/photo-upload`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: form,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(mapPhotoUploadError(data?.code, data?.error));
      }

      const uploaded = Array.isArray(data.uploaded) ? data.uploaded : [];
      const failed = Array.isArray(data.failed) ? data.failed : [];
      const nextUploadedNames = uploaded
        .map((u: { name?: string }) => u?.name)
        .filter((v: unknown): v is string => typeof v === 'string');
      const nextFailedNames = failed
        .map((u: { name?: string }) => u?.name)
        .filter((v: unknown): v is string => typeof v === 'string');
      setUploadedNames(nextUploadedNames);
      setFailedNames(nextFailedNames);
      setMessage(
        failed.length > 0
          ? `Uploaded ${uploaded.length} file(s), ${failed.length} failed. Failed files stayed selected so you can retry them.`
          : `Uploaded ${uploaded.length || files.length} file(s). Thank you!`
      );
      if (nextFailedNames.length > 0) {
        const failedNameSet = new Set(nextFailedNames);
        setFiles(files.filter((file) => failedNameSet.has(file.name)));
      } else {
        setFiles([]);
        setFileInputKey((current) => current + 1);
      }
      setNote('');
      setGuestEmail('');
    } catch (err) {
      setError(mapPhotoUploadRuntimeError(err));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-rose-50/40 px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-xl rounded-3xl bg-white p-5 sm:p-6 shadow-sm border border-rose-100">
        <h1 className="text-3xl font-semibold text-gray-900">Share your photos</h1>
        <p className="mt-2 text-base text-gray-700">Upload photos and videos directly to the couple&apos;s shared album.</p>

        {(albumLabel || (siteSlug && !hasInviteAccess)) && (
          <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/60 px-4 py-3">
            {albumLabel && (
              <p className="text-base font-medium text-gray-900">
                Uploading to the {albumLabel} album
              </p>
            )}
            {siteSlug && !hasInviteAccess && (
              <p className={`text-sm text-gray-700 ${albumLabel ? 'mt-1' : ''}`}>
                {albumLabel ? `Hosted at ${siteSlug}.dayof.love` : `Uploading to ${siteSlug}.dayof.love`}
              </p>
            )}
          </div>
        )}

        <GuestJourneyCompanion
          currentSurface="photos"
          siteSlug={siteSlug || undefined}
          inviteToken={inviteToken || undefined}
          previewGuest={previewGuest || undefined}
          isHubEntry={isHubEntry}
          className="mt-5 border-rose-100 bg-rose-50/45"
        />

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {!hasInviteAccess && (
            <div>
              <label htmlFor="photo-upload-token" className="mb-2 block text-base font-medium text-gray-800">{PHOTO_UPLOAD_ACCESS_LABEL}</label>
              <input
                id="photo-upload-token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base"
                placeholder={PHOTO_UPLOAD_ACCESS_PLACEHOLDER}
                required
              />
            </div>
          )}

          <div>
            <label className="mb-2 block text-base font-medium text-gray-800">Your name (optional)</label>
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base"
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label className="mb-2 block text-base font-medium text-gray-800">Email (optional)</label>
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-base font-medium text-gray-800">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base"
              rows={3}
              placeholder="A few words for the couple"
            />
          </div>

          <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
            <label htmlFor="photo-upload-files" className="mb-2 block text-base font-medium text-gray-800">Files</label>
            <input
              id="photo-upload-files"
              key={fileInputKey}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base"
            />
            {files.length > 0 && <p className="mt-2 text-sm text-gray-700 font-medium">{files.length} file(s) selected</p>}
            {failedNames.length > 0 && (
              <p className="mt-2 text-sm text-amber-700">
                Failed files are still selected so you can retry right away.
              </p>
            )}
            <p className="mt-2 text-sm text-gray-600">Up to 10 files per upload, 30MB per file, 120MB total.</p>
          </div>

          {error && <p className="text-base text-red-700">{error}</p>}
          {message && <p className="text-base text-green-700">{message}</p>}
          {uploadedNames.length > 0 && (
            <ul className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 space-y-1.5">
              {uploadedNames.slice(0, 8).map((name) => <li key={name}>{name}</li>)}
              {uploadedNames.length > 8 && <li>+{uploadedNames.length - 8} more</li>}
            </ul>
          )}
          {failedNames.length > 0 && (
            <ul className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 space-y-1.5">
              {failedNames.slice(0, 8).map((name) => <li key={name}>{name}</li>)}
              {failedNames.length > 8 && <li>+{failedNames.length - 8} more</li>}
            </ul>
          )}
          {(message || uploadedNames.length > 0 || failedNames.length > 0) && (
            <button
              type="button"
              onClick={() => resetUploadFeedback({ clearFiles: true })}
              className="w-full min-h-[48px] rounded-xl border border-rose-200 bg-white px-4 py-3 text-base font-medium text-rose-700 hover:border-rose-300 hover:bg-rose-50"
            >
              Upload more
            </button>
          )}

          <button
            type="submit"
            disabled={isUploading}
            className="w-full min-h-[52px] rounded-xl bg-rose-600 px-4 py-3 text-base font-medium text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {isUploading ? 'Uploading…' : 'Upload files'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PhotoUpload;
