import type { CoordinatorAlertLogItem } from './coordinatorModePersistence';

export type CoordinatorAlertForm = {
  subject: string;
  body: string;
  audience: string;
  channel: 'email' | 'sms';
  scheduleType: 'now' | 'later';
  scheduleDate: string;
  scheduleTime: string;
};

export const resolveCoordinatorScheduledFor = (form: CoordinatorAlertForm) => {
  if (form.scheduleType !== 'later') return null;
  if (!form.scheduleDate || !form.scheduleTime) return null;
  const scheduledFor = `${form.scheduleDate}T${form.scheduleTime}:00`;
  const scheduled = new Date(scheduledFor);
  if (Number.isNaN(scheduled.getTime())) return null;
  return scheduledFor;
};

export const validateCoordinatorAlertForm = (
  form: CoordinatorAlertForm,
  audienceCount: number,
  now = new Date(),
) => {
  if (!form.subject.trim()) return 'Add a subject.';
  if (!form.body.trim()) return 'Add the update you want to send.';
  if (audienceCount <= 0) return 'Choose an audience with at least one guest.';
  if (form.scheduleType !== 'later') return null;
  const scheduledFor = resolveCoordinatorScheduledFor(form);
  if (!scheduledFor) return 'Pick a valid date and time.';
  if (new Date(scheduledFor).getTime() <= now.getTime()) return 'Scheduled alerts need a future time.';
  return null;
};

export const appendCoordinatorAlertLogItem = (
  previous: CoordinatorAlertLogItem[],
  next: CoordinatorAlertLogItem,
) => {
  const deduped = previous.filter((item) => !(
    item.subject === next.subject
    && item.audience === next.audience
    && item.channel === next.channel
    && item.sendAt === next.sendAt
  ));
  return [next, ...deduped].slice(0, 8);
};
