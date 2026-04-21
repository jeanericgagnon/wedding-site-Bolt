export type CoordinatorOverrideDisplayCue =
  | { kind: 'alert-override'; label: string; updatedAt: number }
  | { kind: 'manual-override'; label: string; updatedAt: number }
  | null;

export const resolveCoordinatorOverrideDisplayCue = ({
  alertOverrideLabel,
  alertOverrideUpdatedAt,
  manualOverrideLabel,
  manualOverrideUpdatedAt,
}: {
  alertOverrideLabel: string | null;
  alertOverrideUpdatedAt: number | null;
  manualOverrideLabel: string | null;
  manualOverrideUpdatedAt: number | null;
}): CoordinatorOverrideDisplayCue => {
  const alertCue = alertOverrideLabel && alertOverrideUpdatedAt !== null
    ? { kind: 'alert-override' as const, label: alertOverrideLabel, updatedAt: alertOverrideUpdatedAt }
    : null;
  const manualCue = manualOverrideLabel && manualOverrideUpdatedAt !== null
    ? { kind: 'manual-override' as const, label: manualOverrideLabel, updatedAt: manualOverrideUpdatedAt }
    : null;

  if (alertCue && manualCue) {
    return alertCue.updatedAt >= manualCue.updatedAt ? alertCue : manualCue;
  }

  return alertCue ?? manualCue;
};
