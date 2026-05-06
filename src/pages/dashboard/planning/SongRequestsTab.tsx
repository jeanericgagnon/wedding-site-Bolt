import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Download, ExternalLink, Music2, Plus, Save, Sparkles } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { copyTextOrDownload } from '../../../lib/copyText';
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
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [requests, setRequests] = useState<PlanningSongRequest[]>([]);
  const [hasQuestion, setHasQuestion] = useState(false);
  const playlistDirtyRef = useRef(false);
  const safePlaylistUrl = getSafePublicWebUrl(playlistUrl);

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
  const spotifySearchUrl = (request: ParsedSongRequest) => `https://open.spotify.com/search/${encodeURIComponent(`${request.title} ${request.artist}`.trim())}`;

  async function savePlaylist() {
    if (!siteId) return;
    if (isDemoMode) {
      playlistDirtyRef.current = false;
      toast('Playlist link saved for demo mode.', 'success');
      return;
    }
    try {
      await savePlanningPlaylistUrl(siteId, playlistUrl);
    } catch {
      toast('Couldn’t save the playlist link right now.', 'error');
      return;
    }
    playlistDirtyRef.current = false;
    toast('Playlist link saved.', 'success');
  }

  async function addSongQuestion() {
    if (!siteId) return;
    if (isDemoMode) {
      setHasQuestion(true);
      toast('Song request question enabled for demo mode.', 'success');
      return;
    }
    try {
      await ensurePlanningSongRequestQuestion(siteId);
    } catch {
      toast('Couldn’t enable the song request question right now.', 'error');
      return;
    }
    setHasQuestion(true);
    toast('Song request question added to RSVP.', 'success');
  }

  async function copyDjList() {
    const text = parsedRequests.map((request, index) => `${index + 1}. ${request.title}${request.artist ? ` — ${request.artist}` : ''} (${request.guestName})`).join('\n');
    const result = await copyTextOrDownload(text || 'No song requests yet.', 'dayof-dj-song-list.txt');
    if (result === 'copied') {
      toast('DJ-ready song list copied.', 'success');
    } else {
      toast('Clipboard was blocked, so the DJ list downloaded.', 'success');
    }
  }

  function exportCsv() {
    const csvRows = [
      ['Title', 'Artist', 'Guest', 'Raw answer', 'Responded at'],
      ...parsedRequests.map((request) => [request.title, request.artist, request.guestName, request.answer, request.respondedAt ?? '']),
    ];
    const csv = csvRows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `dayof-song-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <Card padding="md" className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary-light p-2">
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
            className="flex-1 px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
          <Button size="sm" onClick={savePlaylist} disabled={!canEdit}>
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
          {safePlaylistUrl && (
            <a href={safePlaylistUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:text-primary">
              <ExternalLink className="w-4 h-4 mr-1" />
              Open
            </a>
          )}
        </div>
        <Button size="sm" variant={hasQuestion ? 'outline' : 'primary'} onClick={addSongQuestion} disabled={!canEdit || hasQuestion}>
          <Plus className="w-4 h-4 mr-1" />
          {hasQuestion ? 'RSVP song question enabled' : 'Add RSVP song question'}
        </Button>
      </Card>

      <Card padding="sm" className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg border border-primary/20 bg-primary-light p-2">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">DJ handoff</p>
              <p className="text-sm text-text-secondary mt-0.5">Clean requests, open Spotify searches, and export a DJ-ready list without digging through RSVP rows.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={copyDjList}>
              <Copy className="w-4 h-4 mr-1" />
              Copy list
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
