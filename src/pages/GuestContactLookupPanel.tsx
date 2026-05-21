type Match = {
  contact_session: string;
  name: string;
  household_size?: number;
  verification_strength?: 'email_verifier' | 'invite_token';
};

type GuestContactLookupPanelProps = {
  query: string;
  verifier: string;
  searching: boolean;
  matches: Match[];
  selectedContactSession: string;
  onQueryChange: (value: string) => void;
  onVerifierChange: (value: string) => void;
  onSearch: () => void;
  onSelectContactSession: (contactSession: string) => void;
  canSearch: boolean;
};

export function GuestContactLookupPanel({
  query,
  verifier,
  searching,
  matches,
  selectedContactSession,
  onQueryChange,
  onVerifierChange,
  onSearch,
  onSelectContactSession,
  canSearch,
}: GuestContactLookupPanelProps) {
  return (
    <>
      <div>
        <label htmlFor="guest-contact-search" className="mb-1 block text-sm font-medium text-text-primary">Find your guest record</label>
        <div className="space-y-2">
          <input
            id="guest-contact-search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search your full name"
            aria-describedby="guest-contact-search-helper"
            className="w-full px-3 py-2 border border-border rounded-xl bg-surface-subtle"
          />
          <input
            id="guest-contact-verifier"
            value={verifier}
            onChange={(e) => onVerifierChange(e.target.value)}
            placeholder="First few letters of your email"
            aria-label="Confirm your email"
            aria-describedby="guest-contact-verifier-helper"
            className="w-full px-3 py-2 border border-border rounded-xl bg-surface-subtle"
          />
          <div className="flex justify-end">
            <button onClick={onSearch} disabled={searching || !canSearch} className="px-4 py-2 rounded-xl bg-primary text-white disabled:opacity-50">
              {searching ? 'Searching…' : 'Find'}
            </button>
          </div>
        </div>
        <p id="guest-contact-search-helper" className="mt-1 text-xs text-text-secondary">Use your full name exactly as it appears on the invitation.</p>
        <p id="guest-contact-verifier-helper" className="mt-1 text-xs text-text-secondary">Add the first few characters of the email address on your invitation. If you opened this from your invitation link, we can use that to help find your record too.</p>
      </div>

      {matches.length > 0 && (
        <div className="space-y-2">
          <label htmlFor="guest-contact-match" className="block text-sm font-medium text-text-primary">Select your name</label>
          <select
            id="guest-contact-match"
            value={selectedContactSession}
            onChange={(e) => onSelectContactSession(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-xl bg-surface-subtle"
          >
            {matches.map((match) => (
              <option key={match.contact_session} value={match.contact_session}>
                {match.name}
                {(match.household_size ?? 1) > 1 ? ` (party of ${match.household_size})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}
