import { ExternalLink, Loader2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '../../../components/ui';
import { ShareQrPanel } from '../../../components/ui/ShareQrPanel';
import { getSiteVisibilityState, type SitePrivacyMode } from '../../../lib/siteVisibilityState';

type SettingsSiteUrlPanelProps = {
  canEditSettings: boolean;
  isPublished: boolean;
  onSiteSlugChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  privacyMode: SitePrivacyMode;
  publicSiteUrl: string;
  siteSlug: string;
  slugError: string | null;
  slugSaving: boolean;
  slugSuccess: string | null;
};

export function SettingsSiteUrlPanel({
  canEditSettings,
  isPublished,
  onSiteSlugChange,
  onSubmit,
  privacyMode,
  publicSiteUrl,
  siteSlug,
  slugError,
  slugSaving,
  slugSuccess,
}: SettingsSiteUrlPanelProps) {
  const visibility = getSiteVisibilityState({ isPublished, privacyMode });

  return (
    <Card variant="bordered" padding="lg" className="rounded-[20px] shadow-none">
      <CardHeader>
        <CardTitle>Site URL</CardTitle>
        <CardDescription>Your wedding site address</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {slugSuccess && (
            <div className="rounded-[20px] border border-success/20 bg-success-light p-3 text-sm text-success">{slugSuccess}</div>
          )}
          {slugError && (
            <div className="rounded-[20px] border border-border-subtle bg-surface-subtle p-3 text-sm text-text-secondary">{slugError}</div>
          )}
          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">
              Current URL
            </label>
            <div className="flex items-center gap-3">
              <Input
                value={siteSlug}
                onChange={(e) => onSiteSlugChange(e.target.value)}
                disabled={!canEditSettings}
                className="flex-1"
                placeholder="yournames"
              />
              <span className="shrink-0 text-text-secondary">.dayof.love</span>
            </div>
            {siteSlug && (
              <div className="mt-2 space-y-2">
                {visibility.isLive ? (
                  <>
                    <p className="text-sm text-text-secondary">
                      Your site is accessible at{' '}
                      <a
                        href={publicSiteUrl}
                        className="text-primary hover:text-primary-hover"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {siteSlug}.dayof.love
                        <ExternalLink className="ml-1 inline h-3 w-3" aria-hidden="true" />
                      </a>
                    </p>
                    <ShareQrPanel
                      title="Public site QR"
                      description="Print this or add it to signage so guests can open the wedding site quickly."
                      url={publicSiteUrl}
                      copyLabel="Copy site link"
                      className="mt-3"
                    />
                  </>
                ) : (
                  <div className="rounded-[20px] border border-border-subtle bg-surface-subtle p-3 text-sm text-text-secondary">
                    <p className="font-medium text-text-primary">This URL is reserved for your site, but guests cannot open it yet.</p>
                    <p className="mt-1">
                      {visibility.explainer} Publish the site before sharing the public link or printing a QR code.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="primary" size="md" type="submit" disabled={slugSaving || !canEditSettings}>
              {slugSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Update URL
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
