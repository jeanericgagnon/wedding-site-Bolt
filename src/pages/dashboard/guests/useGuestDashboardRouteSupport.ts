import { useEffect, useMemo, useRef, useState } from 'react';
import { buildRsvpAccessModePlan, buildRsvpQuestionTemplateCoverage, buildRsvpSetupChecklist } from '../../../lib/rsvpAccessPlanner';
import { type PlannerAccessRole, readPlannerAccessRole, writePlannerAccessRole } from '../../../lib/plannerAccess';
import type { ConfirmDialogProps } from '../../../components/ui/ConfirmDialog';
import type { Guest, ItineraryEvent, RSVPQuestionSetting } from './guestDashboardTypes';

type Args = {
  guests: Guest[];
  guestsRole: PlannerAccessRole;
  itineraryFilterEvents: ItineraryEvent[];
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
  rsvpMealEnabled,
  rsvpMealOptions,
  rsvpQuestions,
  setGuestsRole,
  weddingSiteId,
}: Args) {
  const [confirmDialog, setConfirmDialog] = useState<null | Omit<ConfirmDialogProps, 'open'>>(null);
  const requestConfirmation = (options: Pick<ConfirmDialogProps, 'title' | 'description' | 'confirmLabel' | 'tone'>) =>
    new Promise<boolean>((resolve) => {
      setConfirmDialog({
        ...options,
        onCancel: () => {
          setConfirmDialog(null);
          resolve(false);
        },
        onConfirm: () => {
          setConfirmDialog(null);
          resolve(true);
        },
      });
    });
  useEffect(() => {
    try {
      const rawRole = readPlannerAccessRole('guests', weddingSiteId ?? 'global');
      if (rawRole) setGuestsRole(rawRole);
    } catch {
      // noop
    }
  }, [setGuestsRole, weddingSiteId]);

  useEffect(() => {
    try {
      writePlannerAccessRole('guests', weddingSiteId ?? 'global', guestsRole);
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
  }), [effectiveItineraryEvents.length, guests]);

  const recommendedRsvpAccessMode = rsvpAccessModePlan.find((mode) => mode.status === 'recommended') ?? rsvpAccessModePlan[0];
  const rsvpQuestionTemplateCoverage = useMemo(() => buildRsvpQuestionTemplateCoverage(rsvpQuestions), [rsvpQuestions]);
  const rsvpSetupChecklist = useMemo(() => buildRsvpSetupChecklist({
    guestCount: guests.length,
    inviteTokenCount: guests.filter((guest) => Boolean(guest.invite_token)).length,
    householdCount: new Set(guests.map((guest) => guest.household_id).filter(Boolean)).size,
    eventCount: effectiveItineraryEvents.length,
    questions: rsvpQuestions,
    mealEnabled: rsvpMealEnabled,
    mealOptionCount: rsvpMealOptions.filter((option) => option.trim().length > 0).length,
  }), [effectiveItineraryEvents.length, guests, rsvpMealEnabled, rsvpMealOptions, rsvpQuestions]);

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
