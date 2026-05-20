import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../config/env', () => ({
  DEMO_MODE: true,
}));

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn<(_: string, args: { body?: { vaultYear?: number | null } }) => Promise<{ data: unknown; error: null }>>(
    async () => ({ data: { configs: [], config: null }, error: null }),
  ),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}));

vi.mock('../lib/publicSiteAccess', () => ({
  fetchPublicSiteAccess: vi.fn(async () => ({ status: 'unavailable', site: null })),
}));

import { VaultContribute, buildVaultAccessPayload, buildVaultIdentityPayload, getContributionWindow, getVaultCoupleName, getVaultUnlockAtIso, getVaultUnlockYear, safeVaultUploadError } from './VaultContribute';

describe('buildVaultAccessPayload', () => {
  it('packages invite and password artifacts for gated vault contribution submits', () => {
    sessionStorage.setItem('dayof_invite_token_ericandkaras', 'stored-invite');
    sessionStorage.setItem('dayof_pw_session_ericandkaras', 'password-session');
    window.history.replaceState({}, '', '/vault/ericandkaras?token=current-invite');

    expect(buildVaultAccessPayload('ericandkaras')).toEqual({
      inviteToken: 'current-invite',
      passwordSession: 'password-session',
    });
  });

  it('falls back to stored invite access when the vault URL has no token', () => {
    sessionStorage.setItem('dayof_invite_token_ericandkaras', 'stored-invite');
    sessionStorage.removeItem('dayof_pw_session_ericandkaras');
    window.history.replaceState({}, '', '/vault/ericandkaras');

    expect(buildVaultAccessPayload('ericandkaras')).toEqual({
      inviteToken: 'stored-invite',
      passwordSession: null,
    });
  });

  it('captures guest invite identity for vault contribution links', () => {
    sessionStorage.setItem('dayof_guest_invite_token_ericandkaras', 'stored-guest-invite');
    window.history.replaceState({}, '', '/vault/ericandkaras/5?invite_token=current-guest-invite');

    expect(buildVaultIdentityPayload('ericandkaras')).toEqual({
      guestInviteToken: 'current-guest-invite',
    });
  });
});

describe('vault contribution guest identity capture', () => {
  it('captures guest-specific invite identity on vault entry links alongside public access artifacts', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/VaultContribute.tsx'), 'utf8');

    expect(page).toContain('capturePublicInviteTokenFromSearch(siteSlug, searchParams);');
    expect(page).toContain('captureGuestInviteTokenFromSearch(siteSlug, searchParams);');
    expect(page).toContain("const target = vaultYear ? '/vault/invite/year' : '/vault/invite';");
    expect(page).toContain("trackGuestHubEvent(siteSlug, 'view', target");
  });
});

describe('getVaultCoupleName', () => {
  it('keeps a single partner name truthful instead of showing a broken ampersand', () => {
    expect(getVaultCoupleName({ couple_name_1: 'Alex', couple_name_2: '   ' })).toBe('Alex');
  });

  it('falls back cleanly when both partner names are blank', () => {
    expect(getVaultCoupleName({ couple_name_1: '  ', couple_name_2: null })).toBe('the couple');
  });
});

describe('getVaultUnlockYear', () => {
  it('skips invalid wedding dates instead of surfacing NaN unlock years', () => {
    expect(getVaultUnlockYear('not-a-date', 5)).toBeNull();
    expect(getVaultUnlockYear('2027-02-30', 5)).toBeNull();
  });

  it('returns the anniversary year when the wedding date is valid', () => {
    expect(getVaultUnlockYear('2026-02-23', 10)).toBe(2036);
  });
});

describe('getVaultUnlockAtIso', () => {
  it('skips invalid persisted wedding dates instead of throwing on toISOString', () => {
    expect(getVaultUnlockAtIso('not-a-date', 5)).toBeNull();
    expect(getVaultUnlockAtIso('2027-02-30', 5)).toBeNull();
    expect(getVaultUnlockAtIso(null, 5)).toBeNull();
  });

  it('returns the matching anniversary unlock timestamp when the wedding date is valid', () => {
    expect(getVaultUnlockAtIso('2026-02-23', 5)).toBe(new Date('2031-02-23T00:00:00.000Z').toISOString());
  });
});

describe('getContributionWindow', () => {
  it('ignores impossible persisted wedding dates instead of enforcing a fake upload window', () => {
    expect(getContributionWindow('2027-02-30')).toEqual({ canSubmit: true, message: null });
  });
});

describe('safeVaultUploadError', () => {
  it('hides technical save details from guest-facing vault errors', () => {
    expect(safeVaultUploadError(new Error('Supabase function policy denied access to storage bucket'))).toBe(
      'Couldn’t add that file right now. Please try again.'
    );
    expect(safeVaultUploadError(new Error('duplicate key value violates unique constraint "vault_entries_pkey"'))).toBe(
      'Couldn’t add that file right now. Please try again.'
    );
  });

  it('keeps plain validation guidance when it is already guest safe', () => {
    expect(safeVaultUploadError(new Error('Please choose an audio file for Voice type.'))).toBe(
      'Please choose an audio file for Voice type.'
    );
  });
});

describe('vault contribution data boundary', () => {
  it('loads vault configs through the public contribution service', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/VaultContribute.tsx'), 'utf8');
    const routeView = readFileSync(join(process.cwd(), 'src/pages/VaultContributeRouteView.tsx'), 'utf8');
    const service = readFileSync(join(process.cwd(), 'src/pages/vaultContributionService.ts'), 'utf8');
    const fn = readFileSync(join(process.cwd(), 'supabase/functions/vault-contribution-public/index.ts'), 'utf8');

    expect(page).toContain("from './VaultContributeRouteView'");
    expect(page).toContain('<VaultContributeRouteView');
    expect(page).toContain('loadEnabledVaultContributionConfig(siteSlug, vaultYear, buildVaultAccessPayload(siteSlug), qaOpen)');
    expect(page).toContain('listEnabledVaultContributionConfigs(siteSlug, buildVaultAccessPayload(siteSlug), qaOpen)');
    expect(page).toContain('const contributionWindow = serverContributionWindow ?? getContributionWindow(site?.wedding_date ?? null, qaOpen);');
    expect(page).toContain("setStep(sortedOptions.length === 1 ? 'form' : 'hub');");
    expect(page).toContain('uploadVaultContributionToGoogleDrive({');
    expect(page).toContain('uploadVaultContributionAttachment({');
    expect(page).toContain('submitVaultContributionRows(rows, buildVaultAccessPayload(siteSlug ?? \'\'), qaOpen)');
    expect(page).toContain('} finally {');
    expect(page).toContain('setSubmitting(false);');
    expect(page).not.toContain("if (step === 'loading')");
    expect(page).not.toContain("if (step === 'invalid')");
    expect(page).not.toContain("if (step === 'hub')");
    expect(page).not.toContain("if (step === 'success')");
    expect(page).not.toContain("if (step === 'error')");
    expect(page).not.toContain("supabase.functions.invoke('vault-upload-google-drive'");
    expect(page).not.toContain("supabase.functions.invoke('vault-entry-submit'");
    expect(routeView).toContain("if (step === 'loading') return <>{loadingView}</>;");
    expect(routeView).toContain("if (step === 'invalid') return <>{invalidView}</>;");
    expect(routeView).toContain("if (step === 'hub') return <>{hubView}</>;");
    expect(routeView).toContain("if (step === 'success') return <>{successView}</>;");
    expect(routeView).toContain("if (step === 'error') return <>{errorView}</>;");
    expect(service).toContain('export const VAULT_CONTRIBUTION_CONFIG_SELECT = ');
    expect(service).toContain("supabase.functions.invoke('vault-contribution-public'");
    expect(service).toContain("supabase.functions.invoke('vault-upload-google-drive'");
    expect(service).toContain("supabase.functions.invoke('vault-entry-submit'");
    expect(service).not.toContain(".from('vault_configs')");
    expect(fn).toContain('import { canReadPublicSubresource } from "../_shared/publicAccessGate.ts"');
    expect(fn).toContain('.select("id,site_slug,is_published,privacy_mode,guest_access_token,wedding_date")');
    expect(fn).toContain('const submissionWindow = vaultWindowStatus(site.wedding_date, qaOpen);');
    expect(fn).toContain('.from("vault_configs")');
  });

  it('keeps vault submitting state alive until the final contribution write settles', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/VaultContribute.tsx'), 'utf8');
    const finalSubmitIndex = page.indexOf("await submitVaultContributionRows(rows, buildVaultAccessPayload(siteSlug ?? ''), qaOpen)");
    const finalIdleIndex = page.indexOf('setSubmitting(false);', finalSubmitIndex);

    expect(finalSubmitIndex).toBeGreaterThan(-1);
    expect(finalIdleIndex).toBeGreaterThan(finalSubmitIndex);
    expect(page.slice(finalSubmitIndex, finalIdleIndex)).not.toContain('setSubmitting(false);');
  });

  it('clears stale guest contribution submit errors once the guest edits the form again', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/VaultContribute.tsx'), 'utf8');

    expect(page).toContain('const clearContributionSubmitError = () => setSubmitError(null);');
    expect(page).toContain("onChange={e => { clearContributionSubmitError(); setForm({ ...form, author_name: e.target.value }); }}");
    expect(page).toContain("onChange={e => { clearContributionSubmitError(); setForm({ ...form, title: e.target.value }); }}");
    expect(page).toContain("onChange={e => { clearContributionSubmitError(); setForm({ ...form, content: e.target.value }); }}");
    expect(page).toContain("onChange={e => { clearContributionSubmitError(); setForm({ ...form, media_type: e.target.value as 'text' | 'photo' | 'video' | 'voice' }); setSelectedFiles([]);");
  });

  it('clears stale guest contribution field validation once the matching field changes', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/VaultContribute.tsx'), 'utf8');

    expect(page).toContain("const clearContributionFieldError = (field: keyof typeof errors) => {");
    expect(page).toContain("clearContributionFieldError('author_name');");
    expect(page).toContain("clearContributionFieldError('content');");
    expect(page).toContain("clearContributionFieldError('attachment_url');");
    expect(page).toContain("clearContributionSubmitError();\n                      clearContributionFieldError('attachment_url');");
  });
});

describe('VaultContribute form accessibility', () => {
  it('labels required fields, message count, media type, and optional media label', async () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/vault/alex-jordan-demo/1'] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: '/vault/:siteSlug/:year',
            element: React.createElement(VaultContribute),
          }),
        ),
      ),
    );

    expect(await screen.findByRole('heading', { name: /anniversary vault/i })).toBeInTheDocument();

    const author = screen.getByLabelText(/your name/i);
    const message = screen.getByLabelText(/your message/i);
    expect(author).toHaveAttribute('id', 'vault-author-name');
    expect(message).toHaveAttribute('id', 'vault-message');
    expect(message).toHaveAttribute('aria-describedby', 'vault-message-count');
    expect(screen.getByText('0 characters')).toHaveAttribute('id', 'vault-message-count');

    fireEvent.change(message, { target: { value: 'A future toast.' } });

    expect(screen.getByText('15 characters')).toBeInTheDocument();
    expect(screen.getByLabelText('Message type')).toHaveAttribute('id', 'vault-message-type');
    expect(screen.getByLabelText(/media label/i)).toHaveAttribute('id', 'vault-media-label');
  });

  it('connects file upload limits and selected-file status when media type changes', async () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/vault/alex-jordan-demo/1'] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: '/vault/:siteSlug/:year',
            element: React.createElement(VaultContribute),
          }),
        ),
      ),
    );

    expect(await screen.findByRole('heading', { name: /anniversary vault/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Message type'), { target: { value: 'photo' } });

    const fileInput = screen.getByLabelText(/add files/i);
    expect(fileInput).toHaveAttribute('id', 'vault-file-upload');
    expect(fileInput).toHaveAttribute('aria-describedby', 'vault-file-limits vault-file-status');
    expect(screen.getByText('Up to 3 photos, 8MB each. If larger, compress first.')).toHaveAttribute('id', 'vault-file-limits');

    fireEvent.change(fileInput, {
      target: {
        files: [new File(['photo'], 'toast.jpg', { type: 'image/jpeg' })],
      },
    });

    expect(screen.getByRole('status')).toHaveTextContent('Selected: 1 file');
  });

  it('keeps the no-year guest vault route usable when only one enabled vault exists', async () => {
    invokeMock.mockImplementation(async (_fn: string, { body }: { body?: { vaultYear?: number | null } }) => {
      if (body?.vaultYear) {
        return {
          data: {
            site: { site_slug: 'alex-jordan-demo', couple_name_1: 'Alex', couple_name_2: 'Jordan', wedding_date: '2026-02-23' },
            config: { id: 'demo-vault-1', label: '1-Year Anniversary Vault', duration_years: 1, is_enabled: true },
          },
          error: null,
        };
      }

      return {
        data: {
          site: { site_slug: 'alex-jordan-demo', couple_name_1: 'Alex', couple_name_2: 'Jordan', wedding_date: '2026-02-23' },
          configs: [{ id: 'demo-vault-1', label: '1-Year Anniversary Vault', duration_years: 1, is_enabled: true }],
        },
        error: null,
      };
    });

    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/vault/alex-jordan-demo'] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: '/vault/:siteSlug',
            element: React.createElement(VaultContribute),
          }),
        ),
      ),
    );

    expect(await screen.findByRole('heading', { name: /anniversary vault/i })).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /1-Year Anniversary Vault/i })).toHaveAttribute('href', '/vault/alex-jordan-demo/1');
  });

  it('shows the vault picker instead of a blank page when the no-year route has multiple enabled vaults', async () => {
    invokeMock.mockImplementation(async (_fn: string, { body }: { body?: { vaultYear?: number | null } }) => {
      if (body?.vaultYear) {
        return {
          data: {
            site: { site_slug: 'alex-jordan-demo', couple_name_1: 'Alex', couple_name_2: 'Jordan', wedding_date: '2026-02-23' },
            config: { id: 'demo-vault-5', label: '5-Year Anniversary Vault', duration_years: 5, is_enabled: true },
          },
          error: null,
        };
      }

      return {
        data: {
          site: { site_slug: 'alex-jordan-demo', couple_name_1: 'Alex', couple_name_2: 'Jordan', wedding_date: '2026-02-23' },
          configs: [
            { id: 'demo-vault-1', label: '1-Year Anniversary Vault', duration_years: 1, is_enabled: true },
            { id: 'demo-vault-5', label: '5-Year Anniversary Vault', duration_years: 5, is_enabled: true },
          ],
        },
        error: null,
      };
    });

    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/vault/alex-jordan-demo'] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: '/vault/:siteSlug',
            element: React.createElement(VaultContribute),
          }),
        ),
      ),
    );

    expect(await screen.findByRole('heading', { name: /choose an anniversary vault/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /1-Year Anniversary Vault/i })).toHaveAttribute('href', '/vault/alex-jordan-demo/1');
    expect(screen.getByRole('link', { name: /5-Year Anniversary Vault/i })).toHaveAttribute('href', '/vault/alex-jordan-demo/5');
    expect(screen.queryByLabelText(/your name/i)).not.toBeInTheDocument();
  });

  it('sorts the no-year vault picker by anniversary year before choosing the default route state', async () => {
    invokeMock.mockImplementation(async (_fn: string, { body }: { body?: { vaultYear?: number | null } }) => {
      if (body?.vaultYear) {
        return {
          data: {
            site: { site_slug: 'alex-jordan-demo', couple_name_1: 'Alex', couple_name_2: 'Jordan', wedding_date: '2026-02-23' },
            config: { id: 'demo-vault-1', label: '1-Year Anniversary Vault', duration_years: 1, is_enabled: true },
          },
          error: null,
        };
      }

      return {
        data: {
          site: { site_slug: 'alex-jordan-demo', couple_name_1: 'Alex', couple_name_2: 'Jordan', wedding_date: '2026-02-23' },
          configs: [
            { id: 'demo-vault-10', label: '10-Year Anniversary Vault', duration_years: 10, is_enabled: true },
            { id: 'demo-vault-1', label: '1-Year Anniversary Vault', duration_years: 1, is_enabled: true },
            { id: 'demo-vault-5', label: '5-Year Anniversary Vault', duration_years: 5, is_enabled: true },
          ],
        },
        error: null,
      };
    });

    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/vault/alex-jordan-demo'] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: '/vault/:siteSlug',
            element: React.createElement(VaultContribute),
          }),
        ),
      ),
    );

    expect(await screen.findByRole('heading', { name: /choose an anniversary vault/i })).toBeInTheDocument();

    const links = [
      screen.getByRole('link', { name: /1-Year Anniversary Vault/i }),
      screen.getByRole('link', { name: /5-Year Anniversary Vault/i }),
      screen.getByRole('link', { name: /10-Year Anniversary Vault/i }),
    ];
    expect(links[0]).toHaveAttribute('href', '/vault/alex-jordan-demo/1');
  });
});
