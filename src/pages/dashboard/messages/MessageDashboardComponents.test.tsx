import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MessageCampaignThreadPanels, MessageHistorySummaryPanels, MessageReachSnapshotCard, MessageReviewQueuePanels } from './MessageDashboardComponents';

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
            deliveredRecipients: 4,
            openRate: 150,
            clickRate: 75,
            replyRate: 25,
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
    expect(screen.getByText('1 recipient needs contact details · 0 not reached yet')).toBeInTheDocument();
    expect(screen.getByText('150% open · 75% click · 25% reply')).toBeInTheDocument();
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
        channelDeliveryBreakdown={{
          email: { delivered: 10, failed: 1, skipped: 2, unreached: 3, targeted: 16 },
          sms: { delivered: 4, failed: 2, skipped: 1, unreached: 0, targeted: 7 },
        }}
        channelEngagementBreakdown={{
          email: { trackedMessages: 2, deliveredRecipients: 10, opened: 7, viewed: 3, clicked: 4, replied: 1, bounced: 0, openRate: 70, clickRate: 40, replyRate: 10 },
          sms: { trackedMessages: 1, deliveredRecipients: 4, opened: 2, viewed: 0, clicked: 1, replied: 0, bounced: 1, openRate: 50, clickRate: 25, replyRate: 0 },
        }}
        deliveryHealth={{ successRate: 75, failRate: 25, skipped: 1, skippedRate: 10, overdueScheduled: 0 }}
        historyStatusCounts={{ sent: 1, active: 2, scheduled: 1, partial: 1, failed: 1 }}
        providerTelemetry={{ attempted: 4, errorTop: [['Temporary delivery issue', 2]], sent: 3, sentRate: 75, skipped: 1 }}
      />,
    );

    expect(screen.getByText('Sent 1 · Active 2 · Scheduled 1 · Needs follow-up 0 · Needs review 0')).toBeInTheDocument();
    expect(screen.getByText('10 delivered · 1 need review')).toBeInTheDocument();
    expect(screen.getByText('2 need contact details · 3 not reached yet')).toBeInTheDocument();
    expect(screen.getByText('Sent 0 · Active 0 · Scheduled 0 · Needs follow-up 1 · Needs review 1')).toBeInTheDocument();
    expect(screen.getByText('4 delivered · 2 need review')).toBeInTheDocument();
    expect(screen.getByText('1 need contact details · 0 not reached yet')).toBeInTheDocument();
    expect(screen.getByText('7 opened · 4 clicked · 1 replied')).toBeInTheDocument();
    expect(screen.getByText('3 viewed across 2 completed campaigns')).toBeInTheDocument();
    expect(screen.getByText('70% open rate · 40% click rate · 10% reply rate')).toBeInTheDocument();
    expect(screen.getByText('2 opened · 1 clicked · 0 replied')).toBeInTheDocument();
    expect(screen.getByText('0 viewed · 1 bounced across 1 completed campaign')).toBeInTheDocument();
    expect(screen.getByText('50% open rate · 25% click rate · 0% reply rate')).toBeInTheDocument();
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
          { id: 'message-sent', status: 'sent', recipient_count: 10, delivered_count: 8, failed_count: 1, recipient_filter: { opened_count: 4, clicked_count: 2, replied_count: 1, viewed_count: 3, skipped_count: 1 } },
          { id: 'message-queued', status: 'queued' },
          { id: 'message-partial', status: 'partial', recipient_count: 4, delivered_count: 2, failed_count: 1, recipient_filter: { opened_count: 1, clicked_count: 0, replied_count: 0, viewed_count: 0 } },
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
    expect(screen.getByText('50% open rate · 20% click rate · 10% reply rate')).toBeInTheDocument();
    expect(screen.getByText('10 delivered · 2 need review')).toBeInTheDocument();
    expect(screen.getByText('1 need contact details · 1 not reached yet')).toBeInTheDocument();
    expect(screen.getByText('Photo links ready')).toBeInTheDocument();
    expect(screen.getAllByText('3')).toHaveLength(2);
  });
});

describe('MessageReviewQueuePanels', () => {
  it('keeps not-reached follow-through visible in the review queue', () => {
    render(
      <MessageReviewQueuePanels
        canCompose
        deliveries={[]}
        onRetry={vi.fn()}
        onShowNeedsFollowUp={vi.fn()}
        onShowNeedsReview={vi.fn()}
        onViewMessage={vi.fn()}
        retryCandidates={[]}
        retryingMessageId={null}
        reviewCandidates={[
          {
            id: 'review-1',
            subject: 'Weekend reminder',
            channel: 'email',
            delivered_count: 2,
            failed_count: 1,
            recipient_count: 5,
            recipient_filter: { skipped_count: 1 },
            status: 'partial',
          },
        ] as any}
      />,
    );

    expect(screen.getByText('email · delivered 2 · needs review 1 · needs contact 1 · not reached 1')).toBeInTheDocument();
  });
});
