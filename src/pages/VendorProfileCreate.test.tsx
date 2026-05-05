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
    expect(screen.getByRole('option', { name: 'Food and beverage' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Beauty and attire' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Music and entertainment' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Travel and logistics' })).toBeInTheDocument();

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
    expect(screen.getByLabelText('Accent style')).toHaveAttribute('id', 'vendor-draft-accent');
    expect(screen.getByLabelText('Logo or monogram text')).toHaveAttribute('id', 'vendor-draft-logo');
    expect(screen.getByLabelText('Gallery layout')).toHaveAttribute('id', 'vendor-draft-gallery-layout');
    expect(screen.getByLabelText('Inquiry button label')).toHaveAttribute('id', 'vendor-draft-cta-label');
    expect(screen.getByLabelText('Service area or best fit')).toHaveAttribute('id', 'vendor-draft-service-area');
    expect(screen.getByLabelText('Pricing or planning note')).toHaveAttribute('id', 'vendor-draft-pricing-note');

    fireEvent.change(screen.getByLabelText('Inquiry button label'), { target: { value: 'Check our date' } });
    fireEvent.change(screen.getByLabelText('Logo or monogram text'), { target: { value: 'ES' } });
    fireEvent.change(screen.getByLabelText('Service area or best fit'), { target: { value: 'Hudson Valley and NYC' } });
    fireEvent.change(screen.getByLabelText('Pricing or planning note'), { target: { value: 'Custom weekend collections.' } });
    fireEvent.change(screen.getByLabelText('Proof point 1'), { target: { value: 'Fast previews' } });
    fireEvent.change(screen.getByPlaceholderText('Service 1 title'), { target: { value: 'Full weekend' } });
    fireEvent.change(screen.getAllByPlaceholderText('Short service description')[0], { target: { value: 'Coverage from welcome party through sendoff.' } });
    fireEvent.change(screen.getAllByPlaceholderText('Price hint or custom quote')[0], { target: { value: 'Custom quote' } });
    fireEvent.change(screen.getAllByPlaceholderText('Short quote')[0], { target: { value: 'They made everything feel calm.' } });
    fireEvent.change(screen.getAllByPlaceholderText('Attribution')[0], { target: { value: 'Maya and Lee' } });
    fireEvent.change(screen.getByPlaceholderText('Question 1'), { target: { value: 'Do you travel?' } });
    fireEvent.change(screen.getAllByPlaceholderText('Answer')[0], { target: { value: 'Yes, destination coverage is available.' } });
    fireEvent.change(screen.getByPlaceholderText('Estimated guest count'), { target: { value: 'Guest count' } });
    fireEvent.change(screen.getByPlaceholderText('4.8'), { target: { value: '4.9' } });
    fireEvent.change(screen.getByPlaceholderText('126'), { target: { value: '212' } });
    fireEvent.change(screen.getByPlaceholderText('Google profile URL'), { target: { value: 'https://www.google.com/maps' } });
    fireEvent.change(screen.getByPlaceholderText('Google place ID for future sync'), { target: { value: 'google-place-123' } });
    fireEvent.change(screen.getByPlaceholderText('9.2'), { target: { value: '9.6' } });
    fireEvent.change(screen.getByPlaceholderText('Why this vendor is a strong fit'), { target: { value: 'Excellent fit for documentary weekend coverage.' } });
    fireEvent.change(screen.getByPlaceholderText('Style match'), { target: { value: 'Style match' } });
    fireEvent.change(screen.getAllByPlaceholderText('9')[0], { target: { value: '9.8' } });

    fireEvent.click(screen.getByRole('button', { name: 'Publish vendor page' }));

    await waitFor(() => {
      expect(createVendorProfile).toHaveBeenCalledWith(expect.objectContaining({
        slug: 'everlight-studio',
        vendor_name: 'Everlight Studio',
        source_payload: expect.objectContaining({
          vendor_customization: expect.objectContaining({
            cta_label: 'Check our date',
            logo_text: 'ES',
            service_area: 'Hudson Valley and NYC',
            pricing_note: 'Custom weekend collections.',
            proof_points: ['Fast previews'],
            packages: [{ title: 'Full weekend', detail: 'Coverage from welcome party through sendoff.', price: 'Custom quote' }],
            testimonials: [{ quote: 'They made everything feel calm.', attribution: 'Maya and Lee' }],
            faqs: [{ question: 'Do you travel?', answer: 'Yes, destination coverage is available.' }],
            inquiry_questions: ['Guest count'],
            external_credibility: expect.objectContaining({
              source_label: 'Google',
              rating: 4.9,
              review_count: 212,
              profile_url: 'https://www.google.com/maps',
              place_id: 'google-place-123',
            }),
            rating: expect.objectContaining({
              overall_score: 9.6,
              summary: 'Excellent fit for documentary weekend coverage.',
              categories: [{ label: 'Style match', score: 9.8 }],
            }),
          }),
        }),
      }));
    });
    expect(screen.getByRole('status')).toHaveTextContent('/vendor/everlight-studio');
  });
});
