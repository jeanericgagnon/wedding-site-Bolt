import { describe, expect, it, vi } from 'vitest';
import {
  analyzeBuilderCopy,
  analyzeTimeline,
  buildBudgetQuickCheck,
  buildInvisibleIntelligenceSuggestions,
  buildMessagingActions,
  buildRegistryInsights,
  buildVaultPrompts,
  cleanBuilderCopy,
  rewriteBuilderCopy,
  shiftTimelineCascade,
  suggestTimelineDuration,
} from './invisibleIntelligence';

describe('invisibleIntelligence', () => {
  it('cleans and rewrites builder copy without hype language', () => {
    expect(cleanBuilderCopy('  please   reply.by friday  ')).toBe('Please reply. by friday');
    expect(rewriteBuilderCopy('Join us as we celebrate our magical unforgettable special day.', 'rewrite')).toContain('meaningful');
    expect(rewriteBuilderCopy('Kindly utilize the shuttle in order to arrive early.', 'simpler')).toBe('Please use the shuttle to arrive early.');
    expect(rewriteBuilderCopy("We're excited and can't wait.", 'formal')).toBe('We are excited and cannot wait.');
  });

  it('detects weak builder sections and duplicate clutter', () => {
    const health = analyzeBuilderCopy({
      sectionType: 'faq',
      settings: {
        title: 'FAQ',
        answer: 'More details coming soon.',
      },
      siblingSections: [
        { id: 'a', type: 'faq', settings: {} },
        { id: 'b', type: 'faq', settings: {} },
      ],
    });

    expect(health.score).toBeLessThan(80);
    expect(health.flags).toContain('Replace placeholder copy');
    expect(health.missingDetails).toEqual(expect.arrayContaining(['parking or transportation', 'dress code']));
    expect(health.duplicateSignals[0]).toContain('2 faq sections');
  });

  it('suggests timeline durations, gaps, overlaps, buffers, and cascade shifts', () => {
    expect(suggestTimelineDuration('Ceremony')).toBe(30);

    const insights = analyzeTimeline([
      { id: 'ceremony', name: 'Ceremony', startTime: '16:00', durationMinutes: 30 },
      { id: 'cocktails', name: 'Cocktail hour', startTime: '16:32', durationMinutes: 60 },
      { id: 'dinner', name: 'Dinner', startTime: '20:00', durationMinutes: 90 },
      { id: 'toast', name: 'Toast', startTime: '20:30', durationMinutes: 15 },
    ]);

    expect(insights.map((insight) => insight.kind)).toEqual(expect.arrayContaining(['buffer', 'gap', 'overlap']));

    expect(shiftTimelineCascade([
      { id: 'ceremony', name: 'Ceremony', startTime: '16:00', endTime: '16:30' },
      { id: 'dinner', name: 'Dinner', startTime: '18:00', endTime: '19:30' },
    ], 'ceremony', 15)).toEqual([
      { id: 'ceremony', name: 'Ceremony', startTime: '16:15', endTime: '16:45' },
      { id: 'dinner', name: 'Dinner', startTime: '18:15', endTime: '19:45' },
    ]);
  });

  it('keeps timeline intelligence scoped to each event date and skips duration nudges when end time is known', () => {
    const insights = analyzeTimeline([
      { id: 'welcome', name: 'Welcome drinks', eventDate: '2026-06-05', startTime: '20:00', endTime: '22:00' },
      { id: 'getting-ready', name: 'Getting Ready', eventDate: '2026-06-06', startTime: '09:00', endTime: '11:00' },
      { id: 'ceremony', name: 'Ceremony', eventDate: '2026-06-06', startTime: '16:00', endTime: '16:30' },
    ]);

    expect(insights).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ eventId: 'welcome', kind: 'overlap' }),
      expect.objectContaining({ eventId: 'welcome', kind: 'gap' }),
      expect.objectContaining({ eventId: 'welcome', kind: 'duration' }),
    ]));
    expect(insights).toEqual(expect.arrayContaining([
      expect.objectContaining({ eventId: 'getting-ready', kind: 'gap' }),
    ]));
  });

  it('keeps registry and budget suggestions gentle', () => {
    const registry = buildRegistryInsights([
      { category: 'Kitchen', image_url: null },
      { category: 'Kitchen', image_url: null },
      { category: 'Kitchen', image_url: 'https://example.com/a.jpg' },
    ]);
    expect(registry.map((suggestion) => suggestion.title)).toContain('Common addition');
    expect(registry.map((suggestion) => suggestion.detail).join(' ')).not.toMatch(/recommended for you/i);
    expect(registry.map((suggestion) => suggestion.detail).join(' ')).not.toMatch(/metadata/i);

    const budget = buildBudgetQuickCheck({ totalBudget: 25000, estimated: 0, actual: 0, paid: 0, categoryCount: 0 });
    expect(budget[0]).toMatchObject({ title: 'Quick check', area: 'budget' });
    expect(budget[0].detail).not.toMatch(/warning|alert|over budget/i);
  });

  it('flags cash funds that are missing setup or goal tracking without overclaiming', () => {
    const registry = buildRegistryInsights([
      {
        category: 'cash funds',
        item_name: 'Honeymoon fund',
        image_url: 'https://example.com/fund.jpg',
        contributionMethodCount: 0,
        goalAmount: 0,
        receivedAmount: 0,
      },
      {
        category: 'cash funds',
        item_name: 'New home fund',
        image_url: 'https://example.com/home.jpg',
        contributionMethodCount: 2,
        goalAmount: 2000,
        receivedAmount: 400,
      },
    ]);

    expect(registry).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'registry-fund-setup',
        title: 'Cash fund setup',
      }),
      expect.objectContaining({
        id: 'registry-fund-goals',
        title: 'Track one simple goal',
      }),
    ]));
    expect(registry.map((suggestion) => suggestion.detail).join(' ')).not.toMatch(/broken|failed|metadata/i);
  });

  it('builds one-click messaging actions while provider sending stays external', () => {
    const actions = buildMessagingActions({
      pendingGuests: 12,
      contactableGuestCount: 20,
      totalGuests: 30,
      activePhotoAlbumCount: 1,
      postWedding: false,
    });

    expect(actions[0]).toMatchObject({
      id: 'message-rsvp-reminder',
      title: 'Ready to send',
      href: '/dashboard/messages?template=rsvp-reminder&audience=pending',
    });
  });

  it('creates vault and cross-suite suggestions without exposing AI spend', () => {
    vi.setSystemTime(new Date('2026-04-30T12:00:00Z'));

    const vault = buildVaultPrompts({
      weddingDate: '2026-05-05',
      vaultCount: 1,
      enabledVaultCount: 1,
    });
    expect(vault[0].title).toBe('A quiet note');

    const suggestions = buildInvisibleIntelligenceSuggestions({
      isPublished: false,
      siteSlug: null,
      weddingDate: '2026-05-05',
      totalGuests: 0,
      pendingGuests: 0,
      contactableGuestCount: 0,
      registryItemCount: 0,
      activePhotoAlbumCount: 0,
      photoAlbumCount: 0,
      vaultCount: 0,
      enabledVaultCount: 0,
    });

    expect(suggestions.map((suggestion) => suggestion.id)).toEqual(expect.arrayContaining(['site-publish', 'guest-import', 'photo-hub']));
    expect(suggestions.map((suggestion) => `${suggestion.title} ${suggestion.detail} ${suggestion.actionLabel}`).join(' ')).not.toMatch(/AI spend|token|cost|bucket/i);

    vi.useRealTimers();
  });
});
