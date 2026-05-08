import { useEffect } from 'react';
import { shouldResetCoordinatorCommandJumpLabel } from '../../../lib/coordinatorCommandJumpReset';
import { shouldResetCoordinatorCommandJumpLabelForTargetChange } from '../../../lib/coordinatorCommandJumpTargetReset';
import { shouldResetCoordinatorManualOverride } from '../../../lib/coordinatorManualOverrideReset';
import { getCoordinatorManualOverrideLabel } from '../../../lib/coordinatorManualOverrideLabel';
import { getCoordinatorRealignmentLabel } from '../../../lib/coordinatorRealignmentLabel';
import { createCoordinatorSummaryFeedback, type CoordinatorSummaryFeedback } from '../../../lib/coordinatorSummaryFeedback';
import { shouldResetCoordinatorSummaryFeedback } from '../../../lib/coordinatorSummaryFeedbackReset';
import { shouldExpireCoordinatorOverrideCue } from '../../../lib/coordinatorOverrideCueExpiry';
import { shouldExpireCoordinatorCue } from '../../../lib/coordinatorCueExpiry';

type CoordinatorPanelFocus = 'check-in' | 'timeline' | 'qna' | null;

type UseCoordinatorDashboardCueLifecycleArgs = {
  activeGuestId: string | null;
  activeQnaId: string | null;
  activeTimelineEventId: string | null;
  alertOverrideLabelState: string | null;
  checkInBoardTargetId: string | null;
  commandJumpLabel: string | null;
  commandJumpPanelFocus: CoordinatorPanelFocus;
  commandJumpTargetId: string | null;
  manualOverrideLabel: string | null;
  overrideCueShownAt: number | null;
  panelFocus: CoordinatorPanelFocus;
  qnaBoardTargetId: string | null;
  summaryFeedback: CoordinatorSummaryFeedback | null;
  summaryFeedbackShownAt: number | null;
  timelineBoardTargetId: string | null;
  setAlertOverrideLabelState: (value: string | null) => void;
  setAlertOverrideUpdatedAt: (value: number | null) => void;
  setCommandJumpLabel: (value: string | null) => void;
  setCommandJumpPanelFocus: (value: CoordinatorPanelFocus) => void;
  setCommandJumpTargetId: (value: string | null) => void;
  setManualOverrideLabel: (value: string | null) => void;
  setManualOverrideUpdatedAt: (value: number | null) => void;
  setOverrideCueShownAt: (value: number | null) => void;
  setSummaryFeedback: (value: CoordinatorSummaryFeedback | null) => void;
  setSummaryFeedbackShownAt: (value: number | null) => void;
};

export function useCoordinatorDashboardCueLifecycle(args: UseCoordinatorDashboardCueLifecycleArgs) {
  const currentTargetId =
    args.panelFocus === 'check-in'
      ? args.activeGuestId
      : args.panelFocus === 'timeline'
        ? args.activeTimelineEventId
        : args.panelFocus === 'qna'
          ? args.activeQnaId
          : null;

  const boardTargetId =
    args.panelFocus === 'check-in'
      ? args.checkInBoardTargetId
      : args.panelFocus === 'timeline'
        ? args.timelineBoardTargetId
        : args.panelFocus === 'qna'
          ? args.qnaBoardTargetId
          : null;

  useEffect(() => {
    if (
      shouldResetCoordinatorCommandJumpLabel({
        jumpLabel: args.commandJumpLabel,
        panelFocus: args.panelFocus,
        expectedPanelFocus: args.commandJumpPanelFocus,
      })
    ) {
      args.setCommandJumpLabel(null);
      args.setCommandJumpPanelFocus(null);
      args.setCommandJumpTargetId(null);
    }
  }, [args.commandJumpLabel, args.commandJumpPanelFocus, args.panelFocus]);

  useEffect(() => {
    if (
      shouldResetCoordinatorCommandJumpLabelForTargetChange({
        jumpLabel: args.commandJumpLabel,
        panelFocus: args.panelFocus,
        expectedPanelFocus: args.commandJumpPanelFocus,
        currentTargetId,
        expectedTargetId: args.commandJumpTargetId,
      })
    ) {
      args.setCommandJumpLabel(null);
      args.setCommandJumpPanelFocus(null);
      args.setCommandJumpTargetId(null);
    }
  }, [args.commandJumpLabel, args.commandJumpPanelFocus, args.commandJumpTargetId, args.panelFocus, currentTargetId]);

  useEffect(() => {
    if (
      shouldResetCoordinatorManualOverride({
        manualOverrideLabel: args.manualOverrideLabel,
        panelFocus: args.panelFocus,
        boardTargetId,
        currentTargetId,
      })
    ) {
      args.setManualOverrideLabel(null);
      args.setManualOverrideUpdatedAt(null);
      args.setOverrideCueShownAt(null);
      const realignment = getCoordinatorRealignmentLabel(args.panelFocus);
      if (realignment) {
        args.setSummaryFeedback(
          createCoordinatorSummaryFeedback({
            label: realignment,
            panelFocus: args.panelFocus,
            targetId: currentTargetId,
            kind: 'realignment',
          }),
        );
        args.setSummaryFeedbackShownAt(Date.now());
      }
    }
  }, [args.manualOverrideLabel, args.panelFocus, boardTargetId, currentTargetId]);

  useEffect(() => {
    if (!args.panelFocus || !currentTargetId || !boardTargetId || currentTargetId === boardTargetId) return;

    const nextManualOverrideLabel = getCoordinatorManualOverrideLabel(args.panelFocus);
    if (!nextManualOverrideLabel || args.manualOverrideLabel === nextManualOverrideLabel) return;

    const nextManualOverrideTime = Date.now();
    args.setManualOverrideLabel(nextManualOverrideLabel);
    args.setManualOverrideUpdatedAt(nextManualOverrideTime);
    args.setOverrideCueShownAt(nextManualOverrideTime);
  }, [args.manualOverrideLabel, args.panelFocus, boardTargetId, currentTargetId]);

  useEffect(() => {
    if (
      shouldResetCoordinatorSummaryFeedback({
        feedbackLabel: args.summaryFeedback?.label ?? null,
        panelFocus: args.panelFocus,
        expectedPanelFocus: args.summaryFeedback?.panelFocus ?? null,
        currentTargetId,
        expectedTargetId: args.summaryFeedback?.targetId ?? null,
      })
    ) {
      args.setSummaryFeedback(null);
      args.setSummaryFeedbackShownAt(null);
    }
  }, [args.summaryFeedback, args.panelFocus, currentTargetId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (
        shouldExpireCoordinatorOverrideCue({
          shownAt: args.overrideCueShownAt,
          now: Date.now(),
          maxAgeMs: 5000,
          hasSummaryFeedback: !!args.summaryFeedback,
        })
      ) {
        args.setAlertOverrideLabelState(null);
        args.setAlertOverrideUpdatedAt(null);
        args.setManualOverrideLabel(null);
        args.setManualOverrideUpdatedAt(null);
        args.setOverrideCueShownAt(null);
      }
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [args.overrideCueShownAt, args.summaryFeedback]);

  useEffect(() => {
    if (!args.summaryFeedback) return;
    const timer = window.setTimeout(() => {
      if (
        shouldExpireCoordinatorCue({
          shownAt: args.summaryFeedbackShownAt,
          now: Date.now(),
          maxAgeMs: 5000,
        })
      ) {
        args.setSummaryFeedback(null);
        args.setSummaryFeedbackShownAt(null);
      }
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [args.summaryFeedback, args.summaryFeedbackShownAt]);
}
