import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VendorProfilePage } from './VendorProfile';
import { getVendorProfileBySlug, submitVendorInquiry } from '../lib/vendorProfiles';

vi.mock('../lib/vendorProfiles', async () => {
  const actual = await vi.importActual<typeof import('../lib/vendorProfiles')>('../lib/vendorProfiles');
  return {
    ...actual,
    getVendorProfileBySlug: vi.fn(),
    submitVendorInquiry: vi.fn(),
  };
});

describe('VendorProfilePage public links', () => {
  beforeEach(() => {
    vi.mocked(getVendorProfileBySlug).mockReset();
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
    expect(screen.getByText('Send a quick inquiry and keep the conversation moving without hunting for details.')).toBeInTheDocument();

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
    const message = screen.getByLabelText('What are you looking for?');
    expect(name).toHaveAttribute('id', 'vendor-inquiry-name');
    expect(email).toHaveAttribute('id', 'vendor-inquiry-email');
    expect(message).toHaveAttribute('id', 'vendor-inquiry-message');

    fireEvent.change(name, { target: { value: 'Maya' } });
    fireEvent.change(email, { target: { value: 'maya@example.com' } });
    fireEvent.change(message, { target: { value: 'We are looking for a photographer.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send inquiry' }));

    await waitFor(() => {
      expect(submitVendorInquiry).toHaveBeenCalledWith({
        vendor_profile_id: 'vendor-1',
        name: 'Maya',
        email: 'maya@example.com',
        message: 'We are looking for a photographer.',
      });
    });
    expect(screen.getByRole('status')).toHaveTextContent('Inquiry sent. We saved your message for follow-up.');
  });
});
