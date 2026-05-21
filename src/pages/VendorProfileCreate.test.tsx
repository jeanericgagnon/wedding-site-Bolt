import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VendorProfileCreatePage } from './VendorProfileCreate';
import { createVendorProfile, generateVendorProfileDraft } from '../lib/vendorProfiles';

const toastMock = vi.fn();
const copyTextOrDownloadMock = vi.fn();

vi.mock('../components/ui/Toast', () => ({
  useToast: () => ({ toast: toastMock }),
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

vi.mock('../lib/copyText', () => ({
  copyTextOrDownload: (...args: unknown[]) => copyTextOrDownloadMock(...args),
}));

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
    toastMock.mockReset();
    copyTextOrDownloadMock.mockReset();
  });

  it('labels generation and draft controls, then announces save status', async () => {
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

    const vendorName = screen.getByLabelText('Name');
    expect(vendorName).toHaveAttribute('id', 'vendor-create-name');
    expect(screen.getByLabelText('Instagram link')).toHaveAttribute('id', 'vendor-create-instagram');
    expect(screen.getByLabelText('Website link')).toHaveAttribute('id', 'vendor-create-website');
    expect(screen.getByLabelText('Email')).toHaveAttribute('id', 'vendor-create-contact-email');
    expect(screen.getByLabelText('Page style')).toHaveAttribute('id', 'vendor-create-template');
    expect(screen.getAllByText('More places').length).toBeGreaterThan(0);
    expect(screen.getByRole('option', { name: 'Food and drinks' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Beauty and getting ready' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Music and sound' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Travel and guest movement' })).toBeInTheDocument();

    fireEvent.change(vendorName, { target: { value: 'Everlight Studio' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    await waitFor(() => {
      expect(generateVendorProfileDraft).toHaveBeenCalledWith(expect.objectContaining({
        vendorName: 'Everlight Studio',
        templateId: 'photography',
      }));
    });

    expect(await screen.findByRole('heading', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getAllByText('Notes').length).toBeGreaterThan(0);
    const bodyText = document.body.textContent ?? '';
    expect(bodyText.indexOf('Notes')).toBeLessThan(bodyText.indexOf('Edit notes'));
    expect(screen.getAllByText('Basics').length).toBeGreaterThan(0);
    expect(screen.getByText('Details ready.')).toBeInTheDocument();
    expect(screen.getByText('Starter notes: send button, where they work, note, notes, details, what to know, common questions, questions for couples')).toBeInTheDocument();
    expect(screen.getAllByText('Quick check').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Starter notes').length).toBeGreaterThan(0);
    expect(screen.getAllByText('5/5 ready').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Ready Ways to reply')).toBeInTheDocument();
    expect(screen.getByText('Ready Notes')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAttribute('id', 'vendor-draft-name');
    expect(screen.getByLabelText('Description')).toHaveAttribute('id', 'vendor-draft-descriptor');
    expect(screen.getByLabelText('Link')).toHaveAttribute('id', 'vendor-draft-slug');
    expect(screen.getByRole('textbox', { name: 'About' })).toHaveAttribute('id', 'vendor-draft-about');
    expect(screen.getByRole('textbox', { name: 'Photos' })).toHaveAccessibleDescription('Put the main photo first. Add up to 11 more; the page opens with six.');
    expect(screen.getByLabelText('Color')).toHaveAttribute('id', 'vendor-draft-accent');
    expect(screen.getByLabelText('Initials')).toHaveAttribute('id', 'vendor-draft-logo');
    expect(screen.getByLabelText('Photo style')).toHaveAttribute('id', 'vendor-draft-gallery-layout');
    expect(screen.getByLabelText('Send button')).toHaveAttribute('id', 'vendor-draft-cta-label');
    expect(screen.getByLabelText('Where they work')).toHaveAttribute('id', 'vendor-draft-service-area');
    expect(screen.getByLabelText('Note')).toHaveAttribute('id', 'vendor-draft-pricing-note');
    expect(screen.getByDisplayValue('Documentary photos with a clean finish')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Wedding day and weekend events')).toBeInTheDocument();
    expect(screen.getAllByText('Details').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Shared notes').length).toBeGreaterThan(0);
    expect(screen.getByText('Notes and questions')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Google place ID for future sync')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Section order')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Details', { selector: 'summary' }));
    expect(screen.getByLabelText('Details')).toBeChecked();
    fireEvent.click(screen.getByLabelText('Details'));
    expect(screen.getByLabelText('Details')).not.toBeChecked();

    fireEvent.change(screen.getByLabelText('Send button'), { target: { value: 'Send note about our date' } });
    fireEvent.change(screen.getByLabelText('Initials'), { target: { value: 'ES' } });
    fireEvent.change(screen.getByLabelText('Where they work'), { target: { value: 'Hudson Valley and NYC' } });
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Weekend notes vary.' } });
    fireEvent.change(screen.getByLabelText('Note 1'), { target: { value: 'Early photos' } });
    fireEvent.change(screen.getByPlaceholderText('Item 1 title'), { target: { value: 'Full weekend' } });
    fireEvent.change(screen.getAllByPlaceholderText('Item note')[0], { target: { value: 'Photos from welcome party through sendoff.' } });
    fireEvent.change(screen.getAllByPlaceholderText('Range or note')[0], { target: { value: 'Start' } });
    fireEvent.click(screen.getByText('Notes and questions'));
    fireEvent.change(screen.getAllByPlaceholderText('Note')[0], { target: { value: 'They made everything feel calm.' } });
    fireEvent.change(screen.getAllByPlaceholderText('Who said it')[0], { target: { value: 'Maya and Lee' } });
    fireEvent.change(screen.getByPlaceholderText('Question 1'), { target: { value: 'Do you travel?' } });
    fireEvent.change(screen.getAllByPlaceholderText('Answer')[0], { target: { value: 'Yes, destination dates can be planned.' } });
    fireEvent.change(screen.getByPlaceholderText('Guest count'), { target: { value: 'Guest count' } });
    fireEvent.click(screen.getByText('Shared notes', { selector: 'summary' }));
    fireEvent.change(screen.getByPlaceholderText('126'), { target: { value: '212' } });
    fireEvent.change(screen.getByPlaceholderText('Google or source link'), { target: { value: 'https://www.google.com/maps' } });
    fireEvent.change(screen.getByPlaceholderText('Note on schedule, style, or limits'), { target: { value: 'Clear schedule for documentary weekend photos.' } });
    fireEvent.change(screen.getByLabelText('Topic 1'), { target: { value: 'Visual style' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save page' }));

    await waitFor(() => {
      expect(createVendorProfile).toHaveBeenCalledWith(expect.objectContaining({
        slug: 'everlight-studio',
        vendor_name: 'Everlight Studio',
        source_payload: expect.objectContaining({
          template_id: 'photography',
          vendor_customization: expect.objectContaining({
            cta_label: 'Send note about our date',
            logo_text: 'ES',
            service_area: 'Hudson Valley and NYC',
            pricing_note: 'Weekend notes vary.',
            hidden_sections: ['facts'],
            proof_points: ['Early photos', 'Schedule calm', 'Photo preview'],
            category_facts: expect.arrayContaining([
              { label: 'Style', value: 'Documentary photos with a clean finish', group: 'style' },
              { label: 'Day plan', value: 'Wedding day and weekend events', group: 'service' },
            ]),
            packages: expect.arrayContaining([
              { title: 'Full weekend', detail: 'Photos from welcome party through sendoff.', price: 'Start' },
              { title: 'Weekend story', detail: 'Welcome party, rehearsal, wedding day, and next morning photos.', price: 'Event count' },
            ]),
            testimonials: [{ quote: 'They made everything feel calm.', attribution: 'Maya and Lee' }],
            faqs: expect.arrayContaining([
              { question: 'Do you travel?', answer: 'Yes, destination dates can be planned.' },
              { question: 'Can we add an engagement session?', answer: 'Engagement sessions are possible when the schedule and location make sense.' },
            ]),
            inquiry_questions: ['Guest count', 'Venue or location', 'Photo needs'],
            external_credibility: expect.objectContaining({
              source_label: 'Google',
              rating: null,
              review_count: 212,
              profile_url: 'https://www.google.com/maps',
            }),
            rating: expect.objectContaining({
              summary: 'Clear schedule for documentary weekend photos.',
              categories: [{ label: 'Visual style', score: 0 }],
            }),
          }),
        }),
      }));
    });
    expect(screen.getByRole('status')).toHaveTextContent('/vendor/everlight-studio');
  });

  it('shows missing basics inside the public preview', async () => {
    vi.mocked(generateVendorProfileDraft).mockResolvedValue({
      slug: 'bare-vendor',
      vendor_name: 'Bare Vendor',
      descriptor: null,
      about: 'Short',
      hero_image_url: null,
      image_urls: [],
      instagram_url: null,
      website_url: null,
      contact_email: null,
      source_payload: { template_id: 'editorial' },
    });

    renderRoute();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Bare Vendor' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    await waitFor(() => expect(screen.getAllByText('Basics').length).toBeGreaterThan(0));
    expect(screen.getAllByText('2/5 ready').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Add Photos, About, Ways to reply')).toBeInTheDocument();
  });

  it('swaps untouched starter copy when the vendor type changes and keeps edited fields', async () => {
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

    renderRoute();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Everlight Studio' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    expect(await screen.findByDisplayValue('Documentary photos with a clean finish')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Venue/ }));

    expect(screen.getByDisplayValue('Send note about a tour')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Outdoor setting with indoor backup option')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Documentary photos with a clean finish')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Where they work'), { target: { value: 'Hudson Valley only' } });
    fireEvent.click(screen.getByRole('button', { name: /Music and sound/ }));

    expect(screen.getByLabelText('Where they work')).toHaveValue('Hudson Valley only');
    expect(screen.getByDisplayValue('Hear a set')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ceremony, cocktail hour, reception, or after party')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Outdoor setting with indoor backup option')).not.toBeInTheDocument();
  });

  it('shows an error toast when copying the shared vendor url fails', async () => {
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
    copyTextOrDownloadMock.mockRejectedValueOnce(new Error('copy failed'));

    renderRoute();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Everlight Studio' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    expect(await screen.findByRole('heading', { name: 'Edit' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save page' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('/vendor/everlight-studio');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Copy page link' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('Couldn’t copy the link right now.', 'error');
    });
    expect(copyTextOrDownloadMock).toHaveBeenCalledTimes(1);
  });

  it('shows a downloaded fallback label when the shared vendor url falls back from clipboard copy', async () => {
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
    copyTextOrDownloadMock.mockResolvedValueOnce('downloaded');

    renderRoute();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Everlight Studio' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    expect(await screen.findByRole('heading', { name: 'Edit' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save page' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('/vendor/everlight-studio');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Copy page link' }));

    expect(await screen.findByRole('button', { name: 'Link saved' })).toBeInTheDocument();
  });

  it('clears stale save status after the draft changes again', async () => {
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
    copyTextOrDownloadMock.mockResolvedValueOnce('copied');

    renderRoute();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Everlight Studio' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(await screen.findByRole('heading', { name: 'Edit' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save page' }));
    expect(await screen.findByRole('status')).toHaveTextContent('/vendor/everlight-studio');

    fireEvent.click(screen.getByRole('button', { name: 'Copy page link' }));
    expect(await screen.findByRole('button', { name: 'Link copied' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Everlight Studio Updated' } });

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Link copied' })).not.toBeInTheDocument();
    });
  });

  it('ignores stale vendor link copy completions after the saved draft changes', async () => {
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
    let finishCopy: ((value: 'copied') => void) | undefined;
    copyTextOrDownloadMock.mockReturnValueOnce(new Promise<'copied'>((resolve) => {
      finishCopy = resolve;
    }));

    renderRoute();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Everlight Studio' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(await screen.findByRole('heading', { name: 'Edit' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save page' }));
    expect(await screen.findByRole('status')).toHaveTextContent('/vendor/everlight-studio');

    fireEvent.click(screen.getByRole('button', { name: 'Copy page link' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Everlight Studio Updated' } });

    await act(async () => {
      finishCopy?.('copied');
    });

    expect(screen.queryByRole('button', { name: 'Link copied' })).not.toBeInTheDocument();
    expect(toastMock).not.toHaveBeenCalledWith('Link copied.', 'success');
  });
});
