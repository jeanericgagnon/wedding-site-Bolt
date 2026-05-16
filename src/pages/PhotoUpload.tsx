import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Check, ImagePlus, UploadCloud } from 'lucide-react';
import { OwnerPreviewBanner } from '../components/site/OwnerPreviewBanner';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { readStoredGuestLanguage, resolveGuestLanguagePreference, writeStoredGuestLanguage } from '../lib/guestLanguagePreference';
import {
  buildPublicAccessArtifacts,
  buildGuestIdentityArtifacts,
  captureGuestInviteTokenFromSearch,
  capturePublicInviteTokenFromSearch,
} from '../lib/publicAccessArtifacts';
import { submitGuestHubProspect, trackGuestHubEvent } from './guestHubPublicService';
import { hasGuestPublicSubmissionRuntime, uploadGuestPhotos } from './guestPublicSubmissionService';
import { PhotoUploadStatusPanel } from './PhotoUploadStatusPanel';
import { appendDemoGuestPhotoUploads } from './dashboard/guestPhotos/guestPhotoDemoState';

export const mapUploadError = (code?: string): string => {
  switch (code) {
    case 'INVALID_TOKEN':
      return 'This upload link is invalid. Ask the couple for a fresh link.';
    case 'ALBUM_INACTIVE':
      return 'This album is currently paused.';
    case 'ALBUM_NOT_OPEN':
      return 'This album is not open for uploads yet.';
    case 'ALBUM_CLOSED':
      return 'This album is closed for uploads.';
    case 'DRIVE_NOT_CONNECTED':
    case 'DRIVE_RECONNECT_REQUIRED':
      return 'Uploads are available here. Please refresh and try again.';
    case 'PHOTO_SHARING_DISABLED':
      return 'Photo sharing is currently turned off for this event.';
    case 'FILE_TOO_LARGE':
    case 'TOTAL_TOO_LARGE':
    case 'TOO_MANY_FILES':
      return 'Your upload exceeds the allowed limits.';
    case 'UNSUPPORTED_FILE_TYPE':
      return 'Please upload photos or videos only.';
    default:
      return 'Couldn’t upload that file. Please try again.';
  }
};

export const safePhotoUploadMessage = (message?: string): string => {
  const safeMessages = [
    'This upload link is invalid. Ask the couple for a fresh link.',
    'This album is currently paused.',
    'This album is not open for uploads yet.',
    'This album is closed for uploads.',
    'Uploads are available here. Please refresh and try again.',
    'Photo sharing is currently turned off for this event.',
    'Your upload exceeds the allowed limits.',
    'Please upload photos or videos only.',
    'Couldn’t upload that file. Please try again.',
  ];
  return message && safeMessages.includes(message) ? message : 'Couldn’t upload that file. Please try again.';
};

export const buildPhotoUploadAccessPayload = (slug: string) => buildPublicAccessArtifacts(slug, new URLSearchParams(window.location.search));
export const buildPhotoUploadIdentityPayload = (slug: string) => buildGuestIdentityArtifacts(slug, new URLSearchParams(window.location.search));

const DEMO_PHOTO_MEMORY_FLOW_SITE_SLUG = 'alex-jordan-demo';

export const PhotoUpload: React.FC = () => {
  const { t, i18n } = useTranslation();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialToken = params.get('t')?.trim() ?? '';
  const siteSlug = params.get('site')?.trim().toLowerCase() ?? '';
  const fromHub = params.get('hub') === '1';
  const mode = params.get('mode')?.trim().toLowerCase() ?? '';
  const photoMemoryFlowQaEnabled = params.get('photoMemoryFlowQa') === '1';

  const [token, setToken] = useState(initialToken);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [wantsPhotoUpdates, setWantsPhotoUpdates] = useState(true);
  const [wantsOwnEventInfo, setWantsOwnEventInfo] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadedNames, setUploadedNames] = useState<string[]>([]);
  const [failedNames, setFailedNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputClassName = 'w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 outline-none transition focus:border-stone-400 focus:ring-4 focus:ring-stone-200/70';
  const labelClassName = 'mb-2 block text-sm font-medium text-stone-800';

  useEffect(() => {
    if (siteSlug) {
      capturePublicInviteTokenFromSearch(siteSlug, params);
      captureGuestInviteTokenFromSearch(siteSlug, params);
    }
    const languagePreference = resolveGuestLanguagePreference({
      search: params,
      storedLanguage: readStoredGuestLanguage(),
    });
    if (languagePreference.language !== i18n.language?.split('-')[0]?.toLowerCase()) {
      void i18n.changeLanguage(languagePreference.language);
    }
    if (languagePreference.source === 'guest-link') {
      writeStoredGuestLanguage(languagePreference.language);
    }
  }, [i18n, params, siteSlug]);

  useEffect(() => {
    if (!siteSlug) return;
    trackGuestHubEvent(siteSlug, 'view', '/photos/upload/invite', {
      ...buildPhotoUploadAccessPayload(siteSlug),
      ...buildPhotoUploadIdentityPayload(siteSlug),
    }).catch(() => {});
  }, [siteSlug]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setUploadedNames([]);
    setFailedNames([]);
    setError(null);

    const useLocalDemoUpload =
      photoMemoryFlowQaEnabled
      && siteSlug === DEMO_PHOTO_MEMORY_FLOW_SITE_SLUG;

    if (!useLocalDemoUpload && !hasGuestPublicSubmissionRuntime()) {
      setError(t('photo_upload.not_configured'));
      return;
    }

    if (!siteSlug && !token.trim() && files.length === 0) {
      setError(t('photo_upload.token_and_file_required'));
      return;
    }

    if (!token.trim() && !siteSlug) {
      setError(t('photo_upload.token_required'));
      return;
    }

    if (files.length === 0) {
      setError(t('photo_upload.choose_file'));
      return;
    }

    try {
      setIsUploading(true);
      const form = new FormData();
      const access = siteSlug ? buildPhotoUploadAccessPayload(siteSlug) : null;
      const identity = siteSlug ? buildPhotoUploadIdentityPayload(siteSlug) : null;
      if (token.trim()) form.append('token', token.trim());
      if (siteSlug) form.append('siteSlug', siteSlug);
      if (siteSlug && access) {
        if (access.inviteToken) form.append('inviteToken', access.inviteToken);
        if (access.passwordSession) form.append('passwordSession', access.passwordSession);
      }
      if (guestName.trim()) form.append('guestName', guestName.trim());
      if (guestEmail.trim()) form.append('guestEmail', guestEmail.trim());
      if (note.trim()) form.append('note', note.trim());
      form.append('website', ''); // honeypot field for basic bot filtering
      files.forEach((file) => form.append('files', file));

      const data = useLocalDemoUpload
        ? (() => {
            appendDemoGuestPhotoUploads({
              siteSlug,
              inviteToken: identity?.guestInviteToken ?? access?.inviteToken ?? (token.trim() || null),
              guestName,
              guestEmail,
              note,
              files: files.map((file) => ({
                name: file.name,
                type: file.type,
                size: file.size,
              })),
            });
            return {
              uploaded: files.map((file) => ({ name: file.name })),
              failed: [],
            };
          })()
        : await uploadGuestPhotos(form).catch((err) => {
            throw new Error(mapUploadError(err instanceof Error ? err.message : undefined));
          });

      const uploaded = Array.isArray(data.uploaded) ? data.uploaded : [];
      const failed = Array.isArray(data.failed) ? data.failed : [];
      setUploadedNames(uploaded.map((u: { name?: string }) => u?.name).filter((v: unknown): v is string => typeof v === 'string'));
      setFailedNames(failed.map((u: { name?: string }) => u?.name).filter((v: unknown): v is string => typeof v === 'string'));
      setMessage(
        failed.length > 0
          ? t('photo_upload.upload_partial', { uploaded: uploaded.length, failed: failed.length })
          : t('photo_upload.upload_success', { count: uploaded.length || files.length })
      );
      if (siteSlug && wantsPhotoUpdates && (guestEmail.trim() || guestPhone.trim())) {
        submitGuestHubProspect(
          {
            siteSlug,
            guestName,
            email: guestEmail,
            phone: guestPhone,
            wantsPhotoUpdates: true,
            wantsOwnEventInfo,
            source: 'guest_upload',
            uploadToken: token.trim() || null,
            ...(access ?? {}),
          },
          'Couldn’t save your update right now.',
        ).catch(() => {});
      }
      setFiles([]);
      setNote('');
      setGuestEmail('');
      setGuestPhone('');
    } catch (err) {
      setError(err instanceof Error ? safePhotoUploadMessage(err.message) : 'Couldn’t upload that file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf7f1] px-4 py-6 text-stone-950 sm:py-10">
      <OwnerPreviewBanner />
      <main className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <section className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          <div className="relative min-h-[260px] bg-stone-900">
            <img
              src="/preview-photos/header-anchor.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-70"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/75 via-stone-950/15 to-transparent" />
            <div className="relative flex min-h-[260px] flex-col justify-end p-6 text-white sm:p-8">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white/18 backdrop-blur">
                <Camera className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="text-xs font-semibold text-white/80">Wedding memories</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">
                {mode === 'guestbook' ? t('photo_upload.guestbook_title') : t('photo_upload.title')}
              </h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-white/90">
                {fromHub
                  ? t('photo_upload.hub_subtitle')
                  : t('photo_upload.default_subtitle')}
              </p>
            </div>
          </div>
          <div className="grid gap-3 p-5 text-sm text-stone-600 sm:p-6">
            <div className="flex gap-3">
              <Check className="mt-0.5 h-4 w-4 flex-none text-stone-600" aria-hidden="true" />
              <span>{t('photo_upload.helper_no_app')}</span>
            </div>
            <div className="flex gap-3">
              <Check className="mt-0.5 h-4 w-4 flex-none text-stone-600" aria-hidden="true" />
              <span>{t('photo_upload.helper_direct')}</span>
            </div>
            <div className="flex gap-3">
              <Check className="mt-0.5 h-4 w-4 flex-none text-stone-600" aria-hidden="true" />
              <span>{t('photo_upload.helper_note')}</span>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-5 sm:p-7">
          <div className="mb-4 flex justify-end">
            <LanguageSwitcher />
          </div>
        {siteSlug && !token && (
          <p className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
            {t('photo_upload.uploading_to', { site: siteSlug })}
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-5 space-y-4" aria-busy={isUploading}>
          {!siteSlug && (
            <div>
              <label htmlFor="photo-upload-token" className={labelClassName}>{t('photo_upload.token_label')}</label>
              <input
                id="photo-upload-token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className={inputClassName}
                placeholder={t('photo_upload.token_placeholder')}
                aria-invalid={error === t('photo_upload.token_required') || error === t('photo_upload.token_and_file_required') ? 'true' : 'false'}
                aria-describedby="photo-upload-token-hint photo-upload-status-panel"
              />
              <p id="photo-upload-token-hint" className="mt-2 text-xs text-stone-500">
                {t('photo_upload.token_hint')}
              </p>
            </div>
          )}

          <div>
            <label htmlFor="photo-upload-guest-name" className={labelClassName}>{t('photo_upload.name_label')}</label>
            <input
              id="photo-upload-guest-name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className={inputClassName}
              placeholder={t('photo_upload.name_placeholder')}
            />
          </div>

          <div>
            <label htmlFor="photo-upload-guest-email" className={labelClassName}>{t('photo_upload.email_label')}</label>
            <input
              id="photo-upload-guest-email"
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className={inputClassName}
              placeholder={t('photo_upload.email_placeholder')}
            />
          </div>

          <div>
            <label htmlFor="photo-upload-guest-phone" className={labelClassName}>{t('photo_upload.phone_label')}</label>
            <input
              id="photo-upload-guest-phone"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              className={inputClassName}
              placeholder={t('photo_upload.phone_placeholder')}
            />
          </div>

          {siteSlug && (
            <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50/70 p-4">
              <label className="flex items-start gap-3 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={wantsPhotoUpdates}
                  onChange={(e) => setWantsPhotoUpdates(e.target.checked)}
                  className="mt-1 accent-stone-900"
                />
                <span>{t('photo_upload.send_updates')}</span>
              </label>
              <label className="flex items-start gap-3 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={wantsOwnEventInfo}
                  onChange={(e) => setWantsOwnEventInfo(e.target.checked)}
                  className="mt-1 accent-stone-900"
                />
                <span>{t('photo_upload.own_event')}</span>
              </label>
            </div>
          )}

          <div>
            <label htmlFor="photo-upload-note" className={labelClassName}>{t('photo_upload.note_label')}</label>
            <textarea
              id="photo-upload-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={inputClassName}
              rows={3}
              placeholder={t('photo_upload.note_placeholder')}
            />
          </div>

          <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50/60 p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-700">
                <ImagePlus className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <label htmlFor="photo-upload-files" className="block text-sm font-medium text-stone-900">{t('photo_upload.files_label')}</label>
                <p id="photo-upload-files-hint" className="text-xs text-stone-500">{t('photo_upload.limits')}</p>
              </div>
            </div>
            <input
              id="photo-upload-files"
              type="file"
              multiple
              accept="image/*,video/*"
              aria-describedby="photo-upload-files-hint photo-upload-status"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-base text-stone-700 file:mr-4 file:rounded-lg file:border-0 file:bg-stone-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
            />
            <p
              id="photo-upload-status"
              role="status"
              aria-live="polite"
              className={files.length > 0 ? 'mt-2 text-sm font-medium text-stone-700' : 'sr-only'}
            >
              {files.length > 0 ? t('photo_upload.files_selected', { count: files.length }) : ''}
            </p>
          </div>

          <PhotoUploadStatusPanel
            panelId="photo-upload-status-panel"
            error={error}
            message={message}
            siteSlug={siteSlug}
            fromHub={fromHub}
            uploadedNames={uploadedNames}
            failedNames={failedNames}
            t={(key) => t(key)}
          />

          <button
            type="submit"
            disabled={isUploading}
            className="inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 py-3 text-base font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
          >
            <UploadCloud className="h-4 w-4" aria-hidden="true" />
            {isUploading ? t('photo_upload.uploading') : t('photo_upload.upload_files')}
          </button>
        </form>
        </section>
      </main>
    </div>
  );
};

export default PhotoUpload;
