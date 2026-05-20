import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '../../../components/ui/Toast';
import { AddressCollectionTab } from './AddressCollectionTab';

const { copyTextOrDownload, loadAddressCollectionData, navigate } = vi.hoisted(() => ({
  copyTextOrDownload: vi.fn(),
  loadAddressCollectionData: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('../../../lib/copyText', () => ({
  copyTextOrDownload: (...args: unknown[]) => copyTextOrDownload(...args),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));

vi.mock('./planningService', () => ({
  loadAddressCollectionData: (...args: unknown[]) => loadAddressCollectionData(...args),
}));

describe('AddressCollectionTab', () => {
  beforeEach(() => {
    copyTextOrDownload.mockReset();
    loadAddressCollectionData.mockReset();
    navigate.mockReset();
  });

  it('restores the address-link copy action after a failed copy', async () => {
    const user = userEvent.setup();
    copyTextOrDownload.mockRejectedValueOnce(new Error('copy failed'));

    render(
      <ToastProvider>
        <AddressCollectionTab siteId="site-1" isDemoMode />
      </ToastProvider>,
    );

    const copyButton = await screen.findByRole('button', { name: /copy link/i });
    await user.click(copyButton);

    expect(copyTextOrDownload).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: /copy link/i })).toBeEnabled();
    expect(screen.getByText(/couldn’t copy address link right now\./i)).toBeInTheDocument();
  });

  it('restores the follow-up copy action after a failed copy', async () => {
    const user = userEvent.setup();
    copyTextOrDownload.mockRejectedValueOnce(new Error('copy failed'));

    render(
      <ToastProvider>
        <AddressCollectionTab siteId="site-1" isDemoMode />
      </ToastProvider>,
    );

    const copyButton = await screen.findByRole('button', { name: /copy follow-ups/i });
    await user.click(copyButton);

    expect(copyTextOrDownload).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: /copy follow-ups/i })).toBeEnabled();
    expect(screen.getByText(/couldn’t copy follow-up list right now\./i)).toBeInTheDocument();
  });

  it('shows downloaded fallback labels after copy actions fall back from the clipboard', async () => {
    const user = userEvent.setup();
    copyTextOrDownload
      .mockResolvedValueOnce('downloaded')
      .mockResolvedValueOnce('downloaded');

    render(
      <ToastProvider>
        <AddressCollectionTab siteId="site-1" isDemoMode />
      </ToastProvider>,
    );

    const linkButton = await screen.findByRole('button', { name: /copy link/i });
    await user.click(linkButton);
    expect(await screen.findByRole('button', { name: /downloaded address link/i })).toBeInTheDocument();

    const followUpsButton = screen.getByRole('button', { name: /copy follow-ups/i });
    await user.click(followUpsButton);
    expect(await screen.findByRole('button', { name: /downloaded guest follow-ups/i })).toBeInTheDocument();
  });

  it('ignores stale address-link copy completions after the active site changes', async () => {
    const user = userEvent.setup();
    let finishCopy: ((value: 'copied') => void) | undefined;
    loadAddressCollectionData
      .mockResolvedValueOnce({ siteSlug: 'site-one', guests: [] })
      .mockResolvedValueOnce({ siteSlug: 'site-two', guests: [] });
    copyTextOrDownload.mockReturnValueOnce(new Promise((resolve) => {
      finishCopy = resolve;
    }));

    const { rerender } = render(
      <ToastProvider>
        <AddressCollectionTab siteId="site-1" />
      </ToastProvider>,
    );

    await screen.findByText(/guest-contact\/site-one/i);
    await user.click(screen.getByRole('button', { name: /copy link/i }));

    rerender(
      <ToastProvider>
        <AddressCollectionTab siteId="site-2" />
      </ToastProvider>,
    );

    await screen.findByText(/guest-contact\/site-two/i);
    await act(async () => {
      finishCopy?.('copied');
    });

    expect(screen.getByRole('button', { name: /copy link/i })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /copied address link/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/address link copied\./i)).not.toBeInTheDocument();
  });

  it('ignores stale follow-up copy completions after the visible segment changes', async () => {
    const user = userEvent.setup();
    let finishCopy: ((value: 'copied') => void) | undefined;
    copyTextOrDownload.mockReturnValueOnce(new Promise((resolve) => {
      finishCopy = resolve;
    }));

    render(
      <ToastProvider>
        <AddressCollectionTab siteId="site-1" isDemoMode />
      </ToastProvider>,
    );

    await user.click(await screen.findByRole('button', { name: /copy follow-ups/i }));
    await user.selectOptions(screen.getByRole('combobox'), 'missing-contact');

    await act(async () => {
      finishCopy?.('copied');
    });

    expect(screen.getByRole('button', { name: /copy follow-ups/i })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /copied guest follow-ups/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/follow-up list copied\./i)).not.toBeInTheDocument();
  });
});
