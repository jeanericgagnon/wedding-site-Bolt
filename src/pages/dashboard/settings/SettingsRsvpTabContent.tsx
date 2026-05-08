import React from 'react';
import type { FormEvent } from 'react';
import type { RSVPQuestionSetting } from './settingsDashboardTypes';
import { SettingsRsvpMealPanel } from './SettingsRsvpMealPanel';
import { SettingsRsvpQuestionsPanel } from './SettingsRsvpQuestionsPanel';

type SettingsRsvpTabContentProps = {
  collapsedQuestionIds: Set<string>;
  mealOptions: string[];
  musicPlaylistUrl: string;
  onAddChoice: (questionId: string) => void;
  onAddMealOption: () => void;
  onAddQuestion: () => void;
  onAppliesToChange: (questionId: string, value: RSVPQuestionSetting['appliesTo']) => void;
  onMealChoiceEnabledChange: (enabled: boolean) => void;
  onMealOptionChange: (index: number, value: string) => void;
  onMusicPlaylistUrlChange: (value: string) => void;
  onOpenPlaylist: () => void;
  onPromptChange: (questionId: string, value: string) => void;
  onRemoveChoice: (questionId: string, optionIndex: number) => void;
  onRemoveMealOption: (index: number) => void;
  onRemoveQuestion: (questionId: string) => void;
  onRequiredChange: (questionId: string, checked: boolean) => void;
  onSaveMealSettings: () => void;
  onSaveMusicPlaylist: () => void;
  onSaveQuestions: (event: FormEvent) => void;
  onToggleAdvancedVisibility: () => void;
  onToggleCollapse: (questionId: string) => void;
  onToggleMealVisibility: () => void;
  onTypeChange: (questionId: string, value: RSVPQuestionSetting['type']) => void;
  onUpdateChoice: (questionId: string, optionIndex: number, value: string) => void;
  questions: RSVPQuestionSetting[];
  rsvpMealEnabled: boolean;
  rsvpQuestionsError: string | null;
  rsvpQuestionsSaving: boolean;
  rsvpQuestionsSuccess: string | null;
  safeMusicPlaylistUrl: string | null;
  showAdvancedRsvp: boolean;
  showMealChoiceSettings: boolean;
};

export function SettingsRsvpTabContent({
  collapsedQuestionIds,
  mealOptions,
  musicPlaylistUrl,
  onAddChoice,
  onAddMealOption,
  onAddQuestion,
  onAppliesToChange,
  onMealChoiceEnabledChange,
  onMealOptionChange,
  onMusicPlaylistUrlChange,
  onOpenPlaylist,
  onPromptChange,
  onRemoveChoice,
  onRemoveMealOption,
  onRemoveQuestion,
  onRequiredChange,
  onSaveMealSettings,
  onSaveMusicPlaylist,
  onSaveQuestions,
  onToggleAdvancedVisibility,
  onToggleCollapse,
  onToggleMealVisibility,
  onTypeChange,
  onUpdateChoice,
  questions,
  rsvpMealEnabled,
  rsvpQuestionsError,
  rsvpQuestionsSaving,
  rsvpQuestionsSuccess,
  safeMusicPlaylistUrl,
  showAdvancedRsvp,
  showMealChoiceSettings,
}: SettingsRsvpTabContentProps) {
  return (
    <>
      <SettingsRsvpMealPanel
        mealOptions={mealOptions}
        onAddMealOption={onAddMealOption}
        onMealChoiceEnabledChange={onMealChoiceEnabledChange}
        onMealOptionChange={onMealOptionChange}
        onRemoveMealOption={onRemoveMealOption}
        onSave={onSaveMealSettings}
        onToggleVisibility={onToggleMealVisibility}
        rsvpMealEnabled={rsvpMealEnabled}
        rsvpQuestionsError={rsvpQuestionsError}
        rsvpQuestionsSaving={rsvpQuestionsSaving}
        rsvpQuestionsSuccess={rsvpQuestionsSuccess}
        showAdvancedRsvp={showAdvancedRsvp}
        showMealChoiceSettings={showMealChoiceSettings}
      />

      <SettingsRsvpQuestionsPanel
        collapsedQuestionIds={collapsedQuestionIds}
        musicPlaylistUrl={musicPlaylistUrl}
        onAddChoice={onAddChoice}
        onAddQuestion={onAddQuestion}
        onAppliesToChange={onAppliesToChange}
        onMusicPlaylistUrlChange={onMusicPlaylistUrlChange}
        onOpenPlaylist={onOpenPlaylist}
        onPromptChange={onPromptChange}
        onRemoveChoice={onRemoveChoice}
        onRemoveQuestion={onRemoveQuestion}
        onRequiredChange={onRequiredChange}
        onSave={onSaveQuestions}
        onSaveMusicPlaylist={onSaveMusicPlaylist}
        onToggleCollapse={onToggleCollapse}
        onToggleVisibility={onToggleAdvancedVisibility}
        onTypeChange={onTypeChange}
        onUpdateChoice={onUpdateChoice}
        questions={questions}
        rsvpQuestionsError={rsvpQuestionsError}
        rsvpQuestionsSaving={rsvpQuestionsSaving}
        rsvpQuestionsSuccess={rsvpQuestionsSuccess}
        safeMusicPlaylistUrl={safeMusicPlaylistUrl}
        showAdvancedRsvp={showAdvancedRsvp}
      />
    </>
  );
}
