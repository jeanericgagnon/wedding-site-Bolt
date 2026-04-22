import { describe, expect, it } from 'vitest';
import { SITE_TRUST_COPY } from './siteTrustCopy';

describe('SITE_TRUST_COPY starter draft truth', () => {
  it('keeps private editing and draft-to-share wording framed around sharing with guests instead of launch claims', () => {
    expect(SITE_TRUST_COPY.privateEditing).toBe('Keep refining it privately, then share it with guests when you are ready.');
    expect(SITE_TRUST_COPY.guestFacingLaunch).toBe('Share with guests');
    expect(SITE_TRUST_COPY.draftToLaunch).toBe('A clean path from draft editing to sharing it with guests.');
    expect(SITE_TRUST_COPY.privateEditing.toLowerCase()).not.toContain('launch it for guests');
    expect(SITE_TRUST_COPY.draftToLaunch.toLowerCase()).not.toContain('guest-facing launch');
  });

  it('keeps the trust copy aligned with starter-draft review language before publish', () => {
    expect(SITE_TRUST_COPY.privateEditing).toContain('share it with guests when you are ready');
    expect(SITE_TRUST_COPY.privateEditing.toLowerCase()).not.toContain('live');
    expect(SITE_TRUST_COPY.draftToLaunch).toContain('sharing it with guests');
  });

  it('keeps hidden-from-search copy framed around review and guest sharing instead of a live-state claim', () => {
    expect(SITE_TRUST_COPY.hiddenFromSearchExplainer).toBe('You can keep search indexing off while you review access settings and decide when to share the site with guests.');
    expect(SITE_TRUST_COPY.hiddenFromSearchExplainer.toLowerCase()).not.toContain('live for guests');
  });

  it('keeps guest-access truth framed around review-only and ready-to-share states', () => {
    expect(SITE_TRUST_COPY.guestAccessTruth).toBe('Privacy + guest-access controls should stay honest about what is review-only, hidden from search, or ready to share with guests.');
    expect(SITE_TRUST_COPY.guestAccessTruth.toLowerCase()).not.toContain('launch state');
  });

  it('keeps messaging trust framed around review-before-send states instead of fake success claims', () => {
    expect(SITE_TRUST_COPY.reviewBeforeSendMessaging).toBe('Review-before-send messaging should stay honest about drafts, scheduled sends, and delivery states before broader launch claims.');
    expect(SITE_TRUST_COPY.reviewBeforeSendMessaging.toLowerCase()).not.toContain('ready-to-send');
  });

  it('keeps the launch story core framed around starter draft + guest ops + calm execution', () => {
    expect(SITE_TRUST_COPY.launchStoryCore).toBe('starter draft + guest ops + calm execution');
    expect(SITE_TRUST_COPY.launchStoryCore).not.toContain('website + guest ops');
  });

  it('keeps the shared launch-story core ready for trust surfaces to reuse verbatim', () => {
    expect(`The hard launch line is ${SITE_TRUST_COPY.launchStoryCore}`).toBe('The hard launch line is starter draft + guest ops + calm execution');
  });

  it('keeps custom URL copy framed around sharing a DayOf link instead of implying a separate domain product', () => {
    expect(SITE_TRUST_COPY.customWeddingUrl).toBe('Share-ready DayOf URL. No separate-domain upsell.');
    expect(SITE_TRUST_COPY.customWeddingUrlExplainer).toBe('Every site includes a personalized DayOf URL, so you can share a polished DayOf link with guests without a separate domain upsell.');
    expect(SITE_TRUST_COPY.customWeddingUrlExplainer.toLowerCase()).not.toContain('separate domain product');
  });
});
