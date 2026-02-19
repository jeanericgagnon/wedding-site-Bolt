import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, Button } from '../../components/ui';
import { Lock, Unlock, Plus, Trash2, ChevronDown, ChevronUp, Loader2, AlertCircle, Paperclip, Link2, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface VaultEntry {
  id: string;
  vault_year: 1 | 5 | 10;
  title: string;
  content: string;
  author_name: string;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
}

interface VaultConfig {
  vault_year: 1 | 5 | 10;
  label: string;
  ordinal: string;
  unlockDate: Date | null;
  isUnlocked: boolean;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

const ToastList: React.FC<{ toasts: Toast[] }> = ({ toasts }) => (
  <div className="fixed bottom-6 right-6 z-50 space-y-2 pointer-events-none">
    {toasts.map(t => (
      <div
        key={t.id}
        className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium border ${
          t.type === 'error'
            ? 'bg-error-light text-error border-error/20'
            : 'bg-success-light text-success border-success/20'
        }`}
      >
        {t.message}
      </div>
    ))}
  </div>
);

interface EntryFormProps {
  vaultYear: 1 | 5 | 10;
  onSave: (entry: Omit<VaultEntry, 'id' | 'created_at'>) => Promise<void>;
  onCancel: () => void;
}

const EntryForm: React.FC<EntryFormProps> = ({ vaultYear, onSave, onCancel }) => {
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
        vault_year: vaultYear,
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
            placeholder="https://… (photo/link)"
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
        <p className="text-xs text-text-tertiary mt-1">Paste a link to a photo album, shared drive, or any URL you want preserved.</p>
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
          {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : 'Save to Vault'}
        </Button>
      </div>
    </form>
  );
};

interface VaultCardProps {
  config: VaultConfig;
  entries: VaultEntry[];
  onAddEntry: (vaultYear: 1 | 5 | 10) => void;
  onDeleteEntry: (id: string) => void;
  showForm: boolean;
  onSaveEntry: (entry: Omit<VaultEntry, 'id' | 'created_at'>) => Promise<void>;
  onCancelForm: () => void;
  siteSlug: string | null;
}

const VaultCard: React.FC<VaultCardProps> = ({
  config, entries, onAddEntry, onDeleteEntry, showForm, onSaveEntry, onCancelForm, siteSlug
}) => {
  const [expanded, setExpanded] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function getShareUrl(): string {
    if (!siteSlug) return '';
    return `${window.location.origin}/vault/${siteSlug}/${config.vault_year}`;
  }

  function handleCopyLink() {
    const url = getShareUrl();
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const unlockLabel = config.unlockDate
    ? config.unlockDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Set your wedding date to unlock this vault';

  return (
    <Card variant="bordered" padding="lg">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${config.isUnlocked ? 'bg-success-light' : 'bg-surface-subtle'}`}>
            {config.isUnlocked
              ? <Unlock className="w-5 h-5 text-success" />
              : <Lock className="w-5 h-5 text-text-tertiary" />
            }
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">{config.label}</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              {config.isUnlocked
                ? 'Unlocked — you can read and add entries'
                : `Locked until ${unlockLabel}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-tertiary">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
          {siteSlug && (
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                copied
                  ? 'border-success/40 bg-success-light text-success'
                  : 'border-border bg-surface-subtle text-text-secondary hover:border-primary/40 hover:text-primary hover:bg-primary/5'
              }`}
              title="Copy shareable link for guests"
            >
              {copied ? <Check className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Share link'}
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-surface-subtle text-text-tertiary transition-colors"
            aria-label={expanded ? 'Collapse' : 'Expand'}
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
              <p className="text-xs text-text-tertiary">Add a message, note, or link to preserve for this anniversary.</p>
            </div>
          )}

          {config.isUnlocked && entries.map(entry => (
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
                  aria-label="Delete entry"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-sm text-text-secondary whitespace-pre-wrap">{entry.content}</p>
              {entry.attachment_url && (
                <a
                  href={entry.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-xs text-primary hover:underline"
                >
                  <Paperclip className="w-3 h-3" />
                  {entry.attachment_name || 'View attachment'}
                </a>
              )}
            </div>
          ))}

          {!config.isUnlocked && entries.length > 0 && (
            <div className="p-4 bg-surface-subtle rounded-xl border border-dashed border-border text-center space-y-1">
              <Lock className="w-5 h-5 text-text-tertiary mx-auto mb-1" />
              <p className="text-sm font-medium text-text-secondary">
                {entries.length} {entries.length === 1 ? 'entry' : 'entries'} sealed
              </p>
              <p className="text-xs text-text-tertiary">
                These messages are locked until {unlockLabel}. They will be revealed automatically on that date.
              </p>
            </div>
          )}

          {showForm && (
            <EntryForm
              vaultYear={config.vault_year}
              onSave={onSaveEntry}
              onCancel={onCancelForm}
            />
          )}

          {!showForm && (
            <button
              onClick={() => onAddEntry(config.vault_year)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-text-secondary border border-dashed border-border rounded-xl hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add entry to {config.ordinal} anniversary vault
            </button>
          )}
        </div>
      )}
    </Card>
  );
};

export const DashboardVault: React.FC = () => {
  const { user } = useAuth();
  const [weddingSiteId, setWeddingSiteId] = useState<string | null>(null);
  const [weddingDate, setWeddingDate] = useState<Date | null>(null);
  const [siteSlug, setSiteSlug] = useState<string | null>(null);
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFormYear, setActiveFormYear] = useState<1 | 5 | 10 | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  function toast(message: string, type: Toast['type'] = 'success') {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: site } = await supabase
        .from('wedding_sites')
        .select('id, wedding_date, site_slug')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!site) return;
      setWeddingSiteId(site.id);
      if (site.wedding_date) {
        setWeddingDate(new Date(site.wedding_date));
      }
      if (site.site_slug) {
        setSiteSlug(site.site_slug as string);
      }

      const { data: entryData, error } = await supabase
        .from('vault_entries')
        .select('*')
        .eq('wedding_site_id', site.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setEntries((entryData ?? []) as VaultEntry[]);
    } catch {
      toast('Failed to load vault data', 'error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  function getUnlockDate(year: number): Date | null {
    if (!weddingDate) return null;
    const d = new Date(weddingDate);
    d.setFullYear(d.getFullYear() + year);
    return d;
  }

  function isUnlocked(unlockDate: Date | null): boolean {
    if (!unlockDate) return true;
    return new Date() >= unlockDate;
  }

  const vaultConfigs: VaultConfig[] = [
    { vault_year: 1, label: '1st Anniversary Vault', ordinal: '1st', unlockDate: getUnlockDate(1), isUnlocked: isUnlocked(getUnlockDate(1)) },
    { vault_year: 5, label: '5th Anniversary Vault', ordinal: '5th', unlockDate: getUnlockDate(5), isUnlocked: isUnlocked(getUnlockDate(5)) },
    { vault_year: 10, label: '10th Anniversary Vault', ordinal: '10th', unlockDate: getUnlockDate(10), isUnlocked: isUnlocked(getUnlockDate(10)) },
  ];

  async function handleSaveEntry(entry: Omit<VaultEntry, 'id' | 'created_at'>) {
    if (!weddingSiteId) throw new Error('No wedding site found');
    const { data, error } = await supabase
      .from('vault_entries')
      .insert({ ...entry, wedding_site_id: weddingSiteId })
      .select()
      .single();

    if (error) throw new Error(error.message);
    setEntries(prev => [...prev, data as VaultEntry]);
    setActiveFormYear(null);
    toast('Entry added to vault');
  }

  async function handleDeleteEntry(id: string) {
    const { error } = await supabase.from('vault_entries').delete().eq('id', id);
    if (error) { toast('Failed to delete entry', 'error'); return; }
    setEntries(prev => prev.filter(e => e.id !== id));
    toast('Entry removed');
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

  return (
    <DashboardLayout currentPage="vault">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">Anniversary Vaults</h1>
            <p className="text-text-secondary">
              Time capsule messages sealed until each anniversary milestone
            </p>
          </div>
          {totalEntries > 0 && (
            <div className="text-right">
              <p className="text-2xl font-bold text-text-primary leading-none">{totalEntries}</p>
              <p className="text-xs text-text-secondary mt-1">total {totalEntries === 1 ? 'entry' : 'entries'}</p>
            </div>
          )}
        </div>

        {!weddingDate && (
          <div className="flex items-start gap-3 p-4 bg-warning-light border border-warning/20 rounded-xl text-sm text-warning">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">No wedding date set</p>
              <p className="mt-0.5 text-warning/80">Set your wedding date in Settings to enable vault lock/unlock dates. You can still add entries now.</p>
            </div>
          </div>
        )}

        <div className="space-y-5">
          {vaultConfigs.map(config => (
            <VaultCard
              key={config.vault_year}
              config={config}
              entries={entries.filter(e => e.vault_year === config.vault_year)}
              onAddEntry={year => setActiveFormYear(year)}
              onDeleteEntry={handleDeleteEntry}
              showForm={activeFormYear === config.vault_year}
              onSaveEntry={handleSaveEntry}
              onCancelForm={() => setActiveFormYear(null)}
              siteSlug={siteSlug}
            />
          ))}
        </div>

        <div className="p-5 bg-surface-subtle border border-border rounded-xl text-sm text-text-secondary">
          <p className="font-medium text-text-primary mb-1">How Vaults work</p>
          <p>Add messages yourself or share the vault link with guests so they can drop in a note. Locked vaults hide their contents until the anniversary date. You can always add new entries at any time.</p>
        </div>
      </div>

      <ToastList toasts={toasts} />
    </DashboardLayout>
  );
};
