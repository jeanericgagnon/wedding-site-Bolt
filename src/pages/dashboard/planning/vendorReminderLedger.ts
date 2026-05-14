import type { PlanningVendor } from './planningService';
import type { VendorMetaMap } from './vendorMetaStorage';
import { isVendorDateOnOrBefore } from './vendorDate';

export interface VendorReminderLedgerSummary {
  vendorCount: number;
  reminderReadyCount: number;
  followUpDueCount: number;
  queuedCount: number;
  summary: string;
}

export function formatVendorReminderLeadDays(days?: number | null): string {
  if (days === 1) return '1 day before';
  if (days === 3 || days === 7 || days === 14) return `${days} days before`;
  return 'Not set';
}

export function formatVendorReminderChannel(channel?: string | null): string {
  if (channel === 'email') return 'Email';
  if (channel === 'phone') return 'Phone';
  if (channel === 'none') return 'No reminder';
  return 'Not set';
}

export function buildVendorReminderLedgerSummary(input: {
  vendors: PlanningVendor[];
  vendorMeta: VendorMetaMap;
  compareDate?: Date;
}): VendorReminderLedgerSummary {
  const compareDate = input.compareDate ?? new Date();
  const followUpDueCount = input.vendors.filter((vendor) =>
    isVendorDateOnOrBefore(input.vendorMeta[vendor.id]?.nextFollowUp, compareDate)
  ).length;
  const reminderReadyCount = input.vendors.filter((vendor) => {
    const meta = input.vendorMeta[vendor.id];
    return Boolean(meta?.nextFollowUp && meta?.reminderChannel && meta.reminderChannel !== 'none' && meta.reminderLeadDays);
  }).length;
  const queuedCount = input.vendors.filter((vendor) => Boolean(input.vendorMeta[vendor.id]?.reminderLastQueuedAt)).length;

  let summary = 'Add follow-up timing and reminder preferences for vendor payment nudges.';
  if (input.vendors.length === 0) {
    summary = 'Add vendors first so contract follow-ups and reminder timing have somewhere to live.';
  } else if (reminderReadyCount === input.vendors.length && input.vendors.length > 0) {
    summary = `${reminderReadyCount} vendor reminder${reminderReadyCount === 1 ? '' : 's'} are configured with a saved follow-up date, channel, and lead time.`;
  } else if (reminderReadyCount > 0) {
    summary = `${reminderReadyCount} of ${input.vendors.length} vendor reminder${input.vendors.length === 1 ? '' : 's'} are configured with saved follow-up timing and delivery preferences.`;
  }

  return {
    vendorCount: input.vendors.length,
    reminderReadyCount,
    followUpDueCount,
    queuedCount,
    summary,
  };
}
