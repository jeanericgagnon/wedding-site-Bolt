export interface FunnelSnapshotInput {
  pageViews: number;
  heroCtaClicks: number;
  rsvpStarts: number;
  rsvpSuccesses: number;
  rsvpFailures: number;
  registryClicks: number;
  faqExpands: number;
}

export interface FunnelSnapshot {
  rsvpStartRate: number;
  rsvpCompletionRate: number;
  rsvpFailureRate: number;
  heroCtr: number;
  registryCtr: number;
  faqInteractionRate: number;
}

function pct(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function buildFunnelSnapshot(input: FunnelSnapshotInput): FunnelSnapshot {
  return {
    rsvpStartRate: pct(input.rsvpStarts, input.pageViews),
    rsvpCompletionRate: pct(input.rsvpSuccesses, input.rsvpStarts),
    rsvpFailureRate: pct(input.rsvpFailures, input.rsvpStarts),
    heroCtr: pct(input.heroCtaClicks, input.pageViews),
    registryCtr: pct(input.registryClicks, input.pageViews),
    faqInteractionRate: pct(input.faqExpands, input.pageViews),
  };
}
