import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VendorProfileCreatePage } from './VendorProfileCreate';
import { createVendorProfile, generateVendorProfileDraft } from '../lib/vendorProfiles';

vi.mock('../components/ui/Toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('../lib/vendorProfileLaunch', () => ({
  isVendorProfileCreationEnabled: () => true,
}));

vi.mock('../lib/vendorProfiles', async () => {
  const actual = await vi.importActual<typeof import('../lib/vendorProfiles')>('../lib/vendorProfiles');
  return {
    ...actual,
    generateVendorProfileDraft: vi.fn(),
    createVendorProfile: vi.fn(),
  };
});

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/vendor-profile-v1']}>
      <Routes>
        <Route path="/vendor-profile-v1" element={<VendorProfileCreatePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('VendorProfileCreatePage', () => {
  beforeEach(() => {
    vi.mocked(generateVendorProfileDraft).mockReset();
    vi.mocked(createVendorProfile).mockReset();
  });

  it('labels generation and draft controls, then announces published status', async () => {
    vi.mocked(generateVendorProfileDraft).mockResolvedValue({
      slug: 'everlight-studio',
      vendor_name: 'Everlight Studio',
      descriptor: 'Editorial wedding photography',
      about: 'Warm, candid wedding photography for full weekends.',
      hero_image_url: 'https://cdn.example.com/hero.jpg',
      image_urls: ['https://cdn.example.com/gallery.jpg'],
      instagram_url: 'https://instagram.com/everlight',
      website_url: 'https://everlight.example.com',
      contact_email: null,
      source_payload: { template_id: 'editorial' },
    });
    vi.mocked(createVendorProfile).mockResolvedValue({
      id: 'vendor-1',
      slug: 'everlight-studio',
      vendor_name: 'Everlight Studio',
      descriptor: 'Editorial wedding photography',
      about: 'Warm, candid wedding photography for full weekends.',
      hero_image_url: null,
      image_urls: [],
      instagram_url: null,
      website_url: null,
      contact_email: null,
      source_payload: {},
    });

    renderRoute();

    const vendorName = screen.getByLabelText('Vendor name');
    expect(vendorName).toHaveAttribute('id', 'vendor-create-name');
    expect(screen.getByLabelText('Instagram URL (optional)')).toHaveAttribute('id', 'vendor-create-instagram');
    expect(screen.getByLabelText('Website URL (optional)')).toHaveAttribute('id', 'vendor-create-website');
    expect(screen.getByLabelText('Contact email for inquiry CTA (optional)')).toHaveAttribute('id', 'vendor-create-contact-email');
    expect(screen.getByLabelText('Design style')).toHaveAttribute('id', 'vendor-create-template');

    fireEvent.change(vendorName, { target: { value: 'Everlight Studio' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate vendor profile' }));

    await waitFor(() => {
      expect(generateVendorProfileDraft).toHaveBeenCalledWith(expect.objectContaining({
        vendorName: 'Everlight Studio',
      }));
    });

    expect(await screen.findByRole('heading', { name: 'Vendor page details' })).toBeInTheDocument();
    expect(screen.getByLabelText('Public vendor name')).toHaveAttribute('id', 'vendor-draft-name');
    expect(screen.getByLabelText('Short descriptor')).toHaveAttribute('id', 'vendor-draft-descriptor');
    expect(screen.getByLabelText('Public URL slug')).toHaveAttribute('id', 'vendor-draft-slug');
    expect(screen.getByLabelText('About')).toHaveAttribute('id', 'vendor-draft-about');
    expect(screen.getByLabelText('Images')).toHaveAccessibleDescription('First line becomes the hero. Up to five more images fill the gallery.');

    fireEvent.click(screen.getByRole('button', { name: 'Publish vendor page' }));

    await waitFor(() => {
      expect(createVendorProfile).toHaveBeenCalledWith(expect.objectContaining({
        slug: 'everlight-studio',
        vendor_name: 'Everlight Studio',
      }));
    });
    expect(screen.getByRole('status')).toHaveTextContent('/vendor/everlight-studio');
  });
});
