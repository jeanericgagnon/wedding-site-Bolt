import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, Button } from '../../components/ui';
import {
  Lock, Unlock, Plus, Trash2, ChevronDown, ChevronUp, Loader2,
  AlertCircle, Paperclip, Link2, Check, Settings2, ToggleLeft,
  ToggleRight, GripVertical, X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

const MAX_VAULTS = 5;
const DEMO_VAULT_STORAGE_KEY = 'dayof_demo_vault_state_v1';
const VAULT_RELEASE_NOTICE_KEY = 'dayof_vault_release_notified_v1';
const DEMO_WEDDING_DATE = '2026-02-23';

interface VaultConfig {
  id: string;
  vault_index: number;
  label: string;
  duration_years: number;
  is_enabled: boolean;
}

interface VaultEntry {
  id: string;
  vault_config_id: string | null;
  vault_year: number;
  title: string;
  content: string;
  author_name: string;
  attachment_url: string | null;
  attachment_name: string | null;
  media_type?: 'text' | 'photo' | 'video' | 'voice' | null;
  storage_provider?: 'supabase' | 'google_drive' | null;
  external_file_id?: string | null;
  external_file_url?: string | null;
  unlock_at?: string | null;
  created_at: string;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
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

const DURATION_OPTIONS = [
  { value: 1, label: '1 year (1st anniversary)' },
  { value: 2, label: '2 years (2nd anniversary)' },
  { value: 3, label: '3 years (3rd anniversary)' },
  { value: 5, label: '5 years (5th anniversary)' },
  { value: 10, label: '10 years (10th anniversary)' },
  { value: 15, label: '15 years (15th anniversary)' },
  { value: 20, label: '20 years (20th anniversary)' },
  { value: 25, label: '25 years (25th anniversary)' },
  { value: 50, label: '50 years (50th anniversary)' },
];

const ToastList: React.FC<{ toasts: Toast[] }> = ({ toasts }) => (
  <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[80] space-y-2 pointer-events-none w-[min(92vw,680px)]">
    {toasts.map(t => (
      <div
        key={t.id}
        className={`px-4 py-3.5 rounded-xl shadow-xl text-sm sm:text-[15px] font-semibold border ${
          t.type === 'error'
            ? 'bg-error-light text-error border-error/30'
            : 'bg-success-light text-success border-success/30'
        }`}
      >
        {t.message}
      </div>
    ))}
  </div>
);

interface EntryFormProps {
  vaultConfigId: string;
  durationYears: number;
  onSave: (entry: { vault_config_id: string; vault_year: number; title: string; content: string; author_name: string; attachment_url: string | null; attachment_name: string | null }) => Promise<void>;
  onCancel: () => void;
}

const EntryForm: React.FC<EntryFormProps> = ({ vaultConfigId, durationYears, onSave, onCancel }) => {
  const [title, setTitle] = useState('');
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
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5 bg-surface-subtle rounded-xl border border-border mt-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-primary mb-1">Title (optional)</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. A message to remember"
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-primary mb-1">From</label>
          <input
            type="text"
            value={authorName}
            onChange={e => setAuthorName(e.target.value)}
            placeholder="Your name"
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-text-primary mb-1">
          Message <span className="text-error">*</span>
        </label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          required
          rows={5}
          placeholder="Write something to your future self or your partner…"
          className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
        <p className="text-xs text-text-tertiary mt-1">{content.length} characters</p>
      </div>

      <div>
        <div className="flex items-center gap-1 mb-1">
          <Paperclip className="w-3.5 h-3.5 text-text-primary" />
          <label className="text-xs font-medium text-text-primary">Attachment URL (optional)</label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="url"
            value={attachmentUrl}
            onChange={e => setAttachmentUrl(e.target.value)}
            placeholder="https://…"
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="text"
            value={attachmentName}
            onChange={e => setAttachmentName(e.target.value)}
            placeholder="Label (e.g. Our first photo)"
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-error-light rounded-lg text-sm text-error border border-error/20">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" variant="primary" size="sm" disabled={saving || !content.trim()}>
          {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />Saving…</> : 'Save to Vault'}
        </Button>
      </div>
    </form>
  );
};

interface VaultCardProps {
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
}

const VaultCard: React.FC<VaultCardProps> = ({
  config, entries, weddingDate, siteSlug, showForm,
  onAddEntry, onDeleteEntry, onSaveEntry, onCancelForm, onToggleEnabled, onEdit
}) => {
  const [expanded, setExpanded] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [resolvedEntryLinks, setResolvedEntryLinks] = useState<Record<string, string>>({});
  const [resolvingEntryId, setResolvingEntryId] = useState<string | null>(null);

  const unlockDate = weddingDate
    ? new Date(new Date(weddingDate).setFullYear(weddingDate.getFullYear() + config.duration_years))
    : null;
  const isUnlocked = unlockDate ? new Date() >= unlockDate : false;

  const unlockLabel = unlockDate
    ? unlockDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Set your wedding date to calculate unlock date';

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
    const d = getEntryUnlockDate(entry);
    return d ? d.getTime() <= nowMs : false;
  };

  async function resolveEntryLink(entry: VaultEntry): Promise<string | null> {
    if (entry.storage_provider !== 'google_drive') return entry.attachment_url ?? null;
    if (resolvedEntryLinks[entry.id]) return resolvedEntryLinks[entry.id];

    setResolvingEntryId(entry.id);
    try {
      const { data, error } = await supabase.functions.invoke('vault-resolve-entry-link', {
        body: { entryId: entry.id },
      });
      if (error) throw error;
      const url = (data as { url?: string | null } | null)?.url ?? null;
      if (url) setResolvedEntryLinks((prev) => ({ ...prev, [entry.id]: url }));
      return url;
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not resolve attachment link.');
      return null;
    } finally {
      setResolvingEntryId(null);
    }
  }

  function handleCopyLink() {
    if (!siteSlug) return;

    const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const vaultPath = `/vault/${siteSlug}`;
    const isGitHubPages = window.location.hostname.includes('github.io');

    const url = isGitHubPages
      ? `${window.location.origin}${basePath || ''}/?oc_redirect=${encodeURIComponent(vaultPath)}`
      : `${window.location.origin}${basePath}${vaultPath}`;

    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      window.prompt('Copy this vault link:', url);
    });
  }

  async function handleToggle() {
    setToggling(true);
    try {
      await onToggleEnabled(config.id, !config.is_enabled);
    } finally {
      setToggling(false);
    }
  }

  return (
    <Card variant="bordered" padding="lg" className={`transition-all shadow-sm hover:shadow-md border border-border-subtle ${!config.is_enabled ? 'opacity-60' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-1">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-2.5 rounded-xl flex-shrink-0 ${isUnlocked && config.is_enabled ? 'bg-success-light' : 'bg-surface-subtle'}`}>
            {isUnlocked && config.is_enabled
              ? <Unlock className="w-5 h-5 text-success" />
              : <Lock className="w-5 h-5 text-text-tertiary" />
            }
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-text-primary truncate">{config.label || `Vault ${config.vault_index}`}</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex-shrink-0">{config.duration_years}yr</span>
              {!config.is_enabled && (
                <span className="text-xs bg-surface-subtle text-text-tertiary px-2 py-0.5 rounded-full border border-border flex-shrink-0">Disabled</span>
              )}
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              {config.is_enabled
                ? isUnlocked
                  ? 'Unlocked — you can read and add entries'
                  : `Locked until ${unlockLabel} (${config.duration_years}yr)`
                : 'This vault is disabled and hidden from guests'
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap self-start sm:self-auto">
          <span className="text-xs text-text-tertiary px-2 py-1 rounded-md bg-surface-subtle border border-border">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>

          {siteSlug && config.is_enabled && (
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all shadow-sm ${
                copied
                  ? 'border-success/40 bg-success-light text-success'
                  : 'border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary hover:bg-primary/5'
              }`}
              title="Copy shareable hub link (all enabled vaults)"
            >
              {copied ? <Check className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Share'}
            </button>
          )}

          <button
            onClick={() => onEdit(config)}
            className="p-1.5 rounded-lg hover:bg-surface-subtle text-text-tertiary hover:text-text-primary transition-colors"
            title="Edit vault settings"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleToggle}
            disabled={toggling}
            className="p-1.5 rounded-lg hover:bg-surface-subtle transition-colors"
            title={config.is_enabled ? 'Disable vault' : 'Enable vault'}
          >
            {toggling
              ? <Loader2 className="w-4 h-4 animate-spin text-text-tertiary" />
              : config.is_enabled
                ? <ToggleRight className="w-5 h-5 text-primary" />
                : <ToggleLeft className="w-5 h-5 text-text-tertiary" />
            }
          </button>

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-surface-subtle text-text-tertiary transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3">
          {entries.length === 0 && !showForm && (
            <div className="text-center py-6 border border-dashed border-border rounded-xl">
              <p className="text-sm text-text-secondary mb-1">No entries yet</p>
              <p className="text-xs text-text-tertiary">Add text, photo, video, voice note, or link for this anniversary.</p>
            </div>
          )}

          {entries.map(entry => {
            const unlocked = isEntryUnlocked(entry);
            const entryUnlockDate = getEntryUnlockDate(entry);
            const entryUnlockLabel = entryUnlockDate
              ? entryUnlockDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
              : unlockLabel;

            return (
              <div key={entry.id} className="p-4 bg-surface-subtle rounded-xl border border-border">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    {entry.title && <p className="font-semibold text-text-primary text-sm mb-0.5">{entry.title}</p>}
                    <p className="text-xs text-text-tertiary">
                      From {entry.author_name} · {new Date(entry.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirmDeleteId === entry.id) {
                        onDeleteEntry(entry.id);
                        setConfirmDeleteId(null);
                      } else {
                        setConfirmDeleteId(entry.id);
                        setTimeout(() => setConfirmDeleteId(null), 3000);
                      }
                    }}
                    className={`flex-shrink-0 p-1.5 rounded-lg border text-xs transition-colors ${
                      confirmDeleteId === entry.id
                        ? 'border-error text-error bg-error-light'
                        : 'border-transparent text-text-tertiary hover:border-error/40 hover:text-error'
                    }`}
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
                      const attachmentUrl = resolvedEntryLinks[entry.id] || entry.external_file_url || entry.attachment_url;
                      if (!attachmentUrl) {
                        return (
                          <div className="mt-2">
                            <button
                              onClick={async () => { await resolveEntryLink(entry); }}
                              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                              disabled={resolvingEntryId === entry.id}
                            >
                              {resolvingEntryId === entry.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
                              {resolvingEntryId === entry.id ? 'Resolving link…' : (entry.attachment_name || 'Open attachment')}
                            </button>
                          </div>
                        );
                      }

                      const kind = inferAttachmentKind(attachmentUrl, entry.attachment_name, entry.media_type);
                      return (
                        <div className="mt-2 space-y-2">
                          {kind === 'image' && (
                            <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="block">
                              <img src={attachmentUrl} alt={entry.attachment_name || 'Vault image'} className="max-h-52 rounded-lg border border-border" loading="lazy" />
                            </a>
                          )}
                          {kind === 'video' && (
                            <video controls preload="metadata" className="w-full max-h-56 rounded-lg border border-border bg-black/80">
                              <source src={attachmentUrl} />
                            </video>
                          )}
                          {kind === 'audio' && (
                            <audio controls preload="metadata" className="w-full">
                              <source src={attachmentUrl} />
                            </audio>
                          )}
                          <a
                            href={attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                          >
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

          {entries.length > 0 && entries.every((entry) => !isEntryUnlocked(entry)) && (
            <div className="p-4 bg-surface-subtle rounded-xl border border-dashed border-border text-center space-y-1">
              <Lock className="w-5 h-5 text-text-tertiary mx-auto mb-1" />
              <p className="text-sm font-medium text-text-secondary">
                {entries.length} {entries.length === 1 ? 'entry' : 'entries'} sealed
              </p>
              <p className="text-xs text-text-tertiary">
                {config.is_enabled
                  ? `These messages are locked until ${unlockLabel}.`
                  : 'Enable this vault to add or read entries.'}
              </p>
            </div>
          )}

          {showForm && config.is_enabled && (
            <EntryForm
              vaultConfigId={config.id}
              durationYears={config.duration_years}
              onSave={onSaveEntry}
              onCancel={onCancelForm}
            />
          )}

          {!showForm && config.is_enabled && (
            <button
              onClick={() => onAddEntry(config.id)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-text-secondary border border-dashed border-border rounded-xl hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add entry to {config.label || `Vault ${config.vault_index}`}
            </button>
          )}
        </div>
      )}
    </Card>
  );
};

interface EditVaultModalProps {
  config: VaultConfig;
  hasEntries: boolean;
  onSave: (id: string, label: string, durationYears: number) => Promise<void>;
  onClose: () => void;
}

const EditVaultModal: React.FC<EditVaultModalProps> = ({ config, hasEntries, onSave, onClose }) => {
  const [label, setLabel] = useState(config.label);
  const [durationYears, setDurationYears] = useState(config.duration_years);
  const [labelManuallyEdited, setLabelManuallyEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    setSaving(true);
    try {
      await onSave(config.id, label, durationYears);
      onClose();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not save vault changes.');
    } finally {
      setSaving(false);
    }
  }

  const isCustom = !DURATION_OPTIONS.find(o => o.value === durationYears);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-surface rounded-2xl shadow-2xl max-w-md w-full p-6 border border-border">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-text-primary">Edit Vault Settings</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-subtle text-text-secondary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {localError && (
              <div className="p-3 rounded-xl border border-error/30 bg-error-light text-error text-sm font-semibold">
                {localError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Vault Name</label>
              <input
                type="text"
                value={label}
                onChange={e => { setLabel(e.target.value); setLabelManuallyEdited(true); }}
                placeholder="e.g. 1st Anniversary"
                maxLength={60}
                className="w-full px-3 py-2.5 text-sm bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Opens After</label>
              <select
                value={isCustom ? 'custom' : String(durationYears)}
                disabled={hasEntries}
                onChange={e => {
                  if (e.target.value !== 'custom') {
                    const newYears = Number(e.target.value);
                    setDurationYears(newYears);
                    if (!labelManuallyEdited) {
                      setLabel(defaultVaultLabel(config.vault_index, newYears));
                    }
                  } else {
                    setDurationYears(durationYears);
                  }
                }}
                className="w-full px-3 py-2.5 text-sm bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {DURATION_OPTIONS.map(o => (
                  <option key={o.value} value={String(o.value)}>{o.label}</option>
                ))}
                <option value="custom">Custom…</option>
              </select>
              {isCustom && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={durationYears}
                    disabled={hasEntries}
                    onChange={e => setDurationYears(Math.max(1, Math.min(100, Number(e.target.value))))}
                    className="w-24 px-3 py-2 text-sm bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-text-secondary">years after wedding date</span>
                </div>
              )}
              <p className="text-xs text-text-tertiary mt-1.5">
                {hasEntries
                  ? 'This vault already has submissions, so its anniversary year is locked.'
                  : 'Guests can contribute at any time, but content stays sealed until this date.'}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" fullWidth onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" fullWidth disabled={saving}>
                {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />Saving…</> : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

function defaultVaultLabel(index: number, years: number): string {
  const ordinals: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 5: '5th', 10: '10th', 15: '15th', 20: '20th', 25: '25th', 50: '50th' };
  const ordinal = ordinals[years] ?? `${years}th`;
  return `${ordinal} Anniversary Vault`;
}

function nextAvailableYears(existingYears: number[]): number {
  const options = [1, 2, 3, 5, 10, 15, 20, 25, 50];
  return options.find(y => !existingYears.includes(y)) ?? (Math.max(...existingYears, 0) + 5);
}

export const DashboardVault: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const [weddingSiteId, setWeddingSiteId] = useState<string | null>(null);
  const [weddingDate, setWeddingDate] = useState<Date | null>(null);
  const [siteSlug, setSiteSlug] = useState<string | null>(null);
  const [vaultConfigs, setVaultConfigs] = useState<VaultConfig[]>([]);
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFormConfigId, setActiveFormConfigId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<VaultConfig | null>(null);
  const [addingVault, setAddingVault] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [vaultStorageProvider, setVaultStorageProvider] = useState<'supabase' | 'google_drive'>('supabase');
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false);
  const [connectingDrive, setConnectingDrive] = useState(false);

  function toast(message: string, type: Toast['type'] = 'success') {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }

  async function handleStorageProviderChange(next: 'supabase' | 'google_drive') {
    if (!weddingSiteId) return;

    if (next === 'google_drive' && !googleDriveConnected) {
      toast('Connect Google Drive first, then switch storage provider.', 'error');
      return;
    }

    if (isDemoMode && weddingSiteId === 'demo-site-id') {
      setVaultStorageProvider(next);
      toast('Demo: storage provider updated locally.');
      return;
    }

    const { error } = await supabase
      .from('wedding_sites')
      .update({ vault_storage_provider: next })
      .eq('id', weddingSiteId);

    if (error) {
      toast('Failed to update vault storage provider.', 'error');
      return;
    }

    setVaultStorageProvider(next);
    toast(`Vault storage set to ${next === 'google_drive' ? 'Google Drive' : 'Supabase Storage'}.`);
  }


  async function handleConnectGoogleDrive() {
    if (!weddingSiteId) return;

    if (isDemoMode && weddingSiteId === 'demo-site-id') {
      setGoogleDriveConnected(true);
      setVaultStorageProvider('google_drive');
      toast('Demo: simulated Google Drive connection.');
      return;
    }

    setConnectingDrive(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-drive-auth-start', {
        body: { siteId: weddingSiteId },
      });

      if (error) throw error;
      const authUrl = (data as { authUrl?: string } | null)?.authUrl;
      if (!authUrl) throw new Error('Missing Google OAuth URL.');
      window.location.href = authUrl;
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to start Google Drive connection.', 'error');
    } finally {
      setConnectingDrive(false);
    }
  }


  function createSeedDemoState(): { vaultConfigs: VaultConfig[]; entries: VaultEntry[] } {
    const now = Date.now();
    const vaultConfigs: VaultConfig[] = [
      { id: 'demo-vault-1', vault_index: 1, label: '1-Year Anniversary Vault', duration_years: 1, is_enabled: true },
      { id: 'demo-vault-5', vault_index: 2, label: '5-Year Anniversary Vault', duration_years: 5, is_enabled: true },
      { id: 'demo-vault-10', vault_index: 3, label: '10-Year Anniversary Vault', duration_years: 10, is_enabled: true },
    ];

    const entries: VaultEntry[] = [
      {
        id: `demo-entry-${now}-1`,
        vault_config_id: 'demo-vault-1',
        vault_year: 1,
        title: 'A first-year note',
        content: 'Congrats on your first year! Keep choosing each other every day.',
        author_name: 'The Johnsons',
        attachment_url: null,
        attachment_name: null,
        media_type: 'text',
        created_at: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(),
      },
      {
        id: `demo-entry-${now}-2`,
        vault_config_id: 'demo-vault-5',
        vault_year: 5,
        title: 'For year five',
        content: 'Five years in, may your adventures be even bigger than your plans today.',
        author_name: 'College Crew',
        attachment_url: null,
        attachment_name: null,
        media_type: 'text',
        created_at: new Date(now - 1000 * 60 * 60 * 20).toISOString(),
      },
      {
        id: `demo-entry-${now}-3`,
        vault_config_id: 'demo-vault-10',
        vault_year: 10,
        title: 'A decade from now',
        content: 'When you open this, we hope you are still laughing at the same inside jokes.',
        author_name: 'Future You',
        attachment_url: null,
        attachment_name: null,
        media_type: 'text',
        created_at: new Date(now - 1000 * 60 * 45).toISOString(),
      },
    ];

    return { vaultConfigs, entries };
  }

  function loadDemoState(): { vaultConfigs: VaultConfig[]; entries: VaultEntry[] } {
    try {
      const raw = localStorage.getItem(DEMO_VAULT_STORAGE_KEY);
      if (!raw) {
        const seeded = createSeedDemoState();
        saveDemoState(seeded.vaultConfigs, seeded.entries);
        return seeded;
      }
      const parsed = JSON.parse(raw) as { vaultConfigs?: VaultConfig[]; entries?: VaultEntry[] };
      const vaultConfigs = parsed.vaultConfigs ?? [];
      const entries = parsed.entries ?? [];

      if (vaultConfigs.length === 0) {
        const seeded = createSeedDemoState();
        saveDemoState(seeded.vaultConfigs, seeded.entries);
        return seeded;
      }

      return { vaultConfigs, entries };
    } catch {
      const seeded = createSeedDemoState();
      saveDemoState(seeded.vaultConfigs, seeded.entries);
      return seeded;
    }
  }

  function saveDemoState(nextConfigs: VaultConfig[], nextEntries: VaultEntry[]) {
    localStorage.setItem(DEMO_VAULT_STORAGE_KEY, JSON.stringify({ vaultConfigs: nextConfigs, entries: nextEntries }));
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (isDemoMode) {
        setSiteSlug('alex-jordan-demo');

        const { data: demoSite } = await supabase
          .from('wedding_sites')
          .select('id, wedding_date, site_slug, vault_storage_provider, vault_google_drive_connected')
          .eq('site_slug', 'alex-jordan-demo')
          .maybeSingle();

        if (demoSite) {
          setWeddingSiteId(demoSite.id);
          setVaultStorageProvider(((demoSite as { vault_storage_provider?: 'supabase' | 'google_drive' }).vault_storage_provider) ?? 'supabase');
          setGoogleDriveConnected(!!(demoSite as { vault_google_drive_connected?: boolean }).vault_google_drive_connected);
if (demoSite.wedding_date) setWeddingDate(new Date(demoSite.wedding_date));
          else setWeddingDate(new Date(DEMO_WEDDING_DATE));

          const { data: configData } = await supabase
            .from('vault_configs')
            .select('*')
            .eq('wedding_site_id', demoSite.id)
            .order('duration_years', { ascending: true });

          const configs = (configData ?? []) as VaultConfig[];
          setVaultConfigs(configs);

          if (configs.length > 0) {
            const configIds = configs.map(c => c.id);
            const { data: entryData } = await supabase
              .from('vault_entries')
              .select('*')
              .in('vault_config_id', configIds)
              .order('created_at', { ascending: true });
            setEntries((entryData ?? []) as VaultEntry[]);
          } else {
            setEntries([]);
          }
          return;
        }

setWeddingSiteId('demo-site-id');
        setVaultStorageProvider('supabase');
        setGoogleDriveConnected(false);
        setWeddingDate(new Date(DEMO_WEDDING_DATE));
        const demoState = loadDemoState();
        setVaultConfigs(demoState.vaultConfigs);
        setEntries(demoState.entries);
        return;
      }

      if (!user) return;
      const { data: site } = await supabase
        .from('wedding_sites')
        .select('id, wedding_date, site_slug, vault_storage_provider, vault_google_drive_connected')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!site) return;
      setWeddingSiteId(site.id);
      setVaultStorageProvider(((site as { vault_storage_provider?: 'supabase' | 'google_drive' }).vault_storage_provider) ?? 'supabase');
      setGoogleDriveConnected(!!(site as { vault_google_drive_connected?: boolean }).vault_google_drive_connected);
      if (site.wedding_date) setWeddingDate(new Date(site.wedding_date));
      if (site.site_slug) setSiteSlug(site.site_slug as string);

      const { data: configData } = await supabase
        .from('vault_configs')
        .select('*')
        .eq('wedding_site_id', site.id)
        .order('duration_years', { ascending: true });

      const configs = (configData ?? []) as VaultConfig[];
      setVaultConfigs(configs);

      if (configs.length > 0) {
        const configIds = configs.map(c => c.id);
        const { data: entryData, error } = await supabase
          .from('vault_entries')
          .select('*')
          .in('vault_config_id', configIds)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setEntries((entryData ?? []) as VaultEntry[]);
      }
    } catch {
      toast('Failed to load vault data', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, isDemoMode]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleCode = params.get('google_drive_code') || params.get('code');
    const googleState = params.get('state');
    if (!googleCode || !googleState) return;

    supabase.functions.invoke('google-drive-auth-callback', {
      body: { code: googleCode, state: googleState },
    }).then(({ error }) => {
      if (error) {
        toast('Google Drive connection failed. Please try again.', 'error');
        return;
      }
      toast('Google Drive connected successfully.');
      setGoogleDriveConnected(true);
      setVaultStorageProvider('google_drive');
      const url = new URL(window.location.href);
      url.searchParams.delete('google_drive_code');
      url.searchParams.delete('code');
      url.searchParams.delete('state');
      window.history.replaceState({}, '', url.toString());
      loadData();
    });
  }, [loadData]);

  useEffect(() => {
    if (!weddingDate || vaultConfigs.length === 0) return;

    const notified = (() => {
      try {
        const raw = localStorage.getItem(VAULT_RELEASE_NOTICE_KEY);
        return raw ? JSON.parse(raw) as string[] : [];
      } catch {
        return [] as string[];
      }
    })();

    const newlyUnlocked = vaultConfigs.filter((cfg) => {
      const unlockDate = new Date(weddingDate);
      unlockDate.setFullYear(unlockDate.getFullYear() + cfg.duration_years);
      const key = `${cfg.id}:${unlockDate.toISOString().slice(0, 10)}`;
      return cfg.is_enabled && new Date() >= unlockDate && !notified.includes(key);
    });

    if (newlyUnlocked.length === 0) return;

    newlyUnlocked.forEach((cfg) => {
      toast(`Vault unlocked: ${cfg.label || `${cfg.duration_years}-Year Anniversary Vault`} ✨`);
    });

    const next = [...notified, ...newlyUnlocked.map((cfg) => {
      const unlockDate = new Date(weddingDate);
      unlockDate.setFullYear(unlockDate.getFullYear() + cfg.duration_years);
      return `${cfg.id}:${unlockDate.toISOString().slice(0, 10)}`;
    })];

    localStorage.setItem(VAULT_RELEASE_NOTICE_KEY, JSON.stringify(Array.from(new Set(next))));
  }, [vaultConfigs, weddingDate]);

  async function handleAddVault() {
    if (!weddingSiteId || vaultConfigs.length >= MAX_VAULTS || addingVault) return;
    setAddingVault(true);
    try {
      if (isDemoMode) {
        const usedIndexes = vaultConfigs.map(c => c.vault_index);
        const nextIndex = [1, 2, 3, 4, 5].find(i => !usedIndexes.includes(i)) ?? (vaultConfigs.length + 1);
        const existingYears = vaultConfigs.map(c => c.duration_years);
        const years = nextAvailableYears(existingYears);
        const demoConfig: VaultConfig = {
          id: `demo-vault-${Date.now()}`,
          vault_index: nextIndex,
          label: defaultVaultLabel(nextIndex, years),
          duration_years: years,
          is_enabled: true,
        };
        const nextConfigs = [...vaultConfigs, demoConfig];
        setVaultConfigs(nextConfigs);
        saveDemoState(nextConfigs, entries);
        toast('Vault added');
        return;
      }
      const usedIndexes = vaultConfigs.map(c => c.vault_index);
      const nextIndex = [1, 2, 3, 4, 5].find(i => !usedIndexes.includes(i)) ?? (vaultConfigs.length + 1);
      const existingYears = vaultConfigs.map(c => c.duration_years);
      const years = nextAvailableYears(existingYears);
      const label = defaultVaultLabel(nextIndex, years);

      const { data, error } = await supabase
        .from('vault_configs')
        .insert({
          wedding_site_id: weddingSiteId,
          vault_index: nextIndex,
          label,
          duration_years: years,
          is_enabled: true,
        })
        .select()
        .single();

      if (error) throw error;
      setVaultConfigs(prev => [...prev, data as VaultConfig].sort((a, b) => a.duration_years - b.duration_years));
      toast('Vault added');
    } catch {
      toast('Failed to add vault', 'error');
    } finally {
      setAddingVault(false);
    }
  }


  async function handleSeedStarterVaults() {
    if (isDemoMode && weddingSiteId === 'demo-site-id') {
      handleSeedDemoVaults();
      return;
    }
    if (!weddingSiteId || addingVault) return;

    setAddingVault(true);
    try {
      const starter = [
        { vault_index: 1, label: '1-Year Anniversary Vault', duration_years: 1 },
        { vault_index: 2, label: '5-Year Anniversary Vault', duration_years: 5 },
        { vault_index: 3, label: '10-Year Anniversary Vault', duration_years: 10 },
      ];

      const { data, error } = await supabase
        .from('vault_configs')
        .upsert(
          starter.map((v) => ({ ...v, wedding_site_id: weddingSiteId, is_enabled: true })),
          { onConflict: 'wedding_site_id,vault_index' }
        )
        .select('*');

      if (error) throw error;
      setVaultConfigs((data ?? []) as VaultConfig[]);
      toast('Starter vault set loaded (1/5/10)');
      await loadData();
    } catch {
      toast('Failed to load starter vault set', 'error');
    } finally {
      setAddingVault(false);
    }
  }

  function handleSeedDemoVaults() {
    if (!isDemoMode) return;
    const seeded = createSeedDemoState();
    setVaultConfigs(seeded.vaultConfigs);
    setEntries(seeded.entries);
    saveDemoState(seeded.vaultConfigs, seeded.entries);
    toast('Demo vault set loaded (1/5/10)');
  }

  async function handleToggleEnabled(configId: string, enabled: boolean) {
    if (isDemoMode && weddingSiteId === 'demo-site-id') {
      const nextConfigs = vaultConfigs.map(c => c.id === configId ? { ...c, is_enabled: enabled } : c);
      setVaultConfigs(nextConfigs);
      saveDemoState(nextConfigs, entries);
      toast(enabled ? 'Vault enabled' : 'Vault disabled');
      return;
    }
    const { error } = await supabase
      .from('vault_configs')
      .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
      .eq('id', configId);

    if (error) { toast('Failed to update vault', 'error'); return; }
    setVaultConfigs(prev => prev.map(c => c.id === configId ? { ...c, is_enabled: enabled } : c));
    toast(enabled ? 'Vault enabled' : 'Vault disabled');
  }

  async function handleEditSave(id: string, label: string, durationYears: number) {
    const current = vaultConfigs.find(c => c.id === id);
    const hasEntriesForVault = entries.some(e => e.vault_config_id === id);
    if (hasEntriesForVault && current && current.duration_years !== durationYears) {
      toast('This vault already has submissions, so you cannot change its anniversary year.', 'error');
      throw new Error('Anniversary year is locked after submissions start.');
    }

    const hasDuplicateYear = vaultConfigs.some(c => c.id !== id && c.duration_years === durationYears);
    if (hasDuplicateYear) {
      toast(`You already have a ${durationYears}-year vault. Choose a different anniversary.`, 'error');
      throw new Error(`You already have a ${durationYears}-year vault.`);
    }

    if (isDemoMode && weddingSiteId === 'demo-site-id') {
      const nextConfigs = vaultConfigs
        .map(c => c.id === id ? { ...c, label, duration_years: durationYears } : c)
        .sort((a, b) => a.duration_years - b.duration_years);
      setVaultConfigs(nextConfigs);
      saveDemoState(nextConfigs, entries);
      toast('Vault updated');
      return;
    }

    const { error } = await supabase
      .from('vault_configs')
      .update({ label, duration_years: durationYears, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      if (error.message?.toLowerCase().includes('duplicate') || error.message?.toLowerCase().includes('unique')) {
        toast(`You already have a ${durationYears}-year vault.`, 'error');
      }
      throw new Error(error.message);
    }

    setVaultConfigs(prev => prev
      .map(c => c.id === id ? { ...c, label, duration_years: durationYears } : c)
      .sort((a, b) => a.duration_years - b.duration_years));
    toast('Vault updated');
  }

  async function handleSaveEntry(entry: { vault_config_id: string; vault_year: number; title: string; content: string; author_name: string; attachment_url: string | null; attachment_name: string | null }) {
    if (!weddingSiteId) throw new Error('No wedding site found');

    if (isDemoMode && weddingSiteId === 'demo-site-id') {
      const demoEntry: VaultEntry = {
        id: `demo-entry-${Date.now()}`,
        vault_config_id: entry.vault_config_id,
        vault_year: entry.vault_year,
        title: entry.title,
        content: entry.content,
        author_name: entry.author_name,
        attachment_url: entry.attachment_url,
        attachment_name: entry.attachment_name,
        media_type: entry.attachment_url ? 'photo' : 'text',
        created_at: new Date().toISOString(),
      };
      const nextEntries = [...entries, demoEntry];
      setEntries(nextEntries);
      setActiveFormConfigId(null);
      saveDemoState(vaultConfigs, nextEntries);
      toast('Entry added to vault');
      return;
    }

    const { data, error } = await supabase
      .from('vault_entries')
      .insert({ ...entry, wedding_site_id: weddingSiteId })
      .select()
      .single();

    if (error) throw new Error(error.message);
    setEntries(prev => [...prev, data as VaultEntry]);
    setActiveFormConfigId(null);
    toast('Entry added to vault');
  }

  async function handleDeleteEntry(id: string) {
    if (isDemoMode && weddingSiteId === 'demo-site-id') {
      const nextEntries = entries.filter(e => e.id !== id);
      setEntries(nextEntries);
      saveDemoState(vaultConfigs, nextEntries);
      toast('Entry removed');
      return;
    }
    const { error } = await supabase.from('vault_entries').delete().eq('id', id);
    if (error) { toast('Failed to delete entry', 'error'); return; }
    setEntries(prev => prev.filter(e => e.id !== id));
    toast('Entry removed');
  }

  async function handleDeleteVault(configId: string) {
    if (isDemoMode && weddingSiteId === 'demo-site-id') {
      const remaining = vaultConfigs.filter(c => c.id !== configId).map((c, i) => ({ ...c, vault_index: i + 1 }));
      const nextEntries = entries.filter(e => e.vault_config_id !== configId);
      setVaultConfigs(remaining);
      setEntries(nextEntries);
      saveDemoState(remaining, nextEntries);
      toast('Vault removed');
      return;
    }
    const { error } = await supabase.from('vault_configs').delete().eq('id', configId);
    if (error) { toast('Failed to delete vault', 'error'); return; }
    setVaultConfigs(prev => {
      const remaining = prev.filter(c => c.id !== configId);
      return remaining.map((c, i) => ({ ...c, vault_index: i + 1 }));
    });
    setEntries(prev => prev.filter(e => e.vault_config_id !== configId));
    toast('Vault removed');
  }

  if (loading) {
    return (
      <DashboardLayout currentPage="vault">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const totalEntries = entries.length;
  const orderedVaultConfigs = [...vaultConfigs].sort((a, b) => a.duration_years - b.duration_years);

  return (
    <DashboardLayout currentPage="vault">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="rounded-2xl border border-primary/15 bg-[linear-gradient(135deg,rgba(59,130,246,0.07),rgba(255,255,255,0.95))] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-primary/80 font-semibold mb-2">Time Capsule</p>
              <h1 className="text-3xl font-bold text-text-primary mb-2">Anniversary Vaults</h1>
              <p className="text-text-secondary">
                Time capsule messages sealed until each anniversary milestone. Up to {MAX_VAULTS} vaults supported.
              </p>
            </div>
            <div className="flex items-center gap-3">
            {totalEntries > 0 && (
              <div className="text-right">
                <p className="text-2xl font-bold text-text-primary leading-none">{totalEntries}</p>
                <p className="text-xs text-text-secondary mt-1">total {totalEntries === 1 ? 'entry' : 'entries'}</p>
              </div>
            )}
            {vaultConfigs.length < MAX_VAULTS && (
              <Button
                variant="primary"
                size="md"
                onClick={handleAddVault}
                disabled={addingVault}
              >
                {addingVault ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
                Add Vault
              </Button>
            )}
          </div>
        </div>
      </div>

        <Card variant="bordered" padding="md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-text-primary">Vault Storage Provider</p>
              <p className="text-xs text-text-secondary mt-1">Use Supabase storage now, or connect Google Drive for external archive flow and time-lock orchestration.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleStorageProviderChange('supabase')}
                className={`px-3 py-2 rounded-lg text-sm border ${vaultStorageProvider === 'supabase' ? 'bg-primary/10 border-primary text-primary' : 'border-border text-text-secondary'}`}
              >
                Supabase
              </button>
              <button
                onClick={() => handleStorageProviderChange('google_drive')}
                disabled={!googleDriveConnected}
                className={`px-3 py-2 rounded-lg text-sm border ${vaultStorageProvider === 'google_drive' ? 'bg-primary/10 border-primary text-primary' : 'border-border text-text-secondary'} disabled:opacity-60`}
                title={!googleDriveConnected ? 'Connect Google Drive first' : undefined}
              >
                Google Drive
              </button>
              <Button variant="outline" size="sm" onClick={handleConnectGoogleDrive} disabled={connectingDrive}>
                {connectingDrive ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                {googleDriveConnected ? 'Reconnect Drive' : 'Connect Drive'}
              </Button>
            </div>
          </div>
        </Card>

        {!weddingDate && (
          <div className="flex items-start gap-3 p-4 bg-warning-light border border-warning/20 rounded-xl text-sm text-warning">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">No wedding date set</p>
              <p className="mt-0.5 text-warning/80">Set your wedding date in Settings. Vault entries stay locked until an unlock date can be calculated.</p>
            </div>
          </div>
        )}

        {vaultConfigs.length === 0 && (
          <Card variant="bordered" padding="lg">
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-surface-subtle rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-text-tertiary" />
              </div>
              <h3 className="font-semibold text-text-primary mb-2">No vaults yet</h3>
              <p className="text-sm text-text-secondary mb-5 max-w-sm mx-auto">
                Create up to {MAX_VAULTS} time capsule vaults, each unlocking on a different anniversary. Share vault links with guests so they can leave messages.
              </p>
              <Button variant="primary" onClick={handleSeedStarterVaults} disabled={addingVault}>
                {addingVault ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
                Load Starter Vault Set (1/5/10)
              </Button>
              <p className="text-[11px] text-text-tertiary mt-2">Creates a ready-to-demo vault set in one tap.</p>
            </div>
          </Card>
        )}

        {vaultConfigs.length > 0 && (
          <div className="space-y-5">
            {orderedVaultConfigs.map(config => (
              <div key={config.id} className="group relative">
                <VaultCard
                  config={config}
                  entries={entries.filter(e => e.vault_config_id === config.id)}
                  weddingDate={weddingDate}
                  siteSlug={siteSlug}
                  showForm={activeFormConfigId === config.id}
                  onAddEntry={id => setActiveFormConfigId(id)}
                  onDeleteEntry={handleDeleteEntry}
                  onSaveEntry={handleSaveEntry}
                  onCancelForm={() => setActiveFormConfigId(null)}
                  onToggleEnabled={handleToggleEnabled}
                  onEdit={c => setEditingConfig(c)}
                />
                <button
                  onClick={() => handleDeleteVault(config.id)}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-error text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-error/80"
                  title="Remove this vault"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {vaultConfigs.length > 0 && vaultConfigs.length < MAX_VAULTS && (
          <button
            onClick={handleAddVault}
            disabled={addingVault}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-text-secondary border-2 border-dashed border-border rounded-xl hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
          >
            {addingVault ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add another vault ({vaultConfigs.length}/{MAX_VAULTS} used)
          </button>
        )}

        {vaultConfigs.length >= MAX_VAULTS && (
          <div className="flex items-center gap-2 p-3 bg-surface-subtle rounded-xl border border-border text-sm text-text-secondary">
            <GripVertical className="w-4 h-4 text-text-tertiary" />
            Maximum of {MAX_VAULTS} vaults reached. Disable or remove an existing vault to add a new one.
          </div>
        )}

        <div className="p-5 bg-surface-subtle border border-border rounded-xl text-sm text-text-secondary">
          <p className="font-medium text-text-primary mb-1">How Vaults work</p>
          <p>Add messages yourself or share a vault link with guests so they can drop in a note. Each vault unlocks automatically on its anniversary date. You can enable or disable individual vaults, and customize how long each one stays sealed. Disabled vaults are hidden from guests but your entries are preserved.</p>
        </div>
      </div>

      {editingConfig && (
        <EditVaultModal
          config={editingConfig}
          hasEntries={entries.some(e => e.vault_config_id === editingConfig.id)}
          onSave={handleEditSave}
          onClose={() => setEditingConfig(null)}
        />
      )}

      <ToastList toasts={toasts} />
    </DashboardLayout>
  );
};
