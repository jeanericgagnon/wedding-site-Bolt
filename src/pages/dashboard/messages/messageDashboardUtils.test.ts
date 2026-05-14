import { describe, expect, it, vi } from 'vitest';
import {
  COMPOSER_TEMPLATES,
  buildCampaignStatusSummary,
  buildCampaignThreads,
  buildChannelBreakdown,
  buildChannelDeliveryBreakdown,
  buildChannelEngagementBreakdown,
  buildDeliveryHealth,
  buildDeliveryBucketSummary,
  buildDeliveryStats,
  buildMessageEngagementSummary,
  buildAudienceBreakdown,
  buildAudienceReachability,
  buildHistoryStatusCounts,
  buildProviderTelemetry,
  buildSegmentPerformance,
  canRetryMessageStatus,
  describeRecipientReview,
  filterMessageHistory,
  getAudienceLabel,
  getActiveCampaignMessages,
  getActiveCampaignThread,
  getCustomerDeliveryReason,
  getCustomerDeliveryBucket,
  getFollowThroughFocusLabel,
  getRecipientExcludedGuestIds,
  getMessageEngagementStats,
  getRecipientRetryGuestIds,
  getRecipientReviewPlanSummary,
  getDeliveryScopedRows,
  getRecipientCount,
  countStoredPhotoAlbumLinks,
  getPreferredStoredPhotoAlbumLink,
  getSkippedCount,
  getTemplateKey,
  getUnreachedCount,
  hasReachableEmail,
  hasReachableSms,
  isDeliveryActiveStatus,
  isDeliveryCompletedStatus,
  isEmailCapConsumingStatus,
  isPastScheduledTime,
  isSavedTemplateScheduleUsable,
  migrateSavedComposerTemplatesStorage,
  normalizeSavedComposerTemplates,
  normalizeSavedTemplateName,
  readStoredPhotoAlbumLinks,
  readSavedComposerTemplates,
  writeSavedComposerTemplates,
} from './messageDashboardUtils';
import { SAVED_COMPOSER_TEMPLATES_STORAGE_KEY } from './messageDashboardTypes';
import type { DeliveryRow, Guest, Message, SavedComposerTemplate } from './messageDashboardTypes';

const message = (overrides: Partial<Message> = {}): Message => ({
  id: 'm1',
  subject: 'Update',
  body: 'Hello',
  status: 'sent',
  channel: 'email',
  audience_filter: 'all',
  recipient_filter: null,
  recipient_count: 10,
  delivered_count: 4,
  failed_count: 1,
  sent_at: null,
  scheduled_for: null,
  ...overrides,
});

describe('messageDashboardUtils', () => {
  it('classifies delivery statuses and retry behavior', () => {
    expect(isDeliveryActiveStatus('queued')).toBe(true);
    expect(isDeliveryCompletedStatus('sent')).toBe(true);
    expect(isEmailCapConsumingStatus('queued')).toBe(true);
    expect(canRetryMessageStatus('failed')).toBe(true);
    expect(canRetryMessageStatus('sent')).toBe(false);
  });

  it('scopes delivery rows to matching messages', () => {
    const deliveries = [
      { id: 'd1', message_id: 'm1', status: 'sent' },
      { id: 'd2', message_id: 'm2', status: 'sent' },
    ] as DeliveryRow[];
    expect(getDeliveryScopedRows([message({ id: 'm1', status: 'sent' })], deliveries, (item) => item.status === 'sent')).toEqual([deliveries[0]]);
  });

  it('keeps saved composer templates bounded and normalized', () => {
    const template = {
      id: 't1',
      name: '  Reminder  ',
      subject: 'Hi',
      body: 'Body',
      channel: 'email',
      audience: 'all',
      campaignName: 'Campaign',
    } as SavedComposerTemplate;

    expect(normalizeSavedTemplateName(template.name)).toBe('reminder');
    const normalized = normalizeSavedComposerTemplates([template]);
    expect(normalized[0].scheduleType).toBe('now');
    expect(normalized[0].createdAt).toEqual(expect.any(String));

    localStorage.clear();
    expect(writeSavedComposerTemplates(Array.from({ length: 13 }, (_, index) => ({ ...normalized[0], id: `t${index}` })))).toBe(true);
    expect(readSavedComposerTemplates()).toHaveLength(12);
  });

  it('migrates stale saved composer template storage to normalized safe rows', () => {
    localStorage.clear();
    localStorage.setItem(SAVED_COMPOSER_TEMPLATES_STORAGE_KEY, JSON.stringify([
      {
        id: 't1',
        name: 'Reminder',
        subject: 'Hi',
        body: 'Body',
        channel: 'email',
        audience: 'all',
        campaignName: 'Campaign',
      },
      { id: 'bad', name: 'Missing body' },
    ]));

    expect(migrateSavedComposerTemplatesStorage()).toBe(true);
    const migrated = readSavedComposerTemplates();
    expect(migrated).toHaveLength(1);
    expect(migrated[0].scheduleType).toBe('now');
  });

  it('reads stored photo album links defensively', () => {
    localStorage.clear();
    localStorage.setItem('dayof.photoAlbumLinks', JSON.stringify({
      ceremony: 'https://example.test/ceremony',
      empty: '',
      count: 123,
      reception: 'https://example.test/reception',
    }));

    expect(readStoredPhotoAlbumLinks()).toEqual([
      'https://example.test/ceremony',
      'https://example.test/reception',
    ]);
    expect(countStoredPhotoAlbumLinks()).toBe(2);
    expect(getPreferredStoredPhotoAlbumLink()).toBe('https://example.test/ceremony');

    localStorage.setItem('dayof.photoAlbumLinks', JSON.stringify(['https://example.test/array']));
    expect(readStoredPhotoAlbumLinks()).toEqual(['https://example.test/array']);
  });

  it('checks schedule usability and reachable channels', () => {
    vi.setSystemTime(new Date('2026-05-04T12:00:00Z'));
    expect(isPastScheduledTime('2026-05-04T11:59:00Z')).toBe(true);
    expect(isSavedTemplateScheduleUsable({
      id: 't1',
      name: 'Later',
      subject: 'Hi',
      body: 'Body',
      channel: 'email',
      audience: 'all',
      campaignName: 'Campaign',
      scheduleType: 'later',
      scheduleDate: '2026-05-05',
      scheduleTime: '12:00',
      createdAt: '2026-05-04T12:00:00Z',
      updatedAt: '2026-05-04T12:00:00Z',
    })).toBe(true);
    vi.useRealTimers();

    expect(hasReachableEmail('guest@example.com')).toBe(true);
    expect(hasReachableEmail('bad')).toBe(false);
    expect(hasReachableSms({ phone: '555-111-2222', sms_consent: true })).toBe(true);
    expect(hasReachableSms({ phone: '555-111-2222', sms_consent: false })).toBe(false);
  });

  it('summarizes audience, counts, template, and safe delivery copy', () => {
    const eventMessage = message({
      audience_filter: 'event:ceremony',
      recipient_filter: {
        audience_label: 'Ceremony guests',
        recipient_count: 8,
        skipped_count: 2,
        opened_count: 6,
        viewed_count: 4,
        clicked_count: 3,
        replied_count: 1,
        bounced_count: 1,
        templateKey: 'rsvp-reminder',
        retry_guest_ids: ['g1', 'g2', 'g1'],
        excluded_guest_ids: ['g3'],
      },
    });
    const skipped = [{ id: 'd1', message_id: 'm1', status: 'skipped' }] as DeliveryRow[];

    expect(getAudienceLabel(eventMessage)).toBe('Ceremony guests');
    expect(getRecipientCount(eventMessage)).toBe(10);
    expect(getSkippedCount(eventMessage, skipped)).toBe(1);
    expect(getUnreachedCount(eventMessage, skipped)).toBe(4);
    expect(getTemplateKey(eventMessage)).toBe('rsvp-reminder');
    expect(getMessageEngagementStats(eventMessage)).toEqual({
      opened: 6,
      viewed: 4,
      clicked: 3,
      replied: 1,
      bounced: 1,
    });
    expect(getCustomerDeliveryReason('Resend API bounced for recipient', 'Needs review')).toBe('delivery service delivery service bounced for recipient');
    expect(getCustomerDeliveryBucket('Twilio invalid phone number', 'failed')).toBe('Phone number needs review');
    expect(getCustomerDeliveryBucket('Recipient unsubscribed from updates', 'failed')).toBe('Blocked or unsubscribed');
    expect(getCustomerDeliveryBucket('Skipped: guest is missing a valid email address', 'skipped')).toBe('Missing contact details');
    expect(getRecipientRetryGuestIds(eventMessage)).toEqual(['g1', 'g2']);
    expect(getRecipientExcludedGuestIds(eventMessage)).toEqual(['g3']);
    expect(getRecipientReviewPlanSummary(eventMessage)).toBe('next send targets 2 reviewed guests and excludes 1 guest still missing contact details');
    expect(describeRecipientReview(1)).toBe('1 recipient needs contact details');
    expect(getFollowThroughFocusLabel({ failed: 1, skipped: 3, unreached: 2 })).toBe('Main cleanup: contact cleanup');
    expect(getFollowThroughFocusLabel({ failed: 4, skipped: 1, unreached: 2 })).toBe('Main cleanup: delivery review');
    expect(getFollowThroughFocusLabel({ failed: 0, skipped: 0, unreached: 2 })).toBe('Main cleanup: unreached guests');
    expect(getFollowThroughFocusLabel({ failed: 0, skipped: 0, unreached: 0 })).toBeNull();
  });

  it('builds customer-safe delivery review buckets for failed and skipped recipients', () => {
    const deliveries = [
      { id: 'd1', message_id: 'm1', status: 'failed', error_message: 'Twilio invalid phone number' },
      { id: 'd2', message_id: 'm1', status: 'failed', error_message: 'Recipient unsubscribed from updates' },
      { id: 'd3', message_id: 'm1', status: 'failed', error_message: 'Recipient unsubscribed from updates' },
      { id: 'd4', message_id: 'm1', status: 'skipped', error_message: 'Skipped: guest is missing a valid email address' },
      { id: 'd5', message_id: 'm1', status: 'skipped', error_message: 'Skipped: guest is missing phone number or SMS consent' },
    ] as DeliveryRow[];

    expect(buildDeliveryBucketSummary(deliveries, 'failed')).toEqual([
      ['Blocked or unsubscribed', 2],
      ['Phone number needs review', 1],
    ]);
    expect(buildDeliveryBucketSummary(deliveries, 'skipped')).toEqual([
      ['Missing contact details', 1],
      ['Missing phone number or text consent', 1],
    ]);
  });

  it('builds message dashboard campaign and delivery summaries', () => {
    const messages = [
      message({ id: 'draft', status: 'draft', recipient_count: 5, delivered_count: 0, failed_count: 0 }),
      message({ id: 'scheduled-email', status: 'scheduled', channel: 'email', recipient_count: 7, delivered_count: 0, failed_count: 0 }),
      message({
        id: 'sent-email',
        status: 'sent',
        channel: 'email',
        recipient_count: 10,
        delivered_count: 8,
        failed_count: 1,
        recipient_filter: { opened_count: 15, viewed_count: 4, clicked_count: 5, replied_count: 1, bounced_count: 1 },
      }),
      message({
        id: 'partial-sms',
        status: 'partial',
        channel: 'sms',
        recipient_count: 4,
        delivered_count: 2,
        failed_count: 1,
        recipient_filter: { opened_count: 2, clicked_count: 1 },
      }),
      message({ id: 'failed-sms', status: 'failed', channel: 'sms', recipient_count: 3, delivered_count: 0, failed_count: 3 }),
      message({
        id: 'queued-email',
        status: 'queued',
        channel: 'email',
        recipient_count: 6,
        delivered_count: 0,
        failed_count: 0,
        recipient_filter: { opened_count: 99, clicked_count: 99 },
      }),
    ];

    expect(buildCampaignStatusSummary(messages)).toEqual({
      draft: 1,
      scheduled: 1,
      sent: 1,
      partial: 1,
      failed: 1,
    });

    expect(buildDeliveryStats(messages)).toMatchObject({
      delivered: 10,
      failed: 5,
      targeted: 17,
      skipped: 0,
      unreached: 2,
      rate: 59,
      scheduled: 1,
      active: 1,
    });

    expect(buildMessageEngagementSummary(messages)).toEqual({
      trackedMessages: 3,
      deliveredRecipients: 10,
      opened: 17,
      viewed: 4,
      clicked: 6,
      replied: 1,
      bounced: 1,
      openRate: 170,
      clickRate: 60,
      replyRate: 10,
    });

    expect(buildChannelBreakdown(messages)).toEqual({
      email: { sent: 1, active: 1, scheduled: 1, failed: 0, partial: 0, targeted: 16 },
      sms: { sent: 0, active: 0, scheduled: 0, failed: 1, partial: 1, targeted: 7 },
    });

    expect(buildChannelDeliveryBreakdown(messages)).toEqual({
      email: { delivered: 8, failed: 1, skipped: 1, unreached: 0, targeted: 10, deliveredRate: 80 },
      sms: { delivered: 2, failed: 4, skipped: 0, unreached: 2, targeted: 7, deliveredRate: 29 },
    });

    expect(buildChannelEngagementBreakdown(messages)).toEqual({
      email: { trackedMessages: 1, deliveredRecipients: 8, opened: 15, viewed: 4, clicked: 5, replied: 1, bounced: 1, openRate: 188, clickRate: 63, replyRate: 13 },
      sms: { trackedMessages: 2, deliveredRecipients: 2, opened: 2, viewed: 0, clicked: 1, replied: 0, bounced: 0, openRate: 100, clickRate: 50, replyRate: 0 },
    });

    expect(buildHistoryStatusCounts(messages)).toEqual({
      sent: 1,
      active: 1,
      scheduled: 1,
      partial: 1,
      failed: 1,
      draft: 1,
    });
  });

  it('builds campaign threads, active campaign messages, delivery health, and provider telemetry', () => {
    vi.setSystemTime(new Date('2026-05-04T12:00:00Z'));
    const messages = [
      message({
        id: 'm1',
        subject: 'Reminder',
        status: 'sent',
        recipient_filter: { campaignName: 'RSVP push', skipped_count: 1, recipient_count: 5, opened_count: 4, clicked_count: 2, bounced_count: 1 },
        recipient_count: 5,
        delivered_count: 3,
        failed_count: 1,
        sent_at: '2026-05-04T10:00:00Z',
      }),
      message({
        id: 'm2',
        subject: 'Reminder 2',
        status: 'partial',
        recipient_filter: { campaignName: 'RSVP push', recipient_count: 4, opened_count: 2, viewed_count: 1, replied_count: 1 },
        recipient_count: 4,
        delivered_count: 1,
        failed_count: 1,
        sent_at: '2026-05-04T11:00:00Z',
      }),
      message({
        id: 'm3',
        subject: 'Due soon',
        status: 'scheduled',
        recipient_filter: { campaignName: 'Day-of' },
        recipient_count: 2,
        delivered_count: 0,
        failed_count: 0,
        scheduled_for: '2026-05-04T11:30:00Z',
      }),
    ];
    const deliveries = [
      { id: 'd1', message_id: 'm1', status: 'sent', error_message: null },
      { id: 'd2', message_id: 'm1', status: 'failed', error_message: 'Resend API bounced recipient' },
      { id: 'd3', message_id: 'm2', status: 'skipped', error_message: null },
      { id: 'd4', message_id: 'm2', status: 'failed', error_message: 'Twilio invalid phone number' },
    ] as DeliveryRow[];

    const threads = buildCampaignThreads(messages, deliveries);
    expect(threads[0]).toMatchObject({
      name: 'Day-of',
      latestStatus: 'scheduled',
      count: 1,
    });
    expect(threads.find((thread) => thread.name === 'RSVP push')).toMatchObject({
      count: 2,
      delivered: 4,
      deliveredRecipients: 4,
      deliveredRate: 50,
      failed: 2,
      skipped: 2,
      opened: 6,
      viewed: 1,
      clicked: 2,
      replied: 1,
      bounced: 1,
      openRate: 150,
      clickRate: 50,
      replyRate: 25,
    });

    const activeThread = getActiveCampaignThread({ campaignThreads: threads, historyCampaignFilter: 'RSVP push', historySearch: '' });
    expect(getActiveCampaignMessages(messages, activeThread).map((item) => item.id)).toEqual(['m2', 'm1']);

    expect(buildDeliveryHealth(messages, deliveries)).toMatchObject({
      successRate: 44,
      failRate: 22,
      skipped: 1,
      skippedRate: 11,
      overdueScheduled: 1,
      reviewBacklog: 1,
    });
    expect(buildProviderTelemetry(messages, deliveries)).toMatchObject({
      attempted: 3,
      sent: 1,
      failed: 2,
      skipped: 1,
      sentRate: 33,
    });
    expect(buildProviderTelemetry(messages, deliveries).errorTop[0][0]).toContain('delivery service');
    vi.useRealTimers();
  });

  it('sums engagement only across completed campaigns', () => {
    const messages = [
      message({
        id: 'sent-email',
        status: 'sent',
        recipient_filter: {
          opened_count: 7,
          viewed_count: 4,
          clicked_count: 2,
          replied_count: 1,
          bounced_count: 1,
        },
      }),
      message({
        id: 'partial-sms',
        status: 'partial',
        recipient_filter: {
          opened_count: 3,
          viewed_count: 0,
          clicked_count: 1,
          replied_count: 0,
          bounced_count: 0,
        },
      }),
      message({
        id: 'scheduled-email',
        status: 'scheduled',
        recipient_filter: {
          opened_count: 99,
          viewed_count: 99,
          clicked_count: 99,
          replied_count: 99,
          bounced_count: 99,
        },
      }),
    ];

    expect(buildMessageEngagementSummary(messages)).toEqual({
      trackedMessages: 2,
      deliveredRecipients: 8,
      opened: 10,
      viewed: 4,
      clicked: 3,
      replied: 1,
      bounced: 1,
      openRate: 125,
      clickRate: 38,
      replyRate: 13,
    });
  });

  it('filters message history by status, channel, audience, delivery state, campaign, and search', () => {
    const messages = [
      message({ id: 'm1', subject: 'Ceremony update', status: 'sent', channel: 'email', audience_filter: 'event:ceremony', delivered_count: 3, failed_count: 0, recipient_filter: { campaignName: 'Ceremony thread' } }),
      message({ id: 'm2', subject: 'Text follow-up', status: 'failed', channel: 'sms', audience_filter: 'all', delivered_count: 0, failed_count: 2, recipient_filter: { campaignName: 'SMS thread' } }),
      message({ id: 'm3', subject: 'Missing contact', status: 'partial', channel: 'email', audience_filter: 'pending', delivered_count: 1, failed_count: 0, recipient_filter: { campaignName: 'Pending thread' } }),
    ];
    const deliveries = [
      { id: 'd1', message_id: 'm3', status: 'skipped', error_message: 'missing email' },
    ] as DeliveryRow[];

    expect(filterMessageHistory({
      messages,
      deliveries,
      statusFilter: 'failed',
      channelFilter: 'sms',
      audienceFilter: 'all',
      deliveryFilter: 'failed',
      campaignFilter: '',
      search: 'text',
    }).map((item) => item.id)).toEqual(['m2']);

    expect(filterMessageHistory({
      messages,
      deliveries,
      statusFilter: 'all',
      channelFilter: 'all',
      audienceFilter: 'pending',
      deliveryFilter: 'skipped',
      campaignFilter: '',
      search: 'contact',
    }).map((item) => item.id)).toEqual(['m3']);

    expect(filterMessageHistory({
      messages,
      deliveries,
      statusFilter: 'all',
      channelFilter: 'all',
      audienceFilter: 'all',
      deliveryFilter: 'all',
      campaignFilter: 'Ceremony thread',
      search: '',
    }).map((item) => item.id)).toEqual(['m1']);
  });

  it('builds audience reachability, audience breakdown, and event segment performance', () => {
    const guests = [
      { id: 'g1', email: 'a@example.com', phone: '555-111-1111', sms_consent: true, rsvp_status: 'attending', first_name: 'A', last_name: 'One', name: 'A One' },
      { id: 'g2', email: null, phone: '555-222-2222', sms_consent: false, rsvp_status: 'pending', first_name: 'B', last_name: 'Two', name: 'B Two' },
    ] as Guest[];
    const messages = [
      message({ id: 'm1', status: 'sent', audience_filter: 'event:ceremony', recipient_count: 10, delivered_count: 10, failed_count: 0 }),
      message({ id: 'm2', status: 'partial', audience_filter: 'event:ceremony', recipient_count: 5, delivered_count: 3, failed_count: 0 }),
      message({ id: 'm3', status: 'failed', audience_filter: 'event:reception', recipient_count: 7, delivered_count: 0, failed_count: 7 }),
      message({ id: 'm4', status: 'draft', audience_filter: 'all', recipient_count: 4, delivered_count: 0, failed_count: 0 }),
    ];

    expect(buildAudienceReachability(guests)).toEqual({ total: 2, missingEmail: 1, missingPhone: 1 });
    expect(buildAudienceBreakdown(messages)[0]).toEqual(['Itinerary segment', 22]);
    expect(buildSegmentPerformance(messages, [
      { value: 'event:ceremony', label: 'Ceremony guests' },
      { value: 'event:reception', label: 'Reception guests' },
    ])).toEqual([
      ['Ceremony guests', { sent: 2, failed: 0, targeted: 15 }],
      ['Reception guests', { sent: 0, failed: 1, targeted: 7 }],
    ]);
  });

  it('keeps composer template registry available', () => {
    expect(COMPOSER_TEMPLATES.map((template) => template.key)).toEqual(
      expect.arrayContaining(['blank', 'save-the-date', 'rsvp-reminder', 'event-reminder', 'day-of-update', 'photo-request', 'thank-you']),
    );
  });
});
