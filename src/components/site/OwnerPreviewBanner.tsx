import { Eye } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { getOwnerPreviewMode } from '../../lib/ownerPreviewMode';

export function OwnerPreviewBanner() {
  const location = useLocation();
  const previewMode = getOwnerPreviewMode(location.pathname, new URLSearchParams(location.search));

  if (!previewMode) return null;

  return (
    <div className="relative z-50 border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white/80">
            <Eye className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold">{previewMode.title}</p>
            <p className="text-sm leading-6 text-amber-900">{previewMode.detail}</p>
          </div>
        </div>
        <a
          href={previewMode.exitHref}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
        >
          Leave preview
        </a>
      </div>
    </div>
  );
}
