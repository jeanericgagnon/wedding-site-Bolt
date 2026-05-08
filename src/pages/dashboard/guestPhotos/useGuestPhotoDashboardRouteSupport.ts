import { useMemo } from 'react';
import { getArchiveModeDescriptor } from '../../../lib/archiveMode';
import { buildQuickStartOverviewPath, readQuickStartDashboardContinuation } from '../../../lib/quickStartContinuation';
import { logAppAction } from '../../../lib/actionAudit';

type Args = {
  eventDate: string | null;
  searchParams: URLSearchParams;
  siteId: string | null;
};

export function useGuestPhotoDashboardRouteSupport({
  eventDate,
  searchParams,
  siteId,
}: Args) {
  const { fromQuickStart, nextStep } = readQuickStartDashboardContinuation(searchParams);
  const archiveMode = useMemo(() => getArchiveModeDescriptor({ weddingDate: eventDate }), [eventDate]);

  const logPhotoAction = (
    type: string,
    summary: string,
    metadata?: Record<string, unknown>,
    targetId?: string | null,
    targetLabel?: string | null,
  ) => {
    if (!siteId) return;
    void logAppAction({
      weddingSiteId: siteId,
      area: 'photos',
      type,
      summary,
      targetId,
      targetLabel,
      metadata,
    });
  };

  return {
    archiveMode,
    fromQuickStart,
    logPhotoAction,
    nextStep,
    quickStartOverviewPath: buildQuickStartOverviewPath(),
  };
}
