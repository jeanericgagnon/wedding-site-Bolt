import { ChevronDown, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Select } from '../../../components/ui';
import type { RSVPQuestionSetting } from './settingsDashboardTypes';

type SettingsRsvpQuestionsPanelProps = {
  canEditSettings: boolean;
  collapsedQuestionIds: Set<string>;
  musicPlaylistUrl: string;
  onAddChoice: (questionId: string) => void;
  onAddQuestion: () => void;
  onAppliesToChange: (questionId: string, value: RSVPQuestionSetting['appliesTo']) => void;
  onMusicPlaylistUrlChange: (value: string) => void;
  onOpenPlaylist: () => void;
  onPromptChange: (questionId: string, value: string) => void;
  onRemoveChoice: (questionId: string, optionIndex: number) => void;
  onRemoveQuestion: (questionId: string) => void;
  onRequiredChange: (questionId: string, checked: boolean) => void;
  onSave: (event: FormEvent) => void;
  onSaveMusicPlaylist: () => void;
  onToggleCollapse: (questionId: string) => void;
  onToggleVisibility: () => void;
  onTypeChange: (questionId: string, value: RSVPQuestionSetting['type']) => void;
  onUpdateChoice: (questionId: string, optionIndex: number, value: string) => void;
  questions: RSVPQuestionSetting[];
  rsvpQuestionsError: string | null;
  rsvpQuestionsSaving: boolean;
  rsvpQuestionsSuccess: string | null;
  safeMusicPlaylistUrl: string | null;
  showAdvancedRsvp: boolean;
};

export function SettingsRsvpQuestionsPanel({
  canEditSettings,
  collapsedQuestionIds,
  musicPlaylistUrl,
  onAddChoice,
  onAddQuestion,
  onAppliesToChange,
  onMusicPlaylistUrlChange,
  onOpenPlaylist,
  onPromptChange,
  onRemoveChoice,
  onRemoveQuestion,
  onRequiredChange,
  onSave,
  onSaveMusicPlaylist,
  onToggleCollapse,
  onToggleVisibility,
  onTypeChange,
  onUpdateChoice,
  questions,
  rsvpQuestionsError,
  rsvpQuestionsSaving,
  rsvpQuestionsSuccess,
  safeMusicPlaylistUrl,
  showAdvancedRsvp,
}: SettingsRsvpQuestionsPanelProps) {
  return (
    <Card variant="bordered" padding="lg" className="rounded-[20px] shadow-none">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>RSVP Custom Questions</CardTitle>
            <CardDescription>Add optional questions to collect extra details from guests</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onToggleVisibility}>
            {showAdvancedRsvp ? 'Hide advanced RSVP' : 'Show advanced RSVP'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!showAdvancedRsvp ? (
          <div className="rounded-xl border border-border-subtle bg-surface-subtle/40 p-4 text-sm text-text-secondary">
            Hidden by default to keep RSVP setup simple. Open this section if you want to ask extra questions or let guests share song requests.
          </div>
        ) : (
          <form onSubmit={onSave} className="space-y-4">
            {rsvpQuestionsSuccess && (
              <div className="rounded-xl border border-success/20 bg-success-light p-3 text-sm text-success">{rsvpQuestionsSuccess}</div>
            )}
            {rsvpQuestionsError && (
              <div className="rounded-xl border border-border-subtle bg-surface-subtle p-3 text-sm text-text-secondary">{rsvpQuestionsError}</div>
            )}

            <div className="space-y-3">
              <div className="rounded-xl border border-border-subtle bg-surface-subtle/40 p-3 text-sm text-text-secondary">
                Generated guest-facing translations now carry these custom questions and meal-choice wording into RSVP too. Review the live RSVP page after you generate a language.
              </div>
              {questions.length === 0 && (
                <p className="text-sm text-text-secondary">No custom questions yet. Add one below if you need something beyond the standard RSVP flow.</p>
              )}

              {questions.map((question, index) => {
                const isCollapsed = collapsedQuestionIds.has(question.id);

                return (
                  <div key={question.id} className="space-y-3 rounded-xl border border-border bg-surface-subtle p-4">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => onToggleCollapse(question.id)}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-text-primary"
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                        Question {index + 1}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveQuestion(question.id)}
                        disabled={!canEditSettings}
                        className="text-text-tertiary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-text-tertiary"
                        aria-label="Remove question"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {!isCollapsed && (
                      <>
                        <Input
                          label="Prompt"
                          value={question.label}
                          onChange={(event) => onPromptChange(question.id, event.target.value)}
                          disabled={!canEditSettings}
                          placeholder="e.g., Song request"
                        />

                        <div className="grid gap-3 md:grid-cols-3">
                          <Select
                            label="Type"
                            value={question.type}
                            onChange={(event) => onTypeChange(question.id, event.target.value as RSVPQuestionSetting['type'])}
                            disabled={!canEditSettings}
                            options={[
                              { value: 'short_text', label: 'Short text' },
                              { value: 'long_text', label: 'Long text' },
                              { value: 'single_choice', label: 'Single choice' },
                              { value: 'multi_choice', label: 'Multiple choice' },
                            ]}
                          />

                          <Select
                            label="Applies to"
                            value={question.appliesTo}
                            onChange={(event) => onAppliesToChange(question.id, event.target.value as RSVPQuestionSetting['appliesTo'])}
                            disabled={!canEditSettings}
                            options={[
                              { value: 'all', label: 'All attendees' },
                              { value: 'ceremony', label: 'Ceremony attendees' },
                              { value: 'reception', label: 'Reception attendees' },
                            ]}
                          />

                          <label className="mt-7 flex items-center gap-2 text-sm text-text-primary">
                            <input
                              type="checkbox"
                              checked={question.required}
                              onChange={(event) => onRequiredChange(question.id, event.target.checked)}
                              disabled={!canEditSettings}
                              className="h-4 w-4 rounded border-border text-primary"
                            />
                            Required
                          </label>
                        </div>

                        {(question.type === 'single_choice' || question.type === 'multi_choice') && (
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-text-primary">Choices</label>
                            {(question.options ?? []).map((option, optionIndex) => (
                              <div key={`${question.id}-opt-${optionIndex}`} className="flex items-center gap-2">
                                <Input
                                  value={option}
                                  onChange={(event) => onUpdateChoice(question.id, optionIndex, event.target.value)}
                                  disabled={!canEditSettings}
                                  placeholder={`Option ${optionIndex + 1}`}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onRemoveChoice(question.id, optionIndex)}
                                  disabled={!canEditSettings}
                                  aria-label="Remove choice"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => onAddChoice(question.id)} disabled={!canEditSettings}>
                              <Plus className="mr-1 h-4 w-4" />
                              Add choice
                            </Button>
                            <p className="text-xs text-text-tertiary">Add at least 2 options so guests can choose clearly.</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="space-y-3 rounded-xl border border-border-subtle bg-surface-subtle/40 p-4">
              <p className="text-sm font-medium text-text-primary">Song request playlist (Spotify collaborative)</p>
              <Input
                label="Playlist URL"
                value={musicPlaylistUrl}
                onChange={(event) => onMusicPlaylistUrlChange(event.target.value)}
                disabled={!canEditSettings}
                placeholder="https://open.spotify.com/playlist/..."
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onSaveMusicPlaylist} disabled={!canEditSettings}>
                  Save playlist link
                </Button>
                {safeMusicPlaylistUrl && (
                  <Button type="button" variant="outline" size="sm" onClick={onOpenPlaylist}>
                    Open
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onAddQuestion} disabled={!canEditSettings}>
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>

              <Button variant="primary" size="md" type="submit" disabled={rsvpQuestionsSaving || !canEditSettings}>
                {rsvpQuestionsSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save RSVP Settings
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
