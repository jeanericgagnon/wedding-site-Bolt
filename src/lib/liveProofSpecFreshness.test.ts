import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('live proof spec freshness', () => {
  it('keeps live smoke marketing assertions aligned with current source copy', () => {
    const liveSmoke = read('tests/e2e/live-smoke.spec.ts');
    const home = read('src/pages/Home.tsx');
    const product = read('src/pages/Product.tsx');
    const trust = read('src/pages/Trust.tsx');

    [
      'A calmer wedding operating system.',
      'Site, guests, and day-of work in the same rhythm.',
      'Built for launch truth, not wedding-tech theater.',
      'Simple, honest pricing.',
    ].forEach((copy) => {
      expect(home).toContain(copy);
      expect(liveSmoke).toContain(copy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    });

    [
      'Start with the website. Keep the rest close.',
      'If you already started elsewhere, dayof is strongest when you move the core wedding spine.',
      'The wedding day should keep unfolding without taking over the planning flow.',
      'What couples can rely on right now',
    ].forEach((copy) => {
      expect(product).toContain(copy);
      expect(liveSmoke).toContain(copy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    });

    [
      'Built to make wedding planning feel calmer, not more manipulative.',
      'Trust gets a lot easier when the promise is narrow and real.',
      'Feature-by-feature read',
    ].forEach((copy) => {
      expect(trust).toContain(copy);
      expect(liveSmoke).toContain(copy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    });
  });

  it('does not use retired May 1 runtime wording notes as current public copy expectations', () => {
    const liveSmoke = read('tests/e2e/live-smoke.spec.ts');

    [
      'A beautiful wedding website with RSVP and guest tools built in',
      'See the actual v1 spine, not the wishlist.',
      'Core v1 claim',
      'AI helps draft, not secretly operate',
      'Launch command center',
    ].forEach((retiredCopy) => {
      expect(liveSmoke).not.toContain(retiredCopy);
    });
  });
});
