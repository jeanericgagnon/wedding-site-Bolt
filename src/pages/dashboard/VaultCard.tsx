import React, { useState } from 'react';
import { Card, Button } from '../../components/ui';
import {
  Lock,
  Unlock,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Paperclip,
  Link2,
  Check,
  Settings2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { formatVaultUnlockDate, getVaultUnlockDate } from './vaultDate';
import { formatVaultEntryDate, getVaultEntryTimestamp } from './vaultEntryTime';
import { copyTextOrDownload } from '../../lib/copyText';
import { getSafePublicWebUrl } from '../../sections/publicLinks';
import { LOCAL_E2E_VAULT_FORCE_UNLOCK_KEY, readLocalE2EBypassFlag } from '../../lib/localE2EBypassStorage';
import { updateVaultRecapDraft, type VaultConfig, type VaultEntry } from './vaultService';

function shouldForceUnlockForE2E(): boolean {
  if (typeof window === 'undefined') return false;
  return readLocalE2EBypassFlag(LOCAL_E2E_VAULT_FORCE_UNLOCK_KEY);
}

function inferAttachmentKind(url: string | null, name: string | null, mediaType?: string | null): 'image' | 'video' | 'audio' | 'file' {
  if (mediaType === 'photo') return 'image';
  if (mediaType === 'video') return 'video';
  if (mediaType === 'voice') return 'audio';
  const target = `${url ?? ''} ${name ?? ''}`.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|avif|heic)(\?|$)/.test(target) || /photo|image/.test(target)) return 'image';
  if (/\.(mp4|mov|webm|m4v)(\?|$)/.test(target) || /video/.test(target)) return 'video';
  if (/\.(mp3|wav|m4a|aac|ogg|webm)(\?|$)/.test(target) || /voice|audio/.test(target)) return 'audio';
  return 'file';
}

function buildAnniversaryRecap(
  entries: VaultEntry[],
  years: number,
  style: 'classic' | 'playful' | 'cinematic' = 'classic',
  length: 'short' | 'medium' | 'long' = 'medium',
  photosOnly = false,
): string {
  const source = photosOnly
    ? entries.filter((e) => {
        const media = (e.media_type || '').toLowerCase();
        const file = (e.attachment_name || '').toLowerCase();
        return media === 'photo' || /\.(jpg|jpeg|png|webp|heic)$/i.test(file);
      })
    : entries;

  const sorted = [...source].sort((a, b) => getVaultEntryTimestamp(a.created_at) - getVaultEntryTimestamp(b.created_at));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const photoEntries = sorted.filter((e) => {
    const media = (e.media_type || '').toLowerCase();
    const file = (e.attachment_name || '').toLowerCase();
    return media === 'photo' || /\.(jpg|jpeg|png|webp|heic)$/i.test(file);
  });

  const timelineLimit = length === 'short' ? 5 : length === 'long' ? 14 : 10;
  const photoLimit = length === 'short' ? 4 : length === 'long' ? 10 : 8;

  const timelineMoments = sorted.slice(0, timelineLimit).map((entry) => {
    const date = formatVaultEntryDate(entry.created_at);
    const title = (entry.title || '').trim();
    const fileName = (entry.attachment_name || '').trim();
    const content = (entry.content || '').trim();
    const core = title || content || fileName || 'A shared memory';
    const cleanCore = core.length > 120 ? `${core.slice(0, 117)}…` : core;
    return `- ${date}: ${cleanCore}`;
  });

  const photoHighlights = photoEntries.slice(0, photoLimit).map((entry) => {
    const date = formatVaultEntryDate(entry.created_at, { month: 'short', year: 'numeric' });
    const name = (entry.attachment_name || entry.title || 'Captured moment').replace(/[_-]+/g, ' ').trim();
    return `- ${date}: ${name}`;
  });

  const textCorpus = sorted.map((e) => `${e.title || ''} ${e.content || ''} ${e.attachment_name || ''}`.toLowerCase()).join(' ');
  const themes = [
    'family', 'friends', 'dance', 'ceremony', 'sunset', 'travel', 'laughter', 'home', 'joy', 'gratitude'
  ].filter((w) => textCorpus.includes(w)).slice(0, 4);

  const openingDate = first ? formatVaultEntryDate(first.created_at, { month: 'long', year: 'numeric' }, '') : null;
  const closingDate = last ? formatVaultEntryDate(last.created_at, { month: 'long', year: 'numeric' }, '') : null;

  const openingBase = openingDate && closingDate
    ? `Over ${openingDate} to ${closingDate}, this ${years}-year chapter unfolds through ${sorted.length} saved memories, including ${photoEntries.length} photo moments.`
    : `This ${years}-year chapter unfolds through ${sorted.length} saved memories, including ${photoEntries.length} photo moments.`;

  const themeLine = themes.length > 0
    ? `The strongest threads are ${themes.join(', ')} — a story of presence, warmth, and shared celebration.`
    : 'The strongest thread is closeness — the kind of love that shows up in small moments and big celebrations alike.';

  const styleOpen = style === 'cinematic'
    ? `${openingBase} It feels like a film told in frames, glances, and quiet gestures.`
    : style === 'playful'
      ? `${openingBase} It’s full of energy, laughter, and beautifully chaotic joy.`
      : openingBase;

  const closing = style === 'cinematic'
    ? 'Looking back, these memories feel like scenes from a beautiful film: vivid, intimate, and timeless.'
    : style === 'playful'
      ? 'Looking back, this chapter is pure heart: big laughs, happy tears, and the kind of love that keeps getting better.'
      : 'Looking back, these memories read like a promise kept: to keep choosing each other, to keep celebrating together, and to keep building a life full of meaning.';

  return [
    `${years}-Year Anniversary Recap (${style[0].toUpperCase()}${style.slice(1)})`,
    photosOnly ? 'Photo-first mode enabled' : 'Mixed memories mode',
    '',
    styleOpen,
    themeLine,
    '',
    'Story arc',
    ...timelineMoments,
    '',
    photoHighlights.length > 0 ? 'Photo highlights' : 'Highlight moments',
    ...(photoHighlights.length > 0 ? photoHighlights : timelineMoments.slice(0, 5)),
    '',
    closing,
    '',
    '— Recap draft, ready to edit'
  ].join('\n');
}

interface EntryFormProps {
  vaultConfigId: string;
  durationYears: number;
  onSave: (entry: { vault_config_id: string; vault_year: number; title: string; content: string; author_name: string; attachment_url: string | null; attachment_name: string | null }) => Promise<void>;
  onCancel: () => void;
  safeVaultDashboardError: (err: unknown, fallback: string) => string;
}

function EntryForm({ vaultConfigId, durationYears, onSave, onCancel, safeVaultDashboardError }: EntryFormProps) {
  const [title, setTitle] = useState(`A note for our ${durationYears}${durationYears === 1 ? 'st' : durationYears === 2 ? 'nd' : durationYears === 3 ? 'rd' : 'th'} anniversary`);
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('You');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        vault_config_id: vaultConfigId,
        vault_year: durationYears,
        title: title.trim(),
        content: content.trim(),
        author_name: authorName.trim() || 'You',
        attachment_url: attachmentUrl.trim() || null,
        attachment_name: attachmentName.trim() || null,
      });
    } catch (err: unknown) {
      setError(safeVaultDashboardError(err, 'Couldn’t save right now. Please try again.'));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5 bg-surface-subtle rounded-lg border border-border mt-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-primary mb-1">Title (optional)</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="For example: A note to remember" className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-primary mb-1">From</label>
          <input type="text" value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Your name" className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-text-primary mb-1">Message <span className="text-text-tertiary">*</span></label>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} required rows={5} placeholder="Write something meaningful to be opened in the future…" className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
        <p className="text-xs text-text-tertiary mt-1">{content.length} characters</p>
      </div>
      <div>
        <div className="flex items-center gap-1 mb-1">
          <Paperclip className="w-3.5 h-3.5 text-text-primary" />
          <label className="text-xs font-medium text-text-primary">Attachment URL (optional)</label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="url" value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} placeholder="https://…" className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary" />
          <input type="text" value={attachmentName} onChange={(e) => setAttachmentName(e.target.value)} placeholder="Label (e.g. Our first photo)" className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>
      {error && (
        <div className="flex items-center gap-2 p-3 bg-surface rounded-lg text-sm text-text-primary border border-border-subtle">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" variant="primary" size="sm" disabled={saving || !content.trim()}>
          {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />Saving…</> : 'Save to vault'}
        </Button>
      </div>
    </form>
  );
}

export interface VaultCardProps {
  config: VaultConfig;
  entries: VaultEntry[];
  weddingDate: Date | null;
  siteSlug: string | null;
  showForm: boolean;
  onAddEntry: (configId: string) => void;
  onDeleteEntry: (id: string) => void;
  onSaveEntry: (entry: { vault_config_id: string; vault_year: number; title: string; content: string; author_name: string; attachment_url: string | null; attachment_name: string | null }) => Promise<void>;
  onCancelForm: () => void;
  onToggleEnabled: (configId: string, enabled: boolean) => Promise<void>;
  onEdit: (config: VaultConfig) => void;
  onError: (message: string) => void;
  resolveVaultEntryLink: (entryId: string) => Promise<string | null>;
  safeVaultDashboardError: (err: unknown, fallback: string) => string;
}

export function VaultCard({
  config,
  entries,
  weddingDate,
  siteSlug,
  showForm,
  onAddEntry,
  onDeleteEntry,
  onSaveEntry,
  onCancelForm,
  onToggleEnabled,
  onEdit,
  onError,
  resolveVaultEntryLink,
  safeVaultDashboardError,
}: VaultCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [recapCopied, setRecapCopied] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [generatingRecap, setGeneratingRecap] = useState(false);
  const [recapStyle, setRecapStyle] = useState<'classic' | 'playful' | 'cinematic'>('classic');
  const [recapLength, setRecapLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [photosOnlyRecap, setPhotosOnlyRecap] = useState(true);
  const [resolvedEntryLinks, setResolvedEntryLinks] = useState<Record<string, string>>({});
  const [resolvingEntryId, setResolvingEntryId] = useState<string | null>(null);
  const [entryOverrides, setEntryOverrides] = useState<Record<string, Partial<VaultEntry>>>({});

  const displayEntries = entries.map((entry) => ({ ...entry, ...(entryOverrides[entry.id] ?? {}) }));
  const unlockDate = getVaultUnlockDate(weddingDate, config.duration_years);
  const isUnlocked = unlockDate ? new Date() >= unlockDate : false;
  const unlockLabel = unlockDate ? formatVaultUnlockDate(unlockDate) : 'Set your wedding date to calculate unlock date';
  const nowMs = Date.now();

  const getEntryUnlockDate = (entry: VaultEntry) => {
    if (entry.unlock_at) {
      const parsed = new Date(entry.unlock_at);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return unlockDate;
  };

  const isEntryUnlocked = (entry: VaultEntry) => {
    if (!config.is_enabled) return false;
    if (shouldForceUnlockForE2E()) return true;
    const d = getEntryUnlockDate(entry);
    return d ? d.getTime() <= nowMs : false;
  };

  async function resolveEntryLink(entry: VaultEntry): Promise<string | null> {
    if (resolvedEntryLinks[entry.id]) return resolvedEntryLinks[entry.id];
    setResolvingEntryId(entry.id);
    try {
      const safeUrl = getSafePublicWebUrl(await resolveVaultEntryLink(entry.id));
      if (safeUrl) setResolvedEntryLinks((prev) => ({ ...prev, [entry.id]: safeUrl }));
      return safeUrl || null;
    } catch (err) {
      onError(safeVaultDashboardError(err, 'Couldn’t open that attachment right now.'));
      return null;
    } finally {
      setResolvingEntryId(null);
    }
  }

  function buildVaultShareUrl() {
    if (!siteSlug) return null;
    const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const vaultPath = `/vault/${siteSlug}`;
    const isGitHubPages = window.location.hostname.includes('github.io');
    return isGitHubPages
      ? `${window.location.origin}${basePath || ''}/?oc_redirect=${encodeURIComponent(vaultPath)}`
      : `${window.location.origin}${basePath}${vaultPath}`;
  }

  async function handleCopyLink() {
    const url = buildVaultShareUrl();
    if (!url) return;
    const result = await copyTextOrDownload(url, 'dayof-vault-link.txt');
    if (result === 'copied') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleToggle() {
    setToggling(true);
    try {
      await onToggleEnabled(config.id, !config.is_enabled);
    } finally {
      setToggling(false);
    }
  }

  async function handleGenerateRecap() {
    if (displayEntries.length === 0 || generatingRecap) return;
    setGeneratingRecap(true);
    try {
      await onSaveEntry({
        vault_config_id: config.id,
        vault_year: config.duration_years,
        title: `${config.duration_years}-Year Recap Draft`,
        content: buildAnniversaryRecap(displayEntries, config.duration_years, recapStyle, recapLength, photosOnlyRecap),
        author_name: 'dayof Recap Draft',
        attachment_url: null,
        attachment_name: null,
      });
    } finally {
      setGeneratingRecap(false);
    }
  }

  async function handleRegenerateLatestRecap() {
    if (generatingRecap) return;
    const latestRecap = [...displayEntries]
      .filter((entry) => (entry.title || '').toLowerCase().includes('recap'))
      .sort((a, b) => getVaultEntryTimestamp(b.created_at) - getVaultEntryTimestamp(a.created_at))[0];

    if (!latestRecap) {
      await handleGenerateRecap();
      return;
    }

    setGeneratingRecap(true);
    try {
      const nextContent = buildAnniversaryRecap(displayEntries, config.duration_years, recapStyle, recapLength, photosOnlyRecap);
      const nextTitle = `${config.duration_years}-Year Recap Draft (${recapStyle[0].toUpperCase()}${recapStyle.slice(1)})`;
      await updateVaultRecapDraft({
        entryId: latestRecap.id,
        title: nextTitle,
        content: nextContent,
        authorName: 'dayof Recap Draft',
      });
      setEntryOverrides((prev) => ({
        ...prev,
        [latestRecap.id]: {
          ...prev[latestRecap.id],
          title: nextTitle,
          content: nextContent,
          author_name: 'dayof Recap Draft',
        },
      }));
    } catch (err) {
      onError(safeVaultDashboardError(err, 'Couldn’t refresh the recap draft.'));
    } finally {
      setGeneratingRecap(false);
    }
  }

  const latestRecap = [...displayEntries]
    .filter((entry) => (entry.title || '').toLowerCase().includes('recap'))
    .sort((a, b) => getVaultEntryTimestamp(b.created_at) - getVaultEntryTimestamp(a.created_at))[0];
  const hasRecap = !!latestRecap;

  async function handleCopyRecapLink() {
    const base = buildVaultShareUrl();
    if (!base || !latestRecap) return;
    const url = `${base}?entry=${latestRecap.id}`;
    const result = await copyTextOrDownload(url, 'dayof-vault-recap-link.txt');
    if (result === 'copied') {
      setRecapCopied(true);
      setTimeout(() => setRecapCopied(false), 2000);
    }
  }

  return (
    <Card variant="bordered" padding="lg" className={`transition-colors border border-border-subtle ${!config.is_enabled ? 'opacity-60' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-1">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-2.5 rounded-lg flex-shrink-0 ${isUnlocked && config.is_enabled ? 'bg-surface-subtle' : 'bg-surface-subtle'}`}>
            {isUnlocked && config.is_enabled ? <Unlock className="w-5 h-5 text-primary" /> : <Lock className="w-5 h-5 text-text-tertiary" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-text-primary truncate">{config.label || `Vault ${config.vault_index}`}</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-lg bg-surface-subtle text-text-secondary border border-border-subtle flex-shrink-0">{config.duration_years}yr</span>
              {!config.is_enabled && <span className="text-xs bg-surface-subtle text-text-tertiary px-2 py-0.5 rounded-lg border border-border flex-shrink-0">Disabled</span>}
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              {config.is_enabled ? (isUnlocked ? 'Unlocked — you can read and add entries' : `Locked until ${unlockLabel} (${config.duration_years}yr)`) : 'This vault is disabled and hidden from guests'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap self-start sm:self-auto">
          <span className="text-xs text-text-tertiary px-2 py-1 rounded-md bg-surface-subtle border border-border">{displayEntries.length} {displayEntries.length === 1 ? 'entry' : 'entries'}</span>
          {siteSlug && config.is_enabled && (
            <button
              onClick={handleCopyLink}
              aria-label={`Share ${config.label || `Vault ${config.vault_index}`}`}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${copied ? 'border-border-subtle bg-surface-subtle text-text-primary' : 'border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary hover:bg-primary/5'}`}
              title={`Copy share link for ${config.label || `Vault ${config.vault_index}`}`}
            >
              {copied ? <Check className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Share'}
            </button>
          )}
          <button
            onClick={() => onEdit(config)}
            aria-label={`Edit ${config.label || `Vault ${config.vault_index}`}`}
            className="p-1.5 rounded-lg hover:bg-surface-subtle text-text-tertiary hover:text-text-primary transition-colors"
            title={`Edit ${config.label || `Vault ${config.vault_index}`}`}
          >
            <Settings2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleToggle}
            disabled={toggling}
            aria-label={`${config.is_enabled ? 'Disable' : 'Enable'} ${config.label || `Vault ${config.vault_index}`}`}
            className="p-1.5 rounded-lg hover:bg-surface-subtle transition-colors"
            title={config.is_enabled ? 'Disable vault' : 'Enable vault'}
          >
            {toggling ? <Loader2 className="w-4 h-4 animate-spin text-text-tertiary" /> : config.is_enabled ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5 text-text-tertiary" />}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${config.label || `Vault ${config.vault_index}`}`}
            className="p-1.5 rounded-lg hover:bg-surface-subtle text-text-tertiary transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3">
          {displayEntries.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => void handleGenerateRecap()} disabled={generatingRecap}>
                {generatingRecap ? 'Generating…' : 'Create recap draft'}
              </Button>
              {hasRecap && (
                <>
                  <Button variant="outline" size="sm" onClick={() => void handleRegenerateLatestRecap()} disabled={generatingRecap}>
                    Refresh recap
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void handleCopyRecapLink()}>
                    {recapCopied ? 'Copied recap link' : 'Copy recap link'}
                  </Button>
                </>
              )}
              <select value={recapStyle} onChange={(e) => setRecapStyle(e.target.value as 'classic' | 'playful' | 'cinematic')} className="rounded-lg border border-border px-2 py-1 text-xs">
                <option value="classic">Classic</option>
                <option value="playful">Playful</option>
                <option value="cinematic">Cinematic</option>
              </select>
              <select value={recapLength} onChange={(e) => setRecapLength(e.target.value as 'short' | 'medium' | 'long')} className="rounded-lg border border-border px-2 py-1 text-xs">
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </select>
              <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
                <input type="checkbox" checked={photosOnlyRecap} onChange={(e) => setPhotosOnlyRecap(e.target.checked)} />
                Photos only
              </label>
            </div>
          )}

          {displayEntries.length === 0 && !showForm && (
            <div className="text-center py-6 border border-dashed border-border rounded-lg">
              <p className="text-sm text-text-secondary mb-1">No entries yet</p>
              <p className="text-xs text-text-tertiary">Add a note, photo, video, voice note, or link for this anniversary.</p>
            </div>
          )}

          {displayEntries.map((entry) => {
            const unlocked = isEntryUnlocked(entry);
            const entryUnlockDate = getEntryUnlockDate(entry);
            const entryUnlockLabel = entryUnlockDate ? formatVaultUnlockDate(entryUnlockDate) : unlockLabel;

            return (
              <div key={entry.id} className="p-4 bg-surface-subtle rounded-lg border border-border">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    {entry.title && <p className="font-semibold text-text-primary text-sm mb-0.5">{entry.title}</p>}
                    <p className="text-xs text-text-tertiary">From {entry.author_name} · {formatVaultEntryDate(entry.created_at, undefined, 'Unknown date')}</p>
                  </div>
                  <button
                    aria-label={`${confirmDeleteId === entry.id ? 'Confirm delete' : 'Delete'} ${entry.title || entry.attachment_name || 'vault entry'}`}
                    onClick={() => {
                      if (confirmDeleteId === entry.id) {
                        onDeleteEntry(entry.id);
                        setConfirmDeleteId(null);
                      } else {
                        setConfirmDeleteId(entry.id);
                        setTimeout(() => setConfirmDeleteId(null), 3000);
                      }
                    }}
                    className={`flex-shrink-0 p-1.5 rounded-lg border text-xs transition-colors ${confirmDeleteId === entry.id ? 'border-border-subtle text-text-primary bg-surface' : 'border-transparent text-text-tertiary hover:border-border-subtle hover:text-text-primary'}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {!unlocked ? (
                  <div className="p-3 rounded-lg border border-dashed border-border bg-surface text-center">
                    <Lock className="w-4 h-4 text-text-tertiary mx-auto mb-1" />
                    <p className="text-xs text-text-secondary">Entry sealed until {entryUnlockLabel}</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-text-secondary whitespace-pre-wrap">{entry.content}</p>
                    {(entry.attachment_url || entry.external_file_id || entry.external_file_url) && (() => {
                      const attachmentUrl = getSafePublicWebUrl(resolvedEntryLinks[entry.id]) || null;
                      if (!attachmentUrl) {
                        return (
                          <div className="mt-2">
                            <button onClick={async () => { await resolveEntryLink(entry); }} className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline" disabled={resolvingEntryId === entry.id}>
                              {resolvingEntryId === entry.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
                              {resolvingEntryId === entry.id ? 'Resolving link…' : (entry.attachment_name || 'Open attachment')}
                            </button>
                          </div>
                        );
                      }
                      const kind = inferAttachmentKind(attachmentUrl, entry.attachment_name, entry.media_type);
                      return (
                        <div className="mt-2 space-y-2">
                          {kind === 'image' && <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="block"><img src={attachmentUrl} alt={entry.attachment_name || 'Vault image'} className="max-h-52 rounded-lg border border-border" loading="lazy" /></a>}
                          {kind === 'video' && <video controls preload="metadata" className="w-full max-h-56 rounded-lg border border-border bg-black/80"><source src={attachmentUrl} /></video>}
                          {kind === 'audio' && <audio controls preload="metadata" className="w-full"><source src={attachmentUrl} /></audio>}
                          <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                            <Paperclip className="w-3 h-3" />
                            {entry.attachment_name || 'View attachment'}
                          </a>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            );
          })}

          {displayEntries.length > 0 && displayEntries.every((entry) => !isEntryUnlocked(entry)) && (
            <div className="p-4 bg-surface-subtle rounded-lg border border-dashed border-border text-center space-y-1">
              <Lock className="w-5 h-5 text-text-tertiary mx-auto mb-1" />
              <p className="text-sm font-medium text-text-secondary">{displayEntries.length} {displayEntries.length === 1 ? 'entry' : 'entries'} sealed</p>
              <p className="text-xs text-text-tertiary">{config.is_enabled ? `These messages are locked until ${unlockLabel}.` : 'Enable this vault to add or read entries.'}</p>
            </div>
          )}

          {showForm && config.is_enabled && (
            <EntryForm vaultConfigId={config.id} durationYears={config.duration_years} onSave={onSaveEntry} onCancel={onCancelForm} safeVaultDashboardError={safeVaultDashboardError} />
          )}

          {!showForm && config.is_enabled && (
            <button onClick={() => onAddEntry(config.id)} className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-text-secondary border border-dashed border-border rounded-lg hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors">
              <Plus className="w-4 h-4" />
              Add entry to {config.label || `Vault ${config.vault_index}`}
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
