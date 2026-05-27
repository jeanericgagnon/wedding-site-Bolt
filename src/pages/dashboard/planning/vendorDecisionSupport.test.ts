import { describe, expect, it } from 'vitest';
import { buildVendorDecisionDeck, buildVendorFitSummary, buildVendorProfileGuide } from './vendorDecisionSupport';
import type { PlanningVendor } from './planningService';
import type { VendorProfile } from '../../../lib/vendorProfiles';

const vendor = (overrides: Partial<PlanningVendor>): PlanningVendor => ({
  id: 'vendor-1',
  wedding_site_id: 'site-1',
  vendor_type: 'Photographer',
  name: 'North Light Studio',
  contact_name: 'Avery',
  email: 'hello@northlight.test',
  phone: '',
  website: 'https://northlight.test',
  contract_total: 6000,
  amount_paid: 2000,
  balance_due: 4000,
  next_payment_due: '2026-06-01',
  document_label: '',
  document_url: '',
  notes: 'Warm editorial style',
  created_at: '2026-05-01T00:00:00.000Z',
  updated_at: '2026-05-01T00:00:00.000Z',
  ...overrides,
});

describe('vendorDecisionSupport', () => {
  it('marks vendors without direct contact as urgent', () => {
    const summary = buildVendorFitSummary(
      vendor({ email: '', phone: '', balance_due: 0, next_payment_due: null }),
      {},
      new Date('2026-05-26T12:00:00.000Z'),
    );

    expect(summary.tone).toBe('urgent');
    expect(summary.label).toBe('Needs contact path');
  });

  it('builds a priority deck with the most urgent vendor first', () => {
    const deck = buildVendorDecisionDeck([
      vendor({ id: 'v1', name: 'Missing Contact', email: '', phone: '', balance_due: 0, next_payment_due: null }),
      vendor({ id: 'v2', name: 'Ready Choice', balance_due: 0, amount_paid: 6000, contract_total: 6000, next_payment_due: null }),
      vendor({ id: 'v3', name: 'Follow Up', balance_due: 0, next_payment_due: null }),
    ], {
      v3: { nextFollowUp: '2026-05-27' },
    }, new Date('2026-05-26T12:00:00.000Z'));

    expect(deck?.items[0].vendorName).toBe('Missing Contact');
    expect(deck?.badges).toContain('1 urgent');
    expect(deck?.focusTitle).toMatch(/urgency before you compare taste/i);
    expect(deck?.focusDetail).toMatch(/contact paths|payment pressure|style debates/i);
    expect(deck?.bestNextMove).toMatch(/missing contact paths|payment pressure|compare only the vendors/i);
    expect(deck?.decisionRule).toMatch(/contact paths|payment pressure/i);
    expect(deck?.sequence.map((step) => step.status)).toEqual(['current', 'next', 'then']);
    expect(deck?.sequence[0]?.title).toMatch(/contact and timing noise|Clear/i);
    expect(deck?.items[0]?.nextBestMove).toMatch(/contact path/i);
  });

  it('builds a public vendor guide from available proof signals', () => {
    const profile: VendorProfile = {
      id: 'profile-1',
      slug: 'north-light',
      vendor_name: 'North Light Studio',
      descriptor: 'Warm editorial wedding photography',
      about: 'A photo team',
      hero_image_url: 'https://example.com/hero.jpg',
      image_urls: ['https://example.com/2.jpg', 'https://example.com/3.jpg'],
      instagram_url: 'https://instagram.com/northlight',
      website_url: 'https://northlight.test',
      contact_email: 'hello@northlight.test',
      source_payload: {},
    };

    const guide = buildVendorProfileGuide(profile);

    expect(guide.label).toBe('Decision-friendly');
    expect(guide.trustSignals[0]).toContain('Gallery depth');
    expect(guide.checks[0]).toContain('gallery');
    expect(guide.focusTitle).toBe('Use proof before outreach');
    expect(guide.nextMove).toMatch(/gallery|public links/i);
    expect(guide.decisionRule).toMatch(/proof first|visual fit/i);
  });

  it('keeps lighter profiles in a cautious evaluation sequence', () => {
    const profile: VendorProfile = {
      id: 'profile-2',
      slug: 'quiet-florals',
      vendor_name: 'Quiet Florals',
      descriptor: '',
      about: 'A florist',
      hero_image_url: 'https://example.com/hero.jpg',
      image_urls: [],
      instagram_url: '',
      website_url: '',
      contact_email: '',
      source_payload: {},
    };

    const guide = buildVendorProfileGuide(profile);

    expect(guide.label).toBe('Decision guide');
    expect(guide.focusTitle).toMatch(/Gather one more layer of proof/i);
    expect(guide.nextMove).toMatch(/first-touch inquiry/i);
    expect(guide.decisionRule).toMatch(/maybe until one stronger signal appears/i);
  });
});
