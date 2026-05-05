export type AudienceOption = { value: string; label: string; count: number };

export type EventLite = {
  id: string;
  event_name: string;
  start_time: string | null;
};

export type TimelineState = 'up-next' | 'live' | 'done';

export type AlertLog = {
  id: string;
  subject: string;
  audience: string;
  channel: 'email' | 'sms';
  queuedAt: string;
  sendAt?: string | null;
};

export type QnaItem = {
  id: string;
  question: string;
  status: 'new' | 'answered';
  answer?: string | null;
};
