import React, { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { Heart, Send } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const GuestbookEntrySchema = z.object({
  id: z.string(),
  text: z.string().default(''),
  author: z.string().default(''),
});

export const quotesGuestbookSchema = z.object({
  eyebrow: z.string().default('Guestbook'),
  headline: z.string().default('Well Wishes'),
  prompt: z.string().default('Leave a quick note for the couple'),
  entries: z.array(GuestbookEntrySchema).default([]),
});

export type QuotesGuestbookData = z.infer<typeof quotesGuestbookSchema>;

export const defaultQuotesGuestbookData: QuotesGuestbookData = {
  eyebrow: 'Guestbook',
  headline: 'Well Wishes',
  prompt: 'Leave a quick note for the couple',
  entries: [
    { id: '1', text: 'Wishing you both a lifetime of laughter and love.', author: 'Aunt Mia' },
    { id: '2', text: 'So excited to celebrate with you! Congratulations!', author: 'Jordan & Lee' },
  ],
};

export const QUOTES_GUESTBOOK_RETENTION_MS = 1000 * 60 * 60 * 24 * 30;
const MAX_LOCAL_GUESTBOOK_ENTRIES = 50;
const MAX_LOCAL_GUESTBOOK_TEXT_LENGTH = 500;
const MAX_LOCAL_GUESTBOOK_AUTHOR_LENGTH = 80;

type LocalGuestbookEntry = {
  id: string;
  text: string;
  author: string;
};

type LocalGuestbookEnvelope = {
  savedAtISO: string;
  entries: LocalGuestbookEntry[];
};

function normalizeLocalGuestbookEntries(value: unknown): LocalGuestbookEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const raw = entry as Partial<LocalGuestbookEntry>;
      const text = String(raw.text ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_LOCAL_GUESTBOOK_TEXT_LENGTH);
      if (!text) return null;
      const author = String(raw.author ?? 'Guest').replace(/\s+/g, ' ').trim().slice(0, MAX_LOCAL_GUESTBOOK_AUTHOR_LENGTH) || 'Guest';
      const id = String(raw.id ?? `local_${Date.now()}`).replace(/\s+/g, '-').trim().slice(0, 120) || `local_${Date.now()}`;
      return { id, text, author };
    })
    .filter((entry): entry is LocalGuestbookEntry => Boolean(entry))
    .slice(0, MAX_LOCAL_GUESTBOOK_ENTRIES);
}

function buildLocalGuestbookPayload(entries: LocalGuestbookEntry[]): string {
  return JSON.stringify({
    savedAtISO: new Date().toISOString(),
    entries: normalizeLocalGuestbookEntries(entries),
  } satisfies LocalGuestbookEnvelope);
}

export function buildLocalGuestbookStorageKey(siteSlug: string | undefined, headline: string | undefined): string {
  const normalizedSiteSlug = String(siteSlug ?? '').trim().toLowerCase();
  const normalizedHeadline = String(headline ?? 'guestbook').trim().toLowerCase().replace(/\s+/g, '_') || 'guestbook';
  return normalizedSiteSlug
    ? `dayof_guestbook_${normalizedSiteSlug}_${normalizedHeadline}`
    : `dayof_guestbook_${normalizedHeadline}`;
}

export function readLocalGuestbookEntries(storageKey: string): LocalGuestbookEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      const entries = normalizeLocalGuestbookEntries(parsed);
      if (entries.length > 0) {
        window.localStorage.setItem(storageKey, buildLocalGuestbookPayload(entries));
      } else {
        window.localStorage.removeItem(storageKey);
      }
      return entries;
    }

    if (parsed && typeof parsed === 'object' && typeof parsed.savedAtISO === 'string') {
      const savedAt = Date.parse(parsed.savedAtISO);
      if (!Number.isFinite(savedAt) || Date.now() - savedAt > QUOTES_GUESTBOOK_RETENTION_MS) {
        window.localStorage.removeItem(storageKey);
        return [];
      }
      return normalizeLocalGuestbookEntries((parsed as LocalGuestbookEnvelope).entries);
    }

    window.localStorage.removeItem(storageKey);
  } catch {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // best effort
    }
  }
  return [];
}

function writeLocalGuestbookEntries(storageKey: string, entries: LocalGuestbookEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, buildLocalGuestbookPayload(entries));
  } catch {
    // best effort
  }
}

const QuotesGuestbook: React.FC<SectionComponentProps<QuotesGuestbookData>> = ({ data, siteSlug }) => {
  const storageKey = useMemo(() => buildLocalGuestbookStorageKey(siteSlug, data.headline), [data.headline, siteSlug]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [localEntries, setLocalEntries] = useState<LocalGuestbookEntry[]>(() => readLocalGuestbookEntries(storageKey));

  useEffect(() => {
    setName('');
    setMessage('');
    setLocalEntries(readLocalGuestbookEntries(storageKey));
  }, [storageKey]);

  const allEntries = [...(data.entries || []), ...localEntries];

  const addEntry = () => {
    if (!message.trim()) return;
    const entry = {
      id: `local_${Date.now()}`,
      text: message.trim(),
      author: name.trim() || 'Guest',
    };
    const next = [entry, ...localEntries].slice(0, 50);
    setLocalEntries(next);
    setMessage('');
    setName('');
    writeLocalGuestbookEntries(storageKey, next);
  };

  return (
    <section className="py-24 bg-white" id="guestbook">
      <div className="max-w-4xl mx-auto px-6 md:px-10">
        <div className="text-center mb-10">
          <p className="text-sm text-primary/70 mb-3">{data.eyebrow}</p>
          <h2 className="text-3xl md:text-5xl font-light text-text-primary">{data.headline}</h2>
          <p className="text-sm text-text-secondary mt-3">{data.prompt}</p>
        </div>

        <div className="rounded-2xl border border-border/40 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.06)] p-4 md:p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="px-3 py-2 rounded-xl border border-border bg-surface text-sm"
            />
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a short wish"
              className="md:col-span-2 px-3 py-2 rounded-xl border border-border bg-surface text-sm"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={addEntry}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-sm hover:bg-primary/90"
            >
              <Send className="w-4 h-4" />
              Add wish
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {allEntries.length === 0 ? (
            <p className="text-sm text-text-tertiary text-center py-10">No notes yet.</p>
          ) : (
            allEntries.map((entry) => (
              <article key={entry.id} className="rounded-xl border border-border/35 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.05)] p-4">
                <p className="text-text-primary text-sm leading-relaxed">“{entry.text}”</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-text-tertiary">
                  <Heart className="w-3.5 h-3.5 text-primary/70" />
                  <span>{entry.author}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export const quotesGuestbookDefinition: SectionDefinition<QuotesGuestbookData> = {
  type: 'quotes',
  variant: 'guestbook',
  schema: quotesGuestbookSchema,
  defaultData: defaultQuotesGuestbookData,
  Component: QuotesGuestbook,
};
