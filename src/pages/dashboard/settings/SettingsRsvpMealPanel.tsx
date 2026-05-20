import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '../../../components/ui';

type SettingsRsvpMealPanelProps = {
  canEditSettings: boolean;
  mealOptions: string[];
  onAddMealOption: () => void;
  onMealChoiceEnabledChange: (enabled: boolean) => void;
  onMealOptionChange: (index: number, value: string) => void;
  onRemoveMealOption: (index: number) => void;
  onSave: () => void;
  onToggleVisibility: () => void;
  rsvpMealEnabled: boolean;
  rsvpQuestionsError: string | null;
  rsvpQuestionsSaving: boolean;
  rsvpQuestionsSuccess: string | null;
  showAdvancedRsvp: boolean;
  showMealChoiceSettings: boolean;
};

export function SettingsRsvpMealPanel({
  canEditSettings,
  mealOptions,
  onAddMealOption,
  onMealChoiceEnabledChange,
  onMealOptionChange,
  onRemoveMealOption,
  onSave,
  onToggleVisibility,
  rsvpMealEnabled,
  rsvpQuestionsError,
  rsvpQuestionsSaving,
  rsvpQuestionsSuccess,
  showAdvancedRsvp,
  showMealChoiceSettings,
}: SettingsRsvpMealPanelProps) {
  return (
    <Card variant="bordered" padding="lg">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Meal Choice</CardTitle>
            <CardDescription>Toggle meal collection and customize options shown on RSVP</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onToggleVisibility}>
            {showMealChoiceSettings ? 'Hide' : 'Show'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!showMealChoiceSettings ? (
          <div className="rounded-2xl border border-border-subtle bg-surface-subtle/40 p-4 text-sm text-text-secondary">
            Hidden by default to keep RSVP setup lighter. Open this section only if you want guests to choose a meal.
          </div>
        ) : (
          <>
            <label className="flex items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={rsvpMealEnabled}
                onChange={(event) => onMealChoiceEnabledChange(event.target.checked)}
                disabled={!canEditSettings}
                className="h-4 w-4 rounded border-border text-primary"
              />
              Collect meal choice on RSVP form
            </label>
            {rsvpMealEnabled && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Meal options</label>
                {mealOptions.map((option, index) => (
                  <div key={`meal-opt-${index}`} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(event) => onMealOptionChange(index, event.target.value)}
                      disabled={!canEditSettings}
                      placeholder={`Meal option ${index + 1}`}
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={() => onRemoveMealOption(index)} disabled={!canEditSettings}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={onAddMealOption} disabled={!canEditSettings}>
                    <Plus className="mr-1 h-4 w-4" />
                    Add meal option
                  </Button>
                  <Button type="button" variant="primary" size="sm" onClick={onSave} disabled={rsvpQuestionsSaving || !canEditSettings}>
                    {rsvpQuestionsSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save meal choices
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
        {!showAdvancedRsvp && rsvpQuestionsSuccess && (
          <div className="rounded-2xl border border-success/20 bg-success-light p-3 text-sm text-success">{rsvpQuestionsSuccess}</div>
        )}
        {!showAdvancedRsvp && rsvpQuestionsError && (
          <div className="rounded-2xl border border-border-subtle bg-surface-subtle p-3 text-sm text-text-secondary">{rsvpQuestionsError}</div>
        )}
      </CardContent>
    </Card>
  );
}
