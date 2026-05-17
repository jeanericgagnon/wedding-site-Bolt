import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GuestPhotoRecapSharingCard } from './GuestPhotoRecapSharingCard';
import { DEFAULT_HUB_SETTINGS } from '../guestPhotoSharingUtils';

describe('GuestPhotoRecapSharingCard', () => {
  const hubSettings = (overrides: Partial<typeof DEFAULT_HUB_SETTINGS> = {}) => ({
    ...DEFAULT_HUB_SETTINGS,
    ...overrides,
  });

  it('keeps recap preview disabled for draft-only sites and draft recap mode', () => {
    render(
      <GuestPhotoRecapSharingCard
        guestRecapUrl="https://dayof.love/event/maya-and-leo/recap"
        isPublished={false}
        hubSettings={hubSettings({
          recap_status: 'draft',
          recap_published_at: null,
          recap_closed_at: null,
        })}
        savingHubSettings={false}
        uploadCount={14}
        recapFeaturedCount={4}
        recapStoryCount={2}
        recapHiddenCount={1}
        recapPublishWarnings={['Publish the site before opening or sharing the recap.']}
        onOpenAppUrl={vi.fn()}
        onSaveHubSettings={vi.fn()}
        onHubSettingsChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /preview recap/i })).toBeDisabled();
    expect(screen.getByText(/Publish the site before opening or sharing the guest recap\./i)).toBeInTheDocument();
    expect(screen.getByText(/Guests cannot view the recap yet\. Use this while curating\./i)).toBeInTheDocument();
    expect(screen.getByText('Publish the site before opening or sharing the recap.')).toBeInTheDocument();
  });

  it('keeps recap preview disabled and explains the closed state after sharing ends', () => {
    render(
      <GuestPhotoRecapSharingCard
        guestRecapUrl="https://dayof.love/event/maya-and-leo/recap"
        isPublished
        hubSettings={hubSettings({
          recap_status: 'closed',
          recap_published_at: '2026-05-15T12:00:00.000Z',
          recap_closed_at: '2026-05-16T12:00:00.000Z',
        })}
        savingHubSettings={false}
        uploadCount={14}
        recapFeaturedCount={4}
        recapStoryCount={2}
        recapHiddenCount={1}
        recapPublishWarnings={[]}
        onOpenAppUrl={vi.fn()}
        onSaveHubSettings={vi.fn()}
        onHubSettingsChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /preview recap/i })).toBeDisabled();
    expect(screen.getByText('Current mode: Closed')).toBeInTheDocument();
    expect(screen.getByText('The recap is intentionally unavailable.')).toBeInTheDocument();
  });

  it('opens the recap preview for quietly shared and published recap modes on live sites', () => {
    const onOpenAppUrl = vi.fn();
    const onSaveHubSettings = vi.fn();
    const onHubSettingsChange = vi.fn();

    const { rerender } = render(
      <GuestPhotoRecapSharingCard
        guestRecapUrl="https://dayof.love/event/maya-and-leo/recap"
        isPublished
        hubSettings={hubSettings({
          recap_status: 'private_link',
          recap_published_at: null,
          recap_closed_at: null,
        })}
        savingHubSettings={false}
        uploadCount={14}
        recapFeaturedCount={4}
        recapStoryCount={2}
        recapHiddenCount={1}
        recapPublishWarnings={[]}
        onOpenAppUrl={onOpenAppUrl}
        onSaveHubSettings={onSaveHubSettings}
        onHubSettingsChange={onHubSettingsChange}
      />,
    );

    expect(screen.getByRole('button', { name: /preview recap/i })).toBeEnabled();
    expect(screen.getByText('Current mode: Private link')).toBeInTheDocument();
    expect(screen.getByText(/Anyone with the recap link can view it/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /preview recap/i }));
    expect(onOpenAppUrl).toHaveBeenCalledWith('https://dayof.love/event/maya-and-leo/recap');

    rerender(
      <GuestPhotoRecapSharingCard
        guestRecapUrl="https://dayof.love/event/maya-and-leo/recap"
        isPublished
        hubSettings={hubSettings({
          recap_status: 'published',
          recap_published_at: '2026-05-15T12:00:00.000Z',
          recap_closed_at: null,
        })}
        savingHubSettings={false}
        uploadCount={14}
        recapFeaturedCount={4}
        recapStoryCount={2}
        recapHiddenCount={1}
        recapPublishWarnings={[]}
        onOpenAppUrl={onOpenAppUrl}
        onSaveHubSettings={onSaveHubSettings}
        onHubSettingsChange={onHubSettingsChange}
      />,
    );

    expect(screen.getByText('Current mode: Published')).toBeInTheDocument();
    expect(screen.getByText('The recap is live for guests.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /save status/i }));
    expect(onSaveHubSettings).toHaveBeenCalledTimes(1);
  });

  it('keeps published draft recaps curatable without reintroducing the site-publish warning', () => {
    render(
      <GuestPhotoRecapSharingCard
        guestRecapUrl="https://dayof.love/event/maya-and-leo/recap"
        isPublished
        hubSettings={hubSettings({
          recap_status: 'draft',
          recap_published_at: null,
          recap_closed_at: null,
        })}
        savingHubSettings={false}
        uploadCount={14}
        recapFeaturedCount={4}
        recapStoryCount={2}
        recapHiddenCount={1}
        recapPublishWarnings={[]}
        onOpenAppUrl={vi.fn()}
        onSaveHubSettings={vi.fn()}
        onHubSettingsChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /preview recap/i })).toBeDisabled();
    expect(screen.getByText('Current mode: Draft')).toBeInTheDocument();
    expect(screen.getByText('Guests cannot view the recap yet. Use this while curating.')).toBeInTheDocument();
    expect(screen.queryByText(/Publish the site before opening or sharing the guest recap\./i)).not.toBeInTheDocument();
  });

  it('updates recap status through owner controls with publish and close timestamps', () => {
    const onHubSettingsChange = vi.fn();

    render(
      <GuestPhotoRecapSharingCard
        guestRecapUrl="https://dayof.love/event/maya-and-leo/recap"
        isPublished
        hubSettings={hubSettings({
          recap_status: 'draft',
          recap_published_at: null,
          recap_closed_at: null,
        })}
        savingHubSettings={false}
        uploadCount={14}
        recapFeaturedCount={4}
        recapStoryCount={2}
        recapHiddenCount={1}
        recapPublishWarnings={[]}
        onOpenAppUrl={vi.fn()}
        onSaveHubSettings={vi.fn()}
        onHubSettingsChange={onHubSettingsChange}
      />,
    );

    const recapStatusSelect = screen.getByDisplayValue('Draft');
    fireEvent.change(recapStatusSelect, { target: { value: 'published' } });
    fireEvent.change(recapStatusSelect, { target: { value: 'closed' } });

    expect(onHubSettingsChange).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        recap_status: 'published',
        recap_published_at: expect.any(String),
        recap_closed_at: null,
      }),
    );
    expect(onHubSettingsChange).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        recap_status: 'closed',
        recap_published_at: null,
        recap_closed_at: expect.any(String),
      }),
    );
  });

  it('keeps recap preview disabled when no guest recap URL exists yet, even on a published site', () => {
    render(
      <GuestPhotoRecapSharingCard
        guestRecapUrl=""
        isPublished
        hubSettings={hubSettings({
          recap_status: 'private_link',
          recap_published_at: null,
          recap_closed_at: null,
        })}
        savingHubSettings={false}
        uploadCount={14}
        recapFeaturedCount={4}
        recapStoryCount={2}
        recapHiddenCount={1}
        recapPublishWarnings={[]}
        onOpenAppUrl={vi.fn()}
        onSaveHubSettings={vi.fn()}
        onHubSettingsChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /preview recap/i })).toBeDisabled();
    expect(screen.getByText('Current mode: Private link')).toBeInTheDocument();
  });

  it('shows a saving state on the owner status action while recap changes are being persisted', () => {
    render(
      <GuestPhotoRecapSharingCard
        guestRecapUrl="https://dayof.love/event/maya-and-leo/recap"
        isPublished
        hubSettings={hubSettings({
          recap_status: 'published',
          recap_published_at: '2026-05-15T12:00:00.000Z',
          recap_closed_at: null,
        })}
        savingHubSettings
        uploadCount={14}
        recapFeaturedCount={4}
        recapStoryCount={2}
        recapHiddenCount={1}
        recapPublishWarnings={[]}
        onOpenAppUrl={vi.fn()}
        onSaveHubSettings={vi.fn()}
        onHubSettingsChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /preview recap/i })).toBeEnabled();
  });
});
