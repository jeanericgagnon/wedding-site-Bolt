import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildCalmDigestDeliveryPreview, buildCalmOwnerDigest } from '../../../lib/calmOwnerDigest';
import { SettingsNotificationsPanel } from './SettingsNotificationsPanel';

describe('SettingsNotificationsPanel', () => {
  it('shows scheduled digest status and plain-text readback without overstating delivery', () => {
    const preview = buildCalmDigestDeliveryPreview({
      digest: buildCalmOwnerDigest({
        role: 'owner',
        newRsvpCount: 2,
        upcomingTaskCount: 1,
        newPhotoUploadCount: 1,
        isPublished: true,
      }),
      cadence: 'weekly',
      includePlanner: true,
      nextDeliveryAt: '2026-05-20T16:00:00.000Z',
      lastReviewedAt: '2026-05-14T17:15:00.000Z',
      emailDeliveryEnabled: false,
    });

    render(
      <SettingsNotificationsPanel
        showNotificationSettings
        notifRsvp
        notifPhotos
        notifDigest
        notifDigestCadence="weekly"
        notifDigestIncludePlanner
        notifDigestQuietUntilLabel=""
        notifDigestNextDeliveryAt="2026-05-20T16:00:00.000Z"
        notifDigestLastReviewedAt="2026-05-14T17:15:00.000Z"
        notifDigestLastDeliveredAt={null}
        notifUpdates={false}
        notifSaving={false}
        notifSuccess={null}
        notifError={null}
        digestPreview={preview}
        digestEmailText={'Owner digest\nWeekly digest · Owners and planners · Scheduled for May 20, 4:00 PM UTC after delivery is connected'}
        onToggleVisibility={vi.fn()}
        onRsvpChange={vi.fn()}
        onPhotosChange={vi.fn()}
        onDigestChange={vi.fn()}
        onDigestCadenceChange={vi.fn()}
        onDigestIncludePlannerChange={vi.fn()}
        onDigestQuietUntilLabelChange={vi.fn()}
        onUpdatesChange={vi.fn()}
        onSaveNotifications={(event) => event.preventDefault()}
      />,
    );

    expect(screen.getByText(/Digest delivery status/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Scheduled for/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/No scheduled digest yet/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/after delivery is connected/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Sample email preview/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Plain-text readback/i));
    expect(screen.getAllByText(/Owners and planners/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/^Sent$/i)).not.toBeInTheDocument();
  });
});
