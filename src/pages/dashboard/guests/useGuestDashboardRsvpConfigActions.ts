import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';

import type { ToastType } from '../../../components/ui/Toast';
import {
  createRsvpQuestionFromTemplate,
  type RsvpQuestionTemplate,
} from '../../../lib/rsvpAccessPlanner';
import { safeGuestsDashboardError, toTitleCase } from './guestDashboardUtils';
import { writeStoredDemoRsvpConfig } from './guestDashboardStorage';
import { persistGuestDashboardRsvpConfig } from './guestService';
import type { RSVPQuestionSetting } from './guestDashboardTypes';

interface UseGuestDashboardRsvpConfigActionsInput {
  guestsTab: 'ops' | 'rsvp-config';
  isDemoMode: boolean;
  rsvpConfigLoadedRef: MutableRefObject<boolean>;
  rsvpMealEnabled: boolean;
  rsvpMealOptions: string[];
  rsvpQuestions: RSVPQuestionSetting[];
  setRsvpQuestions: React.Dispatch<React.SetStateAction<RSVPQuestionSetting[]>>;
  toast: (message: string, type?: ToastType) => void;
  weddingSiteId: string | null;
}

export function useGuestDashboardRsvpConfigActions({
  guestsTab,
  isDemoMode,
  rsvpConfigLoadedRef,
  rsvpMealEnabled,
  rsvpMealOptions,
  rsvpQuestions,
  setRsvpQuestions,
  toast,
  weddingSiteId,
}: UseGuestDashboardRsvpConfigActionsInput) {
  const [rsvpConfigSaving, setRsvpConfigSaving] = useState(false);
  const [rsvpAutoSaveState, setRsvpAutoSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [rsvpConfigDirty, setRsvpConfigDirty] = useState(false);

  const addRsvpQuestionTemplate = useCallback((template: RsvpQuestionTemplate) => {
    const alreadyExists = rsvpQuestions.some((question) => question.label.trim().toLowerCase() === template.label.toLowerCase());
    if (alreadyExists) {
      toast('That RSVP question is already in your list.', 'info');
      return;
    }

    setRsvpQuestions((prev) => [
      ...prev,
      createRsvpQuestionFromTemplate(template, `q_${Date.now().toString(36)}_${template.key}`),
    ]);
    setRsvpConfigDirty(true);
  }, [rsvpQuestions, setRsvpQuestions, toast]);

  const handleSaveRsvpConfig = useCallback(async () => {
    setRsvpConfigSaving(true);
    try {
      const normalizedQuestions = rsvpQuestions
        .map((question) => ({
          ...question,
          label: question.label.trim(),
          options: (question.type === 'single_choice' || question.type === 'multi_choice')
            ? (question.options ?? []).map((option) => option.trim()).filter(Boolean)
            : [],
        }));

      const cleanedQuestions = normalizedQuestions.filter((question) => question.label.length > 0);

      const missingOptions = cleanedQuestions.find(
        (question) => (question.type === 'single_choice' || question.type === 'multi_choice') && (question.options?.length ?? 0) < 2,
      );
      if (missingOptions) {
        toast(`Choice question "${missingOptions.label}" needs at least 2 options.`, 'error');
        return;
      }

      const mealOptions = rsvpMealOptions.map((option) => toTitleCase(option.trim())).filter(Boolean);
      if (rsvpMealEnabled && mealOptions.length < 2) {
        toast('Meal choices need at least 2 options when enabled.', 'error');
        return;
      }

      if (isDemoMode || !weddingSiteId) {
        writeStoredDemoRsvpConfig({ questions: cleanedQuestions, mealEnabled: rsvpMealEnabled, mealOptions });
        setRsvpQuestions(cleanedQuestions);
        toast('RSVP settings saved (demo).', 'success');
        setRsvpAutoSaveState('saved');
        setRsvpConfigDirty(false);
        return;
      }

      await persistGuestDashboardRsvpConfig({
        weddingSiteId,
        questions: cleanedQuestions,
        mealEnabled: rsvpMealEnabled,
        mealOptions,
      });
      setRsvpQuestions(cleanedQuestions);
      toast('RSVP settings saved.', 'success');
      setRsvpAutoSaveState('saved');
      setRsvpConfigDirty(false);
    } catch (error) {
      setRsvpAutoSaveState('error');
      toast(safeGuestsDashboardError(error, 'Couldn’t save RSVP settings.'), 'error');
    } finally {
      setRsvpConfigSaving(false);
    }
  }, [
    isDemoMode,
    rsvpMealEnabled,
    rsvpMealOptions,
    rsvpQuestions,
    setRsvpQuestions,
    toast,
    weddingSiteId,
  ]);

  const autoSaveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (guestsTab !== 'rsvp-config') return;
    if (!rsvpConfigLoadedRef.current) return;
    if (!rsvpConfigDirty) return;

    const hasDraftQuestion = rsvpQuestions.some((question) => question.label.trim().length === 0);
    if (hasDraftQuestion) {
      setRsvpAutoSaveState('idle');
      if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
      return;
    }

    setRsvpAutoSaveState('saving');

    if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = window.setTimeout(() => {
      void handleSaveRsvpConfig();
    }, 700);

    return () => {
      if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
    };
  }, [
    guestsTab,
    handleSaveRsvpConfig,
    rsvpConfigDirty,
    rsvpConfigLoadedRef,
    rsvpQuestions,
  ]);

  return {
    addRsvpQuestionTemplate,
    handleSaveRsvpConfig,
    rsvpAutoSaveState,
    rsvpConfigDirty,
    rsvpConfigSaving,
    setRsvpConfigDirty,
  };
}
