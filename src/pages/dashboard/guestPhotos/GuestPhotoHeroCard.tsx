type GuestPhotoHeroCardProps = {
  albumCount: number;
  uploadCount: number;
};

export function GuestPhotoHeroCard({ albumCount, uploadCount }: GuestPhotoHeroCardProps) {
  return (
    <div className="border-b border-border-subtle pb-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Memories</p>
          <h1 className="mt-3 font-serif text-4xl font-normal leading-tight text-neutral-900">Photos, notes, and moments from the celebration.</h1>
          <p className="mt-3 text-base leading-7 text-neutral-600">Give guests one easy place to share what they captured, wrote, and remembered.</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 lg:w-[420px]">
          <div className="border-l border-border-subtle pl-4">
            <p className="text-xs font-medium text-neutral-500">Albums</p>
            <p className="mt-1 text-sm font-semibold text-neutral-900">{albumCount}</p>
            <p className="mt-1 text-xs text-neutral-500">Start simple, then add the moments you want.</p>
          </div>
          <div className="border-l border-border-subtle pl-4">
            <p className="text-xs font-medium text-neutral-500">Uploads</p>
            <p className="mt-1 text-sm font-semibold text-neutral-900">{uploadCount}</p>
            <p className="mt-1 text-xs text-neutral-500">Across all live memory albums.</p>
          </div>
          <div className="border-l border-border-subtle pl-4">
            <p className="text-xs font-medium text-neutral-500">Sharing</p>
            <p className="mt-1 text-sm font-semibold text-neutral-900">Link + QR ready</p>
            <p className="mt-1 text-xs text-neutral-500">Give guests one obvious way to upload.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
