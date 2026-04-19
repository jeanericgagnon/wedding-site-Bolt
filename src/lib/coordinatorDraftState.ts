export type CoordinatorDraftState = {
  alertForm: {
    subject: string;
    body: string;
    audience: string;
    channel: 'email' | 'sms';
    scheduleType: 'now' | 'later';
    scheduleDate: string;
    scheduleTime: string;
  };
  qnaDraftAnswers: Record<string, string>;
};

export const normalizeCoordinatorDraftState = (value: unknown): CoordinatorDraftState => {
  const base: CoordinatorDraftState = {
    alertForm: {
      subject: '',
      body: '',
      audience: 'all',
      channel: 'sms',
      scheduleType: 'now',
      scheduleDate: '',
      scheduleTime: '',
    },
    qnaDraftAnswers: {},
  };

  if (!value || typeof value !== 'object' || Array.isArray(value)) return base;
  const parsed = value as Partial<CoordinatorDraftState>;
  const qnaDraftAnswers = parsed.qnaDraftAnswers && typeof parsed.qnaDraftAnswers === 'object' && !Array.isArray(parsed.qnaDraftAnswers)
    ? Object.fromEntries(Object.entries(parsed.qnaDraftAnswers).filter(([key, val]) => key && typeof val === 'string'))
    : {};

  return {
    alertForm: parsed.alertForm && typeof parsed.alertForm === 'object'
      ? {
          ...base.alertForm,
          ...parsed.alertForm,
          channel: parsed.alertForm.channel === 'email' ? 'email' : 'sms',
          scheduleType: parsed.alertForm.scheduleType === 'later' ? 'later' : 'now',
        }
      : base.alertForm,
    qnaDraftAnswers,
  };
};
