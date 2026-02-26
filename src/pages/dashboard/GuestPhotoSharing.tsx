import React, { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, Camera, Link as LinkIcon } from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button } from '../../components/ui';
import { supabase } from '../../lib/supabase';

export const GuestPhotoSharing: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [siteSlug, setSiteSlug] = useState<string | null>(null);
  const [driveConnected, setDriveConnected] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const userId = userRes.user?.id;
        if (!userId) {
          setError('Please sign in again.');
          return;
        }

        const { data, error: siteErr } = await supabase
          .from('wedding_sites')
          .select('site_slug, vault_google_drive_connected, vault_storage_provider')
          .eq('user_id', userId)
          .maybeSingle();

        if (siteErr) throw siteErr;

        setSiteSlug((data?.site_slug as string) || null);
        const connected = Boolean(data?.vault_google_drive_connected) || data?.vault_storage_provider === 'google-drive';
        setDriveConnected(connected);
      } catch (err: unknown) {
        setError((err as Error)?.message || 'Could not load photo sharing settings.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const shareLink = useMemo(() => {
    if (!siteSlug) return '';
    return `${window.location.origin}/vault/${siteSlug}/1`;
  }, [siteSlug]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // no-op
    }
  };

  return (
    <DashboardLayout title="Guest Photo Sharing" subtitle="Collect guest photos and videos with one share link">
      <div className="space-y-4">
        <Card variant="bordered" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Camera className="w-5 h-5" /> Guest uploads</CardTitle>
            <CardDescription>
              Guests can upload photos/videos from a public link. Uploads are stored with your vault flow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-text-secondary">Loading…</p>
            ) : error ? (
              <p className="text-sm text-error">{error}</p>
            ) : (
              <>
                {!driveConnected && (
                  <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
                    Google Drive is not connected. Connect Drive in Vault before sharing this link.
                  </div>
                )}

                <div>
                  <label className="block text-xs text-text-secondary mb-1">Share link</label>
                  <div className="flex flex-col md:flex-row gap-2">
                    <div className="flex-1 rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary break-all">
                      {shareLink || 'No site slug available yet.'}
                    </div>
                    <Button variant="outline" onClick={copyLink} disabled={!shareLink}>
                      <Copy className="w-4 h-4 mr-1" /> {copied ? 'Copied' : 'Copy'}
                    </Button>
                    <Button variant="outline" onClick={() => window.open(shareLink, '_blank')} disabled={!shareLink}>
                      <ExternalLink className="w-4 h-4 mr-1" /> Open
                    </Button>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-2">
                  <Button variant="accent" onClick={() => (window.location.href = '/dashboard/vault')}>
                    <LinkIcon className="w-4 h-4 mr-1" /> Manage Vault
                  </Button>
                  <Button variant="outline" onClick={() => (window.location.href = '/dashboard/vault')}>
                    Connect Drive
                  </Button>
                  <Button variant="outline" onClick={() => (window.location.href = '/dashboard/messages')}>
                    Share via Message
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};
