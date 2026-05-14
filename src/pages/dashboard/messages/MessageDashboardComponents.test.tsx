import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MessageCampaignThreadPanels, MessageHistorySummaryPanels, MessageReachSnapshotCard } from './MessageDashboardComponents';

describe('MessageCampaignThreadPanels', () => {
  it('shows engagement readback on recent campaign rollups when it exists', () => {
    render(
      <MessageCampaignThreadPanels
        activeCampaignLatestMessage={null}
        activeCampaignThread={null}
        campaignThreads={[
          {
            key: 'thread-1',
            name: 'RSVP push',
            count: 2,
            delivered: 4,
            failed: 1,
            skipped: 1,
            unreached: 0,
            opened: 6,
            viewed: 2,
            clicked: 3,
            replied: 1,
            bounced: 1,
            latestStatus: 'partial',
            latestAt: 100,
          },
        ]}
        canCompose
        deliveries={[]}
        onClearThreadFilter={vi.fn()}
        onDuplicateLatest={vi.fn()}
        onEditLatest={vi.fn()}
        onScheduleFollowUp={vi.fn()}
        onSelectThread={vi.fn()}
        onStartFollowUp={vi.fn()}
        onViewLatest={vi.fn()}
      />,
    );

    expect(screen.getByText('4 delivered · 1 need review')).toBeInTheDocument();
    expect(screen.getByText('6 opened · 2 viewed · 3 clicked · 1 replied · 1 bounced')).toBeInTheDocument();
    expect(screen.getByText('1 recipient needs contact details')).toBeInTheDocument();
  });
});

describe('MessageHistorySummaryPanels', () => {
  it('keeps queued and sending activity visible in the channel breakdown', () => {
    render(
      <MessageHistorySummaryPanels
        audienceBreakdown={[]}
        campaignStatusSummary={{ draft: 0, scheduled: 1, sent: 1, partial: 1, failed: 1 }}
        channelBreakdown={{
          email: { sent: 1, active: 2, scheduled: 1, failed: 0, partial: 0, targeted: 16 },
          sms: { sent: 0, active: 0, scheduled: 0, failed: 1, partial: 1, targeted: 7 },
        }}
        deliveryHealth={{ successRate: 75, failRate: 25, skipped: 1, skippedRate: 10, overdueScheduled: 0 }}
        historyStatusCounts={{ sent: 1, active: 2, scheduled: 1, partial: 1, failed: 1 }}
        providerTelemetry={{ attempted: 4, errorTop: [['Temporary delivery issue', 2]], sent: 3, sentRate: 75, skipped: 1 }}
      />,
    );

    expect(screen.getByText('Sent 1 · Active 2 · Scheduled 1 · Needs follow-up 0 · Needs review 0')).toBeInTheDocument();
    expect(screen.getByText('Sent 0 · Active 0 · Scheduled 0 · Needs follow-up 1 · Needs review 1')).toBeInTheDocument();
  });
});

describe('MessageReachSnapshotCard', () => {
  it('separates sent, active, and follow-up campaign counts in the top reach snapshot', () => {
    render(
      <MessageReachSnapshotCard
        canCompose
        guests={[
          {
            id: 'guest-1',
            email: 'alex@example.com',
          },
          {
            id: 'guest-2',
            email: null,
          },
        ] as any}
        knownPhotoLinksCount={3}
        messages={[
          { id: 'message-sent', status: 'sent' },
          { id: 'message-queued', status: 'queued' },
          { id: 'message-partial', status: 'partial' },
        ] as any}
        onApplyComposerTemplate={vi.fn()}
        onApplyDayOfAlertPreset={vi.fn()}
        onApplySaveTheDatePreset={vi.fn()}
        onNavigatePhotos={vi.fn()}
        onQuickCreateSaveTheDateCampaign={vi.fn()}
      />,
    );

    expect(screen.getByText('Sent, active, or needs follow-up')).toBeInTheDocument();
    expect(screen.getByText('Sent 1 · Active 1 · Needs follow-up 1')).toBeInTheDocument();
    expect(screen.getByText('Photo links ready')).toBeInTheDocument();
    expect(screen.getAllByText('3')).toHaveLength(2);
  });
});
