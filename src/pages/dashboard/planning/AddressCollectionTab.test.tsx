import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider } from '../../../components/ui/Toast';
import { AddressCollectionTab } from './AddressCollectionTab';

const { copyTextOrDownload, downloadTextFile, loadAddressCollectionData, navigate } = vi.hoisted(() => ({
  copyTextOrDownload: vi.fn(),
  downloadTextFile: vi.fn(),
  loadAddressCollectionData: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('../../../lib/copyText', () => ({
  copyTextOrDownload: (...args: unknown[]) => copyTextOrDownload(...args),
  downloadTextFile: (...args: unknown[]) => downloadTextFile(...args),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));

vi.mock('./planningService', () => ({
  loadAddressCollectionData: (...args: unknown[]) => loadAddressCollectionData(...args),
}));

async function click(element: HTMLElement) {
  await act(async () => {
    fireEvent.click(element);
  });
}

async function select(element: HTMLElement, value: string) {
  await act(async () => {
    fireEvent.change(element, { target: { value } });
  });
}

describe('AddressCollectionTab', () => {
  beforeEach(() => {
    copyTextOrDownload.mockReset();
    downloadTextFile.mockReset();
    loadAddressCollectionData.mockReset();
    navigate.mockReset();
  });

  it('restores the address-link copy action after a failed copy', async () => {
    copyTextOrDownload.mockRejectedValueOnce(new Error('copy failed'));

    render(
      <ToastProvider>
        <AddressCollectionTab siteId="site-1" isDemoMode />
      </ToastProvider>,
    );

    const copyButton = await screen.findByRole('button', { name: /copy link/i });
    await click(copyButton);

    expect(copyTextOrDownload).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: /copy link/i })).toBeEnabled();
    expect(screen.getByText(/couldn’t copy address link right now\./i)).toBeInTheDocument();
  });

  it('restores the follow-up copy action after a failed copy', async () => {
    copyTextOrDownload.mockRejectedValueOnce(new Error('copy failed'));

    render(
      <ToastProvider>
        <AddressCollectionTab siteId="site-1" isDemoMode />
      </ToastProvider>,
    );

    const copyButton = await screen.findByRole('button', { name: /copy follow-ups/i });
    await click(copyButton);

    expect(copyTextOrDownload).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: /copy follow-ups/i })).toBeEnabled();
    expect(screen.getByText(/couldn’t copy follow-up list right now\./i)).toBeInTheDocument();
  });

  it('shows downloaded fallback labels after copy actions fall back from the clipboard', async () => {
    copyTextOrDownload
      .mockResolvedValueOnce('downloaded')
      .mockResolvedValueOnce('downloaded');

    render(
      <ToastProvider>
        <AddressCollectionTab siteId="site-1" isDemoMode />
      </ToastProvider>,
    );

    const linkButton = await screen.findByRole('button', { name: /copy link/i });
    await click(linkButton);
    expect(await screen.findByRole('button', { name: /downloaded address link/i })).toBeInTheDocument();

    const followUpsButton = screen.getByRole('button', { name: /copy follow-ups/i });
    await click(followUpsButton);
    expect(await screen.findByRole('button', { name: /downloaded guest follow-ups/i })).toBeInTheDocument();
  });

  it('ignores stale address-link copy completions after the active site changes', async () => {
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
    await click(screen.getByRole('button', { name: /copy link/i }));

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
    let finishCopy: ((value: 'copied') => void) | undefined;
    copyTextOrDownload.mockReturnValueOnce(new Promise((resolve) => {
      finishCopy = resolve;
    }));

    render(
      <ToastProvider>
        <AddressCollectionTab siteId="site-1" isDemoMode />
      </ToastProvider>,
    );

    await click(await screen.findByRole('button', { name: /copy follow-ups/i }));
    await select(screen.getByRole('combobox'), 'missing-contact');

    await act(async () => {
      finishCopy?.('copied');
    });

    expect(screen.getByRole('button', { name: /copy follow-ups/i })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /copied guest follow-ups/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/follow-up list copied\./i)).not.toBeInTheDocument();
  });

  it('copies the same follow-up guests as the active filter view', async () => {
    copyTextOrDownload.mockResolvedValue('copied');
    loadAddressCollectionData.mockResolvedValue({
      siteSlug: 'site-one',
      guests: [
        {
          id: 'missing-address',
          name: 'Needs Address',
          email: 'address@example.com',
          phone: null,
          household_id: null,
          mailing_address_line1: null,
          mailing_city: null,
        },
        {
          id: 'missing-contact',
          name: 'Needs Contact',
          email: null,
          phone: null,
          household_id: 'house-1',
          mailing_address_line1: '10 Oak St',
          mailing_city: 'Boston',
        },
      ],
    });

    render(
      <ToastProvider>
        <AddressCollectionTab siteId="site-1" />
      </ToastProvider>,
    );

    await screen.findByText('Needs Address');
    await select(screen.getByRole('combobox'), 'missing-contact');
    await screen.findByText('Needs Contact');
    await click(screen.getByRole('button', { name: /copy follow-ups/i }));

    expect(copyTextOrDownload).toHaveBeenCalledWith(
      'Needs Contact — no direct contact — household',
      'dayof-address-follow-ups.txt',
    );
    expect(copyTextOrDownload).not.toHaveBeenCalledWith(
      expect.stringContaining('Needs Address'),
      expect.any(String),
    );
  });

  it('exports the same guests as the active filter view', async () => {
    loadAddressCollectionData.mockResolvedValue({
      siteSlug: 'site-one',
      guests: [
        {
          id: 'missing-address',
          name: 'Needs Address',
          email: 'address@example.com',
          phone: null,
          household_id: null,
          mailing_address_line1: null,
          mailing_city: null,
        },
        {
          id: 'missing-contact',
          name: 'Needs Contact',
          email: null,
          phone: null,
          household_id: 'house-1',
          mailing_address_line1: '10 Oak St',
          mailing_city: 'Boston',
        },
      ],
    });

    render(
      <ToastProvider>
        <AddressCollectionTab siteId="site-1" />
      </ToastProvider>,
    );

    await screen.findByText('Needs Address');
    await select(screen.getByRole('combobox'), 'missing-contact');
    await screen.findByText('Needs Contact');
    await click(screen.getByRole('button', { name: /^export$/i }));

    expect(downloadTextFile).toHaveBeenCalledWith(
      expect.stringMatching(/^dayof-address-list-missing-contact-\d{4}-\d{2}-\d{2}\.csv$/),
      expect.stringContaining('Needs Contact'),
      'text/csv;charset=utf-8',
    );
    expect(downloadTextFile).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Needs Address'),
      expect.any(String),
    );
  });

  it('blocks draft-message actions when address planning is read-only', async () => {
    render(
      <ToastProvider>
        <AddressCollectionTab siteId="site-1" isDemoMode canEdit={false} />
      </ToastProvider>,
    );

    const emailButton = await screen.findByRole('button', { name: /draft email/i });
    const smsButton = screen.getByRole('button', { name: /draft sms/i });

    expect(emailButton).toBeDisabled();
    expect(smsButton).toBeDisabled();

    await click(emailButton);
    await click(smsButton);

    expect(navigate).not.toHaveBeenCalled();
  });

  it('copies SMS-safe text without truncating a long guest update link', async () => {
    copyTextOrDownload.mockResolvedValue('copied');
    loadAddressCollectionData.mockResolvedValue({
      siteSlug: `maya-and-leo-${'very-long-slug-'.repeat(8)}guest-updates`,
      guests: [],
    });

    render(
      <ToastProvider>
        <AddressCollectionTab siteId="site-1" />
      </ToastProvider>,
    );

    await screen.findByText(/guest-contact\//i);
    await click(screen.getByRole('button', { name: /copy text copy/i }));

    const copiedText = copyTextOrDownload.mock.calls.at(-1)?.[0];
    expect(typeof copiedText).toBe('string');
    expect(copiedText).toContain('/guest-contact/');
    expect(copiedText).toMatch(/guest-updates$/);
    expect(copiedText).not.toContain('...');
  });

  it('uses the SMS-safe template when opening the SMS draft composer', async () => {
    loadAddressCollectionData.mockResolvedValue({
      siteSlug: `maya-and-leo-${'very-long-slug-'.repeat(8)}guest-updates`,
      guests: [],
    });

    render(
      <ToastProvider>
        <AddressCollectionTab siteId="site-1" />
      </ToastProvider>,
    );

    await screen.findByText(/guest-contact\//i);
    await click(screen.getByRole('button', { name: /draft sms/i }));

    const navigationCall = navigate.mock.calls.at(-1)?.[0];
    expect(navigationCall?.pathname).toBe('/dashboard/messages');

    const params = new URLSearchParams(String(navigationCall?.search ?? '').replace(/^\?/, ''));
    expect(params.get('prefillChannel')).toBe('sms');
    expect(params.get('prefillBody')).toContain('/guest-contact/');
    expect(params.get('prefillBody')).toMatch(/guest-updates$/);
  });
});
