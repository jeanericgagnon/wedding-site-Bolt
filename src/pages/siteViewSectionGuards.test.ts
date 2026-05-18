import { describe, expect, it } from 'vitest';
import { createEmptyWeddingData } from '../types/weddingData';
import { shouldAppendPublicRsvpSection } from './siteViewSectionGuards';

describe('shouldAppendPublicRsvpSection', () => {
  it('keeps RSVP visible when the wedding data allows RSVP normally', () => {
    const data = createEmptyWeddingData();
    data.rsvp.enabled = true;

    expect(shouldAppendPublicRsvpSection(data)).toBe(true);
  });

  it('still keeps RSVP visible when a public RSVP CTA exists even if the legacy flag is false', () => {
    const data = createEmptyWeddingData();
    data.rsvp.enabled = false;
    data.event.rsvpCallToAction = 'Send RSVP';

    expect(shouldAppendPublicRsvpSection(data)).toBe(true);
  });

  it('hides RSVP when the legacy flag is false and there is no meaningful RSVP CTA', () => {
    const data = createEmptyWeddingData();
    data.rsvp.enabled = false;

    expect(shouldAppendPublicRsvpSection(data)).toBe(false);
  });
});
