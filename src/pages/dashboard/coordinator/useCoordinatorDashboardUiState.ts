import { useCallback, useEffect, useRef, useState } from 'react';
import { getCoordinatorNeutralFocusReason } from '../../../lib/coordinatorNeutralFocusReason';
import type { CoordinatorPanelFocus } from '../../../lib/coordinatorPanelFocus';
import type { CoordinatorSummaryFeedback } from '../../../lib/coordinatorSummaryFeedback';

type Args = {
  siteId?: string | null;
  isDemoMode?: boolean;
};

type SyncArgs = {
  commandSource: 'primary-action' | 'escalation' | 'correction' | null;
  correctionCueCount: number;
  liveIssueCount: number;
  panelFocus: CoordinatorPanelFocus | null;
  primaryActionKey: string;
  setCommandSource: (value: 'primary-action' | 'escalation' | 'correction' | null) => void;
  setNeutralFocusReason: (value: string | null) => void;
};

export function useCoordinatorDashboardUiState(_args?: Args) {
  const previousSiteIdRef = useRef<string | null>(null);
  const [neutralFocusReason, setNeutralFocusReason] = useState<string | null>(null);
  const [commandJumpLabel, setCommandJumpLabel] = useState<string | null>(null);
  const [commandJumpPanelFocus, setCommandJumpPanelFocus] = useState<CoordinatorPanelFocus | null>(null);
  const [commandJumpTargetId, setCommandJumpTargetId] = useState<string | null>(null);
  const [manualOverrideLabel, setManualOverrideLabel] = useState<string | null>(null);
  const [manualOverrideUpdatedAt, setManualOverrideUpdatedAt] = useState<number | null>(null);
  const [alertOverrideLabelState, setAlertOverrideLabelState] = useState<string | null>(null);
  const [alertOverrideUpdatedAt, setAlertOverrideUpdatedAt] = useState<number | null>(null);
  const [overrideCueShownAt, setOverrideCueShownAt] = useState<number | null>(null);
  const [summaryFeedbackShownAt, setSummaryFeedbackShownAt] = useState<number | null>(null);
  const [previousAlertAligned, setPreviousAlertAligned] = useState<boolean | null>(null);
  const [summaryFeedback, setSummaryFeedback] = useState<CoordinatorSummaryFeedback | null>(null);

  const resetCoordinatorDashboardUiState = useCallback(() => {
    setNeutralFocusReason(null);
    setCommandJumpLabel(null);
    setCommandJumpPanelFocus(null);
    setCommandJumpTargetId(null);
    setManualOverrideLabel(null);
    setManualOverrideUpdatedAt(null);
    setAlertOverrideLabelState(null);
    setAlertOverrideUpdatedAt(null);
    setOverrideCueShownAt(null);
    setSummaryFeedbackShownAt(null);
    setPreviousAlertAligned(null);
    setSummaryFeedback(null);
  }, []);

  useEffect(() => {
    const siteId = _args?.siteId ?? null;
    const isDemoMode = _args?.isDemoMode ?? false;
    if (previousSiteIdRef.current && siteId && previousSiteIdRef.current !== siteId) {
      resetCoordinatorDashboardUiState();
    }
    previousSiteIdRef.current = siteId;
    if (!siteId && !isDemoMode) {
      resetCoordinatorDashboardUiState();
    }
  }, [_args?.isDemoMode, _args?.siteId, resetCoordinatorDashboardUiState]);

  return {
    alertOverrideLabelState,
    alertOverrideUpdatedAt,
    commandJumpLabel,
    commandJumpPanelFocus,
    commandJumpTargetId,
    manualOverrideLabel,
    manualOverrideUpdatedAt,
    neutralFocusReason,
    overrideCueShownAt,
    previousAlertAligned,
    setAlertOverrideLabelState,
    setAlertOverrideUpdatedAt,
    setCommandJumpLabel,
    setCommandJumpPanelFocus,
    setCommandJumpTargetId,
    setManualOverrideLabel,
    setManualOverrideUpdatedAt,
    setNeutralFocusReason,
    setOverrideCueShownAt,
    setPreviousAlertAligned,
    setSummaryFeedback,
    setSummaryFeedbackShownAt,
    summaryFeedback,
    summaryFeedbackShownAt,
  };
}

export function useCoordinatorDashboardUiStateSync(args: SyncArgs) {
  useEffect(() => {
    if (args.commandSource !== 'primary-action') return;
    if (args.primaryActionKey !== 'all-clear') return;
    args.setCommandSource(null);
    args.setNeutralFocusReason(getCoordinatorNeutralFocusReason(args.panelFocus));
  }, [args.commandSource, args.panelFocus, args.primaryActionKey, args.setCommandSource, args.setNeutralFocusReason]);

  useEffect(() => {
    if (args.commandSource !== 'escalation') return;
    if (args.liveIssueCount > 0) return;
    args.setCommandSource(null);
    args.setNeutralFocusReason(getCoordinatorNeutralFocusReason(args.panelFocus));
  }, [args.commandSource, args.liveIssueCount, args.panelFocus, args.setCommandSource, args.setNeutralFocusReason]);

  useEffect(() => {
    if (args.commandSource !== 'correction') return;
    if (args.correctionCueCount > 0) return;
    args.setCommandSource(null);
    args.setNeutralFocusReason(getCoordinatorNeutralFocusReason(args.panelFocus));
  }, [args.commandSource, args.correctionCueCount, args.panelFocus, args.setCommandSource, args.setNeutralFocusReason]);
}
