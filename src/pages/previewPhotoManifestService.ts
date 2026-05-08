export type PreviewPhotoManifestEntry = {
  url: string;
  bucket: string;
  orientation: string;
};

export async function loadPreviewPhotoManifest(): Promise<PreviewPhotoManifestEntry[]> {
  const response = await fetch('/preview-photos/manifest.json', { cache: 'no-store' });
  const json = await response.json().catch(() => ({}));
  const items = (json as { items?: Array<{ url?: string; bucket?: string; orientation?: string }> })?.items ?? [];

  return items
    .map((item) => ({
      url: item.url ?? '',
      bucket: item.bucket ?? 'root',
      orientation: item.orientation ?? 'landscape',
    }))
    .filter((item) => Boolean(item.url));
}
