type Match = {
  contact_session: string;
  name: string;
  household_size?: number;
  household_updates_allowed?: boolean;
  verification_strength?: 'email_verifier' | 'invite_token';
};

type GuestContactLookupPanelProps = {
  query: string;
  verifier: string;
  householdVerifier: string;
  searching: boolean;
  matches: Match[];
  selectedContactSession: string;
  selectedHouseholdSize: number;
  selectedHouseholdAllowed: boolean;
  applyHousehold: boolean;
  onQueryChange: (value: string) => void;
  onVerifierChange: (value: string) => void;
  onHouseholdVerifierChange: (value: string) => void;
  onSearch: () => void;
  onSelectContactSession: (contactSession: string) => void;
  onToggleApplyHousehold: (checked: boolean) => void;
  canSearch: boolean;
};

export function GuestContactLookupPanel({
  query,
  verifier,
  householdVerifier,
  searching,
  matches,
  selectedContactSession,
  selectedHouseholdSize,
  selectedHouseholdAllowed,
  applyHousehold,
  onQueryChange,
  onVerifierChange,
  onHouseholdVerifierChange,
  onSearch,
  onSelectContactSession,
  onToggleApplyHousehold,
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
          <input
            id="guest-contact-household-verifier"
            value={householdVerifier}
            onChange={(e) => onHouseholdVerifierChange(e.target.value)}
            placeholder="Last 4 digits of your phone (for whole-party updates)"
            aria-label="Confirm your phone last 4"
            aria-describedby="guest-contact-household-verifier-helper"
            inputMode="numeric"
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
        <p id="guest-contact-household-verifier-helper" className="mt-1 text-xs text-text-secondary">Add the last 4 digits of the phone number on file if you want to update your whole party.</p>
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
          {(selectedHouseholdSize ?? 1) > 1 && (
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input type="checkbox" checked={applyHousehold} disabled={!selectedHouseholdAllowed} onChange={(e) => onToggleApplyHousehold(e.target.checked)} />
              Apply these updates to my whole party ({selectedHouseholdSize} guests)
            </label>
          )}
          {(selectedHouseholdSize ?? 1) > 1 && !selectedHouseholdAllowed && (
            <p className="text-xs text-text-secondary">To update your whole party, add the last 4 digits of the phone number on file and search again.</p>
          )}
        </div>
      )}
    </>
  );
}
