import { Pencil, PlusCircle, Trash2 } from 'lucide-react';

export interface GuestAuditDisplayEntry {
  action: 'insert' | 'update' | 'delete';
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

export function formatAuditValue(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export function summarizeAuditEntry(entry: GuestAuditDisplayEntry): string {
  if (entry.action === 'insert') return 'Guest created';
  if (entry.action === 'delete') return 'Guest removed';

  const oldData = entry.old_data ?? {};
  const newData = entry.new_data ?? {};

  const watched: Array<{ key: string; label: string }> = [
    { key: 'rsvp_status', label: 'RSVP status' },
    { key: 'first_name', label: 'First name' },
    { key: 'last_name', label: 'Last name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'plus_one_allowed', label: 'Plus-one allowed' },
    { key: 'plus_one_name', label: 'Plus-one name' },
    { key: 'invited_to_ceremony', label: 'Ceremony invite' },
    { key: 'invited_to_reception', label: 'Reception invite' },
    { key: 'household_id', label: 'Household' },
  ];

  const changes = watched
    .filter(({ key }) => oldData[key] !== newData[key])
    .slice(0, 2)
    .map(({ key, label }) => `${label}: ${formatAuditValue(oldData[key])} → ${formatAuditValue(newData[key])}`);

  if (changes.length === 0) return 'Guest details updated';
  return changes.join(' · ');
}

export function getAuditActionTone(action: GuestAuditDisplayEntry['action']): string {
  if (action === 'insert') return 'bg-success-light text-success border-success/20';
  if (action === 'delete') return 'bg-surface-subtle text-text-secondary border-border-subtle';
  return 'bg-primary-light text-primary border-primary/20';
}

export function getAuditGuestLabel(entry: GuestAuditDisplayEntry): string {
  const preferred = (entry.new_data?.name as string | undefined)
    || `${entry.new_data?.first_name ?? ''} ${entry.new_data?.last_name ?? ''}`.trim()
    || (entry.old_data?.name as string | undefined)
    || `${entry.old_data?.first_name ?? ''} ${entry.old_data?.last_name ?? ''}`.trim();
  return preferred || 'Guest';
}

export function getAuditActionIcon(action: GuestAuditDisplayEntry['action']) {
  if (action === 'insert') return PlusCircle;
  if (action === 'delete') return Trash2;
  return Pencil;
}

export function parseRsvpEventSelections(notes: string | null): { ceremony?: boolean; reception?: boolean } | null {
  if (!notes) return null;
  const match = notes.match(/\[Events\s+([^\]]+)\]/i);
  if (!match) return null;

  const pairs = match[1]
    .split(',')
    .map((part) => part.trim())
    .map((part) => {
      const [k, v] = part.split(':').map((x) => (x || '').trim().toLowerCase());
      return [k, v === 'yes'] as const;
    });

  const map = Object.fromEntries(pairs) as Record<string, boolean>;
  return {
    ceremony: map.ceremony,
    reception: map.reception,
  };
}

export function getCustomAnswerEntries(customAnswers: Record<string, string | string[]> | null | undefined): Array<{ key: string; value: string }> {
  if (!customAnswers || typeof customAnswers !== 'object') return [];

  return Object.entries(customAnswers)
    .map(([key, value]) => ({
      key: key.replace(/^q_/, 'question_'),
      value: Array.isArray(value) ? value.join(', ').trim() : (typeof value === 'string' ? value : String(value ?? '')).trim(),
    }))
    .filter((entry) => entry.value.length > 0);
}

export function formatCustomAnswers(customAnswers: Record<string, string | string[]> | null | undefined): string {
  if (!customAnswers || typeof customAnswers !== 'object') return '';
  const entries = Object.entries(customAnswers)
    .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : String(value ?? '').trim()] as const)
    .filter(([, value]) => value.length > 0);

  if (entries.length === 0) return '';

  return entries
    .map(([key, value]) => `${key.replace(/^q_/, 'question_')}: ${value}`)
    .join(' | ');
}
