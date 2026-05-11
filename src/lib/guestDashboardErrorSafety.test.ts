import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const guestsCrudSource = () => readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/useGuestDashboardCrudActions.ts'), 'utf8');
const guestsOpsSource = () => readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/useGuestDashboardOpsActions.ts'), 'utf8');
const guestsImportSource = () => readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/useGuestDashboardCsvImport.ts'), 'utf8');
const guestsUtilsSource = () => readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/guestDashboardUtils.ts'), 'utf8');
const customerSafeErrorSource = () => readFileSync(join(process.cwd(), 'src/lib/customerSafeError.ts'), 'utf8');

describe('guest dashboard error safety', () => {
  it('does not surface raw database details or codes in guest add/delete/import toasts', () => {
    const crud = guestsCrudSource();
    const ops = guestsOpsSource();
    const imports = guestsImportSource();
    const utils = guestsUtilsSource();

    expect(crud).toContain('safeGuestsDashboardError');
    expect(crud).toContain("toast(safeGuestsDashboardError(err, 'Couldn’t add guest. Please try again.'), 'error')");
    expect(ops).toContain("toast(safeGuestsDashboardError(err, 'Couldn’t delete all guests. Please try again.'), 'error')");
    expect(imports).toContain("toast(safeGuestsDashboardError(err, 'Couldn’t import guests. Please try again.'), 'error')");
    expect(utils).toContain('return customerSafeErrorMessage(err, fallback);');
    expect(crud).not.toContain("errObj?.message || errObj?.details || 'Couldn’t delete all guests. Please try again.'");
    expect(imports).not.toContain("toast(`Couldn’t import guests: ${msg}${code}`, 'error')");
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
