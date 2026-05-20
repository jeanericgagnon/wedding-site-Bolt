import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VaultCard } from './VaultCard';
import type { VaultConfig, VaultEntry } from './vaultService';

const copyTextOrDownloadMock = vi.fn();

vi.mock('../../lib/copyText', () => ({
  copyTextOrDownload: (...args: unknown[]) => copyTextOrDownloadMock(...args),
}));

const config: VaultConfig = {
  id: 'vault-1',
  vault_index: 1,
  label: 'First anniversary',
  duration_years: 1,
  is_enabled: true,
};

const recapEntry: VaultEntry = {
  id: 'entry-recap-1',
  vault_config_id: 'vault-1',
  vault_year: 1,
  title: 'One-Year Recap Draft',
  content: 'A recap of the year.',
  author_name: 'dayof',
  attachment_url: null,
  attachment_name: null,
  created_at: '2026-06-20T12:00:00Z',
};

const baseProps = {
  config,
  entries: [recapEntry],
  weddingDate: new Date('2025-06-20T00:00:00.000Z'),
  siteSlug: 'first-site',
  showForm: false,
  onAddEntry: vi.fn(),
  onDeleteEntry: vi.fn(),
  onSaveEntry: vi.fn(),
  onCancelForm: vi.fn(),
  onToggleEnabled: vi.fn().mockResolvedValue(undefined),
  onEdit: vi.fn(),
  onError: vi.fn(),
  resolveVaultEntryLink: vi.fn().mockResolvedValue(null),
  safeVaultDashboardError: (_err: unknown, fallback: string) => fallback,
};

describe('VaultCard', () => {
  it('ignores stale share-link copy completions after the site changes', async () => {
    let finishCopy: ((value: 'copied') => void) | undefined;
    copyTextOrDownloadMock.mockReturnValueOnce(new Promise<'copied'>((resolve) => {
      finishCopy = resolve;
    }));

    const { rerender } = render(<VaultCard {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Share First anniversary' }));

    rerender(<VaultCard {...baseProps} siteSlug="next-site" />);

    await act(async () => {
      finishCopy?.('copied');
    });

    expect(copyTextOrDownloadMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Share First anniversary' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /copied share link/i })).not.toBeInTheDocument();
    expect(baseProps.onError).not.toHaveBeenCalled();
  });
});
