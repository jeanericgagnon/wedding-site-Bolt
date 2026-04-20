type CoordinatorCommandSummaryItem = {
  label: string;
  detail: string;
};

export const buildCoordinatorCommandSummary = ({
  checkInLabel,
  timelineLabel,
  qnaLabel,
  alertLabel,
}: {
  checkInLabel: string | null;
  timelineLabel: string | null;
  qnaLabel: string | null;
  alertLabel: string;
}): CoordinatorCommandSummaryItem[] => {
  const items: CoordinatorCommandSummaryItem[] = [];

  if (checkInLabel) {
    items.push({ label: 'Check-in', detail: checkInLabel });
  }

  if (timelineLabel) {
    items.push({ label: 'Timeline', detail: timelineLabel });
  }

  if (qnaLabel) {
    items.push({ label: 'Q&A', detail: qnaLabel });
  }

  items.push({ label: 'Alerting', detail: alertLabel });

  return items;
};
