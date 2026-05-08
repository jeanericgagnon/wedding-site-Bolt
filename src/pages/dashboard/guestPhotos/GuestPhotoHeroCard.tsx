type GuestPhotoHeroCardProps = {
  albumCount: number;
  uploadCount: number;
};

export function GuestPhotoHeroCard({ albumCount, uploadCount }: GuestPhotoHeroCardProps) {
  return (
    <div className="rounded-lg border border-border-subtle bg-white p-5">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-neutral-500">Memories</p>
          <h1 className="mt-3 text-4xl font-semibold text-neutral-900">Collect guest photos around the moments you care about.</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">Create simple photo albums, share one upload link or QR code, and let guests send photos without making an account.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:w-[420px]">
          <div className="rounded-lg border border-border-subtle bg-surface-subtle p-4">
            <p className="text-xs font-medium text-neutral-500">Albums</p>
            <p className="mt-2 text-2xl font-semibold text-neutral-900">{albumCount}</p>
            <p className="mt-1 text-xs text-neutral-500">Start simple, then add the moments you want.</p>
          </div>
          <div className="rounded-lg border border-border-subtle bg-surface-subtle p-4">
            <p className="text-xs font-medium text-neutral-500">Uploads</p>
            <p className="mt-2 text-2xl font-semibold text-neutral-900">{uploadCount}</p>
            <p className="mt-1 text-xs text-neutral-500">Across all live memory albums.</p>
          </div>
          <div className="rounded-lg border border-border-subtle bg-surface-subtle p-4">
            <p className="text-xs font-medium text-neutral-500">Sharing</p>
            <p className="mt-2 text-sm font-semibold text-neutral-900">Link + QR ready</p>
            <p className="mt-1 text-xs text-neutral-500">Give guests one obvious way to upload.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
