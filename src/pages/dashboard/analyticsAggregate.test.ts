import { describe, expect, it } from 'vitest';
import { buildFunnelSnapshot } from './analyticsAggregate';

describe('analyticsAggregate', () => {
  it('computes funnel percentages', () => {
    const snap = buildFunnelSnapshot({
      pageViews: 100,
      heroCtaClicks: 40,
      rsvpStarts: 25,
      rsvpSuccesses: 20,
      rsvpFailures: 2,
      registryClicks: 12,
      faqExpands: 30,
    });

    expect(snap.rsvpStartRate).toBe(25);
    expect(snap.rsvpCompletionRate).toBe(80);
    expect(snap.rsvpFailureRate).toBe(8);
    expect(snap.heroCtr).toBe(40);
    expect(snap.registryCtr).toBe(12);
    expect(snap.faqInteractionRate).toBe(30);
  });

  it('handles zero denominators', () => {
    const snap = buildFunnelSnapshot({
      pageViews: 0,
      heroCtaClicks: 0,
      rsvpStarts: 0,
      rsvpSuccesses: 0,
      rsvpFailures: 0,
      registryClicks: 0,
      faqExpands: 0,
    });

    expect(Object.values(snap).every((v) => v === 0)).toBe(true);
  });
});
