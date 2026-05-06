import { describe, expect, it } from 'vitest';
import { buildVaultEntryRollbackRows, VAULT_CONFIG_SELECT, VAULT_ENTRY_SELECT, type VaultEntry } from './vaultService';

describe('vaultService', () => {
  it('uses explicit projections for vault dashboard data', () => {
    expect(VAULT_CONFIG_SELECT).toContain('id');
    expect(VAULT_CONFIG_SELECT).toContain('wedding_site_id');
    expect(VAULT_CONFIG_SELECT).toContain('duration_years');
    expect(VAULT_CONFIG_SELECT).not.toContain('*');

    expect(VAULT_ENTRY_SELECT).toContain('vault_config_id');
    expect(VAULT_ENTRY_SELECT).toContain('author_name');
    expect(VAULT_ENTRY_SELECT).toContain('attachment_url');
    expect(VAULT_ENTRY_SELECT).not.toContain('*');
  });

  it('preserves entry ids and timestamps when building rollback rows', () => {
    const entries: VaultEntry[] = [
      {
        id: 'entry-1',
        vault_config_id: 'vault-1',
        vault_year: 5,
        title: 'Year five',
        content: 'Keep this',
        author_name: 'Guest',
        attachment_url: null,
        attachment_name: null,
        media_type: 'text',
        created_at: '2026-05-05T20:00:00.000Z',
      },
    ];

    expect(buildVaultEntryRollbackRows(entries)).toEqual(entries);
  });
});
