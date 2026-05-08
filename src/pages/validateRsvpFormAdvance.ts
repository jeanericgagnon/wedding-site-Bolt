import type { Guest, RSVPMealConfig, RSVPQuestion } from './rsvpTypes';

interface RsvpFormDataLike {
  attending: boolean;
  attendCeremony: boolean;
  attendReception: boolean;
  meal_choice: string;
}

interface ValidateRsvpFormAdvanceArgs {
  customAnswers: Record<string, string | string[]>;
  formData: RsvpFormDataLike;
  formStep: 1 | 2 | 3;
  getRequiredQuestionValidationLabel: (question: RSVPQuestion) => string;
  guest: Guest | null;
  mealConfig: RSVPMealConfig;
  rsvpQuestions: RSVPQuestion[];
}

type ValidateRsvpFormAdvanceResult =
  | { nextStep: 2 | 3 }
  | { error: string };

export function validateRsvpFormAdvance({
  customAnswers,
  formData,
  formStep,
  getRequiredQuestionValidationLabel,
  guest,
  mealConfig,
  rsvpQuestions,
}: ValidateRsvpFormAdvanceArgs): ValidateRsvpFormAdvanceResult {
  if (formStep === 1) {
    if (formData.attending && guest && !guest.invited_to_ceremony && !guest.invited_to_reception) {
      return { error: 'You are marked attending, but no event invitations are enabled for this guest.' };
    }
    return { nextStep: 2 };
  }

  if (formStep === 2) {
    if (formData.attending && guest?.invited_to_ceremony && guest?.invited_to_reception && !formData.attendCeremony && !formData.attendReception) {
      return { error: 'Please select at least one event before continuing.' };
    }

    if (formData.attending && mealConfig.enabled && !formData.meal_choice) {
      return { error: 'Please choose a meal option before review.' };
    }

    const requiredMissing = rsvpQuestions
      .filter((question) => question.required)
      .filter((question) => (
        (question.appliesTo ?? 'all') === 'all'
        || ((question.appliesTo === 'ceremony' && formData.attendCeremony) || (question.appliesTo === 'reception' && formData.attendReception))
      ))
      .find((question) => {
        const value = customAnswers[question.id];
        if (Array.isArray(value)) return value.length === 0;
        return !(value || '').toString().trim();
      });

    if (requiredMissing) {
      return { error: `Please answer: ${getRequiredQuestionValidationLabel(requiredMissing)}` };
    }

    return { nextStep: 3 };
  }

  return { nextStep: formStep };
}
