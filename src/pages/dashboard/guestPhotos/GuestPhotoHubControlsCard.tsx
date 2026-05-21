import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { DEFAULT_HUB_SETTINGS, type GuestHubSettings } from '../guestPhotoSharingUtils';

const GUEST_HUB_CONTROL_FIELDS: Array<[keyof GuestHubSettings, string]> = [
  ['rsvp_enabled', 'RSVP'],
  ['photos_enabled', 'Photo upload + recap'],
  ['guestbook_enabled', 'Guestbook notes'],
  ['registry_enabled', 'Registry'],
  ['schedule_enabled', 'Schedule'],
  ['travel_enabled', 'Travel'],
];

type GuestPhotoHubControlsCardProps = {
  hubSettings: GuestHubSettings;
  savingHubSettings: boolean;
  onSaveHubSettings: () => void;
  onHubSettingsChange: (settings: GuestHubSettings) => void;
};

export function GuestPhotoHubControlsCard({
  hubSettings,
  savingHubSettings,
  onSaveHubSettings,
  onHubSettingsChange,
}: GuestPhotoHubControlsCardProps) {
  return (
    <Card className="p-6 border border-neutral-200 bg-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">Guest hub controls</h2>
          <p className="mt-1 text-sm text-neutral-600">Choose which no-login guest actions are available from the one QR code. Turning photos off also blocks upload links and the public recap.</p>
        </div>
        <Button variant="outline" onClick={onSaveHubSettings} disabled={savingHubSettings}>
          {savingHubSettings ? 'Saving...' : 'Save hub controls'}
        </Button>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GUEST_HUB_CONTROL_FIELDS.map(([key, label]) => (
          <label key={key} className="flex items-center justify-between gap-3 rounded-[20px] border border-border-subtle bg-surface-subtle px-4 py-3 text-sm font-medium text-text-primary">
            {label}
            <input
              type="checkbox"
              checked={Boolean(hubSettings[key])}
              onChange={(event) => onHubSettingsChange({ ...hubSettings, [key]: event.target.checked })}
              className="h-4 w-4"
            />
          </label>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px]">
        <Input
          value={hubSettings.custom_message ?? ''}
          onChange={(event) => onHubSettingsChange({ ...hubSettings, custom_message: event.target.value })}
          placeholder="Optional custom message for the hub"
        />
        <Input
          value={hubSettings.language_default ?? DEFAULT_HUB_SETTINGS.language_default}
          onChange={(event) => onHubSettingsChange({ ...hubSettings, language_default: event.target.value })}
          placeholder="Default language"
        />
      </div>
    </Card>
  );
}
