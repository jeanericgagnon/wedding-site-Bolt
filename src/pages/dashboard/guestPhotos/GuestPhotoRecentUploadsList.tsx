import { Eye, EyeOff, Flag } from 'lucide-react';
import { safePhotoAnalysisList } from '../../../lib/photoAnalysisCustomerCopy';
import type { PhotoUploadAiAnalysisRow, PhotoUploadRow } from '../guestPhotoSharingUtils';

type GuestPhotoRecentUploadsListProps = {
  uploads: PhotoUploadRow[];
  analysisByUploadId: Map<string, PhotoUploadAiAnalysisRow>;
  onTagFilterChange: (tag: string) => void;
  onModerateUpload: (uploadId: string, patch: Partial<Pick<PhotoUploadRow, 'is_hidden' | 'is_flagged' | 'recap_hidden' | 'recap_featured' | 'recap_story'>>) => void;
  formatDateTime: (value: string | null | undefined) => string;
};

export function GuestPhotoRecentUploadsList({
  uploads,
  analysisByUploadId,
  onTagFilterChange,
  onModerateUpload,
  formatDateTime,
}: GuestPhotoRecentUploadsListProps) {
  if (uploads.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium text-neutral-700 mb-1">Recent uploads</p>
      <ul className="space-y-2 text-xs text-neutral-600">
        {uploads.map((upload) => {
          const safeTags = safePhotoAnalysisList(analysisByUploadId.get(upload.id)?.tags);

          return (
            <li key={upload.id} className={`rounded-[20px] border px-2 py-1 ${upload.is_hidden ? 'bg-neutral-100 border-neutral-200' : 'bg-white border-neutral-200'}`}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span>
                    {upload.original_filename} · {upload.guest_name || 'Guest'}{upload.guest_email ? ` (${upload.guest_email})` : ''} · {formatDateTime(upload.uploaded_at)}
                  </span>
                  {safeTags.length ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {safeTags.slice(0, 5).map((tag) => (
                        <button
                          key={`${upload.id}-${tag}`}
                          type="button"
                          onClick={() => onTagFilterChange(tag.trim().toLowerCase())}
                          className="rounded-xl bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600 hover:bg-neutral-200"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {(upload.recap_featured || upload.recap_story || upload.recap_hidden) && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {upload.recap_featured && <span className="rounded-xl border border-border-subtle bg-surface-subtle px-2 py-0.5 text-[11px] text-text-secondary">Featured</span>}
                      {upload.recap_story && <span className="rounded-xl bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-700">Story</span>}
                      {upload.recap_hidden && <span className="rounded-xl bg-neutral-200 px-2 py-0.5 text-[11px] text-neutral-700">Recap hidden</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className={`inline-flex items-center rounded-xl px-1.5 py-0.5 border ${upload.recap_featured ? 'bg-surface-subtle text-text-primary border-border-subtle' : 'bg-white text-neutral-600 border-neutral-300'}`}
                    onClick={() => onModerateUpload(upload.id, { recap_featured: !upload.recap_featured })}
                  >
                    {upload.recap_featured ? 'Unfeature' : 'Feature'}
                  </button>
                  <button
                    type="button"
                    className={`inline-flex items-center rounded-xl px-1.5 py-0.5 border ${upload.recap_story ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-300'}`}
                    onClick={() => onModerateUpload(upload.id, { recap_story: !upload.recap_story })}
                  >
                    {upload.recap_story ? 'Unstory' : 'Story'}
                  </button>
                  <button
                    type="button"
                    className={`inline-flex items-center rounded-xl px-1.5 py-0.5 border ${upload.recap_hidden ? 'bg-neutral-200 text-neutral-700 border-neutral-300' : 'bg-white text-neutral-600 border-neutral-300'}`}
                    onClick={() => onModerateUpload(upload.id, { recap_hidden: !upload.recap_hidden })}
                  >
                    {upload.recap_hidden ? 'Show recap' : 'Hide recap'}
                  </button>
                  <button
                    type="button"
                    className={`inline-flex items-center rounded-xl px-1.5 py-0.5 border ${upload.is_flagged ? 'bg-surface-subtle text-text-primary border-border-subtle' : 'bg-white text-neutral-600 border-neutral-300'}`}
                    onClick={() => onModerateUpload(upload.id, { is_flagged: !upload.is_flagged })}
                  >
                    <Flag className="w-3 h-3 mr-1" /> {upload.is_flagged ? 'Unflag' : 'Flag'}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center rounded-xl px-1.5 py-0.5 border border-neutral-300 bg-white text-neutral-600"
                    onClick={() => onModerateUpload(upload.id, { is_hidden: !upload.is_hidden })}
                  >
                    {upload.is_hidden ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                    {upload.is_hidden ? 'Restore' : 'Remove'}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
