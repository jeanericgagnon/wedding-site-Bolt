import type React from 'react';

interface BuildRsvpLiveContentActionsOptions {
  activeLookupRequestRef: React.MutableRefObject<number>;
  formStep: 1 | 2 | 3;
  guestPresent: boolean;
  invalidateActiveSubmit: () => void;
  loading: boolean;
  resetToSearch: (preserveToken?: boolean) => void;
  returnToLoadedRsvp: () => void;
  setError: (value: string) => void;
  setFormStep: React.Dispatch<React.SetStateAction<1 | 2 | 3>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface RsvpLiveContentActions {
  onBack: () => void;
  onCancelLoading: () => void;
  onDone: () => void;
  onSearchAgain: () => void;
  onSubmitAnother: () => void;
}

export function buildRsvpLiveContentActions({
  activeLookupRequestRef,
  formStep,
  guestPresent,
  invalidateActiveSubmit,
  loading,
  resetToSearch,
  returnToLoadedRsvp,
  setError,
  setFormStep,
  setLoading,
  setSubmitting,
}: BuildRsvpLiveContentActionsOptions): RsvpLiveContentActions {
  return {
    onBack: () => {
      invalidateActiveSubmit();
      if (formStep > 1) {
        setError('');
        setFormStep((formStep - 1) as 1 | 2 | 3);
      } else {
        resetToSearch(false);
      }
    },
    onCancelLoading: () => {
      if (loading) {
        activeLookupRequestRef.current += 1;
        setLoading(false);
        setSubmitting(false);
      }
      setError('');
    },
    onDone: () => {
      if (guestPresent) {
        returnToLoadedRsvp();
        return;
      }
      resetToSearch(true);
    },
    onSearchAgain: () => {
      resetToSearch(false);
    },
    onSubmitAnother: () => {
      resetToSearch(false);
    },
  };
}
