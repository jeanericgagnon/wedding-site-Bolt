import { countSmsSegments, estimateSmsCredits } from '../../../lib/smsSegments';
import { isSmsProviderEnabled } from '../../../lib/smsProvider';
import { filterMessageAudienceGuests } from '../../../lib/messageAudienceSegments';
import type { AudienceOption, DeliveryRow, Guest, Message } from './messageDashboardTypes';
import {
  buildAudienceBreakdown,
  buildAudienceReachability,
  buildCampaignThreads,
  buildChannelBreakdown,
  buildChannelEngagementBreakdown,
  buildDeliveryHealth,
  buildDeliveryStats,
  buildHistoryStatusCounts,
  buildProviderTelemetry,
  filterMessageHistory,
  getActiveCampaignMessages,
  getActiveCampaignThread,
  getRecipientCount,
  hasReachableEmail,
  hasReachableSms,
  isEmailCapConsumingStatus,
  isPastScheduledTime,
  type MessageHistoryChannelFilter,
  type MessageHistoryDeliveryFilter,
  type MessageHistoryStatusFilter,
} from './messageDashboardUtils';

type ComposerFormData = {
  audience: string;
  body: string;
  channel: 'email' | 'sms';
  scheduleDate: string;
  scheduleTime: string;
};

export type BuildMessageDashboardDerivedStateArgs = {
  audienceOptions: AudienceOption[];
  deliveries: DeliveryRow[];
  eventGuestIds: Record<string, Set<string>>;
  formData: ComposerFormData;
  guests: Guest[];
  hardEmailCap: number;
  historyAudienceFilter: string;
  historyCampaignFilter: string;
  historyChannelFilter: MessageHistoryChannelFilter;
  historyDeliveryFilter: MessageHistoryDeliveryFilter;
  historySearch: string;
  historyStatusFilter: MessageHistoryStatusFilter;
  itineraryAudienceOptions: AudienceOption[];
  messages: Message[];
  weddingSiteSmsCredits: number | null | undefined;
};

export function buildMessageDashboardDerivedState({
  audienceOptions,
  deliveries,
  eventGuestIds,
  formData,
  guests,
  hardEmailCap,
  historyAudienceFilter,
  historyCampaignFilter,
  historyChannelFilter,
  historyDeliveryFilter,
  historySearch,
  historyStatusFilter,
  itineraryAudienceOptions,
  messages,
  weddingSiteSmsCredits,
}: BuildMessageDashboardDerivedStateArgs) {
  const getRecipients = (audience: string) => filterMessageAudienceGuests(guests, audience, eventGuestIds);
  const selectedAudience = audienceOptions.find((option) => option.value === formData.audience);
  const recipients = getRecipients(formData.audience);
  const recipientsWithEmail = recipients.filter((guest) => hasReachableEmail(guest.email)).length;
  const recipientsWithSmsConsent = recipients.filter((guest) => hasReachableSms(guest)).length;
  const activeRecipients = formData.channel === 'sms' ? recipientsWithSmsConsent : recipientsWithEmail;
  const previewRecipients = recipients.filter((guest) => (
    formData.channel === 'sms' ? hasReachableSms(guest) : hasReachableEmail(guest.email)
  ));
  const unreachableRecipients = (selectedAudience?.count ?? 0) - activeRecipients;
  const selectedScheduleIsPast = !!(formData.scheduleDate && formData.scheduleTime)
    && isPastScheduledTime(`${formData.scheduleDate}T${formData.scheduleTime}:00`);
  const smsCredits = weddingSiteSmsCredits ?? 0;
  const smsProviderEnabled = isSmsProviderEnabled();
  const smsSegmentCount = countSmsSegments(formData.body);
  const smsCreditsNeeded = estimateSmsCredits(formData.body, recipientsWithSmsConsent);
  const smsCreditsSufficient = smsCredits >= smsCreditsNeeded;
  const usedEmailRecipients = messages
    .filter((message) => message.channel === 'email' && isEmailCapConsumingStatus(message.status))
    .reduce((sum, message) => sum + getRecipientCount(message), 0);
  const remainingEmailRecipients = Math.max(hardEmailCap - usedEmailRecipients, 0);
  const emailCapacityAfterSend = Math.max(remainingEmailRecipients - recipientsWithEmail, 0);
  const emailCapacityEnough = recipientsWithEmail <= remainingEmailRecipients;
  const audienceReachability = buildAudienceReachability(recipients);
  const deliveryStats = buildDeliveryStats(messages);
  const filteredHistory = filterMessageHistory({
    messages,
    deliveries,
    statusFilter: historyStatusFilter,
    channelFilter: historyChannelFilter,
    audienceFilter: historyAudienceFilter,
    deliveryFilter: historyDeliveryFilter,
    campaignFilter: historyCampaignFilter,
    search: historySearch,
  });
  const audienceBreakdown = buildAudienceBreakdown(messages);
  const retryCandidates = messages.filter((message) => message.status === 'failed').slice(0, 5);
  const reviewCandidates = messages.filter((message) => message.status === 'partial').slice(0, 5);
  const historyStatusCounts = buildHistoryStatusCounts(messages);
  const channelBreakdown = buildChannelBreakdown(messages);
  const channelEngagementBreakdown = buildChannelEngagementBreakdown(messages);
  const deliveryHealth = buildDeliveryHealth(messages, deliveries);
  const campaignThreads = buildCampaignThreads(messages, deliveries);
  const activeCampaignThread = getActiveCampaignThread({ campaignThreads, historyCampaignFilter, historySearch });
  const activeCampaignLatestMessage = getActiveCampaignMessages(messages, activeCampaignThread)[0] ?? null;
  const providerTelemetry = buildProviderTelemetry(messages, deliveries);

  return {
    activeCampaignLatestMessage,
    activeCampaignThread,
    activeRecipients,
    audienceBreakdown,
    audienceReachability,
    channelBreakdown,
    channelEngagementBreakdown,
    deliveryHealth,
    deliveryStats,
    emailCapacityAfterSend,
    emailCapacityEnough,
    filteredHistory,
    historyStatusCounts,
    previewRecipients,
    providerTelemetry,
    recipientsWithEmail,
    recipientsWithSmsConsent,
    remainingEmailRecipients,
    retryCandidates,
    reviewCandidates,
    selectedAudience,
    selectedScheduleIsPast,
    smsCredits,
    smsCreditsNeeded,
    smsCreditsSufficient,
    smsProviderEnabled,
    smsSegmentCount,
    unreachableRecipients,
    usedEmailRecipients,
    campaignThreads,
    itineraryAudienceOptions,
  };
}
