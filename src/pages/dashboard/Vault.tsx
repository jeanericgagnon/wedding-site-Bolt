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
  created_at: string;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
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

  const unlockDate = weddingDate
    ? new Date(new Date(weddingDate).setFullYear(weddingDate.getFullYear() + config.duration_years))
    : null;
  const isUnlocked = unlockDate ? new Date() >= unlockDate : true;

  const unlockLabel = unlockDate
    ? unlockDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Set your wedding date to calculate unlock date';

  function handleCopyLink() {
    if (!siteSlug) return;
    const url = `${window.location.origin}/vault/${siteSlug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
    <Card variant="bordered" padding="lg" className={!config.is_enabled ? 'opacity-60' : ''}>
      <div className="flex items-start justify-between gap-4 mb-1">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`p-2.5 rounded-xl flex-shrink-0 ${isUnlocked && config.is_enabled ? 'bg-success-light' : 'bg-surface-subtle'}`}>
            {isUnlocked && config.is_enabled
              ? <Unlock className="w-5 h-5 text-success" />
              : <Lock className="w-5 h-5 text-text-tertiary" />
            }
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-text-primary truncate">{config.label || `Vault ${config.vault_index}`}</h3>
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

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xs text-text-tertiary">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>

          {siteSlug && config.is_enabled && (
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
              <p className="text-xs text-text-tertiary">Add a message, note, or link to preserve for this anniversary.</p>
            </div>
          )}

          {isUnlocked && config.is_enabled && entries.map(entry => (
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

          {(!isUnlocked || !config.is_enabled) && entries.length > 0 && (
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
  onSave: (id: string, label: string, durationYears: number) => Promise<void>;
  onClose: () => void;
}

const EditVaultModal: React.FC<EditVaultModalProps> = ({ config, onSave, onClose }) => {
  const [label, setLabel] = useState(config.label);
  const [durationYears, setDurationYears] = useState(config.duration_years);
  const [labelManuallyEdited, setLabelManuallyEdited] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(config.id, label, durationYears);
      onClose();
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
                className="w-full px-3 py-2.5 text-sm bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
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
                    onChange={e => setDurationYears(Math.max(1, Math.min(100, Number(e.target.value))))}
                    className="w-24 px-3 py-2 text-sm bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm text-text-secondary">years after wedding date</span>
                </div>
              )}
              <p className="text-xs text-text-tertiary mt-1.5">
                Guests can contribute at any time, but content stays sealed until this date.
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

  function toast(message: string, type: Toast['type'] = 'success') {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }


  function loadDemoState(): { vaultConfigs: VaultConfig[]; entries: VaultEntry[] } {
    try {
      const raw = localStorage.getItem(DEMO_VAULT_STORAGE_KEY);
      if (!raw) return { vaultConfigs: [], entries: [] };
      const parsed = JSON.parse(raw) as { vaultConfigs?: VaultConfig[]; entries?: VaultEntry[] };
      return {
        vaultConfigs: parsed.vaultConfigs ?? [],
        entries: parsed.entries ?? [],
      };
    } catch {
      return { vaultConfigs: [], entries: [] };
    }
  }

  function saveDemoState(nextConfigs: VaultConfig[], nextEntries: VaultEntry[]) {
    localStorage.setItem(DEMO_VAULT_STORAGE_KEY, JSON.stringify({ vaultConfigs: nextConfigs, entries: nextEntries }));
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (isDemoMode) {
        setWeddingSiteId('demo-site-id');
        setSiteSlug('alex-jordan-demo');
        const demoState = loadDemoState();
        setVaultConfigs(demoState.vaultConfigs);
        setEntries(demoState.entries);
        return;
      }

      if (!user) return;
      const { data: site } = await supabase
        .from('wedding_sites')
        .select('id, wedding_date, site_slug')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!site) return;
      setWeddingSiteId(site.id);
      if (site.wedding_date) setWeddingDate(new Date(site.wedding_date));
      if (site.site_slug) setSiteSlug(site.site_slug as string);

      const { data: configData } = await supabase
        .from('vault_configs')
        .select('*')
        .eq('wedding_site_id', site.id)
        .order('vault_index', { ascending: true });

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
      setVaultConfigs(prev => [...prev, data as VaultConfig]);
      toast('Vault added');
    } catch {
      toast('Failed to add vault', 'error');
    } finally {
      setAddingVault(false);
    }
  }

  async function handleToggleEnabled(configId: string, enabled: boolean) {
    if (isDemoMode) {
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
    if (isDemoMode) {
      const nextConfigs = vaultConfigs.map(c => c.id === id ? { ...c, label, duration_years: durationYears } : c);
      setVaultConfigs(nextConfigs);
      saveDemoState(nextConfigs, entries);
      toast('Vault updated');
      return;
    }
    const { error } = await supabase
      .from('vault_configs')
      .update({ label, duration_years: durationYears, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);
    setVaultConfigs(prev => prev.map(c => c.id === id ? { ...c, label, duration_years: durationYears } : c));
    toast('Vault updated');
  }

  async function handleSaveEntry(entry: { vault_config_id: string; vault_year: number; title: string; content: string; author_name: string; attachment_url: string | null; attachment_name: string | null }) {
    if (!weddingSiteId) throw new Error('No wedding site found');

    if (isDemoMode) {
      const demoEntry: VaultEntry = {
        id: `demo-entry-${Date.now()}`,
        vault_config_id: entry.vault_config_id,
        vault_year: entry.vault_year,
        title: entry.title,
        content: entry.content,
        author_name: entry.author_name,
        attachment_url: entry.attachment_url,
        attachment_name: entry.attachment_name,
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
    if (isDemoMode) {
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
    if (isDemoMode) {
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

  return (
    <DashboardLayout currentPage="vault">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
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

        {!weddingDate && (
          <div className="flex items-start gap-3 p-4 bg-warning-light border border-warning/20 rounded-xl text-sm text-warning">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">No wedding date set</p>
              <p className="mt-0.5 text-warning/80">Set your wedding date in Settings to enable vault lock/unlock dates. You can still add entries now.</p>
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
              <Button variant="primary" onClick={handleAddVault} disabled={addingVault}>
                {addingVault ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
                Create Your First Vault
              </Button>
            </div>
          </Card>
        )}

        {vaultConfigs.length > 0 && (
          <div className="space-y-5">
            {vaultConfigs.map(config => (
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
          onSave={handleEditSave}
          onClose={() => setEditingConfig(null)}
        />
      )}

      <ToastList toasts={toasts} />
    </DashboardLayout>
  );
};
