import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Download, ExternalLink, Music2, Plus, Save, Sparkles } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { copyTextOrDownload, downloadTextFile } from '../../../lib/copyText';
import { getSafePublicWebUrl } from '../../../sections/publicLinks';
import {
  ensurePlanningSongRequestQuestion,
  loadSongRequestData,
  savePlanningPlaylistUrl,
  type PlanningSongRequest,
} from './planningService';

interface Props {
  siteId: string | null;
  isDemoMode?: boolean;
  canEdit?: boolean;
}

interface ParsedSongRequest extends PlanningSongRequest {
  title: string;
  artist: string;
}

function parseSongRequest(request: PlanningSongRequest): ParsedSongRequest {
  const normalized = request.answer.replace(/\s+/g, ' ').trim();
  const separator = normalized.includes(' - ') ? ' - ' : normalized.includes(' by ') ? ' by ' : null;
  if (!separator) return { ...request, title: normalized, artist: '' };
  const [title, ...rest] = normalized.split(separator);
  return { ...request, title: title.trim(), artist: rest.join(separator).trim() };
}

export const SongRequestsTab: React.FC<Props> = ({ siteId, isDemoMode = false, canEdit = true }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [savingPlaylist, setSavingPlaylist] = useState(false);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [copyingDjList, setCopyingDjList] = useState(false);
  const [djListCopyNotice, setDjListCopyNotice] = useState<'copied' | 'downloaded' | null>(null);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [requests, setRequests] = useState<PlanningSongRequest[]>([]);
  const [hasQuestion, setHasQuestion] = useState(false);
  const playlistDirtyRef = useRef(false);
  const djListCopyNoticeTimeoutRef = useRef<number | null>(null);
  const djListCopyRequestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const canEditRef = useRef(canEdit);
  const safePlaylistUrl = getSafePublicWebUrl(playlistUrl);

  canEditRef.current = canEdit;

  useEffect(() => () => {
    mountedRef.current = false;
    djListCopyRequestIdRef.current += 1;
    if (djListCopyNoticeTimeoutRef.current) window.clearTimeout(djListCopyNoticeTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (canEdit) return;
    setSavingPlaylist(false);
    setAddingQuestion(false);
  }, [canEdit]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!siteId) return;
      setLoading(true);
      try {
        if (isDemoMode) {
          if (!playlistDirtyRef.current) setPlaylistUrl('https://open.spotify.com/playlist/dayof-demo');
          setHasQuestion(true);
          setRequests([
            { guestName: 'Sarah Mitchell', answer: 'Dancing Queen - ABBA', respondedAt: new Date().toISOString() },
            { guestName: 'Michael Chen', answer: 'September - Earth, Wind & Fire', respondedAt: new Date().toISOString() },
          ]);
          return;
        }

        const data = await loadSongRequestData(siteId);
        if (cancelled) return;
        if (!playlistDirtyRef.current) setPlaylistUrl(data.playlistUrl);
        setHasQuestion(data.hasQuestion);
        setRequests(data.requests);
      } catch {
        toast('Couldn’t load song requests right now.', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [siteId, isDemoMode, toast]);

  const uniqueRequests = useMemo(() => {
    const seen = new Set<string>();
    return requests.filter((request) => {
      const key = `${request.guestName}:${request.answer}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [requests]);
  const parsedRequests = useMemo(() => uniqueRequests.map(parseSongRequest), [uniqueRequests]);
  const djListContextKey = useMemo(() => JSON.stringify(parsedRequests.map((request) => [
    request.guestName,
    request.title,
    request.artist,
    request.answer,
    request.respondedAt,
  ])), [parsedRequests]);
  const djListContextKeyRef = useRef(djListContextKey);
  djListContextKeyRef.current = djListContextKey;

  useEffect(() => {
    djListCopyRequestIdRef.current += 1;
    setCopyingDjList(false);
    setDjListCopyNotice(null);
    if (djListCopyNoticeTimeoutRef.current) {
      window.clearTimeout(djListCopyNoticeTimeoutRef.current);
      djListCopyNoticeTimeoutRef.current = null;
    }
  }, [djListContextKey]);

  const spotifySearchUrl = (request: ParsedSongRequest) => `https://open.spotify.com/search/${encodeURIComponent(`${request.title} ${request.artist}`.trim())}`;

  async function savePlaylist() {
    if (!canEditRef.current || !siteId || savingPlaylist) return;
    setSavingPlaylist(true);
    if (isDemoMode) {
      if (!canEditRef.current) return;
      playlistDirtyRef.current = false;
      toast('Playlist link saved for demo mode.', 'success');
      setSavingPlaylist(false);
      return;
    }
    try {
      await savePlanningPlaylistUrl(siteId, playlistUrl);
    } catch {
      if (!canEditRef.current) return;
      toast('Couldn’t save the playlist link right now.', 'error');
      setSavingPlaylist(false);
      return;
    }
    if (!canEditRef.current) return;
    playlistDirtyRef.current = false;
    toast('Playlist link saved.', 'success');
    setSavingPlaylist(false);
  }

  async function addSongQuestion() {
    if (!canEditRef.current || !siteId || hasQuestion || addingQuestion) return;
    setAddingQuestion(true);
    if (isDemoMode) {
      if (!canEditRef.current) return;
      setHasQuestion(true);
      toast('Song request question enabled for demo mode.', 'success');
      setAddingQuestion(false);
      return;
    }
    try {
      await ensurePlanningSongRequestQuestion(siteId);
    } catch {
      if (!canEditRef.current) return;
      toast('Couldn’t enable the song request question right now.', 'error');
      setAddingQuestion(false);
      return;
    }
    if (!canEditRef.current) return;
    setHasQuestion(true);
    toast('Song request question added to RSVP.', 'success');
    setAddingQuestion(false);
  }

  async function copyDjList() {
    if (copyingDjList) return;

    const requestId = djListCopyRequestIdRef.current + 1;
    djListCopyRequestIdRef.current = requestId;
    const requestContextKey = djListContextKeyRef.current;
    const isCurrentDjListCopy = () => (
      mountedRef.current &&
      requestId === djListCopyRequestIdRef.current &&
      requestContextKey === djListContextKeyRef.current
    );

    setCopyingDjList(true);
    setDjListCopyNotice(null);
    const text = parsedRequests.map((request, index) => `${index + 1}. ${request.title}${request.artist ? ` — ${request.artist}` : ''} (${request.guestName})`).join('\n');
    try {
      const result = await copyTextOrDownload(text || 'No song requests yet.', 'dayof-dj-song-list.txt');
      if (!isCurrentDjListCopy()) return;
      setDjListCopyNotice(result);
      if (result === 'copied') {
        toast('DJ-ready song list copied.', 'success');
      } else {
        toast('Clipboard was blocked, so the DJ list downloaded.', 'success');
      }
      if (djListCopyNoticeTimeoutRef.current) window.clearTimeout(djListCopyNoticeTimeoutRef.current);
      djListCopyNoticeTimeoutRef.current = window.setTimeout(() => {
        if (!isCurrentDjListCopy()) return;
        setDjListCopyNotice((current) => (current === result ? null : current));
      }, 1800);
    } catch {
      if (!isCurrentDjListCopy()) return;
      toast('Couldn’t copy the DJ list right now.', 'error');
    } finally {
      if (isCurrentDjListCopy()) {
        setCopyingDjList(false);
      }
    }
  }

  function exportCsv() {
    const csvRows = [
      ['Title', 'Artist', 'Guest', 'Raw answer', 'Responded at'],
      ...parsedRequests.map((request) => [request.title, request.artist, request.guestName, request.answer, request.respondedAt ?? '']),
    ];
    const csv = csvRows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    downloadTextFile(
      `dayof-song-requests-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      'text/csv;charset=utf-8',
    );
  }

  return (
    <div className="space-y-4">
      <Card padding="md" className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary-light p-2">
            <Music2 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-text-primary">Shared playlist + RSVP song requests</p>
            <p className="text-sm text-text-secondary mt-1">Collect song ideas from RSVP answers and keep the collaborative playlist link in one place.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={playlistUrl}
            onChange={(event) => {
              playlistDirtyRef.current = true;
              setPlaylistUrl(event.target.value);
            }}
            disabled={!canEdit}
            placeholder="https://open.spotify.com/playlist/..."
            className="flex-1 px-3 py-2 text-sm bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
          <Button size="sm" onClick={savePlaylist} disabled={!canEdit || savingPlaylist}>
            <Save className="w-4 h-4 mr-1" />
            {savingPlaylist ? 'Saving...' : 'Save'}
          </Button>
          {safePlaylistUrl && (
            <a href={safePlaylistUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-sm text-text-secondary hover:text-primary">
              <ExternalLink className="w-4 h-4 mr-1" />
              Open
            </a>
          )}
        </div>
        <Button size="sm" variant={hasQuestion ? 'outline' : 'primary'} onClick={addSongQuestion} disabled={!canEdit || hasQuestion || addingQuestion}>
          <Plus className="w-4 h-4 mr-1" />
          {hasQuestion ? 'RSVP song question enabled' : addingQuestion ? 'Adding RSVP song question...' : 'Add RSVP song question'}
        </Button>
      </Card>

      <Card padding="sm" className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-primary/20 bg-primary-light p-2">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">DJ handoff</p>
              <p className="text-sm text-text-secondary mt-0.5">Clean requests, open Spotify searches, and export a DJ-ready list without digging through RSVP rows.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void copyDjList()} disabled={copyingDjList}>
              <Copy className="w-4 h-4 mr-1" />
              {copyingDjList
                ? 'Copying...'
                : djListCopyNotice === 'downloaded'
                  ? 'Downloaded DJ list'
                  : djListCopyNotice === 'copied'
                    ? 'Copied DJ list'
                    : 'Copy list'}
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-border-subtle px-4 py-3">
          <p className="text-sm font-semibold text-text-primary">Requests</p>
          <p className="text-xs text-text-tertiary">{loading ? 'Loading…' : `${parsedRequests.length} song request${parsedRequests.length === 1 ? '' : 's'}`}</p>
        </div>
        {parsedRequests.length === 0 ? (
          <div className="p-6 text-center text-sm text-text-tertiary">Song requests will appear after guests answer the RSVP song question.</div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {parsedRequests.map((request, index) => (
              <div key={`${request.guestName}-${index}`} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{request.title}</p>
                    <p className="text-xs text-text-tertiary">{request.artist ? `${request.artist} · ` : ''}{request.guestName}</p>
                  </div>
                  <a href={spotifySearchUrl(request)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:text-primary-hover inline-flex items-center gap-1">
                    Search <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
