import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const guestsSource = () => readFileSync(join(process.cwd(), 'src/pages/dashboard/Guests.tsx'), 'utf8');
const customerSafeErrorSource = () => readFileSync(join(process.cwd(), 'src/lib/customerSafeError.ts'), 'utf8');

describe('guest dashboard error safety', () => {
  it('does not surface raw database details or codes in guest add/delete/import toasts', () => {
    const source = guestsSource();

    expect(source).toContain('safeGuestsDashboardError');
    expect(source).toContain("toast(safeGuestsDashboardError(err, 'Couldn’t add guest. Please try again.'), 'error')");
    expect(source).toContain("toast(safeGuestsDashboardError(err, 'Couldn’t delete all guests. Please try again.'), 'error')");
    expect(source).toContain("toast(safeGuestsDashboardError(err, 'Couldn’t import guests. Please try again.'), 'error')");
    expect(source).not.toContain("errObj?.message || errObj?.details || 'Couldn’t delete all guests. Please try again.'");
    expect(source).not.toContain("errObj?.message || errObj?.details || errObj?.hint");
    expect(source).not.toContain('errObj?.code ? ` (${errObj.code})`');
    expect(source).not.toContain("toast(`Couldn’t import guests: ${msg}${code}`, 'error')");
  });

  it('treats backend-shaped wording as unsafe for owner-visible guest errors', () => {
    const source = customerSafeErrorSource();

    expect(source).toContain('supabase');
    expect(source).toContain('database');
    expect(source).toContain('policy');
    expect(source).toContain('relation');
    expect(source).toContain('schema');
    expect(source).toContain('sql');
    expect(source).toContain('jwt');
    expect(source).toContain('token');
  });
});
