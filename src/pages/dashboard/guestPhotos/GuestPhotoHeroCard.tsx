import { DashboardPageHero } from '../../../components/dashboard/DashboardPageHero';

type GuestPhotoHeroCardProps = {
  albumCount: number;
  uploadCount: number;
};

export function GuestPhotoHeroCard({ albumCount, uploadCount }: GuestPhotoHeroCardProps) {
  return (
    <DashboardPageHero
      eyebrow="Memories"
      title="Photos, notes, and moments from the celebration."
      description="Give guests one easy place to share what they captured, wrote, and remembered."
      stats={[
        { label: 'Albums', value: albumCount, detail: 'start simple, then add the moments you want' },
        { label: 'Uploads', value: uploadCount, detail: 'across all live memory albums' },
        { label: 'Sharing', value: 'Link + QR ready', detail: 'one obvious way for guests to upload' },
      ]}
    />
  );
}
