import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildVaultEntryRollbackRows,
  MAX_VAULT_CONFIG_ROWS,
  MAX_VAULT_ENTRY_ROWS,
  VAULT_CONFIG_SELECT,
  VAULT_ENTRY_SELECT,
  type VaultEntry,
} from './vaultService';

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

  it('exports stable vault dashboard query caps', () => {
    expect(MAX_VAULT_CONFIG_ROWS).toBe(25);
    expect(MAX_VAULT_ENTRY_ROWS).toBe(1000);
  });

  it('keeps vault dashboard config and entry reads bounded', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/vaultService.ts'), 'utf8');

    expect(source).toContain('MAX_VAULT_CONFIG_ROWS = 25');
    expect(source).toContain('MAX_VAULT_ENTRY_ROWS = 1000');
    expect(source).toContain(".order('duration_years', { ascending: true })\n    .limit(MAX_VAULT_CONFIG_ROWS);");
    expect(source).toContain(".order('created_at', { ascending: true })\n    .limit(MAX_VAULT_ENTRY_ROWS);");
  });
});
