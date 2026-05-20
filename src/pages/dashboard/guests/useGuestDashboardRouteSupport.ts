import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildRsvpAccessModePlan,
  buildRsvpQuestionTemplateCoverage,
  buildRsvpSetupChecklist,
  type PersistedRsvpAccessSelection,
} from '../../../lib/rsvpAccessPlanner';
import { type PlannerAccessRole, readPlannerAccessRole, writePlannerAccessRole } from '../../../lib/plannerAccess';
import type { ConfirmDialogProps } from '../../../components/ui/ConfirmDialog';
import type { Guest, ItineraryEvent, RSVPQuestionSetting } from './guestDashboardTypes';

type ConfirmationOptions = Pick<ConfirmDialogProps, 'title' | 'description' | 'confirmLabel' | 'tone'>;

type Args = {
  guests: Guest[];
  guestsRole: PlannerAccessRole;
  itineraryFilterEvents: ItineraryEvent[];
  rsvpAccessSelection: PersistedRsvpAccessSelection;
  rsvpMealEnabled: boolean;
  rsvpMealOptions: string[];
  rsvpQuestions: RSVPQuestionSetting[];
  setGuestsRole: (role: PlannerAccessRole) => void;
  weddingSiteId: string | null;
};

export function useGuestDashboardRouteSupport({
  guests,
  guestsRole,
  itineraryFilterEvents,
  rsvpAccessSelection,
  rsvpMealEnabled,
  rsvpMealOptions,
  rsvpQuestions,
  setGuestsRole,
  weddingSiteId,
}: Args) {
  const [confirmDialog, setConfirmDialog] = useState<null | Omit<ConfirmDialogProps, 'open'>>(null);
  const pendingConfirmationResolveRef = useRef<((confirmed: boolean) => void) | null>(null);
  const settleConfirmation = useCallback((confirmed: boolean) => {
    const resolve = pendingConfirmationResolveRef.current;
    pendingConfirmationResolveRef.current = null;
    setConfirmDialog(null);
    resolve?.(confirmed);
  }, []);
  const requestConfirmation = useCallback((options: ConfirmationOptions) =>
    new Promise<boolean>((resolve) => {
      pendingConfirmationResolveRef.current?.(false);
      pendingConfirmationResolveRef.current = resolve;
      setConfirmDialog({
        ...options,
        onCancel: () => settleConfirmation(false),
        onConfirm: () => settleConfirmation(true),
      });
    }), [settleConfirmation]);

  useEffect(() => () => {
    settleConfirmation(false);
  }, [settleConfirmation]);

  useEffect(() => {
    if (!weddingSiteId) {
      settleConfirmation(false);
      return;
    }
    try {
      const rawRole = readPlannerAccessRole('guests', weddingSiteId);
      if (rawRole) setGuestsRole(rawRole);
    } catch {
      // noop
    }
  }, [setGuestsRole, settleConfirmation, weddingSiteId]);

  useEffect(() => {
    if (!weddingSiteId) return;
    try {
      writePlannerAccessRole('guests', weddingSiteId, guestsRole);
    } catch {
      // noop
    }
  }, [guestsRole, weddingSiteId]);

  const effectiveItineraryEvents = useMemo<ItineraryEvent[]>(() => {
    if (itineraryFilterEvents.length > 0) return itineraryFilterEvents;
    return [
      { id: 'legacy-ceremony', event_name: 'Ceremony', event_date: '', start_time: '', location_name: '' },
      { id: 'legacy-reception', event_name: 'Reception', event_date: '', start_time: '', location_name: '' },
    ];
  }, [itineraryFilterEvents]);

  const rsvpAccessModePlan = useMemo(() => buildRsvpAccessModePlan({
    guestCount: guests.length,
    inviteTokenCount: guests.filter((guest) => Boolean(guest.invite_token)).length,
    householdCount: new Set(guests.map((guest) => guest.household_id).filter(Boolean)).size,
    eventCount: effectiveItineraryEvents.length,
    emailCount: guests.filter((guest) => Boolean(guest.email?.trim())).length,
    phoneCount: guests.filter((guest) => Boolean(guest.phone?.trim())).length,
  }, rsvpAccessSelection), [effectiveItineraryEvents.length, guests, rsvpAccessSelection]);

  const recommendedRsvpAccessMode = rsvpAccessModePlan.find((mode) => mode.status === 'recommended') ?? rsvpAccessModePlan[0];
  const rsvpQuestionTemplateCoverage = useMemo(() => buildRsvpQuestionTemplateCoverage(rsvpQuestions), [rsvpQuestions]);
  const rsvpSetupChecklist = useMemo(() => buildRsvpSetupChecklist({
    guestCount: guests.length,
    inviteTokenCount: guests.filter((guest) => Boolean(guest.invite_token)).length,
    householdCount: new Set(guests.map((guest) => guest.household_id).filter(Boolean)).size,
    eventCount: effectiveItineraryEvents.length,
    emailCount: guests.filter((guest) => Boolean(guest.email?.trim())).length,
    phoneCount: guests.filter((guest) => Boolean(guest.phone?.trim())).length,
    questions: rsvpQuestions,
    mealEnabled: rsvpMealEnabled,
    mealOptionCount: rsvpMealOptions.filter((option) => option.trim().length > 0).length,
  }, rsvpAccessSelection), [effectiveItineraryEvents.length, guests, rsvpAccessSelection, rsvpMealEnabled, rsvpMealOptions, rsvpQuestions]);

  return {
    confirmDialog,
    effectiveItineraryEvents,
    recommendedRsvpAccessMode,
    requestConfirmation,
    rsvpAccessModePlan,
    rsvpQuestionTemplateCoverage,
    rsvpSetupChecklist,
    setConfirmDialog,
  };
}
