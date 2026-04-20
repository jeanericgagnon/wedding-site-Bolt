export const getCoordinatorAlertOverrideCurrentLabel = ({
  subject,
  audienceLabel,
}: {
  subject: string;
  audienceLabel: string;
}) => {
  const trimmedSubject = subject.trim();
  if (!trimmedSubject) return null;
  return `Working draft: ${trimmedSubject} · ${audienceLabel}`;
};
