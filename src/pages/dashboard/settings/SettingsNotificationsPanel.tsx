import { Loader2, Save } from 'lucide-react';
import type { FormEvent } from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui';

type SettingsNotificationsPanelProps = {
  showNotificationSettings: boolean;
  notifRsvp: boolean;
  notifPhotos: boolean;
  notifDigest: boolean;
  notifUpdates: boolean;
  notifSaving: boolean;
  notifSuccess: string | null;
  notifError: string | null;
  onToggleVisibility: () => void;
  onRsvpChange: (value: boolean) => void;
  onPhotosChange: (value: boolean) => void;
  onDigestChange: (value: boolean) => void;
  onUpdatesChange: (value: boolean) => void;
  onSaveNotifications: (event: FormEvent) => void;
};

export function SettingsNotificationsPanel({
  showNotificationSettings,
  notifRsvp,
  notifPhotos,
  notifDigest,
  notifUpdates,
  notifSaving,
  notifSuccess,
  notifError,
  onToggleVisibility,
  onRsvpChange,
  onPhotosChange,
  onDigestChange,
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
                <p className="text-sm text-text-secondary">Summary of activity on your site</p>
              </div>
            </label>

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
