import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VendorProfilePage } from './VendorProfile';
import { getMyVendorInquiryContext, getSampleVendorProfileBySlug, getVendorProfileBySlug, submitVendorInquiry } from '../lib/vendorProfiles';

vi.mock('../lib/vendorProfiles', async () => {
  const actual = await vi.importActual<typeof import('../lib/vendorProfiles')>('../lib/vendorProfiles');
  return {
    ...actual,
    getMyVendorInquiryContext: vi.fn(),
    getVendorProfileBySlug: vi.fn(),
    submitVendorInquiry: vi.fn(),
  };
});

describe('VendorProfilePage public links', () => {
  beforeEach(() => {
    vi.mocked(getVendorProfileBySlug).mockReset();
    vi.mocked(getMyVendorInquiryContext).mockReset();
    vi.mocked(getMyVendorInquiryContext).mockResolvedValue(null);
    vi.mocked(submitVendorInquiry).mockReset();
  });

  it('renders only safe public vendor links and images', async () => {
    vi.mocked(getVendorProfileBySlug).mockResolvedValue({
      id: 'vendor-1',
      slug: 'everlight',
      vendor_name: 'Everlight Studio',
      descriptor: 'Photography',
      about: 'Warm wedding photography.',
      hero_image_url: 'javascript:alert(1)',
      image_urls: ['https://cdn.example.com/photo.jpg', 'ftp://example.com/photo.jpg'],
      instagram_url: 'javascript:alert(1)',
      website_url: 'https://everlight.example.com',
      contact_email: 'hello@example.com?bcc=hidden@example.com',
      source_payload: {
        pinterest_url: 'ftp://example.com/board',
        tiktok_url: 'https://www.tiktok.com/@everlight',
      },
    });

    render(
      <MemoryRouter initialEntries={['/vendor/everlight']}>
        <Routes>
          <Route path="/vendor/:slug" element={<VendorProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Everlight Studio')).toBeInTheDocument();

    const anchors = Array.from(document.querySelectorAll('a')).map((anchor) => anchor.href);
    expect(anchors).toContain('https://everlight.example.com/');
    expect(anchors).toContain('https://www.tiktok.com/@everlight');
    expect(anchors.some((href) => href.startsWith('javascript:'))).toBe(false);
    expect(anchors.some((href) => href.startsWith('ftp:'))).toBe(false);
    expect(anchors.some((href) => href.includes('bcc='))).toBe(false);
    expect(screen.queryByRole('link', { name: /email everlight studio/i })).not.toBeInTheDocument();
    expect(screen.getByText('Package your wedding details into one clean vendor email.')).toBeInTheDocument();
    expect(screen.getByText('Send an inquiry here')).toBeInTheDocument();

    await waitFor(() => {
      const images = Array.from(document.querySelectorAll('img')).map((image) => image.getAttribute('src'));
      expect(images).toContain('https://cdn.example.com/photo.jpg');
      expect(images).not.toContain('javascript:alert(1)');
    });
  });

  it('labels inquiry fields and announces sent status after submit', async () => {
    vi.mocked(getVendorProfileBySlug).mockResolvedValue({
      id: 'vendor-1',
      slug: 'everlight',
      vendor_name: 'Everlight Studio',
      descriptor: 'Photography',
      about: 'Warm wedding photography.',
      hero_image_url: null,
      image_urls: [],
      instagram_url: null,
      website_url: null,
      contact_email: null,
      source_payload: {},
    });
    vi.mocked(submitVendorInquiry).mockResolvedValue(undefined);

    render(
      <MemoryRouter initialEntries={['/vendor/everlight']}>
        <Routes>
          <Route path="/vendor/:slug" element={<VendorProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Everlight Studio')).toBeInTheDocument();

    const name = screen.getByLabelText('Your name');
    const email = screen.getByLabelText('Email');
    const weddingDate = screen.getByLabelText('Wedding date');
    const venueName = screen.getByLabelText('Venue name');
    const venueLocation = screen.getByLabelText('Wedding location');
    const message = screen.getByLabelText('What do you need from this vendor?');
    expect(name).toHaveAttribute('id', 'vendor-inquiry-name');
    expect(email).toHaveAttribute('id', 'vendor-inquiry-email');
    expect(weddingDate).toHaveAttribute('id', 'vendor-inquiry-date');
    expect(venueName).toHaveAttribute('id', 'vendor-inquiry-venue');
    expect(venueLocation).toHaveAttribute('id', 'vendor-inquiry-location');
    expect(message).toHaveAttribute('id', 'vendor-inquiry-message');

    fireEvent.change(name, { target: { value: 'Maya' } });
    fireEvent.change(email, { target: { value: 'maya@example.com' } });
    fireEvent.change(weddingDate, { target: { value: '2026-10-04' } });
    fireEvent.change(venueName, { target: { value: 'Stonehouse Estate' } });
    fireEvent.change(venueLocation, { target: { value: 'Hudson Valley, NY' } });
    fireEvent.change(message, { target: { value: 'We are looking for a photographer.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send inquiry' }));

    await waitFor(() => {
      expect(submitVendorInquiry).toHaveBeenCalledWith({
        vendor_profile_id: 'vendor-1',
        name: 'Maya',
        email: 'maya@example.com',
        wedding_date: '2026-10-04',
        venue_name: 'Stonehouse Estate',
        venue_location: 'Hudson Valley, NY',
        message: 'We are looking for a photographer.',
      });
    });
    expect(screen.getByRole('status')).toHaveTextContent('Inquiry sent. We saved your message for follow-up.');
  });

  it('packages logged-in wedding context so couples only write the message', async () => {
    vi.mocked(getMyVendorInquiryContext).mockResolvedValue({
      couple_names: 'Maya & Lee',
      wedding_date: '2026-10-04',
      venue_name: 'Stonehouse Estate',
      venue_location: 'Hudson Valley, NY',
      site_slug: 'maya-lee',
      sender_name: 'Maya & Lee',
      sender_email: 'maya@example.com',
      summary: 'Couple: Maya & Lee\nWedding date: 2026-10-04\nVenue: Stonehouse Estate',
    });
    vi.mocked(getVendorProfileBySlug).mockResolvedValue({
      id: 'vendor-1',
      slug: 'everlight',
      vendor_name: 'Everlight Studio',
      descriptor: 'Photography',
      about: 'Warm wedding photography.',
      hero_image_url: null,
      image_urls: [],
      instagram_url: null,
      website_url: null,
      contact_email: null,
      source_payload: {},
    });
    vi.mocked(submitVendorInquiry).mockResolvedValue(undefined);

    render(
      <MemoryRouter initialEntries={['/vendor/everlight']}>
        <Routes>
          <Route path="/vendor/:slug" element={<VendorProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Everlight Studio')).toBeInTheDocument();
    expect(await screen.findByText('Your wedding details are ready')).toBeInTheDocument();
    expect(screen.queryByLabelText('Your name')).not.toBeInTheDocument();
    expect(screen.getByText('Maya & Lee')).toBeInTheDocument();
    expect(screen.getByText('/maya-lee')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('What do you need from this vendor?'), { target: { value: 'Can you share photo packages?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send inquiry' }));

    await waitFor(() => {
      expect(submitVendorInquiry).toHaveBeenCalledWith(expect.objectContaining({
        vendor_profile_id: 'vendor-1',
        name: 'Maya & Lee',
        email: 'maya@example.com',
        wedding_date: '2026-10-04',
        venue_name: 'Stonehouse Estate',
        venue_location: 'Hudson Valley, NY',
        couple_names: 'Maya & Lee',
        site_slug: 'maya-lee',
        inquiry_context: expect.stringContaining('Couple: Maya & Lee'),
        message: 'Can you share photo packages?',
      }));
    });
  });

  it('renders category-specific proof and CTA for food vendors', async () => {
    vi.mocked(getVendorProfileBySlug).mockResolvedValue({
      id: 'vendor-food',
      slug: 'sage-table',
      vendor_name: 'Sage Table Catering',
      descriptor: 'Seasonal menus and tasting support',
      about: 'Menus, tasting, and service timing for wedding weekends.',
      hero_image_url: null,
      image_urls: [],
      instagram_url: null,
      website_url: null,
      contact_email: null,
      source_payload: {
        template_id: 'food',
        vendor_customization: {
          accent_id: 'champagne',
          cta_label: 'Request a custom tasting',
          service_area: 'New England estates and tented wedding weekends',
          pricing_note: 'Menus are scoped by guest count and staffing.',
          proof_points: ['Passed bites', 'Bar staffing', 'Late-night snacks'],
          gallery_layout: 'mosaic',
          logo_text: 'STC',
          packages: [
            { title: 'Cocktail hour', detail: 'Passed bites, stations, and bar timing.', price: 'Custom quote' },
          ],
          testimonials: [
            { quote: 'Dinner felt elegant and relaxed.', attribution: 'Sample couple' },
          ],
          faqs: [
            { question: 'Can you support rentals?', answer: 'Yes. Rental coordination can be scoped into service.' },
          ],
          inquiry_questions: ['Guest count', 'Service style'],
          external_credibility: {
            enabled: true,
            source_label: 'Google',
            rating: 4.8,
            review_count: 126,
            profile_url: 'https://www.google.com/maps',
            place_id: 'sample-place',
          },
          rating: {
            enabled: true,
            overall_score: 9.3,
            summary: 'Strong fit for polished catering and smooth guest flow.',
            categories: [
              { label: 'Guest impact', score: 9.5 },
              { label: 'Logistics', score: 9.1 },
            ],
          },
        },
      },
    });
    vi.mocked(submitVendorInquiry).mockResolvedValue(undefined);

    render(
      <MemoryRouter initialEntries={['/vendor/sage-table']}>
        <Routes>
          <Route path="/vendor/:slug" element={<VendorProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Sage Table Catering')).toBeInTheDocument();
    expect(screen.getByText('Food and beverage profile')).toBeInTheDocument();
    expect(screen.getByText('Passed bites')).toBeInTheDocument();
    expect(screen.getAllByText('New England estates and tented wedding weekends').length).toBeGreaterThan(0);
    expect(screen.getByText('Menus are scoped by guest count and staffing.')).toBeInTheDocument();
    expect(screen.getByText('STC')).toBeInTheDocument();
    expect(screen.getByText('Cocktail hour')).toBeInTheDocument();
    expect(screen.getByText(/Dinner felt elegant and relaxed/)).toBeInTheDocument();
    expect(screen.getByText('Can you support rentals?')).toBeInTheDocument();
    expect(screen.getByText('Vendor fit rating')).toBeInTheDocument();
    expect(screen.getByText('External credibility')).toBeInTheDocument();
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText(/126 public reviews/)).toBeInTheDocument();
    expect(screen.getByText('9.3')).toBeInTheDocument();
    expect(screen.getByText('Guest impact')).toBeInTheDocument();
    expect(screen.getByText('Guest count')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request a custom tasting' })).toBeInTheDocument();
  });

  it('keeps local sample vendor profiles available for preview', () => {
    const sample = getSampleVendorProfileBySlug('dayof-sample-photography');
    expect(sample).toMatchObject({
      slug: 'dayof-sample-photography',
      vendor_name: 'Everlight Studio',
      source_payload: { template_id: 'photography', sampleProfile: true },
    });
  });
});
