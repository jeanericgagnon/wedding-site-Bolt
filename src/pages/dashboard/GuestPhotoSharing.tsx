import React, { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, Camera, Plus, Link as LinkIcon } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';

type ItineraryEvent = {
  id: string;
  event_name: string;
  event_date: string;
};

type PhotoAlbumRow = {
  id: string;
  name: string;
  slug: string;
  drive_folder_url: string | null;
  is_active: boolean;
  created_at: string;
  itinerary_event_id: string | null;
};

export const GuestPhotoSharing: React.FC = () => {
  const location = useLocation();
  const search = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [siteId, setSiteId] = useState<string | null>(null);
  const [siteSlug, setSiteSlug] = useState<string | null>(null);
  const [events, setEvents] = useState<ItineraryEvent[]>([]);
  const [albums, setAlbums] = useState<PhotoAlbumRow[]>([]);

  const [name, setName] = useState(search.get('eventName') ?? '');
  const [itineraryEventId, setItineraryEventId] = useState(search.get('eventId') ?? '');

  const [latestUploadUrl, setLatestUploadUrl] = useState<string>('');
  const [copied, setCopied] = useState<string>('');

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) throw new Error('Please sign in again.');

      const { data: site, error: siteErr } = await supabase
        .from('wedding_sites')
        .select('id, site_slug')
        .eq('user_id', userId)
        .single();

      if (siteErr || !site) throw new Error(siteErr?.message ?? 'No wedding site found.');

      setSiteId(site.id as string);
      setSiteSlug((site.site_slug as string) ?? null);

      const [{ data: eventsData }, { data: albumData }] = await Promise.all([
        supabase
          .from('itinerary_events')
          .select('id,event_name,event_date')
          .eq('wedding_site_id', site.id)
          .order('event_date', { ascending: true })
          .order('start_time', { ascending: true }),
        supabase
          .from('photo_albums')
          .select('id,name,slug,drive_folder_url,is_active,created_at,itinerary_event_id')
          .eq('wedding_site_id', site.id)
          .order('created_at', { ascending: false }),
      ]);

      setEvents((eventsData as ItineraryEvent[] | null) ?? []);
      setAlbums((albumData as PhotoAlbumRow[] | null) ?? []);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to load photo sharing.');
    } finally {
      setLoading(false);
    }
  }

  const copyText = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(''), 1400);
    } catch {
      // ignore
    }
  };

  const uploadLanding = useMemo(() => {
    if (!siteSlug) return '';
    return `${window.location.origin}/site/${siteSlug}`;
  }, [siteSlug]);

  const createAlbum = async () => {
    if (!siteId) return;
    if (!name.trim()) {
      setError('Album name is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const { data, error: fnError } = await supabase.functions.invoke('photo-album-create', {
        body: {
          siteId,
          name: name.trim(),
          itineraryEventId: itineraryEventId || null,
        },
      });

      if (fnError) throw fnError;
      if (!data?.album?.id) throw new Error('Album creation failed.');

      setLatestUploadUrl((data.uploadUrl as string) ?? '');
      setSuccess(`Album "${data.album.name}" created.`);
      await load();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to create album.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout currentPage="photos">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Photo Sharing</h1>
          <p className="mt-2 text-neutral-600">Create event albums and share guest upload links backed by Google Drive.</p>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-5 h-5 text-rose-600" />
            <h2 className="text-xl font-semibold text-neutral-900">Create album</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Album name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ceremony" />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Link to itinerary event (optional)</label>
              <select
                value={itineraryEventId}
                onChange={(e) => setItineraryEventId(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.event_name} ({new Date(event.event_date).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button onClick={createAlbum} disabled={submitting || loading}>
              <Camera className="w-4 h-4 mr-1" />
              {submitting ? 'Creating...' : 'Create album'}
            </Button>
            {uploadLanding && (
              <Button variant="outline" onClick={() => window.open(uploadLanding, '_blank')}>
                <ExternalLink className="w-4 h-4 mr-1" /> Open site
              </Button>
            )}
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {success && <p className="mt-3 text-sm text-emerald-700">{success}</p>}

          {latestUploadUrl && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-medium text-emerald-900 mb-1">New upload link</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-emerald-800 break-all">{latestUploadUrl}</code>
                <Button size="sm" variant="outline" onClick={() => copyText(latestUploadUrl, 'latest')}>
                  <Copy className="w-3 h-3 mr-1" /> {copied === 'latest' ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">Albums</h2>

          {loading ? (
            <p className="text-sm text-neutral-500">Loading albums…</p>
          ) : albums.length === 0 ? (
            <p className="text-sm text-neutral-600">No albums yet. Create your first album above.</p>
          ) : (
            <div className="space-y-3">
              {albums.map((album) => (
                <div key={album.id} className="rounded-lg border border-neutral-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-neutral-900">{album.name}</p>
                      <p className="text-xs text-neutral-500">Created {new Date(album.created_at).toLocaleString()}</p>
                      <div className="mt-1 text-xs text-neutral-500 flex items-center gap-2">
                        <span className={`inline-flex rounded px-2 py-0.5 ${album.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}>
                          {album.is_active ? 'Active' : 'Paused'}
                        </span>
                        <span>slug: {album.slug}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {album.drive_folder_url && (
                        <Button size="sm" variant="outline" onClick={() => window.open(album.drive_folder_url!, '_blank')}>
                          <ExternalLink className="w-3 h-3 mr-1" /> Drive
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyText(`${window.location.origin}/photos/upload`, album.id)}
                      >
                        <LinkIcon className="w-3 h-3 mr-1" />
                        {copied === album.id ? 'Copied' : 'Copy upload page'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default GuestPhotoSharing;
