import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MessageCampaignThreadPanels, MessageHistoryCard, MessageHistorySummaryPanels, MessageReachSnapshotCard, MessageReviewQueuePanels } from './MessageDashboardComponents';

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
            deliveredRate: 67,
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
    expect(screen.getByText('4 recipients delivered')).toBeInTheDocument();
    expect(screen.getByText('6 targeted recipients')).toBeInTheDocument();
    expect(screen.getByText('4 of 6 targeted recipients have been delivered')).toBeInTheDocument();
    expect(screen.getByText('67% delivered coverage · 17% review coverage · 17% needs contact · 0% unreached')).toBeInTheDocument();
    expect(screen.getByText('33% cleanup still pending')).toBeInTheDocument();
    expect(screen.getByText('67% follow-through ready')).toBeInTheDocument();
    expect(screen.getByText('4 of 6 targeted recipients are already closed out')).toBeInTheDocument();
    expect(screen.getByText('4 recipients already closed out')).toBeInTheDocument();
    expect(screen.getByText('2 of 6 targeted recipients still need cleanup')).toBeInTheDocument();
    expect(screen.getByText('2 recipients still need cleanup')).toBeInTheDocument();
    expect(screen.getByText('1 of 6 targeted recipients need contact details · 0 of 6 targeted recipients were not reached yet')).toBeInTheDocument();
    expect(screen.getByText('6 opened · 2 viewed · 3 clicked · 1 replied · 1 bounced')).toBeInTheDocument();
    expect(screen.getByText('1 recipient needs contact details · 0 not reached yet')).toBeInTheDocument();
    expect(screen.getAllByText('Main cleanup: contact cleanup')).not.toHaveLength(0);
    expect(screen.getByText('150% open · 75% click · 25% reply')).toBeInTheDocument();
  });

  it('keeps the cleanup lane explicit when a campaign rollup is fully closed out', () => {
    render(
      <MessageCampaignThreadPanels
        activeCampaignLatestMessage={null}
        activeCampaignThread={null}
        campaignThreads={[
          {
            key: 'thread-clean',
            name: 'Thank-you note',
            count: 1,
            delivered: 3,
            failed: 0,
            skipped: 0,
            unreached: 0,
            opened: 2,
            viewed: 1,
            clicked: 1,
            replied: 0,
            bounced: 0,
            deliveredRecipients: 3,
            deliveredRate: 100,
            openRate: 67,
            clickRate: 33,
            replyRate: 0,
            latestStatus: 'sent',
            latestAt: 120,
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

    expect(screen.getByText('3 recipients delivered')).toBeInTheDocument();
    expect(screen.getByText('3 targeted recipients')).toBeInTheDocument();
    expect(screen.getByText('100% follow-through ready')).toBeInTheDocument();
    expect(screen.getByText('3 of 3 targeted recipients are already closed out')).toBeInTheDocument();
    expect(screen.getByText('3 recipients already closed out')).toBeInTheDocument();
    expect(screen.getByText('0 of 3 targeted recipients still need cleanup')).toBeInTheDocument();
    expect(screen.getByText('No recipients still need cleanup')).toBeInTheDocument();
    expect(screen.getByText('0 of 3 targeted recipients need contact details · 0 of 3 targeted recipients were not reached yet')).toBeInTheDocument();
    expect(screen.getByText('0 need contact details · 0 not reached yet')).toBeInTheDocument();
    expect(screen.getByText('Main cleanup: all clear')).toBeInTheDocument();
    expect(screen.getByText('2 opened · 1 viewed · 1 clicked · 0 replied')).toBeInTheDocument();
    expect(screen.getByText('67% open · 33% click · 0% reply')).toBeInTheDocument();
  });

  it('keeps recent campaign rollups explicit when zero recipients were delivered', () => {
    render(
      <MessageCampaignThreadPanels
        activeCampaignLatestMessage={null}
        activeCampaignThread={null}
        campaignThreads={[
          {
            key: 'thread-failed',
            name: 'Reminder resend',
            count: 1,
            delivered: 0,
            failed: 2,
            skipped: 1,
            unreached: 0,
            opened: 0,
            viewed: 0,
            clicked: 0,
            replied: 0,
            bounced: 0,
            deliveredRecipients: 0,
            deliveredRate: 0,
            openRate: 0,
            clickRate: 0,
            replyRate: 0,
            latestStatus: 'failed',
            latestAt: 130,
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

    expect(screen.getAllByText('0 recipients delivered')).not.toHaveLength(0);
    expect(screen.getByText('3 targeted recipients')).toBeInTheDocument();
    expect(screen.getByText('0 of 3 targeted recipients have been delivered')).toBeInTheDocument();
    expect(screen.getByText('0% delivered coverage · 67% review coverage · 33% needs contact · 0% unreached')).toBeInTheDocument();
    expect(screen.getByText('0% follow-through ready')).toBeInTheDocument();
    expect(screen.getByText('0 of 3 targeted recipients are already closed out')).toBeInTheDocument();
    expect(screen.getByText('No recipients are already closed out')).toBeInTheDocument();
    expect(screen.getByText('3 of 3 targeted recipients still need cleanup')).toBeInTheDocument();
    expect(screen.getByText('3 recipients still need cleanup')).toBeInTheDocument();
    expect(screen.getByText('1 of 3 targeted recipients need contact details · 0 of 3 targeted recipients were not reached yet')).toBeInTheDocument();
    expect(screen.getByText('0 opened · 0 viewed · 0 clicked · 0 replied')).toBeInTheDocument();
  });

  it('shows delivered coverage inside the active campaign thread chip row', () => {
    render(
      <MessageCampaignThreadPanels
        activeCampaignLatestMessage={null}
        activeCampaignThread={{
          key: 'thread-1',
          name: 'RSVP push',
          count: 2,
          delivered: 8,
          failed: 1,
          skipped: 1,
          unreached: 1,
          opened: 4,
          viewed: 2,
          clicked: 1,
          replied: 1,
          bounced: 0,
          deliveredRecipients: 8,
          deliveredRate: 73,
          openRate: 50,
          clickRate: 13,
          replyRate: 13,
          latestStatus: 'partial',
          latestAt: 100,
        }}
        campaignThreads={[]}
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

    expect(screen.getByText('Delivered 8')).toBeInTheDocument();
    expect(screen.getAllByText('8 recipients delivered')).not.toHaveLength(0);
    expect(screen.getByText('Targeted 11')).toBeInTheDocument();
    expect(screen.getByText('8 of 11 targeted recipients have been delivered')).toBeInTheDocument();
    expect(screen.getByText('73% delivered coverage')).toBeInTheDocument();
    expect(screen.getByText('9% review coverage')).toBeInTheDocument();
    expect(screen.getByText('9% needs contact')).toBeInTheDocument();
    expect(screen.getByText('9% unreached')).toBeInTheDocument();
    expect(screen.getByText('27% cleanup still pending')).toBeInTheDocument();
    expect(screen.getByText('73% follow-through ready')).toBeInTheDocument();
    expect(screen.getByText('8 of 11 targeted recipients are already closed out')).toBeInTheDocument();
    expect(screen.getByText('8 recipients already closed out')).toBeInTheDocument();
    expect(screen.getByText('3 of 11 targeted recipients still need cleanup')).toBeInTheDocument();
    expect(screen.getByText('3 recipients still need cleanup')).toBeInTheDocument();
    expect(screen.getAllByText('Main cleanup: contact cleanup')).not.toHaveLength(0);
    expect(screen.getByText('Needs review 1')).toBeInTheDocument();
    expect(screen.getByText('Needs contact 1')).toBeInTheDocument();
    expect(screen.getByText('Not reached 1')).toBeInTheDocument();
  });

  it('keeps the active campaign thread explicit when zero recipients were delivered', () => {
    render(
      <MessageCampaignThreadPanels
        activeCampaignLatestMessage={null}
        activeCampaignThread={{
          key: 'thread-1',
          name: 'RSVP push',
          count: 1,
          delivered: 0,
          failed: 3,
          skipped: 0,
          unreached: 0,
          opened: 0,
          viewed: 0,
          clicked: 0,
          replied: 0,
          bounced: 0,
          deliveredRecipients: 0,
          deliveredRate: 0,
          openRate: 0,
          clickRate: 0,
          replyRate: 0,
          latestStatus: 'failed',
          latestAt: 100,
        }}
        campaignThreads={[]}
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

    expect(screen.getAllByText('0 recipients delivered')).not.toHaveLength(0);
    expect(screen.getAllByText('Targeted 3')).not.toHaveLength(0);
    expect(screen.getByText('0 of 3 targeted recipients have been delivered')).toBeInTheDocument();
    expect(screen.getByText('0% delivered coverage')).toBeInTheDocument();
    expect(screen.getByText('0% follow-through ready')).toBeInTheDocument();
    expect(screen.getByText('0 of 3 targeted recipients are already closed out')).toBeInTheDocument();
    expect(screen.getByText('No recipients are already closed out')).toBeInTheDocument();
    expect(screen.getByText('3 of 3 targeted recipients still need cleanup')).toBeInTheDocument();
    expect(screen.getByText('3 recipients still need cleanup')).toBeInTheDocument();
    expect(screen.getAllByText('Main cleanup: delivery review')).not.toHaveLength(0);
    expect(screen.getAllByText('Opened 0')).not.toHaveLength(0);
    expect(screen.getAllByText('Viewed 0')).not.toHaveLength(0);
    expect(screen.getAllByText('Clicked 0')).not.toHaveLength(0);
    expect(screen.getAllByText('Replied 0')).not.toHaveLength(0);
    expect(screen.getAllByText('Bounced 0')).not.toHaveLength(0);
  });

  it('keeps the active campaign thread explicit before delivery counters land when the latest message already has an audience', () => {
    render(
      <MessageCampaignThreadPanels
        activeCampaignLatestMessage={{
          id: 'message-queued',
          subject: 'Save the date nudge',
          body: 'Heads up.',
          channel: 'email',
          status: 'queued',
          recipient_count: 4,
          delivered_count: 0,
          failed_count: 0,
          audience_filter: 'all',
          recipient_filter: {
            opened_count: 0,
            viewed_count: 0,
            clicked_count: 0,
            replied_count: 0,
            bounced_count: 0,
            skipped_count: 0,
          },
        } as any}
        activeCampaignThread={{
          key: 'thread-queued',
          name: 'Save the date push',
          count: 1,
          delivered: 0,
          failed: 0,
          skipped: 0,
          unreached: 0,
          opened: 0,
          viewed: 0,
          clicked: 0,
          replied: 0,
          bounced: 0,
          deliveredRecipients: 0,
          deliveredRate: 0,
          openRate: 0,
          clickRate: 0,
          replyRate: 0,
          latestStatus: 'queued',
          latestAt: 100,
        }}
        campaignThreads={[]}
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

    expect(screen.getAllByText('0 recipients delivered')).not.toHaveLength(0);
    expect(screen.getAllByText('Targeted 4')).not.toHaveLength(0);
    expect(screen.getAllByText('0 of 4 targeted recipients have been delivered')).not.toHaveLength(0);
    expect(screen.getAllByText('0% delivered coverage')).not.toHaveLength(0);
    expect(screen.getAllByText('0% review coverage')).not.toHaveLength(0);
    expect(screen.getAllByText('0% needs contact')).not.toHaveLength(0);
    expect(screen.getByText('100% unreached')).toBeInTheDocument();
    expect(screen.getByText('100% cleanup still pending')).toBeInTheDocument();
    expect(screen.getByText('0% follow-through ready')).toBeInTheDocument();
    expect(screen.getByText('0 of 4 targeted recipients are already closed out')).toBeInTheDocument();
    expect(screen.getByText('No recipients are already closed out')).toBeInTheDocument();
    expect(screen.getByText('4 of 4 targeted recipients still need cleanup')).toBeInTheDocument();
    expect(screen.getByText('4 recipients still need cleanup')).toBeInTheDocument();
    expect(screen.getByText('0 of 4 targeted recipients need contact details · 4 of 4 targeted recipients were not reached yet')).toBeInTheDocument();
    expect(screen.getByText('Main cleanup: unreached guests')).toBeInTheDocument();
    expect(screen.getByText('Main cleanup: all clear')).toBeInTheDocument();
  });

  it('shows engagement rates on the latest campaign message when delivered recipients exist', () => {
    render(
      <MessageCampaignThreadPanels
        activeCampaignLatestMessage={{
          id: 'message-1',
          subject: 'RSVP nudge',
          body: 'Please reply.',
          channel: 'email',
          status: 'partial',
          recipient_count: 10,
          delivered_count: 8,
          failed_count: 1,
          audience_filter: 'all',
          recipient_filter: {
            opened_count: 4,
            viewed_count: 2,
            clicked_count: 1,
            replied_count: 1,
            bounced_count: 1,
            skipped_count: 1,
          },
        } as any}
        activeCampaignThread={{
          key: 'thread-1',
          name: 'RSVP push',
          count: 2,
          delivered: 8,
          failed: 1,
          skipped: 1,
          unreached: 1,
          opened: 4,
          viewed: 2,
          clicked: 1,
          replied: 1,
          bounced: 1,
          deliveredRecipients: 8,
          deliveredRate: 73,
          openRate: 50,
          clickRate: 13,
          replyRate: 13,
          latestStatus: 'partial',
          latestAt: 100,
        }}
        campaignThreads={[]}
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

    expect(screen.getAllByText('8 recipients delivered')).not.toHaveLength(0);
    expect(screen.getByText('10 targeted recipients')).toBeInTheDocument();
    expect(screen.getByText('8 of 10 targeted recipients have been delivered')).toBeInTheDocument();
    expect(screen.getByText('80% delivered coverage')).toBeInTheDocument();
    expect(screen.getByText('Targeted 10')).toBeInTheDocument();
    expect(screen.getByText('10% review coverage')).toBeInTheDocument();
    expect(screen.getByText('10% needs contact')).toBeInTheDocument();
    expect(screen.getByText('0% unreached')).toBeInTheDocument();
    expect(screen.getByText('20% cleanup still pending')).toBeInTheDocument();
    expect(screen.getByText('80% follow-through ready')).toBeInTheDocument();
    expect(screen.getByText('8 of 10 targeted recipients are already closed out')).toBeInTheDocument();
    expect(screen.getAllByText('8 recipients already closed out')).not.toHaveLength(0);
    expect(screen.getByText('2 of 10 targeted recipients still need cleanup')).toBeInTheDocument();
    expect(screen.getByText('2 recipients still need cleanup')).toBeInTheDocument();
    expect(screen.getByText('1 of 10 targeted recipients need contact details · 0 of 10 targeted recipients were not reached yet')).toBeInTheDocument();
    expect(screen.getAllByText('Main cleanup: contact cleanup')).not.toHaveLength(0);
    expect(screen.getAllByText('Opened 4')).not.toHaveLength(0);
    expect(screen.getAllByText('Viewed 2')).not.toHaveLength(0);
    expect(screen.getAllByText('Clicked 1')).not.toHaveLength(0);
    expect(screen.getAllByText('Replied 1')).not.toHaveLength(0);
    expect(screen.getAllByText('Bounced 1')).not.toHaveLength(0);
    expect(screen.getByText('50% open · 13% click · 13% reply')).toBeInTheDocument();
  });

  it('keeps the latest campaign message explicit when zero recipients were delivered', () => {
    render(
      <MessageCampaignThreadPanels
        activeCampaignLatestMessage={{
          id: 'message-1',
          subject: 'RSVP nudge',
          body: 'Please reply.',
          channel: 'email',
          status: 'failed',
          recipient_count: 3,
          delivered_count: 0,
          failed_count: 3,
          audience_filter: 'all',
          recipient_filter: {
            opened_count: 0,
            viewed_count: 0,
            clicked_count: 0,
            replied_count: 0,
            bounced_count: 0,
            skipped_count: 0,
          },
        } as any}
        activeCampaignThread={{
          key: 'thread-1',
          name: 'RSVP push',
          count: 1,
          delivered: 0,
          failed: 3,
          skipped: 0,
          unreached: 0,
          opened: 0,
          viewed: 0,
          clicked: 0,
          replied: 0,
          bounced: 0,
          deliveredRecipients: 0,
          deliveredRate: 0,
          openRate: 0,
          clickRate: 0,
          replyRate: 0,
          latestStatus: 'failed',
          latestAt: 100,
        }}
        campaignThreads={[]}
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

    expect(screen.getAllByText('0 recipients delivered')).not.toHaveLength(0);
    expect(screen.getAllByText('3 targeted recipients')).not.toHaveLength(0);
    expect(screen.getAllByText('Targeted 3')).not.toHaveLength(0);
    expect(screen.getAllByText('100% review coverage')).not.toHaveLength(0);
    expect(screen.getAllByText('0% needs contact')).not.toHaveLength(0);
    expect(screen.getAllByText('0% unreached')).not.toHaveLength(0);
    expect(screen.getAllByText('100% cleanup still pending')).not.toHaveLength(0);
    expect(screen.getAllByText('0% follow-through ready')).not.toHaveLength(0);
    expect(screen.getAllByText('0 of 3 targeted recipients are already closed out')).not.toHaveLength(0);
    expect(screen.getAllByText('No recipients are already closed out')).not.toHaveLength(0);
    expect(screen.getAllByText('3 recipients still need cleanup')).not.toHaveLength(0);
    expect(screen.getAllByText('0 of 3 targeted recipients need contact details · 0 of 3 targeted recipients were not reached yet')).not.toHaveLength(0);
    expect(screen.getAllByText('Main cleanup: delivery review')).not.toHaveLength(0);
    expect(screen.getAllByText('Opened 0')).not.toHaveLength(0);
    expect(screen.getAllByText('Viewed 0')).not.toHaveLength(0);
    expect(screen.getAllByText('Clicked 0')).not.toHaveLength(0);
    expect(screen.getAllByText('Replied 0')).not.toHaveLength(0);
    expect(screen.getAllByText('Bounced 0')).not.toHaveLength(0);
  });

  it('keeps the latest campaign message explicit before recipient delivery readback lands', () => {
    render(
      <MessageCampaignThreadPanels
        activeCampaignLatestMessage={{
          id: 'message-queued',
          subject: 'Save the date nudge',
          body: 'Heads up.',
          channel: 'email',
          status: 'queued',
          recipient_count: 4,
          delivered_count: 0,
          failed_count: 0,
          audience_filter: 'all',
          recipient_filter: {
            opened_count: 0,
            viewed_count: 0,
            clicked_count: 0,
            replied_count: 0,
            bounced_count: 0,
            skipped_count: 0,
          },
        } as any}
        activeCampaignThread={{
          key: 'thread-queued',
          name: 'Save the date push',
          count: 1,
          delivered: 0,
          failed: 0,
          skipped: 0,
          unreached: 0,
          opened: 0,
          viewed: 0,
          clicked: 0,
          replied: 0,
          bounced: 0,
          deliveredRecipients: 0,
          deliveredRate: 0,
          openRate: 0,
          clickRate: 0,
          replyRate: 0,
          latestStatus: 'queued',
          latestAt: 100,
        }}
        campaignThreads={[]}
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

    expect(screen.getAllByText('0 recipients delivered')).not.toHaveLength(0);
    expect(screen.getByText('4 targeted recipients')).toBeInTheDocument();
    expect(screen.getAllByText('Targeted 4')).not.toHaveLength(0);
    expect(screen.getAllByText('0% delivered coverage')).not.toHaveLength(0);
    expect(screen.getAllByText('0% review coverage')).not.toHaveLength(0);
    expect(screen.getAllByText('0% needs contact')).not.toHaveLength(0);
    expect(screen.getAllByText('0% unreached')).not.toHaveLength(0);
    expect(screen.getAllByText('0% cleanup still pending')).not.toHaveLength(0);
    expect(screen.getAllByText('100% follow-through ready')).not.toHaveLength(0);
    expect(screen.getAllByText('4 recipients already closed out')).not.toHaveLength(0);
    expect(screen.getAllByText('No recipients still need cleanup')).not.toHaveLength(0);
    expect(screen.getAllByText('Main cleanup: all clear')).not.toHaveLength(0);
    expect(screen.getByText('0% open · 0% click · 0% reply')).toBeInTheDocument();
    expect(screen.getAllByText('Opened 0')).not.toHaveLength(0);
    expect(screen.getAllByText('Viewed 0')).not.toHaveLength(0);
    expect(screen.getAllByText('Clicked 0')).not.toHaveLength(0);
    expect(screen.getAllByText('Replied 0')).not.toHaveLength(0);
    expect(screen.getAllByText('Bounced 0')).not.toHaveLength(0);
  });
});

describe('MessageReachSnapshotCard', () => {
  it('keeps zero-targeted delivery math readable instead of implying progress that is not there yet', () => {
    render(
      <MessageReachSnapshotCard
        canCompose
        guests={[]}
        knownPhotoLinksCount={0}
        messages={[]}
        onApplyComposerTemplate={vi.fn()}
        onApplyDayOfAlertPreset={vi.fn()}
        onApplySaveTheDatePreset={vi.fn()}
        onNavigatePhotos={vi.fn()}
        onQuickCreateSaveTheDateCampaign={vi.fn()}
      />,
    );

    expect(screen.getByText('0 delivered · 0 need review')).toBeInTheDocument();
    expect(screen.getByText('0 recipients delivered')).toBeInTheDocument();
    expect(screen.getByText('0 targeted recipients')).toBeInTheDocument();
    expect(screen.getByText('0 of 0 targeted recipients have been delivered')).toBeInTheDocument();
    expect(screen.getByText('0 need contact details · 0 not reached yet')).toBeInTheDocument();
    expect(screen.getByText('0 of 0 targeted recipients need contact details · 0 of 0 targeted recipients were not reached yet')).toBeInTheDocument();
    expect(screen.getByText('0 of 0 targeted recipients are already closed out')).toBeInTheDocument();
    expect(screen.getByText('No recipients are already closed out')).toBeInTheDocument();
    expect(screen.getByText('0 of 0 targeted recipients still need cleanup')).toBeInTheDocument();
    expect(screen.getByText('No recipients still need cleanup')).toBeInTheDocument();
    expect(screen.queryByText(/% delivered coverage/)).not.toBeInTheDocument();
    expect(screen.queryByText(/% cleanup still pending/)).not.toBeInTheDocument();
    expect(screen.queryByText(/% follow-through ready/)).not.toBeInTheDocument();
  });
});

describe('MessageReachSnapshotCard', () => {
  it('keeps large audience counts visible instead of collapsing to zero', () => {
    render(
      <MessageReachSnapshotCard
        canCompose
        guests={Array.from({ length: 176 }, (_, index) => ({
          id: `guest-${index + 1}`,
          email: index < 172 ? `guest${index + 1}@example.com` : null,
        })) as any}
        knownPhotoLinksCount={0}
        messages={[]}
        onApplyComposerTemplate={vi.fn()}
        onApplyDayOfAlertPreset={vi.fn()}
        onApplySaveTheDatePreset={vi.fn()}
        onNavigatePhotos={vi.fn()}
        onQuickCreateSaveTheDateCampaign={vi.fn()}
      />,
    );

    expect(screen.getByText('Total Guests')).toBeInTheDocument();
    expect(screen.getByText('With email')).toBeInTheDocument();
    expect(screen.getByText('172')).toBeInTheDocument();
    expect(screen.queryByText('0 guests')).not.toBeInTheDocument();
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
          email: { delivered: 10, failed: 1, skipped: 2, unreached: 3, targeted: 16, deliveredRate: 63 },
          sms: { delivered: 4, failed: 2, skipped: 1, unreached: 0, targeted: 7, deliveredRate: 57 },
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
    expect(screen.getByText('10 recipients delivered')).toBeInTheDocument();
    expect(screen.getByText('16 targeted recipients')).toBeInTheDocument();
    expect(screen.getByText('10 of 16 targeted recipients have been delivered')).toBeInTheDocument();
    expect(screen.getByText('63% delivered coverage · 6% review coverage · 13% needs contact · 19% unreached')).toBeInTheDocument();
    expect(screen.getByText('38% cleanup still pending')).toBeInTheDocument();
    expect(screen.getByText('62% follow-through ready')).toBeInTheDocument();
    expect(screen.getByText('10 of 16 targeted recipients are already closed out')).toBeInTheDocument();
    expect(screen.getByText('10 recipients already closed out')).toBeInTheDocument();
    expect(screen.getByText('6 of 16 targeted recipients still need cleanup')).toBeInTheDocument();
    expect(screen.getByText('6 recipients still need cleanup')).toBeInTheDocument();
    expect(screen.getByText('2 of 16 targeted recipients need contact details · 3 of 16 targeted recipients were not reached yet')).toBeInTheDocument();
    expect(screen.getByText('2 need contact details · 3 not reached yet')).toBeInTheDocument();
    expect(screen.getByText('Main cleanup: unreached guests')).toBeInTheDocument();
    expect(screen.getByText('Sent 0 · Active 0 · Scheduled 0 · Needs follow-up 1 · Needs review 1')).toBeInTheDocument();
    expect(screen.getByText('4 delivered · 2 need review')).toBeInTheDocument();
    expect(screen.getByText('4 recipients delivered')).toBeInTheDocument();
    expect(screen.getByText('7 targeted recipients')).toBeInTheDocument();
    expect(screen.getByText('4 of 7 targeted recipients have been delivered')).toBeInTheDocument();
    expect(screen.getByText('57% delivered coverage · 29% review coverage · 14% needs contact · 0% unreached')).toBeInTheDocument();
    expect(screen.getByText('43% cleanup still pending')).toBeInTheDocument();
    expect(screen.getByText('57% follow-through ready')).toBeInTheDocument();
    expect(screen.getByText('4 of 7 targeted recipients are already closed out')).toBeInTheDocument();
    expect(screen.getByText('4 recipients already closed out')).toBeInTheDocument();
    expect(screen.getByText('3 of 7 targeted recipients still need cleanup')).toBeInTheDocument();
    expect(screen.getByText('3 recipients still need cleanup')).toBeInTheDocument();
    expect(screen.getByText('1 of 7 targeted recipients need contact details · 0 of 7 targeted recipients were not reached yet')).toBeInTheDocument();
    expect(screen.getByText('1 need contact details · 0 not reached yet')).toBeInTheDocument();
    expect(screen.getByText('Main cleanup: delivery review')).toBeInTheDocument();
    expect(screen.getByText('7 opened · 4 clicked · 1 replied')).toBeInTheDocument();
    expect(screen.getByText('3 viewed · 0 bounced across 2 completed campaigns')).toBeInTheDocument();
    expect(screen.getByText('70% open rate · 40% click rate · 10% reply rate')).toBeInTheDocument();
    expect(screen.getByText('2 opened · 1 clicked · 0 replied')).toBeInTheDocument();
    expect(screen.getByText('0 viewed · 1 bounced across 1 completed campaign')).toBeInTheDocument();
    expect(screen.getByText('50% open rate · 25% click rate · 0% reply rate')).toBeInTheDocument();
  });
});

describe('MessageReachSnapshotCard', () => {
  it('keeps guest audience totals truthful even before message activity loads', () => {
    const guests = Array.from({ length: 176 }, (_, index) => ({
      id: `guest-${index + 1}`,
      email: index < 174 ? `guest${index + 1}@example.com` : null,
    }));

    render(
      <MessageReachSnapshotCard
        canCompose
        guests={guests as any}
        knownPhotoLinksCount={0}
        messages={[]}
        onApplyComposerTemplate={vi.fn()}
        onApplyDayOfAlertPreset={vi.fn()}
        onApplySaveTheDatePreset={vi.fn()}
        onNavigatePhotos={vi.fn()}
        onQuickCreateSaveTheDateCampaign={vi.fn()}
      />,
    );

    expect(screen.getByText('Total Guests')).toBeInTheDocument();
    expect(screen.getByText('With email')).toBeInTheDocument();
    expect(screen.getByText('176')).toBeInTheDocument();
    expect(screen.getByText('174')).toBeInTheDocument();
    expect(screen.getByText('0 delivered · 0 need review')).toBeInTheDocument();
  });

  it('ignores malformed guest entries instead of crashing the reach snapshot', () => {
    render(
      <MessageReachSnapshotCard
        canCompose
        guests={[
          undefined,
          null,
          { id: '', email: 'broken@example.com' },
          { id: 'guest-1', email: 'alex@example.com' },
        ] as any}
        knownPhotoLinksCount={0}
        messages={[]}
        onApplyComposerTemplate={vi.fn()}
        onApplyDayOfAlertPreset={vi.fn()}
        onApplySaveTheDatePreset={vi.fn()}
        onNavigatePhotos={vi.fn()}
        onQuickCreateSaveTheDateCampaign={vi.fn()}
      />,
    );

    expect(screen.getByText('Total Guests')).toBeInTheDocument();
    expect(screen.getByText('With email')).toBeInTheDocument();
    expect(screen.getAllByText('1')).toHaveLength(2);
    expect(screen.getByText('0 delivered · 0 need review')).toBeInTheDocument();
  });

  it('separates sent, active, follow-up, and review campaign counts in the top reach snapshot', () => {
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
          { id: 'message-failed', status: 'failed', recipient_count: 3, delivered_count: 0, failed_count: 3 },
        ] as any}
        onApplyComposerTemplate={vi.fn()}
        onApplyDayOfAlertPreset={vi.fn()}
        onApplySaveTheDatePreset={vi.fn()}
        onNavigatePhotos={vi.fn()}
        onQuickCreateSaveTheDateCampaign={vi.fn()}
      />,
    );

    expect(screen.getByText('Sent, active, follow-up, or review')).toBeInTheDocument();
    expect(screen.getByText('Sent 1 · Active 1 · Needs follow-up 1 · Needs review 1')).toBeInTheDocument();
    expect(screen.getByText('50% open rate · 20% click rate · 10% reply rate')).toBeInTheDocument();
    expect(screen.getByText('10 delivered · 5 need review')).toBeInTheDocument();
    expect(screen.getByText('10 recipients delivered')).toBeInTheDocument();
    expect(screen.getByText('17 targeted recipients')).toBeInTheDocument();
    expect(screen.getByText('1 need contact details · 2 not reached yet')).toBeInTheDocument();
    expect(screen.getByText('59% delivered coverage · 29% review coverage · 6% needs contact · 12% unreached')).toBeInTheDocument();
    expect(screen.getByText('47% cleanup still pending')).toBeInTheDocument();
    expect(screen.getByText('8 recipients still need cleanup')).toBeInTheDocument();
    expect(screen.getByText('9 of 17 targeted recipients are already closed out')).toBeInTheDocument();
    expect(screen.getByText('8 of 17 targeted recipients still need cleanup')).toBeInTheDocument();
    expect(screen.getByText('Main cleanup: delivery review')).toBeInTheDocument();
    expect(screen.getByText('Photo links ready')).toBeInTheDocument();
    expect(screen.getByText('Photo links ready').parentElement).toHaveTextContent('3');
  });

  it('keeps the top reach snapshot explicit when cleanup is fully closed out', () => {
    render(
      <MessageReachSnapshotCard
        canCompose
        guests={[{ id: 'guest-1', email: 'alex@example.com' }] as any}
        knownPhotoLinksCount={0}
        messages={[
          { id: 'message-sent', status: 'sent', recipient_count: 3, delivered_count: 3, failed_count: 0, recipient_filter: { opened_count: 2, clicked_count: 1, replied_count: 0, viewed_count: 1, skipped_count: 0 } },
        ] as any}
        onApplyComposerTemplate={vi.fn()}
        onApplyDayOfAlertPreset={vi.fn()}
        onApplySaveTheDatePreset={vi.fn()}
        onNavigatePhotos={vi.fn()}
        onQuickCreateSaveTheDateCampaign={vi.fn()}
      />,
    );

    expect(screen.getByText('3 recipients delivered')).toBeInTheDocument();
    expect(screen.getByText('3 targeted recipients')).toBeInTheDocument();
    expect(screen.getByText('100% follow-through ready')).toBeInTheDocument();
    expect(screen.getByText('3 recipients already closed out')).toBeInTheDocument();
    expect(screen.getByText('No recipients still need cleanup')).toBeInTheDocument();
    expect(screen.getByText('Main cleanup: all clear')).toBeInTheDocument();
  });

  it('keeps large reach counts visible while viewer mode locks the helpful-start actions', () => {
    render(
      <MessageReachSnapshotCard
        canCompose={false}
        guests={Array.from({ length: 176 }, (_, index) => ({
          id: `guest-${index + 1}`,
          email: index < 172 ? `guest${index + 1}@example.com` : null,
        })) as any}
        knownPhotoLinksCount={2}
        messages={[]}
        onApplyComposerTemplate={vi.fn()}
        onApplyDayOfAlertPreset={vi.fn()}
        onApplySaveTheDatePreset={vi.fn()}
        onNavigatePhotos={vi.fn()}
        onQuickCreateSaveTheDateCampaign={vi.fn()}
      />,
    );

    expect(screen.getByText('176')).toBeInTheDocument();
    expect(screen.getByText('172')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save-the-date draft/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /schedule save-the-date/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /day-of update draft/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /use photo request/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /open photos/i })).toBeEnabled();
  });

  it('keeps the top reach snapshot explicit when no recipients are closed out yet', () => {
    render(
      <MessageReachSnapshotCard
        canCompose
        guests={[{ id: 'guest-1', email: 'alex@example.com' }] as any}
        knownPhotoLinksCount={0}
        messages={[
          { id: 'message-failed', status: 'failed', recipient_count: 3, delivered_count: 0, failed_count: 3, recipient_filter: { skipped_count: 0 } },
        ] as any}
        onApplyComposerTemplate={vi.fn()}
        onApplyDayOfAlertPreset={vi.fn()}
        onApplySaveTheDatePreset={vi.fn()}
        onNavigatePhotos={vi.fn()}
        onQuickCreateSaveTheDateCampaign={vi.fn()}
      />,
    );

    expect(screen.getByText('No recipients are already closed out')).toBeInTheDocument();
    expect(screen.getByText('3 recipients still need cleanup')).toBeInTheDocument();
  });

  it('keeps the top reach engagement summary explicit before any tracked campaigns land', () => {
    render(
      <MessageReachSnapshotCard
        canCompose
        guests={[{ id: 'guest-1', email: 'alex@example.com' }] as any}
        knownPhotoLinksCount={0}
        messages={[
          { id: 'message-queued', status: 'queued' },
          { id: 'message-failed', status: 'failed', recipient_count: 2, delivered_count: 0, failed_count: 2 },
        ] as any}
        onApplyComposerTemplate={vi.fn()}
        onApplyDayOfAlertPreset={vi.fn()}
        onApplySaveTheDatePreset={vi.fn()}
        onNavigatePhotos={vi.fn()}
        onQuickCreateSaveTheDateCampaign={vi.fn()}
      />,
    );

    expect(screen.getByText('0 opened · 0 clicked · 0 replied')).toBeInTheDocument();
    expect(screen.getByText('0 viewed across guest pages · 0 bounced')).toBeInTheDocument();
    expect(screen.getByText('0% open rate · 0% click rate · 0% reply rate')).toBeInTheDocument();
  });

  it('keeps the top reach delivery summary explicit before any recipient delivery readback lands', () => {
    render(
      <MessageReachSnapshotCard
        canCompose
        guests={[{ id: 'guest-1', email: 'alex@example.com' }] as any}
        knownPhotoLinksCount={0}
        messages={[
          { id: 'message-queued', status: 'queued' },
        ] as any}
        onApplyComposerTemplate={vi.fn()}
        onApplyDayOfAlertPreset={vi.fn()}
        onApplySaveTheDatePreset={vi.fn()}
        onNavigatePhotos={vi.fn()}
        onQuickCreateSaveTheDateCampaign={vi.fn()}
      />,
    );

    expect(screen.getByText('0 delivered · 0 need review')).toBeInTheDocument();
    expect(screen.getByText('0 recipients delivered')).toBeInTheDocument();
    expect(screen.getByText('0 targeted recipients')).toBeInTheDocument();
    expect(screen.getByText('0 need contact details · 0 not reached yet')).toBeInTheDocument();
    expect(screen.queryByText('0% delivered coverage · 0% review coverage · 0% needs contact · 0% unreached')).not.toBeInTheDocument();
    expect(screen.queryByText('0% cleanup still pending')).not.toBeInTheDocument();
    expect(screen.queryByText('0% follow-through ready')).not.toBeInTheDocument();
    expect(screen.getByText('No recipients are already closed out')).toBeInTheDocument();
    expect(screen.getByText('No recipients still need cleanup')).toBeInTheDocument();
    expect(screen.getByText('Main cleanup: all clear')).toBeInTheDocument();
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
    expect(screen.getByText('5 targeted recipients · 40% delivered coverage · 20% review coverage · 20% needs contact · 20% unreached')).toBeInTheDocument();
    expect(screen.getByText('60% cleanup still pending · 40% follow-through ready')).toBeInTheDocument();
    expect(screen.getByText('2 of 5 targeted recipients are already closed out · 3 of 5 targeted recipients still need cleanup')).toBeInTheDocument();
    expect(screen.getByText('2 recipients already closed out · 3 recipients still need cleanup')).toBeInTheDocument();
    expect(screen.getByText('1 of 5 targeted recipients need contact details · 1 of 5 targeted recipients were not reached yet')).toBeInTheDocument();
    expect(screen.getByText('Main cleanup: contact cleanup')).toBeInTheDocument();
  });

  it('keeps viewer mode from sending retries while still allowing message review', () => {
    const onRetry = vi.fn();
    const onViewMessage = vi.fn();

    render(
      <MessageReviewQueuePanels
        canCompose={false}
        deliveries={[]}
        onRetry={onRetry}
        onShowNeedsFollowUp={vi.fn()}
        onShowNeedsReview={vi.fn()}
        onViewMessage={onViewMessage}
        retryCandidates={[
          {
            id: 'retry-1',
            subject: 'Weekend reminder',
            status: 'failed',
            channel: 'email',
            recipient_count: 5,
          },
        ] as any}
        retryingMessageId={null}
        reviewCandidates={[
          {
            id: 'review-2',
            subject: 'Travel follow-up',
            channel: 'email',
            delivered_count: 2,
            failed_count: 1,
            recipient_count: 4,
            recipient_filter: { skipped_count: 1 },
            status: 'partial',
          },
        ] as any}
      />,
    );

    expect(screen.getByRole('button', { name: /^Send again$/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /^Review$/i }));

    expect(onRetry).not.toHaveBeenCalled();
    expect(onViewMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 'review-2' }));
  });
});

describe('MessageHistoryCard', () => {
  it('resets stale filters when jumping from review shortcuts into history', () => {
    const onSetHistoryStatusFilter = vi.fn();
    const onSetHistoryChannelFilter = vi.fn();
    const onSetHistoryDeliveryFilter = vi.fn();
    const onSetHistoryCampaignFilter = vi.fn();
    const onSetHistorySearch = vi.fn();

    render(
      <MessageHistoryCard
        activeCampaignLatestMessage={null}
        activeCampaignThread={null}
        audienceBreakdown={[]}
        campaignStatusSummary={{ draft: 0, scheduled: 0, sent: 0, partial: 1, failed: 1 }}
        campaignThreads={[]}
        canCompose
        channelBreakdown={{
          email: { sent: 0, active: 0, scheduled: 0, failed: 0, partial: 1, targeted: 3 },
          sms: { sent: 0, active: 0, scheduled: 0, failed: 1, partial: 0, targeted: 2 },
        }}
        channelDeliveryBreakdown={{
          email: { delivered: 1, failed: 0, skipped: 1, unreached: 1, targeted: 3, deliveredRate: 33 },
          sms: { delivered: 0, failed: 1, skipped: 0, unreached: 1, targeted: 2, deliveredRate: 0 },
        }}
        channelEngagementBreakdown={{
          email: { trackedMessages: 1, deliveredRecipients: 1, opened: 0, viewed: 0, clicked: 0, replied: 0, bounced: 0, openRate: 0, clickRate: 0, replyRate: 0 },
          sms: { trackedMessages: 0, deliveredRecipients: 0, opened: 0, viewed: 0, clicked: 0, replied: 0, bounced: 0, openRate: 0, clickRate: 0, replyRate: 0 },
        }}
        deliveries={[]}
        deliveryHealth={{ successRate: 50, failRate: 50, skipped: 1, skippedRate: 20, overdueScheduled: 0 }}
        filteredHistory={[]}
        historyAudienceFilter="all"
        historyCampaignFilter="Old thread"
        historyChannelFilter="sms"
        historyDeliveryFilter="skipped"
        historySearch="old query"
        historyStatusCounts={{ sent: 0, active: 0, scheduled: 0, partial: 1, failed: 1 }}
        historyStatusFilter="all"
        messages={[] as any}
        providerTelemetry={{ attempted: 1, errorTop: [], sent: 0, sentRate: 0, skipped: 0 }}
        retryCandidates={[]}
        retryingMessageId={null}
        reviewCandidates={[{ id: 'review-1', subject: 'Follow-up', status: 'partial', channel: 'email', delivered_count: 1, failed_count: 0, recipient_count: 3, recipient_filter: { skipped_count: 1 } } as any]}
        onCancelSchedule={vi.fn()}
        onClearThreadFilter={vi.fn()}
        onDuplicateLatest={vi.fn()}
        onEditLatest={vi.fn()}
        onRescheduleMessage={vi.fn()}
        onRetry={vi.fn()}
        onScheduleFollowUp={vi.fn()}
        onSelectThread={vi.fn()}
        onSendScheduledNow={vi.fn()}
        onSetHistoryAudienceFilter={vi.fn()}
        onSetHistoryCampaignFilter={onSetHistoryCampaignFilter}
        onSetHistoryChannelFilter={onSetHistoryChannelFilter}
        onSetHistoryDeliveryFilter={onSetHistoryDeliveryFilter}
        onSetHistorySearch={onSetHistorySearch}
        onSetHistoryStatusFilter={onSetHistoryStatusFilter}
        onStartFollowUp={vi.fn()}
        onViewMessage={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('View needs follow-up'));

    expect(onSetHistoryStatusFilter).toHaveBeenCalledWith('partial');
    expect(onSetHistoryChannelFilter).toHaveBeenCalledWith('all');
    expect(onSetHistoryDeliveryFilter).toHaveBeenCalledWith('all');
    expect(onSetHistoryCampaignFilter).toHaveBeenCalledWith('');
    expect(onSetHistorySearch).toHaveBeenCalledWith('');
  });

  it('keeps history-row engagement explicit when all engagement counts are zero', () => {
    render(
      <MessageHistoryCard
        activeCampaignLatestMessage={null}
        activeCampaignThread={null}
        audienceBreakdown={[]}
        campaignStatusSummary={{ draft: 0, scheduled: 0, sent: 0, partial: 0, failed: 1 }}
        campaignThreads={[]}
        canCompose
        channelBreakdown={{
          email: { sent: 0, active: 0, scheduled: 0, failed: 1, partial: 0, targeted: 3 },
          sms: { sent: 0, active: 0, scheduled: 0, failed: 0, partial: 0, targeted: 0 },
        }}
        channelDeliveryBreakdown={{
          email: { delivered: 0, failed: 3, skipped: 0, unreached: 0, targeted: 3, deliveredRate: 0 },
          sms: { delivered: 0, failed: 0, skipped: 0, unreached: 0, targeted: 0, deliveredRate: 0 },
        }}
        channelEngagementBreakdown={{
          email: { trackedMessages: 1, deliveredRecipients: 0, opened: 0, viewed: 0, clicked: 0, replied: 0, bounced: 0, openRate: 0, clickRate: 0, replyRate: 0 },
          sms: { trackedMessages: 0, deliveredRecipients: 0, opened: 0, viewed: 0, clicked: 0, replied: 0, bounced: 0, openRate: 0, clickRate: 0, replyRate: 0 },
        }}
        deliveries={[]}
        deliveryHealth={{ successRate: 0, failRate: 100, skipped: 0, skippedRate: 0, overdueScheduled: 0 }}
        filteredHistory={[
          {
            id: 'message-1',
            subject: 'Quiet failed send',
            body: 'No one got this one.',
            sent_at: '2026-05-13T12:00:00.000Z',
            scheduled_for: null,
            status: 'failed',
            channel: 'email',
            audience_filter: 'all',
            recipient_filter: {
              opened_count: 0,
              viewed_count: 0,
              clicked_count: 0,
              replied_count: 0,
              bounced_count: 0,
              skipped_count: 0,
            },
            recipient_count: 3,
            delivered_count: 0,
            failed_count: 3,
          },
        ] as any}
        historyAudienceFilter="all"
        historyCampaignFilter=""
        historyChannelFilter="all"
        historyDeliveryFilter="all"
        historySearch=""
        historyStatusCounts={{ sent: 0, active: 0, scheduled: 0, partial: 0, failed: 1 }}
        historyStatusFilter="all"
        messages={[] as any}
        providerTelemetry={{ attempted: 1, errorTop: [], sent: 0, sentRate: 0, skipped: 0 }}
        retryCandidates={[]}
        retryingMessageId={null}
        reviewCandidates={[]}
        onCancelSchedule={vi.fn()}
        onClearThreadFilter={vi.fn()}
        onDuplicateLatest={vi.fn()}
        onEditLatest={vi.fn()}
        onRescheduleMessage={vi.fn()}
        onRetry={vi.fn()}
        onScheduleFollowUp={vi.fn()}
        onSelectThread={vi.fn()}
        onSendScheduledNow={vi.fn()}
        onSetHistoryAudienceFilter={vi.fn()}
        onSetHistoryCampaignFilter={vi.fn()}
        onSetHistoryChannelFilter={vi.fn()}
        onSetHistoryDeliveryFilter={vi.fn()}
        onSetHistorySearch={vi.fn()}
        onSetHistoryStatusFilter={vi.fn()}
        onStartFollowUp={vi.fn()}
        onViewMessage={vi.fn()}
      />,
    );

    expect(screen.getByText('0 opened')).toBeInTheDocument();
    expect(screen.getByText('0 viewed')).toBeInTheDocument();
    expect(screen.getByText('0 clicked')).toBeInTheDocument();
    expect(screen.getByText('0 replied')).toBeInTheDocument();
    expect(screen.getByText('0 bounced')).toBeInTheDocument();
    expect(screen.getAllByText('0 delivered · 3 need review')).not.toHaveLength(0);
    expect(screen.getByText('0 need contact details')).toBeInTheDocument();
    expect(screen.getByText('0 not reached yet')).toBeInTheDocument();
  });

  it('keeps channel engagement summaries explicit before a channel has tracked campaigns', () => {
    render(
      <MessageHistoryCard
        activeCampaignLatestMessage={null}
        activeCampaignThread={null}
        audienceBreakdown={[]}
        campaignStatusSummary={{ draft: 0, scheduled: 0, sent: 0, partial: 1, failed: 1 }}
        campaignThreads={[]}
        canCompose
        channelBreakdown={{
          email: { sent: 0, active: 0, scheduled: 0, failed: 0, partial: 1, targeted: 3 },
          sms: { sent: 0, active: 0, scheduled: 0, failed: 1, partial: 0, targeted: 2 },
        }}
        channelDeliveryBreakdown={{
          email: { delivered: 1, failed: 0, skipped: 1, unreached: 1, targeted: 3, deliveredRate: 33 },
          sms: { delivered: 0, failed: 1, skipped: 0, unreached: 1, targeted: 2, deliveredRate: 0 },
        }}
        channelEngagementBreakdown={{
          email: { trackedMessages: 1, deliveredRecipients: 1, opened: 0, viewed: 0, clicked: 0, replied: 0, bounced: 0, openRate: 0, clickRate: 0, replyRate: 0 },
          sms: { trackedMessages: 0, deliveredRecipients: 0, opened: 0, viewed: 0, clicked: 0, replied: 0, bounced: 0, openRate: 0, clickRate: 0, replyRate: 0 },
        }}
        deliveries={[]}
        deliveryHealth={{ successRate: 50, failRate: 50, skipped: 1, skippedRate: 20, overdueScheduled: 0 }}
        filteredHistory={[]}
        historyAudienceFilter="all"
        historyCampaignFilter=""
        historyChannelFilter="all"
        historyDeliveryFilter="all"
        historySearch=""
        historyStatusCounts={{ sent: 0, active: 0, scheduled: 0, partial: 1, failed: 1 }}
        historyStatusFilter="all"
        messages={[] as any}
        providerTelemetry={{ attempted: 1, errorTop: [], sent: 0, sentRate: 0, skipped: 0 }}
        retryCandidates={[]}
        retryingMessageId={null}
        reviewCandidates={[]}
        onCancelSchedule={vi.fn()}
        onClearThreadFilter={vi.fn()}
        onDuplicateLatest={vi.fn()}
        onEditLatest={vi.fn()}
        onRescheduleMessage={vi.fn()}
        onRetry={vi.fn()}
        onScheduleFollowUp={vi.fn()}
        onSelectThread={vi.fn()}
        onSendScheduledNow={vi.fn()}
        onSetHistoryAudienceFilter={vi.fn()}
        onSetHistoryCampaignFilter={vi.fn()}
        onSetHistoryChannelFilter={vi.fn()}
        onSetHistoryDeliveryFilter={vi.fn()}
        onSetHistorySearch={vi.fn()}
        onSetHistoryStatusFilter={vi.fn()}
        onStartFollowUp={vi.fn()}
        onViewMessage={vi.fn()}
      />,
    );

    expect(screen.getAllByText('0 opened · 0 clicked · 0 replied')).not.toHaveLength(0);
    expect(screen.getByText('0 viewed · 0 bounced across 0 completed campaigns')).toBeInTheDocument();
    expect(screen.getAllByText('0% open rate · 0% click rate · 0% reply rate')).not.toHaveLength(0);
  });

  it('keeps channel delivery summaries explicit before a channel has recipient delivery readback', () => {
    render(
      <MessageHistoryCard
        activeCampaignLatestMessage={null}
        activeCampaignThread={null}
        audienceBreakdown={[]}
        campaignStatusSummary={{ draft: 0, scheduled: 1, sent: 0, partial: 0, failed: 1 }}
        campaignThreads={[]}
        canCompose
        channelBreakdown={{
          email: { sent: 0, active: 0, scheduled: 1, failed: 0, partial: 0, targeted: 0 },
          sms: { sent: 0, active: 0, scheduled: 0, failed: 1, partial: 0, targeted: 0 },
        }}
        channelDeliveryBreakdown={{
          email: { delivered: 0, failed: 0, skipped: 0, unreached: 0, targeted: 0, deliveredRate: 0 },
          sms: { delivered: 0, failed: 0, skipped: 0, unreached: 0, targeted: 0, deliveredRate: 0 },
        }}
        channelEngagementBreakdown={{
          email: { trackedMessages: 0, deliveredRecipients: 0, opened: 0, viewed: 0, clicked: 0, replied: 0, bounced: 0, openRate: 0, clickRate: 0, replyRate: 0 },
          sms: { trackedMessages: 0, deliveredRecipients: 0, opened: 0, viewed: 0, clicked: 0, replied: 0, bounced: 0, openRate: 0, clickRate: 0, replyRate: 0 },
        }}
        deliveries={[]}
        deliveryHealth={{ successRate: 0, failRate: 0, skipped: 0, skippedRate: 0, overdueScheduled: 0 }}
        filteredHistory={[]}
        historyAudienceFilter="all"
        historyCampaignFilter=""
        historyChannelFilter="all"
        historyDeliveryFilter="all"
        historySearch=""
        historyStatusCounts={{ sent: 0, active: 0, scheduled: 1, partial: 0, failed: 1 }}
        historyStatusFilter="all"
        messages={[] as any}
        providerTelemetry={{ attempted: 0, errorTop: [], sent: 0, sentRate: 0, skipped: 0 }}
        retryCandidates={[]}
        retryingMessageId={null}
        reviewCandidates={[]}
        onCancelSchedule={vi.fn()}
        onClearThreadFilter={vi.fn()}
        onDuplicateLatest={vi.fn()}
        onEditLatest={vi.fn()}
        onRescheduleMessage={vi.fn()}
        onRetry={vi.fn()}
        onScheduleFollowUp={vi.fn()}
        onSelectThread={vi.fn()}
        onSendScheduledNow={vi.fn()}
        onSetHistoryAudienceFilter={vi.fn()}
        onSetHistoryCampaignFilter={vi.fn()}
        onSetHistoryChannelFilter={vi.fn()}
        onSetHistoryDeliveryFilter={vi.fn()}
        onSetHistorySearch={vi.fn()}
        onSetHistoryStatusFilter={vi.fn()}
        onStartFollowUp={vi.fn()}
        onViewMessage={vi.fn()}
      />,
    );

    expect(screen.getAllByText('0 delivered · 0 need review')).not.toHaveLength(0);
    expect(screen.getAllByText('0 recipients delivered')).not.toHaveLength(0);
    expect(screen.getAllByText('0 targeted recipients')).not.toHaveLength(0);
    expect(screen.getAllByText('0 of 0 targeted recipients have been delivered')).not.toHaveLength(0);
    expect(screen.getAllByText('0% delivered coverage · 0% review coverage · 0% needs contact · 0% unreached')).not.toHaveLength(0);
    expect(screen.getAllByText('0 of 0 targeted recipients are already closed out')).not.toHaveLength(0);
    expect(screen.getAllByText('No recipients are already closed out')).not.toHaveLength(0);
    expect(screen.getAllByText('0 of 0 targeted recipients still need cleanup')).not.toHaveLength(0);
    expect(screen.getAllByText('No recipients still need cleanup')).not.toHaveLength(0);
    expect(screen.getAllByText('0 of 0 targeted recipients need contact details · 0 of 0 targeted recipients were not reached yet')).not.toHaveLength(0);
    expect(screen.getAllByText('0 need contact details · 0 not reached yet')).not.toHaveLength(0);
    expect(screen.getAllByText('Main cleanup: all clear')).not.toHaveLength(0);
  });

  it('keeps history-row delivery summaries explicit before delivery counters land', () => {
    render(
      <MessageHistoryCard
        activeCampaignLatestMessage={null}
        activeCampaignThread={null}
        audienceBreakdown={[]}
        campaignStatusSummary={{ draft: 0, scheduled: 1, sent: 0, partial: 0, failed: 0 }}
        campaignThreads={[]}
        canCompose
        channelBreakdown={{
          email: { sent: 0, active: 0, scheduled: 1, failed: 0, partial: 0, targeted: 0 },
          sms: { sent: 0, active: 0, scheduled: 0, failed: 0, partial: 0, targeted: 0 },
        }}
        channelDeliveryBreakdown={{
          email: { delivered: 0, failed: 0, skipped: 0, unreached: 0, targeted: 0, deliveredRate: 0 },
          sms: { delivered: 0, failed: 0, skipped: 0, unreached: 0, targeted: 0, deliveredRate: 0 },
        }}
        channelEngagementBreakdown={{
          email: { trackedMessages: 0, deliveredRecipients: 0, opened: 0, viewed: 0, clicked: 0, replied: 0, bounced: 0, openRate: 0, clickRate: 0, replyRate: 0 },
          sms: { trackedMessages: 0, deliveredRecipients: 0, opened: 0, viewed: 0, clicked: 0, replied: 0, bounced: 0, openRate: 0, clickRate: 0, replyRate: 0 },
        }}
        deliveries={[]}
        deliveryHealth={{ successRate: 0, failRate: 0, skipped: 0, skippedRate: 0, overdueScheduled: 0 }}
        filteredHistory={[
          {
            id: 'message-queued',
            subject: 'Queued save the date',
            body: 'Waiting to go out.',
            sent_at: null,
            scheduled_for: '2026-05-16T18:00:00.000Z',
            status: 'scheduled',
            channel: 'email',
            audience_filter: 'all',
            recipient_filter: {
              opened_count: 0,
              viewed_count: 0,
              clicked_count: 0,
              replied_count: 0,
              bounced_count: 0,
              skipped_count: 0,
            },
            recipient_count: 4,
            delivered_count: null,
            failed_count: null,
          },
        ] as any}
        historyAudienceFilter="all"
        historyCampaignFilter=""
        historyChannelFilter="all"
        historyDeliveryFilter="all"
        historySearch=""
        historyStatusCounts={{ sent: 0, active: 0, scheduled: 1, partial: 0, failed: 0 }}
        historyStatusFilter="all"
        messages={[] as any}
        providerTelemetry={{ attempted: 0, errorTop: [], sent: 0, sentRate: 0, skipped: 0 }}
        retryCandidates={[]}
        retryingMessageId={null}
        reviewCandidates={[]}
        onCancelSchedule={vi.fn()}
        onClearThreadFilter={vi.fn()}
        onDuplicateLatest={vi.fn()}
        onEditLatest={vi.fn()}
        onRescheduleMessage={vi.fn()}
        onRetry={vi.fn()}
        onScheduleFollowUp={vi.fn()}
        onSelectThread={vi.fn()}
        onSendScheduledNow={vi.fn()}
        onSetHistoryAudienceFilter={vi.fn()}
        onSetHistoryCampaignFilter={vi.fn()}
        onSetHistoryChannelFilter={vi.fn()}
        onSetHistoryDeliveryFilter={vi.fn()}
        onSetHistorySearch={vi.fn()}
        onSetHistoryStatusFilter={vi.fn()}
        onStartFollowUp={vi.fn()}
        onViewMessage={vi.fn()}
      />,
    );

    expect(screen.getAllByText('0 delivered · 0 need review')).not.toHaveLength(0);
    expect(screen.getByText('4 targeted recipients')).toBeInTheDocument();
    expect(screen.getByText('0 of 4 targeted recipients have been delivered')).toBeInTheDocument();
    expect(screen.getAllByText('0% delivered coverage · 0% review coverage · 0% needs contact · 0% unreached')).not.toHaveLength(0);
    expect(screen.getAllByText('0% cleanup still pending')).not.toHaveLength(0);
    expect(screen.getAllByText('100% follow-through ready')).not.toHaveLength(0);
    expect(screen.getAllByText('4 of 4 targeted recipients are already closed out')).not.toHaveLength(0);
    expect(screen.getAllByText('4 recipients already closed out')).not.toHaveLength(0);
    expect(screen.getAllByText('0 of 4 targeted recipients still need cleanup')).not.toHaveLength(0);
    expect(screen.getAllByText('No recipients still need cleanup')).not.toHaveLength(0);
    expect(screen.getAllByText('0 of 4 targeted recipients need contact details · 0 of 4 targeted recipients were not reached yet')).not.toHaveLength(0);
    expect(screen.getAllByText('Main cleanup: all clear')).not.toHaveLength(0);
    expect(screen.getByText('0 opened')).toBeInTheDocument();
    expect(screen.getByText('0 viewed')).toBeInTheDocument();
    expect(screen.getByText('0 clicked')).toBeInTheDocument();
    expect(screen.getByText('0 replied')).toBeInTheDocument();
    expect(screen.getByText('0 bounced')).toBeInTheDocument();
    expect(screen.getByText('0% open · 0% click · 0% reply')).toBeInTheDocument();
    expect(screen.getByText('0 need contact details')).toBeInTheDocument();
    expect(screen.getByText('0 not reached yet')).toBeInTheDocument();
  });
});
