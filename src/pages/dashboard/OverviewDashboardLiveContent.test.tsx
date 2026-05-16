import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OverviewDashboardLiveContent } from './OverviewDashboardLiveContent';

describe('OverviewDashboardLiveContent', () => {
  const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  const assignSpy = vi.spyOn(window.location, 'assign').mockImplementation(() => {});

  beforeEach(() => {
    openSpy.mockClear();
    assignSpy.mockClear();
  });

  function renderOverview({
    isLive,
    siteSlug = 'maya-leo',
  }: {
    isLive: boolean;
    siteSlug?: string | null;
  }) {
    return render(
      <OverviewDashboardLiveContent
        coupleLabel="Maya & Leo"
        dashboardModel={{
          contactCoverage: 100,
          publishBlockers: [],
          responseRate: 82,
          siteVisibility: {
            isLive,
            label: isLive ? 'Public' : 'Draft only — visible only to you',
            shortLabel: isLive ? 'Public' : 'Draft only',
          },
        } as never}
        draftBrief={[]}
        heroVenueLine="June 15, 2026 · Sunset Gardens"
        interactiveLoading={false}
        interactiveSuggestions={[]}
        interactiveVoteSummaries={[]}
        nameChangeCard={null as never}
        nameChangeInsights={null as never}
        navigate={vi.fn()}
        nextStepAction={vi.fn()}
        nextStepActionLabel="Next"
        nextStepLabel="Next"
        onDismissInvisibleSuggestion={vi.fn()}
        onHideSuggestion={vi.fn()}
        onRefreshDraftFromBrief={vi.fn()}
        recentSiteActivity={[]}
        refreshingBrief={false}
        setShowMoreDetail={vi.fn()}
        setupChecklistLength={0}
        setupCompletedCount={0}
        setupDraftProgressPercent={0}
        setupProgressRatio={0}
        showInternalProof={false}
        showMoreDetail={false}
        stats={{
          siteSlug,
          weddingDate: '2026-06-15',
          totalGuests: 48,
          pendingGuests: 6,
          registryItemCount: 2,
          newPhotoUploadCount: 0,
          vaultCount: 0,
          recentRsvps: [],
          messageReviewCount: 0,
        } as never}
      />,
    );
  }

  it('routes draft owner preview actions to the builder instead of the blocked public site path', () => {
    renderOverview({ isLive: false });

    fireEvent.click(screen.getByRole('button', { name: 'Preview draft' }));
    expect(assignSpy).toHaveBeenCalledWith('/dashboard/builder');
    expect(openSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Open your draft preview' }));
    expect(assignSpy).toHaveBeenCalledTimes(2);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('opens the public site preview only once the site is actually live', () => {
    renderOverview({ isLive: true });

    fireEvent.click(screen.getByRole('button', { name: 'Preview site' }));
    expect(openSpy).toHaveBeenCalledWith('/site/maya-leo', '_blank', 'noopener,noreferrer');
    expect(assignSpy).not.toHaveBeenCalled();
  });

  it('keeps draft preview routing inside the builder even when the site slug is still missing', () => {
    renderOverview({ isLive: false, siteSlug: null });

    fireEvent.click(screen.getByRole('button', { name: 'Preview draft' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open your draft preview' }));

    expect(assignSpy).toHaveBeenNthCalledWith(1, '/dashboard/builder');
    expect(assignSpy).toHaveBeenNthCalledWith(2, '/dashboard/builder');
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('falls back to the builder when no site slug exists, even if visibility state says live', () => {
    renderOverview({ isLive: true, siteSlug: null });

    expect(screen.queryByRole('button', { name: 'Preview site' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open your draft preview' }));

    expect(assignSpy).toHaveBeenCalledWith('/dashboard/builder');
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('keeps live preview actions on the public site path when the site is live and the slug exists', () => {
    renderOverview({ isLive: true, siteSlug: 'maya-leo' });

    fireEvent.click(screen.getByRole('button', { name: 'Preview site' }));

    expect(openSpy).toHaveBeenCalledWith('/site/maya-leo', '_blank', 'noopener,noreferrer');
    expect(screen.getByRole('button', { name: 'Edit website' })).toBeInTheDocument();
    expect(assignSpy).not.toHaveBeenCalled();
  });
});
