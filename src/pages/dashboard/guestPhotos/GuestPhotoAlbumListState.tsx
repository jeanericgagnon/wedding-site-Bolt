type GuestPhotoAlbumListStateProps = {
  loading: boolean;
  bucketCount: number;
  filteredBucketCount: number;
  onSuggestionSelect: (value: string) => void;
};

export function GuestPhotoAlbumListState({
  loading,
  bucketCount,
  filteredBucketCount,
  onSuggestionSelect,
}: GuestPhotoAlbumListStateProps) {
  if (loading) {
    return <p className="text-sm text-neutral-500">Loading albums…</p>;
  }

  if (bucketCount === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-subtle bg-surface-subtle p-8">
        <p className="text-xs font-semibold text-neutral-500">Blank album sheet</p>
        <h3 className="mt-3 text-2xl font-semibold text-neutral-900">Start with the moments you actually want back.</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">Create a few simple albums first, then share the upload link or QR so guests know exactly where to send photos.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {['Welcome party', 'Ceremony', 'Dance floor', 'Brunch'].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onSuggestionSelect(suggestion)}
              className="rounded-2xl border border-border-subtle bg-white px-4 py-4 text-left transition-colors hover:bg-surface-subtle"
            >
              <p className="text-sm font-medium text-neutral-900">{suggestion}</p>
              <p className="mt-1 text-xs text-neutral-500">Use this as your next album</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (filteredBucketCount === 0) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface-subtle px-4 py-5 text-sm text-text-secondary">
        No albums match those filters. Try a different search, switch the status filter, or clear your hidden / flagged view.
      </div>
    );
  }

  return null;
}
