export type CoordinatorTimelineState = 'up-next' | 'live' | 'done';

export type CoordinatorAlertLogItem = {
  id: string;
  subject: string;
  audience: string;
  channel: 'email' | 'sms';
  queuedAt: string;
  sendAt?: string | null;
};

export type CoordinatorQnaItem = {
  id: string;
  question: string;
  status: 'new' | 'answered';
  answer?: string | null;
};

const isTimelineState = (value: unknown): value is CoordinatorTimelineState => (
  value === 'up-next' || value === 'live' || value === 'done'
);

export const normalizeCoordinatorTimelineState = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {} as Record<string, CoordinatorTimelineState>;
  return Object.fromEntries(
    Object.entries(value).filter(([key, state]) => key.trim().length > 0 && isTimelineState(state)),
  ) as Record<string, CoordinatorTimelineState>;
};

export const normalizeCoordinatorAlertLog = (value: unknown): CoordinatorAlertLogItem[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is CoordinatorAlertLogItem => {
    if (!item || typeof item !== 'object') return false;
    const alert = item as Partial<CoordinatorAlertLogItem>;
    return typeof alert.id === 'string'
      && typeof alert.subject === 'string'
      && typeof alert.audience === 'string'
      && (alert.channel === 'email' || alert.channel === 'sms')
      && typeof alert.queuedAt === 'string'
      && (typeof alert.sendAt === 'string' || alert.sendAt == null);
  });
};

export const normalizeCoordinatorQnaItems = (value: unknown): CoordinatorQnaItem[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is CoordinatorQnaItem => {
    if (!item || typeof item !== 'object') return false;
    const qna = item as Partial<CoordinatorQnaItem>;
    return typeof qna.id === 'string'
      && typeof qna.question === 'string'
      && (qna.status === 'new' || qna.status === 'answered')
      && (typeof qna.answer === 'string' || qna.answer == null);
  });
};
