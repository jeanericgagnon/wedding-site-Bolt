import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
const toastMock = vi.fn();
const writeTextMock = vi.fn();
const promptMock = vi.fn();
const generateVendorProfileDraftMock = vi.fn();
const createVendorProfileMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../components/ui/Toast', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

vi.mock('../lib/vendorProfiles', () => ({
  generateVendorProfileDraft: (...args: unknown[]) => generateVendorProfileDraftMock(...args),
  createVendorProfile: (...args: unknown[]) => createVendorProfileMock(...args),
}));

import { VendorProfileCreatePage } from './VendorProfileCreate';

describe('VendorProfileCreatePage truth copy', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    toastMock.mockReset();
    writeTextMock.mockReset();
    promptMock.mockReset();
    generateVendorProfileDraftMock.mockReset();
    createVendorProfileMock.mockReset();

    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    window.prompt = promptMock;
  });

  it('keeps vendor draft and published copy framed as a public page, not a live shell', async () => {
    generateVendorProfileDraftMock.mockResolvedValue({
      vendor_name: 'Golden Hour Studio',
      descriptor: 'Editorial wedding photography',
      slug: 'golden-hour-studio',
      about: 'Warm imagery for wedding weekends.',
      hero_image_url: null,
      image_urls: [],
      instagram_url: null,
      website_url: null,
      contact_email: null,
      source_payload: {},
    });

    createVendorProfileMock.mockResolvedValue({
      id: 'vendor-1',
      slug: 'golden-hour-studio',
    });

    render(
      <MemoryRouter>
        <VendorProfileCreatePage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('Vendor name'), {
      target: { value: 'Golden Hour Studio' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Generate vendor profile' }));

    expect(await screen.findByText('Canonical vendor page fields')).toBeInTheDocument();
    expect(screen.getByText('Everything below maps directly into the public vendor page template: hero, images, about, links, and contact.')).toBeInTheDocument();
    expect(screen.getByText('How this draft will pour into the public page shell')).toBeInTheDocument();
    expect(screen.queryByText(/live page template/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/live shell/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create vendor page' }));

    expect(await screen.findByText('Vendor page ready')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open vendor page' })).toHaveAttribute('href', '/vendor/golden-hour-studio');
    expect(screen.getByRole('button', { name: 'Copy page URL' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /open live page/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /copy live url/i })).not.toBeInTheDocument();
  });

  it('copies vendor page URLs with public-page wording', async () => {
    generateVendorProfileDraftMock.mockResolvedValue({
      vendor_name: 'Golden Hour Studio',
      descriptor: null,
      slug: 'golden-hour-studio',
      about: 'Warm imagery for wedding weekends.',
      hero_image_url: null,
      image_urls: [],
      instagram_url: null,
      website_url: null,
      contact_email: null,
      source_payload: {},
    });

    createVendorProfileMock.mockResolvedValue({
      id: 'vendor-1',
      slug: 'golden-hour-studio',
    });

    writeTextMock.mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <VendorProfileCreatePage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('Vendor name'), {
      target: { value: 'Golden Hour Studio' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate vendor profile' }));
    await screen.findByText('Canonical vendor page fields');

    fireEvent.click(screen.getByRole('button', { name: 'Create vendor page' }));
    await screen.findByText('Vendor page ready');

    fireEvent.click(screen.getByRole('button', { name: 'Copy page URL' }));

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('http://localhost:3000/vendor/golden-hour-studio');
    });
    expect(toastMock).toHaveBeenCalledWith('Vendor page URL copied.', 'success');
    expect(promptMock).not.toHaveBeenCalled();
  });
});
