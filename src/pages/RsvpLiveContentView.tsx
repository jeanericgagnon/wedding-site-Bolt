import type React from 'react';
import type { TFunction } from 'i18next';

import { RsvpFlowView } from './RsvpFlowView';
import { RsvpFormView } from './RsvpFormView';
import { RsvpGuestPickerView } from './RsvpGuestPickerView';
import { RsvpSearchView } from './RsvpSearchView';
import { RsvpSuccessView } from './RsvpSuccessView';
import type { ExistingRSVP, Guest, HouseholdGuest, RSVPMealConfig, RSVPQuestion } from './rsvpTypes';

interface RsvpFormData {
  attending: boolean;
  attendCeremony: boolean;
  attendReception: boolean;
  meal_choice: string;
  plus_one_name: string;
  children_count: number;
  notes: string;
}

export interface RsvpLiveContentViewProps {
  activePredictionId?: string;
  activePredictionIndex: number;
  allowedChildrenCount: number;
  ambiguousGuests: Guest[];
  applyToHousehold: boolean;
  canSubmit: boolean;
  childCountOptions: Array<{ label: string; value: string }>;
  customAnswers: Record<string, string | string[]>;
  deadlinePassed: boolean;
  error: string;
  existingRsvp: ExistingRSVP | null;
  formData: RsvpFormData;
  formStep: 1 | 2 | 3;
  getQuestionLabel: (question: RSVPQuestion) => string;
  guest: Guest | null;
  guestDisplayName: string;
  guestLabel: (guest: Guest) => string;
  guestPredictions: string[];
  goToNextFormStep: () => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  householdGuests: HouseholdGuest[];
  inheritedHouseholdMembers: HouseholdGuest[];
  invitedEvents: string[];
  loading: boolean;
  mealConfig: RSVPMealConfig;
  onActivePredictionIndexChange: React.Dispatch<React.SetStateAction<number>>;
  onBack: () => void;
  onCancelLoading: () => void;
  onDone: () => void;
  onHouseholdSelectionChange: (updater: (current: string[]) => string[]) => void;
  onHouseholdToggle: (nextValue: boolean) => void;
  onPickGuest: (guest: Guest) => void;
  onSearchAgain: () => void;
  onSearchSubmit: (event: React.FormEvent) => Promise<void>;
  onSearchValueChange: (value: string) => void;
  onStepAnswerChange: (updater: (current: Record<string, string | string[]>) => Record<string, string | string[]>) => void;
  onStepDataChange: (updater: (current: RsvpFormData) => RsvpFormData) => void;
  onSubmitAnother: () => void;
  predictionListId: string;
  rsvpDeadline: string | null;
  rsvpQuestions: RSVPQuestion[];
  rsvpSessionToken: string | null;
  safeMusicPlaylistUrl: string | null;
  searchHintId: string;
  searchInputId: string;
  searchValue: string;
  selectedHouseholdGuestIds: string[];
  step: 'search' | 'pick' | 'form' | 'success';
  submitting: boolean;
  t: TFunction;
}

export function RsvpLiveContentView({
  activePredictionId,
  activePredictionIndex,
  allowedChildrenCount,
  ambiguousGuests,
  applyToHousehold,
  canSubmit,
  childCountOptions,
  customAnswers,
  deadlinePassed,
  error,
  existingRsvp,
  formData,
  formStep,
  getQuestionLabel,
  goToNextFormStep,
  guest,
  guestDisplayName,
  guestLabel,
  guestPredictions,
  handleSubmit,
  householdGuests,
  inheritedHouseholdMembers,
  invitedEvents,
  loading,
  mealConfig,
  onActivePredictionIndexChange,
  onBack,
  onCancelLoading,
  onDone,
  onHouseholdSelectionChange,
  onHouseholdToggle,
  onPickGuest,
  onSearchAgain,
  onSearchSubmit,
  onSearchValueChange,
  onStepAnswerChange,
  onStepDataChange,
  onSubmitAnother,
  predictionListId,
  rsvpDeadline,
  rsvpQuestions,
  rsvpSessionToken,
  safeMusicPlaylistUrl,
  searchHintId,
  searchInputId,
  searchValue,
  selectedHouseholdGuestIds,
  step,
  submitting,
  t,
}: RsvpLiveContentViewProps) {
  return (
    <div className="min-h-screen overflow-hidden bg-background">
      {step === 'search' ? (
        <RsvpSearchView
          activePredictionId={activePredictionId}
          activePredictionIndex={activePredictionIndex}
          error={error}
          guestPredictions={guestPredictions}
          loading={loading}
          onActivePredictionIndexChange={onActivePredictionIndexChange}
          onCancelLoading={onCancelLoading}
          onSearchSubmit={onSearchSubmit}
          onSearchValueChange={onSearchValueChange}
          predictionListId={predictionListId}
          searchHintId={searchHintId}
          searchInputId={searchInputId}
          searchValue={searchValue}
          t={t}
        />
      ) : (
        <RsvpFlowView
          step={step as 'pick' | 'form' | 'success'}
          pickerContent={(
            <RsvpGuestPickerView
              ambiguousGuests={ambiguousGuests}
              guestLabel={guestLabel}
              loading={loading}
              onPickGuest={onPickGuest}
              onSearchAgain={onSearchAgain}
            />
          )}
          formContent={step === 'form' && guest ? (
            <RsvpFormView
              allowedChildrenCount={allowedChildrenCount}
              applyToHousehold={applyToHousehold}
              canSubmit={canSubmit}
              childCountOptions={childCountOptions}
              customAnswers={customAnswers}
              deadlinePassed={deadlinePassed}
              error={error}
              existingRsvp={existingRsvp}
              formData={formData}
              formStep={formStep}
              getQuestionLabel={getQuestionLabel}
              goToNextFormStep={goToNextFormStep}
              guest={guest}
              guestDisplayName={guestDisplayName}
              handleSubmit={handleSubmit}
              householdGuests={householdGuests}
              inheritedHouseholdMembers={inheritedHouseholdMembers}
              invitedEvents={invitedEvents}
              loading={loading}
              mealConfig={mealConfig}
              onBack={onBack}
              onHouseholdSelectionChange={onHouseholdSelectionChange}
              onHouseholdToggle={onHouseholdToggle}
              onStepAnswerChange={onStepAnswerChange}
              onStepDataChange={onStepDataChange}
              rsvpDeadline={rsvpDeadline}
              rsvpQuestions={rsvpQuestions}
              rsvpSessionToken={rsvpSessionToken}
              safeMusicPlaylistUrl={safeMusicPlaylistUrl}
              selectedHouseholdGuestIds={selectedHouseholdGuestIds}
              submitting={submitting}
            />
          ) : null}
          successContent={(
            <RsvpSuccessView
              applyToHousehold={applyToHousehold}
              formData={formData}
              guestDisplayName={guestDisplayName}
              guestInvitedToCeremony={!!guest?.invited_to_ceremony}
              guestInvitedToReception={!!guest?.invited_to_reception}
              guestPresent={!!guest}
              inheritedHouseholdMembers={inheritedHouseholdMembers}
              onDone={onDone}
              onSubmitAnother={onSubmitAnother}
            />
          )}
        />
      )}
    </div>
  );
}
