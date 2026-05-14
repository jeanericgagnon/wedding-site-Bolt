import { Loader2, Save } from 'lucide-react';
import type { FormEvent } from 'react';
import type { DigestCadence } from '../../../lib/notificationPrefs';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui';

type SettingsNotificationsPanelProps = {
  showNotificationSettings: boolean;
  notifRsvp: boolean;
  notifPhotos: boolean;
  notifDigest: boolean;
  notifDigestCadence: DigestCadence;
  notifDigestIncludePlanner: boolean;
  notifDigestQuietUntilLabel: string;
  notifUpdates: boolean;
  notifSaving: boolean;
  notifSuccess: string | null;
  notifError: string | null;
  onToggleVisibility: () => void;
  onRsvpChange: (value: boolean) => void;
  onPhotosChange: (value: boolean) => void;
  onDigestChange: (value: boolean) => void;
  onDigestCadenceChange: (value: DigestCadence) => void;
  onDigestIncludePlannerChange: (value: boolean) => void;
  onDigestQuietUntilLabelChange: (value: string) => void;
  onUpdatesChange: (value: boolean) => void;
  onSaveNotifications: (event: FormEvent) => void;
};

export function SettingsNotificationsPanel({
  showNotificationSettings,
  notifRsvp,
  notifPhotos,
  notifDigest,
  notifDigestCadence,
  notifDigestIncludePlanner,
  notifDigestQuietUntilLabel,
  notifUpdates,
  notifSaving,
  notifSuccess,
  notifError,
  onToggleVisibility,
  onRsvpChange,
  onPhotosChange,
  onDigestChange,
  onDigestCadenceChange,
  onDigestIncludePlannerChange,
  onDigestQuietUntilLabelChange,
  onUpdatesChange,
  onSaveNotifications,
}: SettingsNotificationsPanelProps) {
  return (
    <Card variant="bordered" padding="lg">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>Choose what updates you want to receive</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onToggleVisibility}>
            {showNotificationSettings ? 'Hide' : 'Show'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!showNotificationSettings ? (
          <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 p-4 text-sm text-text-secondary">
            Hidden by default to keep this page easy to scan. Open it when you want to choose which updates you get.
          </div>
        ) : (
          <form onSubmit={onSaveNotifications} className="space-y-4">
            {notifSuccess && (
              <div className="p-3 bg-success-light border border-success/20 rounded-lg text-success text-sm">{notifSuccess}</div>
            )}
            {notifError && (
              <div className="p-3 bg-surface-subtle border border-border-subtle rounded-lg text-text-secondary text-sm">{notifError}</div>
            )}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifRsvp}
                onChange={(e) => onRsvpChange(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
              />
              <div className="flex-1">
                <p className="font-medium text-text-primary">New RSVPs</p>
                <p className="text-sm text-text-secondary">Get notified when guests respond</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifPhotos}
                onChange={(e) => onPhotosChange(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
              />
              <div className="flex-1">
                <p className="font-medium text-text-primary">Photo uploads</p>
                <p className="text-sm text-text-secondary">Get notified when guests upload photos</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifDigest}
                onChange={(e) => onDigestChange(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
              />
              <div className="flex-1">
                <p className="font-medium text-text-primary">Weekly digest</p>
                <p className="text-sm text-text-secondary">A calm recap of RSVPs, guests, photos, and publishing details</p>
              </div>
            </label>

            <div id="digest" className={`space-y-4 rounded-lg border border-border-subtle bg-surface-subtle/35 p-4 ${notifDigest ? '' : 'opacity-70'}`}>
              <div className="space-y-2">
                <label htmlFor="digest-cadence" className="text-sm font-medium text-text-primary">
                  Digest cadence
                </label>
                <select
                  id="digest-cadence"
                  value={notifDigest ? notifDigestCadence : 'paused'}
                  disabled={!notifDigest}
                  onChange={(e) => onDigestCadenceChange(e.target.value as DigestCadence)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="paused">Paused</option>
                </select>
                <p className="text-xs leading-5 text-text-secondary">
                  This saves your review preference now. Delivery stays in preview mode until a sending provider is connected.
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifDigestIncludePlanner}
                  disabled={!notifDigest}
                  onChange={(e) => onDigestIncludePlannerChange(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                />
                <div className="flex-1">
                  <p className="font-medium text-text-primary">Include planners and coordinators</p>
                  <p className="text-sm text-text-secondary">Keep your shared team on the same digest when that helps.</p>
                </div>
              </label>

              <div className="space-y-2">
                <label htmlFor="digest-quiet-until" className="text-sm font-medium text-text-primary">
                  Quiet until
                </label>
                <input
                  id="digest-quiet-until"
                  type="text"
                  value={notifDigestQuietUntilLabel}
                  disabled={!notifDigest}
                  onChange={(e) => onDigestQuietUntilLabelChange(e.target.value)}
                  placeholder="After the rehearsal dinner"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                />
                <p className="text-xs leading-5 text-text-secondary">
                  Use a plain-language note so the overview can reflect when you want this lane to stay quiet.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifUpdates}
                onChange={(e) => onUpdatesChange(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
              />
              <div className="flex-1">
                <p className="font-medium text-text-primary">Product updates</p>
                <p className="text-sm text-text-secondary">New features and improvements</p>
              </div>
            </label>

            <div className="flex justify-end pt-2">
              <Button variant="primary" size="md" type="submit" disabled={notifSaving}>
                {notifSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Preferences
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
