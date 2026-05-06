import { Card } from '../../../components/ui/Card';

type GuestPhotoStatsCardsProps = {
  albumCount: number;
  activeAlbumCount: number;
  pausedAlbumCount: number;
  uploadCount: number;
};

export function GuestPhotoStatsCards({
  albumCount,
  activeAlbumCount,
  pausedAlbumCount,
  uploadCount,
}: GuestPhotoStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Card className="p-4">
        <p className="text-xs text-neutral-500">Albums</p>
        <p className="text-2xl font-semibold text-neutral-900">{albumCount}</p>
        <p className="text-xs text-neutral-500">{activeAlbumCount} active · {pausedAlbumCount} paused</p>
      </Card>
      <Card className="p-4">
        <p className="text-xs text-neutral-500">Uploads</p>
        <p className="text-2xl font-semibold text-neutral-900">{uploadCount}</p>
        <p className="text-xs text-neutral-500">Across all albums</p>
      </Card>
    </div>
  );
}
