import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OverviewDashboardLiveContent } from './OverviewDashboardLiveContent';

describe('OverviewDashboardLiveContent', () => {
  const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  const originalLocation = window.location;
  let assignSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    openSpy.mockClear();
    assignSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        assign: assignSpy,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  function renderOverview({
    isLive,
    siteSlug = 'maya-leo',
    showMoreDetail = false,
    shortLabel = isLive ? 'Public' : 'Needs content',
    label = isLive ? 'Public' : 'Draft only — visible only to you',
  }: {
    isLive: boolean;
    siteSlug?: string | null;
    showMoreDetail?: boolean;
    shortLabel?: string;
    label?: string;
  }) {
    const navigateSpy = vi.fn();
    const rendered = render(
      <MemoryRouter>
        <OverviewDashboardLiveContent
          coupleLabel="Maya & Leo"
          dashboardModel={{
            contactCoverage: 100,
            publishBlockers: [],
            responseRate: 82,
            siteVisibility: {
              isLive,
              label,
              shortLabel,
            },
            websiteInviteAnalytics: {
              summary: 'Analytics are tied to real product actions.',
              signals: [
                {
                  id: 'site-visit-tracking',
                  label: 'Website visits',
                  value: '12',
                  detail: '12 aggregate website visits were recorded in the last 30 days.',
                  privacy: 'Aggregated guest counts only.',
                },
              ],
            },
            websiteInviteAnalyticsFunnel: {
              summary: 'The guest journey funnel is backed by measured product events.',
              steps: [
                {
                  id: 'visit',
                  label: 'Visit',
                  value: '12',
                  detail: 'Visits are being measured.',
                },
              ],
              guardrails: ['Show owner/planner summaries only; public and guest routes should not reveal analytics detail.'],
            },
          } as never}
          draftBrief={[]}
          heroVenueLine="June 15, 2026 · Sunset Gardens"
          interactiveLoading={false}
          interactiveSuggestions={[]}
          interactiveVoteSummaries={[]}
          nameChangeCard={null as never}
          nameChangeInsights={null as never}
          navigate={navigateSpy}
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
          showMoreDetail={showMoreDetail}
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
        />
      </MemoryRouter>,
    );
    return { navigateSpy, ...rendered };
  }

  it('routes draft owner preview actions to the builder instead of the blocked public site path', () => {
    const { navigateSpy } = renderOverview({ isLive: false });

    fireEvent.click(screen.getByText('Preview draft'));
    expect(navigateSpy).toHaveBeenCalledWith('/dashboard/builder');
    expect(assignSpy).not.toHaveBeenCalled();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('opens the public site preview only once the site is actually live', () => {
    renderOverview({ isLive: true });

    fireEvent.click(screen.getByText('Preview site'));
    expect(openSpy).toHaveBeenCalledWith('/site/maya-leo', '_blank', 'noopener,noreferrer');
    expect(assignSpy).not.toHaveBeenCalled();
  });

  it('keeps draft preview routing inside the builder even when the site slug is still missing', () => {
    const { navigateSpy } = renderOverview({ isLive: false, siteSlug: null });

    fireEvent.click(screen.getByText('Preview draft'));

    expect(navigateSpy).toHaveBeenCalledWith('/dashboard/builder');
    expect(assignSpy).not.toHaveBeenCalled();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('falls back to the builder when no site slug exists, even if visibility state says live', () => {
    const { navigateSpy } = renderOverview({ isLive: true, siteSlug: null });

    fireEvent.click(screen.getByText('Preview site'));

    expect(navigateSpy).toHaveBeenCalledWith('/dashboard/builder');
    expect(assignSpy).not.toHaveBeenCalled();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('keeps live preview actions on the public site path when the site is live and the slug exists', () => {
    renderOverview({ isLive: true, siteSlug: 'maya-leo' });

    fireEvent.click(screen.getByText('Preview site'));

    expect(openSpy).toHaveBeenCalledWith('/site/maya-leo', '_blank', 'noopener,noreferrer');
    expect(screen.getByRole('button', { name: 'Edit website' })).toBeInTheDocument();
    expect(assignSpy).not.toHaveBeenCalled();
  });

  it('keeps the site summary aligned with the shared visibility truth when the site is not guest-ready', () => {
    renderOverview({ isLive: false, shortLabel: 'Needs content' });

    expect(screen.getByText('Guest site')).toBeInTheDocument();
    expect(screen.getByText('Needs content')).toBeInTheDocument();
    expect(screen.queryByText('Guest-ready')).not.toBeInTheDocument();
  });

  it('keeps the hero badge and preview actions aligned when the site is published but not guest-ready', () => {
    const { navigateSpy } = renderOverview({
      isLive: false,
      shortLabel: 'Needs content',
      label: 'Published, but not ready for guests yet',
    });

    expect(screen.getByText('Published, but not ready for guests yet')).toBeInTheDocument();
    expect(screen.getByText('Needs content')).toBeInTheDocument();
    expect(screen.queryByText('Guest-ready')).not.toBeInTheDocument();
    expect(screen.getByText('Preview draft')).toBeInTheDocument();
    expect(screen.queryByText('Preview site')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Preview draft'));

    expect(navigateSpy).toHaveBeenCalledWith('/dashboard/builder');
    expect(assignSpy).not.toHaveBeenCalled();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('renders the owner analytics panel when more detail is enabled', () => {
    renderOverview({ isLive: true, showMoreDetail: true });

    expect(screen.getByText('Website and invite analytics')).toBeInTheDocument();
    expect(screen.getByText('Guest journey funnel')).toBeInTheDocument();
    expect(screen.getByText('Show owner/planner summaries only; public and guest routes should not reveal analytics detail.')).toBeInTheDocument();
    expect(screen.getByText('Website visits')).toBeInTheDocument();
  });
});
