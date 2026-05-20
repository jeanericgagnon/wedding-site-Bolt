type PhotoUploadStatusPanelProps = {
  panelId?: string;
  error: string | null;
  message: string | null;
  siteSlug: string;
  fromHub: boolean;
  uploadedNames: string[];
  failedNames: string[];
  t: (key: string) => string;
};

export function PhotoUploadStatusPanel({
  panelId,
  error,
  message,
  siteSlug,
  fromHub,
  uploadedNames,
  failedNames,
  t,
}: PhotoUploadStatusPanelProps) {
  return (
    <>
      {error && <p id={panelId} role="alert" className="rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-base text-stone-800">{error}</p>}
      {message && <p role="status" className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-800">{message}</p>}
      {message && siteSlug && fromHub && (
        <div className="grid gap-2 sm:grid-cols-2">
          <a
            href={`/event/${encodeURIComponent(siteSlug)}/recap`}
            className="block rounded-xl bg-stone-950 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-stone-800"
          >
            {t('photo_upload.see_recap')}
          </a>
          <a
            href={`/event/${encodeURIComponent(siteSlug)}`}
            className="block rounded-xl border border-stone-200 bg-white px-4 py-3 text-center text-sm font-medium text-stone-800 hover:bg-stone-50"
          >
            {t('photo_upload.back_hub')}
          </a>
        </div>
      )}
      {message && (
        <a
          href="/signup"
          className="block rounded-xl border border-stone-200 bg-white px-4 py-3 text-center text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          {t('photo_upload.create_own')}
        </a>
      )}
      {uploadedNames.length > 0 && (
        <ul className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-800 space-y-1.5">
          {uploadedNames.slice(0, 8).map((name) => <li key={name}>{name}</li>)}
          {uploadedNames.length > 8 && <li>+{uploadedNames.length - 8} more</li>}
        </ul>
      )}
      {failedNames.length > 0 && (
        <ul className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-800 space-y-1.5">
          {failedNames.slice(0, 8).map((name) => <li key={name}>{name}</li>)}
          {failedNames.length > 8 && <li>+{failedNames.length - 8} more</li>}
        </ul>
      )}
    </>
  );
}
