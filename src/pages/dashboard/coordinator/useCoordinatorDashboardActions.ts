import { useState, type Dispatch, type SetStateAction } from 'react';
import type { GuestLiteForCoordinator } from '../../../lib/coordinatorTypes';
import type { CoordinatorAlertForm } from '../../../lib/coordinatorAlertFlow';
import { appendCoordinatorAlertLogItem, resolveCoordinatorScheduledFor } from '../../../lib/coordinatorAlertFlow';
import { resetCoordinatorAlertFormAfterSend } from '../../../lib/coordinatorAlertReset';
import { applyCoordinatorAlertSuggestion } from '../../../lib/coordinatorAlertSuggestionApply';
import { getNextCoordinatorCheckInFocusId } from '../../../lib/coordinatorCheckInAdvance';
import type { CoordinatorAlertSuggestion } from '../../../lib/coordinatorAlertSuggestions';
import type { QnaItem, AlertLog } from './coordinatorDashboardTypes';
import {
  createCoordinatorAlertMessage,
  createCoordinatorQnaQuestion,
  updateCoordinatorGuestCheckIn,
} from './coordinatorService';

type Args = {
  alertAudienceCount: number;
  alertForm: CoordinatorAlertForm;
  alertOverrideLabel: string | null;
  alertTargetCueAligned: boolean;
  canCheckIn: boolean;
  canEditQna: boolean;
  canScheduleAlerts: boolean;
  canSendAlerts: boolean;
  checkInFilter: 'all' | 'arrivals' | 'checked-in';
  checkInQueue: GuestLiteForCoordinator[];
  focusCoordinatorQnaLane: () => void;
  isDemoMode: boolean;
  preferredAlertSuggestion: CoordinatorAlertSuggestion | null;
  qnaInput: string;
  setActiveGuestId: (guestId: string | null) => void;
  setAlertForm: Dispatch<SetStateAction<CoordinatorAlertForm>>;
  setAlertLog: Dispatch<SetStateAction<AlertLog[]>>;
  setAlertOverrideLabelState: Dispatch<SetStateAction<string | null>>;
  setGuests: Dispatch<SetStateAction<GuestLiteForCoordinator[]>>;
  setPreviousAlertAligned: Dispatch<SetStateAction<boolean | null>>;
  setQnaInput: Dispatch<SetStateAction<string>>;
  setQnaItems: Dispatch<SetStateAction<QnaItem[]>>;
  siteId: string | null;
  toast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  validationError: string | null;
};

export function useCoordinatorDashboardActions(args: Args) {
  const [alertBusy, setAlertBusy] = useState(false);
  const [checkInBusyGuestId, setCheckInBusyGuestId] = useState<string | null>(null);

  const toggleCheckIn = async (guest: GuestLiteForCoordinator) => {
    if (!args.canCheckIn) {
      args.toast('Your collaborator role cannot update coordinator check-in.', 'info');
      return;
    }

    if (checkInBusyGuestId === guest.id) return;

    const next = guest.checked_in_at ? null : new Date().toISOString();
    const removesFromCurrentQueue = !guest.checked_in_at && (args.checkInFilter !== 'checked-in');
    const nextFocusGuestId = getNextCoordinatorCheckInFocusId({
      queue: args.checkInQueue,
      activeGuestId: guest.id,
      removeActiveGuest: removesFromCurrentQueue,
    });

    setCheckInBusyGuestId(guest.id);

    try {
      if (args.isDemoMode) {
        args.setGuests((prev) => prev.map((g) => (g.id === guest.id ? { ...g, checked_in_at: next } : g)));
        args.setActiveGuestId(nextFocusGuestId);
        args.toast(next ? 'Guest checked in. Door focus moved to the next guest.' : 'Guest moved back to arrivals.', 'success');
        return;
      }

      if (!args.siteId) return;

      try {
        await updateCoordinatorGuestCheckIn({ siteId: args.siteId, guestId: guest.id, checkedInAt: next });
      } catch {
        args.toast('Couldn’t update check-in right now.', 'error');
        return;
      }

      args.setGuests((prev) => prev.map((g) => (g.id === guest.id ? { ...g, checked_in_at: next } : g)));
      args.setActiveGuestId(nextFocusGuestId);
      args.toast(next ? 'Guest checked in. Door focus moved to the next guest.' : 'Guest moved back to arrivals.', 'success');
    } finally {
      setCheckInBusyGuestId((current) => (current === guest.id ? null : current));
    }
  };

  const sendDayOfAlert = async () => {
    if (!args.siteId) return;
    if (!args.canSendAlerts) {
      args.toast('Your collaborator role cannot send coordinator alerts.', 'info');
      return;
    }
    if (args.alertForm.scheduleType === 'later' && !args.canScheduleAlerts) {
      args.toast('Your collaborator role cannot schedule coordinator alerts.', 'info');
      return;
    }
    if (args.validationError) {
      args.toast(args.validationError, 'error');
      return;
    }
    const scheduledFor = resolveCoordinatorScheduledFor(args.alertForm);
    const status = scheduledFor ? 'scheduled' : 'queued';

    setAlertBusy(true);
    try {
      if (!args.isDemoMode) {
        await createCoordinatorAlertMessage({
          siteId: args.siteId,
          subject: args.alertForm.subject.trim(),
          body: args.alertForm.body.trim(),
          channel: args.alertForm.channel,
          audience: args.alertForm.audience,
          recipientCount: args.alertAudienceCount,
          status,
          scheduledFor,
        });
      }

      args.setAlertLog((prev) => appendCoordinatorAlertLogItem(prev, {
        id: `${Date.now()}`,
        subject: args.alertForm.subject.trim(),
        audience: args.alertForm.audience,
        channel: args.alertForm.channel,
        queuedAt: new Date().toISOString(),
        sendAt: scheduledFor,
      }));
      args.setPreviousAlertAligned(args.alertTargetCueAligned);
      args.setAlertOverrideLabelState(args.alertTargetCueAligned ? null : args.alertOverrideLabel);
      args.setAlertForm((prev) => {
        const reset = resetCoordinatorAlertFormAfterSend(prev);
        return args.preferredAlertSuggestion
          ? applyCoordinatorAlertSuggestion({ form: reset, suggestion: args.preferredAlertSuggestion })
          : reset;
      });
      args.toast(scheduledFor ? 'Coordinator alert scheduled.' : 'Coordinator alert queued.', 'success');
    } catch {
      args.toast('Couldn’t prepare that update right now.', 'error');
    } finally {
      setAlertBusy(false);
    }
  };

  const addQnaItem = async () => {
    if (!args.canEditQna) {
      args.toast('Your collaborator role cannot add guest questions here.', 'info');
      return;
    }

    const q = args.qnaInput.trim();
    if (!q) return;

    args.focusCoordinatorQnaLane();

    if (!args.isDemoMode && args.siteId) {
      try {
        const data = await createCoordinatorQnaQuestion(args.siteId, q);
        args.setQnaItems((prev) => [data, ...prev].slice(0, 30));
      } catch {
        args.toast('Couldn’t save that guest question right now.', 'error');
        return;
      }
    } else {
      args.setQnaItems((prev) => [{ id: `${Date.now()}`, question: q, status: 'new' as const }, ...prev].slice(0, 30));
    }
    args.setQnaInput('');
  };

  return {
    addQnaItem,
    alertBusy,
    checkInBusyGuestId,
    sendDayOfAlert,
    toggleCheckIn,
  };
}
