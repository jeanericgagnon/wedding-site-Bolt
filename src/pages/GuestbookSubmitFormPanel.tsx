import { Link } from 'react-router-dom';
import { PenLine, Send } from 'lucide-react';

type GuestbookSubmitFormPanelProps = {
  siteSlug: string;
  guestName: string;
  guestEmail: string;
  message: string;
  website: string;
  status: string | null;
  error: string | null;
  submitting: boolean;
  inputClassName: string;
  labelClassName: string;
  onSubmit: (event: React.FormEvent) => void;
  onGuestNameChange: (value: string) => void;
  onGuestEmailChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onWebsiteChange: (value: string) => void;
};

export function GuestbookSubmitFormPanel({
  siteSlug,
  guestName,
  guestEmail,
  message,
  website,
  status,
  error,
  submitting,
  inputClassName,
  labelClassName,
  onSubmit,
  onGuestNameChange,
  onGuestEmailChange,
  onMessageChange,
  onWebsiteChange,
}: GuestbookSubmitFormPanelProps) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5 sm:p-7">
      <form className="space-y-4" onSubmit={onSubmit} aria-busy={submitting}>
        <input className="hidden" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => onWebsiteChange(e.target.value)} />
        <div>
          <label htmlFor="guestbook-name" className={labelClassName}>Your name (optional)</label>
          <input id="guestbook-name" value={guestName} onChange={(e) => onGuestNameChange(e.target.value)} className={inputClassName} placeholder="Jane Doe" />
        </div>
        <div>
          <label htmlFor="guestbook-email" className={labelClassName}>Email (optional)</label>
          <input id="guestbook-email" type="email" value={guestEmail} onChange={(e) => onGuestEmailChange(e.target.value)} className={inputClassName} placeholder="you@example.com" />
        </div>
        <div>
          <label htmlFor="guestbook-message" className={labelClassName}>Note</label>
          <div className="relative">
            <PenLine className="pointer-events-none absolute right-4 top-4 h-4 w-4 text-stone-400" aria-hidden="true" />
            <textarea
              id="guestbook-message"
              maxLength={2000}
              aria-describedby={error ? 'guestbook-message-error guestbook-message-count' : 'guestbook-message-count'}
              aria-invalid={error ? 'true' : undefined}
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              className={`${inputClassName} min-h-40 pr-11`}
              placeholder="A few words for the couple"
            />
          </div>
          <p id="guestbook-message-count" className="mt-1 text-xs text-stone-500" aria-live="polite">{message.length}/2000 characters</p>
        </div>
        {error && <p id="guestbook-message-error" role="alert" className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">{error}</p>}
        {status && <p role="status" className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">{status}</p>}
        <button type="submit" disabled={submitting} className="inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 py-3 text-base font-semibold text-white hover:bg-stone-800 disabled:opacity-60">
          <Send className="h-4 w-4" aria-hidden="true" />
          {submitting ? 'Sending…' : 'Send note'}
        </button>
      </form>

      {siteSlug && (
        <Link to={`/event/${encodeURIComponent(siteSlug)}`} className="mt-4 block text-center text-sm font-medium text-stone-700 hover:text-stone-950">
          Back to wedding hub
        </Link>
      )}
    </section>
  );
}
