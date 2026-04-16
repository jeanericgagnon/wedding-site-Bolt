import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, ExternalLink, Camera, Plus, Link as LinkIcon, CalendarClock, Mail, EyeOff, Eye, Flag, Clapperboard } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ActionsMenu } from '../../components/ui/ActionsMenu';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { invokeFunctionOrThrow } from '../../lib/invokeFunctionOrThrow';
import { getArchiveModeDescriptor } from '../../lib/archiveMode';
import { createEmptyPhotoBuckets } from '../../lib/aiPhotoBuckets';
import { PhotoBucketCards } from '../../components/dashboard/PhotoBucketCards';

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
  is_hidden: boolean;
  is_flagged: boolean;
  uploaded_at: string;
};

type SlideshowOrderMode = 'newest' | 'oldest' | 'shuffled';
type SlideshowTheme = 'classic' | 'editorial' | 'party';

type SlideshowFrame = {
  uploadId: string;
  albumId: string;
  albumName: string;
  title: string;
  caption: string;
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
  const [showHidden, setShowHidden] = useState(false);
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);

  const [name, setName] = useState(search.get('eventName') ?? '');
  const [itineraryEventId, setItineraryEventId] = useState(search.get('eventId') ?? '');
  const [albumSearch, setAlbumSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');

  const [latestUploadUrl, setLatestUploadUrl] = useState<string>('');
  const [albumUploadLinks, setAlbumUploadLinks] = useState<Record<string, string>>(() => readStoredAlbumLinks());
  const [copied, setCopied] = useState<string>('');
  const [workingAlbumId, setWorkingAlbumId] = useState<string>('');

  const [windowDrafts, setWindowDrafts] = useState<Record<string, { opensAt: string; closesAt: string }>>({});
  const [bulkCreating, setBulkCreating] = useState(false);
  const [bulkUpdatingStatus, setBulkUpdatingStatus] = useState(false);
  const [bulkRegenerating, setBulkRegenerating] = useState(false);
  const [bulkModerating, setBulkModerating] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [photoBuckets, setPhotoBuckets] = useState(() => createEmptyPhotoBuckets());
  const [slideshowOrder, setSlideshowOrder] = useState<SlideshowOrderMode>('newest');
  const [slideshowAlbumFilter, setSlideshowAlbumFilter] = useState<string>('all');
  const [slideshowTheme, setSlideshowTheme] = useState<SlideshowTheme>('classic');
  const [slideshowPreviewOpen, setSlideshowPreviewOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);
  const archiveMode = useMemo(() => getArchiveModeDescriptor({ weddingDate: events[0]?.event_date ?? null }), [events]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!actionsMenuOpen) return;
      if (!actionsMenuRef.current?.contains(event.target as Node)) setActionsMenuOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActionsMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [actionsMenuOpen]);

  useEffect(() => {
    writeStoredAlbumLinks(albumUploadLinks);
  }, [albumUploadLinks]);

  const invokeOrThrow = async (fnName: string, body: Record<string, unknown>) => {
    try {
      return await invokeFunctionOrThrow(supabase, fnName, body);
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      const authish = msg.includes('invalid jwt') || msg.includes('jwt') || msg.includes('401') || msg.includes('auth');
      if (!authish) throw err;

      const { data } = await supabase.auth.refreshSession();
      if (!data.session) throw err;
      return await invokeFunctionOrThrow(supabase, fnName, body);
    }
  };

  async function load(retried = false) {
    try {
      setLoading(true);
      setError(null);

      await supabase.auth.getSession();
      const { data: userRes } = await supabase.auth.getUser();
      let userId = userRes.user?.id;
      if (!userId) {
        const { data: sessionRes } = await supabase.auth.getSession();
        userId = sessionRes.session?.user?.id;
      }
      if (!userId) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        userId = refreshed.session?.user?.id;
      }
      if (!userId) throw new Error('Session expired. Refresh and try again.');

      const { data: site, error: siteErr } = await supabase
        .from('wedding_sites')
        .select('id, site_slug, wedding_data')
        .eq('user_id', userId)
        .single();

      if (siteErr || !site) throw new Error(siteErr?.message ?? 'No wedding site found.');

      setSiteId(site.id as string);
      setSiteSlug((site.site_slug as string) ?? null);
      const savedBuckets = ((((site.wedding_data as Record<string, unknown> | null)?.meta as Record<string, unknown> | undefined)?.photoBuckets as ReturnType<typeof createEmptyPhotoBuckets> | undefined) ?? null);
      if (savedBuckets) setPhotoBuckets(savedBuckets);

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
          .select('id,photo_album_id,original_filename,guest_name,guest_email,is_hidden,is_flagged,uploaded_at')
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
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      const authish = msg.includes('invalid jwt') || msg.includes('jwt') || msg.includes('401') || msg.includes('auth');
      if (authish && !retried) {
        await supabase.auth.refreshSession();
        await load(true);
        return;
      }
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

  const hiddenCountsByAlbum = useMemo(() => {
    const m = new Map<string, number>();
    uploads.filter((u) => u.is_hidden).forEach((u) => m.set(u.photo_album_id, (m.get(u.photo_album_id) ?? 0) + 1));
    return m;
  }, [uploads]);

  const flaggedCountsByAlbum = useMemo(() => {
    const m = new Map<string, number>();
    uploads.filter((u) => u.is_flagged).forEach((u) => m.set(u.photo_album_id, (m.get(u.photo_album_id) ?? 0) + 1));
    return m;
  }, [uploads]);

  const recentByAlbum = useMemo(() => {
    const m = new Map<string, PhotoUploadRow[]>();
    uploads
      .filter((u) => (showHidden || !u.is_hidden) && (!showFlaggedOnly || u.is_flagged))
      .forEach((u) => {
        const arr = m.get(u.photo_album_id) ?? [];
        if (arr.length < 5) arr.push(u);
        m.set(u.photo_album_id, arr);
      });
    return m;
  }, [uploads, showHidden, showFlaggedOnly]);

  const slideshowReadyAlbumCount = useMemo(
    () => albums.filter((album) => (countsByAlbum.get(album.id) ?? 0) >= 3).length,
    [albums, countsByAlbum]
  );

  const slideshowFrames = useMemo<SlideshowFrame[]>(() => {
    const sourceAlbums = albums.filter((album) => {
      if (!album.is_active) return false;
      if ((countsByAlbum.get(album.id) ?? 0) < 3) return false;
      if (slideshowAlbumFilter === 'all') return true;
      return album.id === slideshowAlbumFilter;
    });

    const sourceAlbumIds = new Set(sourceAlbums.map((album) => album.id));
    let selectedUploads = uploads
      .filter((upload) => !upload.is_hidden && !upload.is_flagged && sourceAlbumIds.has(upload.photo_album_id))
      .map((upload) => {
        const album = albums.find((entry) => entry.id === upload.photo_album_id);
        return {
          uploadId: upload.id,
          albumId: upload.photo_album_id,
          albumName: album?.name || 'Album',
          title: upload.original_filename,
          caption: `${upload.guest_name || 'Guest'} · ${new Date(upload.uploaded_at).toLocaleDateString()}`,
          uploadedAt: upload.uploaded_at,
        };
      });

    if (slideshowOrder === 'newest') {
      selectedUploads = selectedUploads.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    } else if (slideshowOrder === 'oldest') {
      selectedUploads = selectedUploads.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
    } else {
      selectedUploads = [...selectedUploads].sort((a, b) => a.uploadId.localeCompare(b.uploadId));
    }

    return selectedUploads.slice(0, 24).map(({ uploadedAt: _uploadedAt, ...frame }) => frame);
  }, [albums, uploads, countsByAlbum, slideshowAlbumFilter, slideshowOrder]);

  const slideshowThemeMeta: Record<SlideshowTheme, { label: string; cardClass: string; chipClass: string; helper: string }> = {
    classic: {
      label: 'Classic',
      cardClass: 'bg-white border-border-subtle',
      chipClass: 'bg-neutral-100 text-neutral-700',
      helper: 'Clean, neutral presentation focused on the photos.',
    },
    editorial: {
      label: 'Editorial',
      cardClass: 'bg-stone-50 border-stone-200',
      chipClass: 'bg-stone-200 text-stone-800',
      helper: 'Softer gallery feel with a more polished keepsake vibe.',
    },
    party: {
      label: 'Party',
      cardClass: 'bg-violet-50 border-violet-200',
      chipClass: 'bg-violet-100 text-violet-800',
      helper: 'More energetic framing for reception and dance-floor moments.',
    },
  };

  const copyText = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(''), 1400);
    } catch {
      // ignore
    }
  };

  const exportSlideshowPlan = async () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      theme: slideshowTheme,
      order: slideshowOrder,
      albumFilter: slideshowAlbumFilter,
      frameCount: slideshowFrames.length,
      frames: slideshowFrames,
    };

    const text = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied('slideshow-plan');
      setTimeout(() => setCopied(''), 1400);
    } catch {
      window.prompt('Copy slideshow plan JSON:', text);
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

  const totalUploads = useMemo(() => uploads.length, [uploads]);
  const activeAlbumsCount = useMemo(() => albums.filter((a) => a.is_active).length, [albums]);
  const pausedAlbumsCount = useMemo(() => albums.filter((a) => !a.is_active).length, [albums]);

  const filteredAlbums = useMemo(() => {
    const q = albumSearch.trim().toLowerCase();
    return albums.filter((a) => {
      const statusOk = statusFilter === 'all' || (statusFilter === 'active' ? a.is_active : !a.is_active);
      const searchOk = !q || a.name.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q);
      return statusOk && searchOk;
    });
  }, [albums, albumSearch, statusFilter]);

  const missingItineraryEvents = useMemo(() => {
    const linked = new Set(albums.map((a) => a.itinerary_event_id).filter(Boolean));
    return events.filter((e) => !linked.has(e.id));
  }, [events, albums]);

  const makeShareMessage = (albumName: string, link: string) =>
    `Please upload your ${albumName} photos here: ${link}`;

  const sendAllActiveAlbumRequests = () => {
    const lines = albums
      .filter((a) => a.is_active)
      .map((a) => {
        const link = albumUploadLinks[a.id];
        if (!link) return null;
        return `${a.name}: ${makeShareMessage(a.name, link)}`;
      })
      .filter((v): v is string => typeof v === 'string');

    if (lines.length === 0) {
      setError('No active albums with links available to send.');
      return;
    }

    const subject = encodeURIComponent('Photo upload links');
    const body = encodeURIComponent(lines.join('\n\n'));
    window.location.href = `/dashboard/messages?prefillSubject=${subject}&prefillBody=${body}`;
  };

  const copyAllShareMessages = async () => {
    const lines = albums
      .map((a) => {
        const link = albumUploadLinks[a.id];
        if (!link) return null;
        return `${a.name}: ${makeShareMessage(a.name, link)}`;
      })
      .filter((v): v is string => typeof v === 'string');

    if (lines.length === 0) {
      setError('No share messages are ready yet. Create links first.');
      return;
    }

    await copyText(lines.join('\n\n'), 'all-share-messages');
    setSuccess(`Copied ${lines.length} share message(s).`);
  };

  const copyAllKnownLinks = async () => {
    const links = albums
      .map((a) => albumUploadLinks[a.id])
      .filter((v): v is string => typeof v === 'string' && v.length > 0);

    if (links.length === 0) {
      setError('No upload links are ready yet. Create or refresh links first.');
      return;
    }

    await copyText(links.join('\n'), 'all-links');
    setSuccess(`Copied ${links.length} link(s).`);
  };

  const regenerateAllKnownAlbumLinks = async () => {
    const targetAlbums = albums.filter((a) => albumUploadLinks[a.id]);
    if (targetAlbums.length === 0) {
      setError('No album links are ready to refresh yet.');
      return;
    }

    try {
      setBulkRegenerating(true);
      setError(null);
      const updated: Record<string, string> = {};

      for (const album of targetAlbums) {
        const data = await invokeOrThrow('photo-album-manage', { action: 'regenerate_link', albumId: album.id });
        const link = typeof data?.uploadUrl === 'string' ? data.uploadUrl : '';
        if (link) updated[album.id] = link;
      }

      if (Object.keys(updated).length > 0) {
        setAlbumUploadLinks((prev) => ({ ...prev, ...updated }));
      }
      setSuccess(`Rotated ${Object.keys(updated).length} link(s).`);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to rotate links.');
    } finally {
      setBulkRegenerating(false);
    }
  };

  const exportSharePackCsv = () => {
    const rows = albums
      .map((a) => {
        const link = albumUploadLinks[a.id] || '';
        return {
          name: a.name,
          status: a.is_active ? 'active' : 'paused',
          upload_link: link,
          suggested_message: link ? makeShareMessage(a.name, link) : '',
        };
      })
      .filter((r) => r.upload_link);

    if (rows.length === 0) return;

    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [
      ['name', 'status', 'upload_link', 'suggested_message'].join(','),
      ...rows.map((r) => [esc(r.name), esc(r.status), esc(r.upload_link), esc(r.suggested_message)].join(',')),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'photo-share-pack.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportAlbumLinksCsv = () => {
    const rows = albums
      .map((a) => ({
        name: a.name,
        slug: a.slug,
        status: a.is_active ? 'active' : 'paused',
        upload_link: albumUploadLinks[a.id] || '',
        drive_folder_url: a.drive_folder_url || '',
      }))
      .filter((r) => r.upload_link || r.drive_folder_url);

    if (rows.length === 0) return;

    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [
      ['name', 'slug', 'status', 'upload_link', 'drive_folder_url'].join(','),
      ...rows.map((r) => [esc(r.name), esc(r.slug), esc(r.status), esc(r.upload_link), esc(r.drive_folder_url)].join(',')),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'photo-album-links.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const createMissingAlbumsFromItinerary = async () => {
    if (!siteId) return;
    if (missingItineraryEvents.length === 0) {
      setSuccess('All itinerary events already have albums.');
      return;
    }

    try {
      setBulkCreating(true);
      setError(null);
      setSuccess(null);

      const created: string[] = [];
      const links: Record<string, string> = {};

      for (const event of missingItineraryEvents) {
        const data = await invokeOrThrow('photo-album-create', {
          siteId,
          name: event.event_name,
          itineraryEventId: event.id,
        });
        if (data?.album?.id) {
          created.push(event.event_name);
          if (typeof data.uploadUrl === 'string' && data.uploadUrl) {
            links[String(data.album.id)] = data.uploadUrl;
          }
        }
      }

      if (Object.keys(links).length > 0) {
        setAlbumUploadLinks((prev) => ({ ...prev, ...links }));
      }

      await load();
      setSuccess(`Created ${created.length} album(s) from itinerary events.`);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to create itinerary albums.');
    } finally {
      setBulkCreating(false);
    }
  };

  const setUploadsHiddenByFilter = async (hide: boolean) => {
    const target = uploads.filter((u) => (showFlaggedOnly ? u.is_flagged : true) && (showHidden || !u.is_hidden));
    if (target.length === 0) {
      setSuccess('No uploads match current filters.');
      return;
    }

    try {
      setBulkModerating(true);
      setError(null);
      const ids = target.map((u) => u.id);
      await invokeOrThrow('photo-upload-moderate', { uploadIds: ids, patch: { is_hidden: hide } });
      await load();
      setSuccess(`${hide ? 'Hidden' : 'Unhidden'} ${ids.length} upload(s) from current view.`);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Bulk moderation failed.');
    } finally {
      setBulkModerating(false);
    }
  };

  const setUploadsFlaggedByFilter = async (flagged: boolean) => {
    const target = uploads.filter((u) => (showHidden || !u.is_hidden));
    if (target.length === 0) {
      setSuccess('No uploads match current filters.');
      return;
    }

    try {
      setBulkModerating(true);
      setError(null);
      const ids = target.map((u) => u.id);
      await invokeOrThrow('photo-upload-moderate', { uploadIds: ids, patch: { is_flagged: flagged } });
      await load();
      setSuccess(`${flagged ? 'Flagged' : 'Unflagged'} ${ids.length} upload(s) from current view.`);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Bulk moderation failed.');
    } finally {
      setBulkModerating(false);
    }
  };

  const setAllAlbumsActive = async (isActive: boolean) => {
    const targetAlbums = albums.filter((a) => a.is_active !== isActive);
    if (targetAlbums.length === 0) {
      setSuccess(isActive ? 'All albums are already active.' : 'All albums are already paused.');
      return;
    }

    try {
      setBulkUpdatingStatus(true);
      setError(null);
      setSuccess(null);

      for (const album of targetAlbums) {
        await invokeOrThrow('photo-album-manage', { action: 'set_active', albumId: album.id, isActive });
      }

      await load();
      setSuccess(`${isActive ? 'Activated' : 'Paused'} ${targetAlbums.length} album(s).`);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to update album statuses.');
    } finally {
      setBulkUpdatingStatus(false);
    }
  };

  const moderateUpload = async (uploadId: string, patch: Partial<Pick<PhotoUploadRow, 'is_hidden' | 'is_flagged'>>) => {
    try {
      setError(null);
      await invokeOrThrow('photo-upload-moderate', { uploadIds: [uploadId], patch });
      await load();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to update upload moderation status.');
    }
  };

  const setAlbumActive = async (albumId: string, isActive: boolean) => {
    try {
      setWorkingAlbumId(albumId);
      setError(null);
      await invokeOrThrow('photo-album-manage', { action: 'set_active', albumId, isActive });
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
      const data = await invokeOrThrow('photo-album-manage', { action: 'regenerate_link', albumId });
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

  const applySuggestedWindow = (albumId: string) => {
    const album = albums.find((a) => a.id === albumId);
    if (!album) return;

    const event = events.find((e) => e.id === album.itinerary_event_id);
    const baseDate = event?.event_date ? new Date(`${event.event_date}T00:00:00`) : new Date();
    const opens = baseDate;
    const closes = new Date(baseDate.getTime() + 72 * 60 * 60 * 1000); // +72h

    const toLocal = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setWindowDrafts((prev) => ({
      ...prev,
      [albumId]: { opensAt: toLocal(opens), closesAt: toLocal(closes) },
    }));
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
      await invokeOrThrow('photo-album-manage', { action: 'set_window', albumId, opensAt, closesAt });
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

      const data = await invokeOrThrow('photo-album-create', {
        siteId,
        name: name.trim(),
        itineraryEventId: itineraryEventId || null,
      });
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
          <h1 className="text-3xl font-bold text-neutral-900">Guest photo sharing</h1>
          <p className="mt-2 text-neutral-600">Create albums, collect guest photos by event, and keep the upload flow organized.</p>
        </div>

        <Card className="p-6 border border-border bg-surface">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-neutral-900">Auto-place couple photos</h2>
            <p className="mt-1 text-sm text-neutral-600">Bucket photos into a few simple groups and we will place them into the right site sections automatically.</p>
          </div>
          <PhotoBucketCards buckets={photoBuckets} />
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="p-4">
            <p className="text-xs text-neutral-500">Albums</p>
            <p className="text-2xl font-semibold text-neutral-900">{albums.length}</p>
            <p className="text-xs text-neutral-500">{activeAlbumsCount} active · {pausedAlbumsCount} paused</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-neutral-500">Uploads</p>
            <p className="text-2xl font-semibold text-neutral-900">{totalUploads}</p>
            <p className="text-xs text-neutral-500">Across all albums</p>
          </Card>
        </div>

        <Card className="p-6 border border-violet-200 bg-violet-50/40">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clapperboard className="w-5 h-5 text-violet-700" />
                <h2 className="text-xl font-semibold text-violet-950">Slideshow generator</h2>
              </div>
              <p className="text-sm text-violet-900/80">
                Turn uploaded guest photos into a simple album-driven slideshow. Start with your strongest event albums, preview the sequence, then polish later.
              </p>
              <p className="mt-2 text-xs text-violet-900/70">
                Ready now: <span className="font-semibold text-violet-950">{slideshowReadyAlbumCount}</span> album{slideshowReadyAlbumCount === 1 ? '' : 's'} with 3+ uploads.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" className="border-violet-300 text-violet-900 hover:bg-violet-100">
                <Clapperboard className="w-4 h-4 mr-2" />
                Slideshow v1 ready below
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">Slideshow builder v1</h2>
              <p className="mt-1 text-sm text-neutral-600">Assemble a simple slideshow sequence from your uploaded guest photos.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={slideshowAlbumFilter}
                onChange={(e) => setSlideshowAlbumFilter(e.target.value)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="all">All slideshow-ready albums</option>
                {albums
                  .filter((album) => album.is_active && (countsByAlbum.get(album.id) ?? 0) >= 3)
                  .map((album) => (
                    <option key={album.id} value={album.id}>{album.name}</option>
                  ))}
              </select>
              <select
                value={slideshowOrder}
                onChange={(e) => setSlideshowOrder(e.target.value as SlideshowOrderMode)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="shuffled">Stable shuffled</option>
              </select>
              <select
                value={slideshowTheme}
                onChange={(e) => setSlideshowTheme(e.target.value as SlideshowTheme)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="classic">Classic</option>
                <option value="editorial">Editorial</option>
                <option value="party">Party</option>
              </select>
              <Button variant="outline" onClick={() => setSlideshowPreviewOpen(true)} disabled={slideshowFrames.length === 0}>
                Preview
              </Button>
              <Button variant="outline" onClick={() => void exportSlideshowPlan()} disabled={slideshowFrames.length === 0}>
                {copied === 'slideshow-plan' ? 'Copied plan' : 'Export plan'}
              </Button>
            </div>
          </div>

          {slideshowFrames.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-surface-subtle/20 px-4 py-6 text-sm text-neutral-600">
              Need at least one active album with 3+ visible uploads before a slideshow can be assembled.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-4 py-3 text-sm text-neutral-700">
                Built <span className="font-semibold text-neutral-900">{slideshowFrames.length}</span> frames from <span className="font-semibold text-neutral-900">{slideshowAlbumFilter === 'all' ? slideshowReadyAlbumCount : 1}</span> album source{slideshowAlbumFilter === 'all' ? 's' : ''}.
              </div>
              <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-4 py-3 text-sm text-neutral-700">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${slideshowThemeMeta[slideshowTheme].chipClass}`}>
                  {slideshowThemeMeta[slideshowTheme].label}
                </span>
                <span className="ml-2">{slideshowThemeMeta[slideshowTheme].helper}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {slideshowFrames.map((frame, index) => (
                  <div key={frame.uploadId} className={`rounded-xl border px-4 py-3 ${slideshowThemeMeta[slideshowTheme].cardClass}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-neutral-900">Frame {index + 1}</p>
                      <span className={`text-xs rounded-full px-2 py-0.5 ${slideshowThemeMeta[slideshowTheme].chipClass}`}>{frame.albumName}</span>
                    </div>
                    <p className="mt-2 text-sm text-neutral-800 truncate">{frame.title}</p>
                    <p className="mt-1 text-xs text-neutral-500">{frame.caption}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {slideshowPreviewOpen && slideshowFrames.length > 0 && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-white rounded-2xl border border-border shadow-xl p-5 space-y-4 max-h-[90vh] overflow-auto">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900">Slideshow preview</h3>
                  <p className="text-sm text-neutral-600">{slideshowThemeMeta[slideshowTheme].label} · {slideshowFrames.length} frames · {slideshowOrder}</p>
                </div>
                <Button variant="outline" onClick={() => setSlideshowPreviewOpen(false)}>Close</Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {slideshowFrames.map((frame, index) => (
                  <div key={frame.uploadId} className={`rounded-xl border px-4 py-4 ${slideshowThemeMeta[slideshowTheme].cardClass}`}>
                    <p className="text-xs uppercase tracking-wide text-neutral-500">Slide {index + 1}</p>
                    <p className="mt-2 text-base font-semibold text-neutral-900 truncate">{frame.title}</p>
                    <p className="mt-1 text-sm text-neutral-700">{frame.albumName}</p>
                    <p className="mt-2 text-xs text-neutral-500">{frame.caption}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

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

          <div className="mt-4 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Button onClick={createAlbum} disabled={submitting || loading} className="w-full sm:w-auto">
                <Camera className="w-4 h-4 mr-1" />
                {submitting ? 'Creating...' : 'Create album'}
              </Button>
              {uploadLanding && (
                <Button variant="outline" onClick={() => window.open(uploadLanding, '_blank')} className="w-full sm:w-auto">
                  <ExternalLink className="w-4 h-4 mr-1" /> Open site
                </Button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-border-subtle bg-surface-subtle/40 px-3 py-2">
              <p className="text-xs text-text-secondary">
                Missing event albums: <span className="font-semibold text-text-primary">{missingItineraryEvents.length}</span>
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void createMissingAlbumsFromItinerary()}
                disabled={bulkCreating || loading || missingItineraryEvents.length === 0}
                className="w-full sm:w-auto"
              >
                {bulkCreating ? 'Creating event albums...' : 'Create missing event albums'}
              </Button>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {success && <p className="mt-3 text-sm text-emerald-700">{success}</p>}

          {latestUploadUrl && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-medium text-emerald-900 mb-1">Newest upload link</p>
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
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-neutral-900">Albums</h2>
            <ActionsMenu
              open={actionsMenuOpen}
              onToggle={() => setActionsMenuOpen((v) => !v)}
              align="right"
              menuRef={actionsMenuRef}
            >
              <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => { exportAlbumLinksCsv(); setActionsMenuOpen(false); }}>
                Export album links
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => { exportSharePackCsv(); setActionsMenuOpen(false); }}>
                Export sharing pack
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => { void copyAllKnownLinks(); setActionsMenuOpen(false); }}>
                {copied === 'all-links' ? 'Copied all' : 'Copy all links'}
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => { void copyAllShareMessages(); setActionsMenuOpen(false); }}>
                {copied === 'all-share-messages' ? 'Copied messages' : 'Copy all messages'}
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => { sendAllActiveAlbumRequests(); setActionsMenuOpen(false); }}>
                Send all active album requests
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => { void regenerateAllKnownAlbumLinks(); setActionsMenuOpen(false); }} disabled={bulkRegenerating}>
                {bulkRegenerating ? 'Refreshing links...' : 'Refresh saved links'}
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => setShowFlaggedOnly((v) => !v)}>
                <Flag className="w-3.5 h-3.5 mr-1" />
                {showFlaggedOnly ? 'Show all uploads' : 'Show flagged only'}
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => setShowHidden((v) => !v)}>
                {showHidden ? <Eye className="w-3.5 h-3.5 mr-1" /> : <EyeOff className="w-3.5 h-3.5 mr-1" />}
                {showHidden ? 'Hide hidden items' : 'Show hidden items'}
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => void setUploadsFlaggedByFilter(true)} disabled={bulkModerating}>
                Flag visible
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => void setUploadsFlaggedByFilter(false)} disabled={bulkModerating}>
                Unflag visible
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => void setUploadsHiddenByFilter(true)} disabled={bulkModerating}>
                Hide visible
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => void setUploadsHiddenByFilter(false)} disabled={bulkModerating}>
                Unhide visible
              </Button>
            </ActionsMenu>
          </div>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input
              value={albumSearch}
              onChange={(e) => setAlbumSearch(e.target.value)}
              placeholder="Search album name or slug"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'paused')}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="paused">Paused only</option>
            </select>
            <div className="text-xs text-neutral-500 flex items-center">{filteredAlbums.length} album(s)</div>
          </div>

          {loading ? (
            <p className="text-sm text-neutral-500">Loading albums…</p>
          ) : albums.length === 0 ? (
            <p className="text-sm text-neutral-600">No albums yet. Create your first one above.</p>
          ) : filteredAlbums.length === 0 ? (
            <p className="text-sm text-neutral-600">No albums match those filters.</p>
          ) : (
            <div className="space-y-3">
              {filteredAlbums.map((album) => {
                const uploadCount = countsByAlbum.get(album.id) ?? 0;
                const hiddenCount = hiddenCountsByAlbum.get(album.id) ?? 0;
                const flaggedCount = flaggedCountsByAlbum.get(album.id) ?? 0;
                const recents = recentByAlbum.get(album.id) ?? [];
                const draft = windowDrafts[album.id] ?? { opensAt: '', closesAt: '' };
                const knownUploadLink = albumUploadLinks[album.id] || '';
                const hasWindow = Boolean(album.opens_at || album.closes_at);
                const hasLink = Boolean(knownUploadLink);

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
                          {!hasLink && <span className="text-rose-700">no saved link yet</span>}
                          {!hasWindow && <span className="text-amber-700">no upload window yet</span>}
                          {flaggedCount > 0 && <span className="text-amber-700">{flaggedCount} flagged</span>}
                          {hiddenCount > 0 && <span className="text-neutral-600">{hiddenCount} hidden</span>}
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
                          {workingAlbumId === album.id ? 'Working...' : 'Create new link'}
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
                          disabled={!knownUploadLink}
                          onClick={() => void copyText(makeShareMessage(album.name, knownUploadLink), `share-msg-${album.id}`)}
                        >
                          {copied === `share-msg-${album.id}` ? 'Copied message' : 'Copy message'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const shareUrl = knownUploadLink || latestUploadUrl || `${window.location.origin}/photos/upload`;
                            const subject = encodeURIComponent(`${album.name} photos upload`);
                            const body = encodeURIComponent(makeShareMessage(album.name, shareUrl));
                            window.location.href = `/dashboard/messages?prefillSubject=${subject}&prefillBody=${body}`;
                          }}
                        >
                          <Mail className="w-3 h-3 mr-1" /> Share request
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
                        <Button size="sm" variant="outline" disabled={workingAlbumId === album.id} onClick={() => applySuggestedWindow(album.id)}>
                          Suggested window
                        </Button>
                        <Button size="sm" variant="outline" disabled={workingAlbumId === album.id} onClick={() => void saveWindow(album.id)}>
                          {workingAlbumId === album.id ? 'Saving...' : 'Save window'}
                        </Button>
                      </div>
                    </div>

                    {recents.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-neutral-700 mb-1">Recent uploads</p>
                        <ul className="space-y-2 text-xs text-neutral-600">
                          {recents.map((u) => (
                            <li key={u.id} className={`rounded border px-2 py-1 ${u.is_hidden ? 'bg-neutral-100 border-neutral-200' : 'bg-white border-neutral-200'}`}>
                              <div className="flex items-center justify-between gap-2">
                                <span>
                                  {u.original_filename} · {u.guest_name || 'Guest'}{u.guest_email ? ` (${u.guest_email})` : ''} · {new Date(u.uploaded_at).toLocaleString()}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    className={`inline-flex items-center rounded px-1.5 py-0.5 border ${u.is_flagged ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-white text-neutral-600 border-neutral-300'}`}
                                    onClick={() => void moderateUpload(u.id, { is_flagged: !u.is_flagged })}
                                  >
                                    <Flag className="w-3 h-3 mr-1" /> {u.is_flagged ? 'Unflag' : 'Flag'}
                                  </button>
                                  <button
                                    type="button"
                                    className="inline-flex items-center rounded px-1.5 py-0.5 border bg-white text-neutral-600 border-neutral-300"
                                    onClick={() => void moderateUpload(u.id, { is_hidden: !u.is_hidden })}
                                  >
                                    {u.is_hidden ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                                    {u.is_hidden ? 'Unhide' : 'Hide'}
                                  </button>
                                </div>
                              </div>
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
