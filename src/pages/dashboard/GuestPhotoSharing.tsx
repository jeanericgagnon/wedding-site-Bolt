import React, { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, Camera, Plus, Link as LinkIcon, CalendarClock, Mail } from 'lucide-react';
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
  opens_at: string | null;
  closes_at: string | null;
};

type PhotoUploadRow = {
  id: string;
  photo_album_id: string;
  original_filename: string;
  guest_name: string | null;
  guest_email: string | null;
  uploaded_at: string;
};

const toDatetimeLocal = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromDatetimeLocal = (v: string): string | null => (v.trim() ? new Date(v).toISOString() : null);

const PHOTO_ALBUM_LINKS_STORAGE_KEY = 'dayof.photoAlbumLinks';

const readStoredAlbumLinks = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(PHOTO_ALBUM_LINKS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeStoredAlbumLinks = (value: Record<string, string>) => {
  try {
    localStorage.setItem(PHOTO_ALBUM_LINKS_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore
  }
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
  const [uploads, setUploads] = useState<PhotoUploadRow[]>([]);

  const [name, setName] = useState(search.get('eventName') ?? '');
  const [itineraryEventId, setItineraryEventId] = useState(search.get('eventId') ?? '');

  const [latestUploadUrl, setLatestUploadUrl] = useState<string>('');
  const [albumUploadLinks, setAlbumUploadLinks] = useState<Record<string, string>>(() => readStoredAlbumLinks());
  const [copied, setCopied] = useState<string>('');
  const [workingAlbumId, setWorkingAlbumId] = useState<string>('');

  const [windowDrafts, setWindowDrafts] = useState<Record<string, { opensAt: string; closesAt: string }>>({});

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    writeStoredAlbumLinks(albumUploadLinks);
  }, [albumUploadLinks]);

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

      const [{ data: eventsData }, { data: albumData }, { data: uploadsData }] = await Promise.all([
        supabase
          .from('itinerary_events')
          .select('id,event_name,event_date')
          .eq('wedding_site_id', site.id)
          .order('event_date', { ascending: true })
          .order('start_time', { ascending: true }),
        supabase
          .from('photo_albums')
          .select('id,name,slug,drive_folder_url,is_active,created_at,itinerary_event_id,opens_at,closes_at')
          .eq('wedding_site_id', site.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('photo_uploads')
          .select('id,photo_album_id,original_filename,guest_name,guest_email,uploaded_at')
          .eq('wedding_site_id', site.id)
          .order('uploaded_at', { ascending: false })
          .limit(200),
      ]);

      const nextAlbums = (albumData as PhotoAlbumRow[] | null) ?? [];
      setEvents((eventsData as ItineraryEvent[] | null) ?? []);
      setAlbums(nextAlbums);
      setUploads((uploadsData as PhotoUploadRow[] | null) ?? []);

      const nextDrafts: Record<string, { opensAt: string; closesAt: string }> = {};
      nextAlbums.forEach((a) => {
        nextDrafts[a.id] = {
          opensAt: toDatetimeLocal(a.opens_at),
          closesAt: toDatetimeLocal(a.closes_at),
        };
      });
      setWindowDrafts(nextDrafts);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to load photo sharing.');
    } finally {
      setLoading(false);
    }
  }

  const countsByAlbum = useMemo(() => {
    const m = new Map<string, number>();
    uploads.forEach((u) => m.set(u.photo_album_id, (m.get(u.photo_album_id) ?? 0) + 1));
    return m;
  }, [uploads]);

  const recentByAlbum = useMemo(() => {
    const m = new Map<string, PhotoUploadRow[]>();
    uploads.forEach((u) => {
      const arr = m.get(u.photo_album_id) ?? [];
      if (arr.length < 3) arr.push(u);
      m.set(u.photo_album_id, arr);
    });
    return m;
  }, [uploads]);

  const copyText = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(''), 1400);
    } catch {
      // ignore
    }
  };

  const exportAlbumCsv = (albumId: string, albumName: string) => {
    const rows = uploads.filter((u) => u.photo_album_id === albumId);
    if (rows.length === 0) return;

    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const header = ['filename', 'guest_name', 'guest_email', 'uploaded_at'];
    const lines = [
      header.join(','),
      ...rows.map((r) => [
        escapeCsv(r.original_filename),
        escapeCsv(r.guest_name || ''),
        escapeCsv(r.guest_email || ''),
        escapeCsv(new Date(r.uploaded_at).toISOString()),
      ].join(',')),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${albumName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'album'}-uploads.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const uploadLanding = useMemo(() => {
    if (!siteSlug) return '';
    return `${window.location.origin}/site/${siteSlug}`;
  }, [siteSlug]);

  const setAlbumActive = async (albumId: string, isActive: boolean) => {
    try {
      setWorkingAlbumId(albumId);
      setError(null);
      const { error: fnError } = await supabase.functions.invoke('photo-album-manage', {
        body: { action: 'set_active', albumId, isActive },
      });
      if (fnError) throw fnError;
      await load();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to update album status.');
    } finally {
      setWorkingAlbumId('');
    }
  };

  const regenerateLink = async (albumId: string) => {
    try {
      setWorkingAlbumId(albumId);
      setError(null);
      setSuccess(null);
      const { data, error: fnError } = await supabase.functions.invoke('photo-album-manage', {
        body: { action: 'regenerate_link', albumId },
      });
      if (fnError) throw fnError;
      const uploadUrl = (data?.uploadUrl as string) ?? '';
      setLatestUploadUrl(uploadUrl);
      if (uploadUrl) {
        setAlbumUploadLinks((prev) => ({ ...prev, [albumId]: uploadUrl }));
      }
      setSuccess('Album link regenerated. Old link is now invalid.');
      await load();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to regenerate upload link.');
    } finally {
      setWorkingAlbumId('');
    }
  };

  const saveWindow = async (albumId: string) => {
    try {
      setWorkingAlbumId(albumId);
      setError(null);
      setSuccess(null);
      const draft = windowDrafts[albumId] ?? { opensAt: '', closesAt: '' };
      const opensAt = fromDatetimeLocal(draft.opensAt);
      const closesAt = fromDatetimeLocal(draft.closesAt);
      if (opensAt && closesAt && new Date(closesAt) <= new Date(opensAt)) {
        throw new Error('Close time must be after open time.');
      }
      const { error: fnError } = await supabase.functions.invoke('photo-album-manage', {
        body: { action: 'set_window', albumId, opensAt, closesAt },
      });
      if (fnError) throw fnError;
      setSuccess('Upload window saved.');
      await load();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to save upload window.');
    } finally {
      setWorkingAlbumId('');
    }
  };

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

      const uploadUrl = (data.uploadUrl as string) ?? '';
      setLatestUploadUrl(uploadUrl);
      if (uploadUrl && data.album?.id) {
        setAlbumUploadLinks((prev) => ({ ...prev, [String(data.album.id)]: uploadUrl }));
      }
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
              <p className="text-sm font-medium text-emerald-900 mb-1">Latest upload link</p>
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
              {albums.map((album) => {
                const uploadCount = countsByAlbum.get(album.id) ?? 0;
                const recents = recentByAlbum.get(album.id) ?? [];
                const draft = windowDrafts[album.id] ?? { opensAt: '', closesAt: '' };
                const knownUploadLink = albumUploadLinks[album.id] || '';

                return (
                  <div key={album.id} className="rounded-lg border border-neutral-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-neutral-900">{album.name}</p>
                        <p className="text-xs text-neutral-500">Created {new Date(album.created_at).toLocaleString()}</p>
                        <div className="mt-1 text-xs text-neutral-500 flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex rounded px-2 py-0.5 ${album.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}>
                            {album.is_active ? 'Active' : 'Paused'}
                          </span>
                          <span>{uploadCount} uploads</span>
                          <span>slug: {album.slug}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        {album.drive_folder_url && (
                          <Button size="sm" variant="outline" onClick={() => window.open(album.drive_folder_url!, '_blank')}>
                            <ExternalLink className="w-3 h-3 mr-1" /> Drive
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={workingAlbumId === album.id}
                          onClick={() => void regenerateLink(album.id)}
                        >
                          <LinkIcon className="w-3 h-3 mr-1" />
                          {workingAlbumId === album.id ? 'Working...' : 'Regenerate link'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!knownUploadLink}
                          onClick={() => void copyText(knownUploadLink, `uplink-${album.id}`)}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          {copied === `uplink-${album.id}` ? 'Copied' : 'Copy link'}
                        </Button>
                        <Button
                          size="sm"
                          variant={album.is_active ? 'outline' : 'accent'}
                          disabled={workingAlbumId === album.id}
                          onClick={() => void setAlbumActive(album.id, !album.is_active)}
                        >
                          {workingAlbumId === album.id ? 'Working...' : album.is_active ? 'Pause' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportAlbumCsv(album.id, album.name)}
                          disabled={uploadCount === 0}
                        >
                          Export CSV
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const shareUrl = knownUploadLink || latestUploadUrl || `${window.location.origin}/photos/upload`;
                            const txt = encodeURIComponent(`Please upload your event photos here: ${shareUrl}`);
                            window.location.href = `/dashboard/messages?prefillSubject=Photo%20Upload%20Link&prefillBody=${txt}`;
                          }}
                        >
                          <Mail className="w-3 h-3 mr-1" /> Share
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 rounded-md border border-neutral-200 p-3 bg-neutral-50">
                      <div className="flex items-center gap-2 mb-2 text-xs font-medium text-neutral-700">
                        <CalendarClock className="w-3.5 h-3.5" /> Upload window
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                        <div>
                          <label className="block text-xs text-neutral-500 mb-1">Opens</label>
                          <Input
                            type="datetime-local"
                            value={draft.opensAt}
                            onChange={(e) => setWindowDrafts((prev) => ({ ...prev, [album.id]: { ...draft, opensAt: e.target.value } }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-neutral-500 mb-1">Closes</label>
                          <Input
                            type="datetime-local"
                            value={draft.closesAt}
                            onChange={(e) => setWindowDrafts((prev) => ({ ...prev, [album.id]: { ...draft, closesAt: e.target.value } }))}
                          />
                        </div>
                        <Button size="sm" variant="outline" disabled={workingAlbumId === album.id} onClick={() => void saveWindow(album.id)}>
                          {workingAlbumId === album.id ? 'Saving...' : 'Save window'}
                        </Button>
                      </div>
                    </div>

                    {recents.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-neutral-700 mb-1">Recent uploads</p>
                        <ul className="space-y-1 text-xs text-neutral-600">
                          {recents.map((u) => (
                            <li key={u.id}>
                              {u.original_filename} · {u.guest_name || 'Guest'}{u.guest_email ? ` (${u.guest_email})` : ''} · {new Date(u.uploaded_at).toLocaleString()}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default GuestPhotoSharing;
