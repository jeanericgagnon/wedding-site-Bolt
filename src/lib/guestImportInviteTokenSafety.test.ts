import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('guest import invite token safety', () => {
  it('re-applies invite tokens through the guest write path after import', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/guests/useGuestDashboardCsvImport.ts'),
      'utf8',
    );

    expect(source).toContain('await Promise.all(inserted.map(async (insertedGuest, index) => {');
    expect(source).toContain('await updateGuestForSite(importSiteId, insertedGuest.id, { invite_token: inviteToken });');
  });
});
