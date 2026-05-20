import { Link } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { EventRecapRouteView } from './EventRecapRouteView';

type RecapSummary = {
  uploadCount: number;
  highlightCount: number;
  chapterCount: number;
  curatedCount?: number;
};

type RecapData = {
  summary: RecapSummary;
};

type EventRecapLiveContentProps = {
  t: (key: string, options?: Record<string, unknown>) => string;
  slug: string;
  coupleLabel: string;
  shareStatus: string | null;
  data: RecapData | null;
  loading: boolean;
  recapLoadingView: React.ReactNode;
  recapErrorView: React.ReactNode;
  recapContentView: React.ReactNode;
  onShareRecap: () => void | Promise<void>;
};

export function EventRecapLiveContent({
  t,
  slug,
  coupleLabel,
  shareStatus,
  data,
  loading,
  recapLoadingView,
  recapErrorView,
  recapContentView,
  onShareRecap,
}: EventRecapLiveContentProps) {
  return (
    <div className="min-h-screen bg-[#fbf7f1] text-neutral-950">
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="rounded-xl border border-neutral-200 bg-white p-6 sm:p-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold text-neutral-500">{t('event_recap.eyebrow')}</p>
            <LanguageSwitcher />
          </div>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold sm:text-6xl">{coupleLabel}</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-600">
                {t('event_recap.subtitle')}
              </p>
            </div>
            <Link to={`/event/${encodeURIComponent(slug)}`} className="inline-flex rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50">
              {t('event_recap.back_hub')}
            </Link>
            <button
              type="button"
              onClick={() => void onShareRecap()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              <Share2 className="h-4 w-4" />
              {t('event_recap.share_recap')}
            </button>
          </div>
          {shareStatus && <p role="status" className="mt-4 text-sm text-neutral-600">{shareStatus}</p>}
          {data && (
            <div className="mt-8 grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-neutral-950 p-5 text-white">
                <p className="text-sm text-white/60">{t('event_recap.shared_uploads')}</p>
                <p className="mt-2 text-3xl font-semibold">{data.summary.uploadCount}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5">
                <p className="text-sm text-neutral-500">{t('event_recap.top_moments')}</p>
                <p className="mt-2 text-3xl font-semibold">{data.summary.highlightCount}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5">
                <p className="text-sm text-neutral-500">{t('event_recap.memory_chapters')}</p>
                <p className="mt-2 text-3xl font-semibold">{data.summary.chapterCount}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5">
                <p className="text-sm text-neutral-500">{t('event_recap.curated_picks')}</p>
                <p className="mt-2 text-3xl font-semibold">{data.summary.curatedCount ?? 0}</p>
              </div>
            </div>
          )}
        </section>
        <EventRecapRouteView
          loadingState={loading}
          hasData={Boolean(data)}
          loading={recapLoadingView}
          error={recapErrorView}
          content={recapContentView}
        />
      </main>
    </div>
  );
}
