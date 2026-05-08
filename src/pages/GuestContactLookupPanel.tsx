type Match = {
  contact_session: string;
  name: string;
  household_size?: number;
};

type GuestContactLookupPanelProps = {
  query: string;
  searching: boolean;
  matches: Match[];
  selectedContactSession: string;
  selectedHouseholdSize: number;
  applyHousehold: boolean;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onSelectContactSession: (contactSession: string) => void;
  onToggleApplyHousehold: (checked: boolean) => void;
  canSearch: boolean;
};

export function GuestContactLookupPanel({
  query,
  searching,
  matches,
  selectedContactSession,
  selectedHouseholdSize,
  applyHousehold,
  onQueryChange,
  onSearch,
  onSelectContactSession,
  onToggleApplyHousehold,
  canSearch,
}: GuestContactLookupPanelProps) {
  return (
    <>
      <div>
        <label htmlFor="guest-contact-search" className="mb-1 block text-sm font-medium text-text-primary">Find your guest record</label>
        <div className="flex gap-2">
          <input
            id="guest-contact-search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search your full name"
            aria-describedby="guest-contact-search-helper"
            className="flex-1 px-3 py-2 border border-border rounded-lg bg-surface-subtle"
          />
          <button onClick={onSearch} disabled={searching || !canSearch} className="px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-50">
            {searching ? 'Searching…' : 'Find'}
          </button>
        </div>
        <p id="guest-contact-search-helper" className="mt-1 text-xs text-text-secondary">Use your full name exactly as it appears on the invitation.</p>
      </div>

      {matches.length > 0 && (
        <div className="space-y-2">
          <label htmlFor="guest-contact-match" className="block text-sm font-medium text-text-primary">Select your name</label>
          <select
            id="guest-contact-match"
            value={selectedContactSession}
            onChange={(e) => onSelectContactSession(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface-subtle"
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
              <input type="checkbox" checked={applyHousehold} onChange={(e) => onToggleApplyHousehold(e.target.checked)} />
              Apply these updates to my whole party ({selectedHouseholdSize} guests)
            </label>
          )}
        </div>
      )}
    </>
  );
}
