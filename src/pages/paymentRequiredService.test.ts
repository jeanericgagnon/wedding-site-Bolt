import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { makePaymentRequiredBaseSlug } from './paymentRequiredService';

describe('payment required service boundary', () => {
  it('normalizes fallback site slugs for payment-required setup', () => {
    expect(makePaymentRequiredBaseSlug('Couple.Name+2026@example.com')).toBe('couplename2026');
    expect(makePaymentRequiredBaseSlug(null)).toBe('ourwedding');
  });

  it('keeps payment-required page checkout orchestration free of direct table writes', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/PaymentRequired.tsx'), 'utf8');
    const service = readFileSync(join(process.cwd(), 'src/pages/paymentRequiredService.ts'), 'utf8');

    expect(page).toContain('ensureMinimalPaymentWeddingSite(user.id, user.email)');
    expect(page).not.toContain("from '../lib/supabase'");
    expect(page).not.toContain("from('wedding_sites')");
    expect(service).toContain("supabase.rpc('wedding_site_bootstrap_write'");
    expect(service).not.toContain(".select('*')");
    expect(service).not.toContain(".from('wedding_sites')\n      .insert");
  });
});
