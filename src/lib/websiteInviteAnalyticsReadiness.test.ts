import { describe, expect, it } from 'vitest';
import { buildWebsiteInviteAnalyticsFunnelReview, buildWebsiteInviteAnalyticsReadiness } from './websiteInviteAnalyticsReadiness';

describe('website invite analytics readiness', () => {
  it('separates measured owner signals from planned tracking instrumentation', () => {
    const model = buildWebsiteInviteAnalyticsReadiness({
      siteSlug: 'maya-and-leo',
      isPublished: true,
      totalGuests: 100,
      confirmedGuests: 64,
      declinedGuests: 12,
      pendingGuests: 24,
      contactableGuests: 92,
      registryItemCount: 4,
      photoAlbumCount: 2,
      activePhotoAlbumCount: 1,
      interactiveSuggestionCount: 3,
      interactiveVoteWidgetCount: 2,
      recentRsvpCount: 5,
    });

    expect(model.status).toBe('needs-instrumentation');
    expect(model.summary).toBe('5 signals are usable now; 3 need instrumentation before launch claims.');
    expect(model.signals.find((signal) => signal.id === 'rsvp-funnel')).toMatchObject({
      value: '76%',
      state: 'measured',
      privacy: 'Aggregated guest counts only.',
    });
    expect(model.signals.filter((signal) => signal.state === 'planned').map((signal) => signal.id)).toEqual([
      'site-visit-tracking',
      'invite-open-tracking',
      'qr-scans',
    ]);
  });

  it('does not invent analytics when guests and published site are missing', () => {
    const model = buildWebsiteInviteAnalyticsReadiness({
      siteSlug: null,
      isPublished: false,
      totalGuests: 0,
      confirmedGuests: 0,
      declinedGuests: 0,
      pendingGuests: 0,
      contactableGuests: 0,
      registryItemCount: 0,
      photoAlbumCount: 0,
      activePhotoAlbumCount: 0,
      interactiveSuggestionCount: 0,
      interactiveVoteWidgetCount: 0,
      recentRsvpCount: 0,
    });

    expect(model.status).toBe('empty');
    expect(model.measuredCount).toBe(0);
    expect(model.plannedCount).toBe(8);
    expect(model.signals.every((signal) => signal.state === 'planned')).toBe(true);
  });

  it('keeps privacy notes explicit for sensitive tracking lanes', () => {
    const model = buildWebsiteInviteAnalyticsReadiness({
      siteSlug: 'demo',
      isPublished: true,
      totalGuests: 1,
      confirmedGuests: 1,
      declinedGuests: 0,
      pendingGuests: 0,
      contactableGuests: 1,
      registryItemCount: 0,
      photoAlbumCount: 0,
      activePhotoAlbumCount: 0,
      interactiveSuggestionCount: 0,
      interactiveVoteWidgetCount: 0,
      recentRsvpCount: 1,
    });

    expect(model.signals.find((signal) => signal.id === 'qr-scans')?.privacy).toContain('without exposing guest tokens');
    expect(model.signals.find((signal) => signal.id === 'site-visit-tracking')?.privacy).toContain('avoid IP/device fingerprint exposure');
  });

  it('builds a privacy-safe guest journey funnel review from current signals', () => {
    const model = buildWebsiteInviteAnalyticsReadiness({
      siteSlug: 'maya-and-leo',
      isPublished: true,
      totalGuests: 100,
      confirmedGuests: 64,
      declinedGuests: 12,
      pendingGuests: 24,
      contactableGuests: 92,
      registryItemCount: 4,
      photoAlbumCount: 2,
      activePhotoAlbumCount: 1,
      interactiveSuggestionCount: 3,
      interactiveVoteWidgetCount: 2,
      recentRsvpCount: 5,
    });

    const review = buildWebsiteInviteAnalyticsFunnelReview(model);

    expect(review.status).toBe('needs-instrumentation');
    expect(review.summary).toBe('3 funnel steps are real now; 2 still need privacy-safe instrumentation.');
    expect(review.steps.map((step) => [step.id, step.state])).toEqual([
      ['visit', 'planned'],
      ['invite', 'planned'],
      ['rsvp', 'measured'],
      ['photos', 'measured'],
      ['prompts', 'measured'],
    ]);
    expect(review.guardrails.join(' ')).toContain('guest tokens');
    expect(review.guardrails.join(' ')).toContain('public and guest routes should not reveal analytics detail');
  });
});
