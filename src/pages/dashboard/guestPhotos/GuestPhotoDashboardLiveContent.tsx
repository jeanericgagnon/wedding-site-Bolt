import { type ComponentProps } from 'react';
import { GuestPhotoAlbumControls } from './GuestPhotoAlbumControls';
import { GuestPhotoAlbumCreateCard } from './GuestPhotoAlbumCreateCard';
import { GuestPhotoAlbumListState } from './GuestPhotoAlbumListState';
import { GuestPhotoBucketList } from './GuestPhotoBucketList';
import { GuestPhotoCoupleAlbumsCard } from './GuestPhotoCoupleAlbumsCard';
import { GuestPhotoFollowupCard } from './GuestPhotoFollowupCard';
import { GuestPhotoGuestbookCard } from './GuestPhotoGuestbookCard';
import { GuestPhotoHeroCard } from './GuestPhotoHeroCard';
import { GuestPhotoHubControlsCard } from './GuestPhotoHubControlsCard';
import { GuestPhotoHubQrCard } from './GuestPhotoHubQrCard';
import { GuestPhotoMemoryFlowCard } from './GuestPhotoMemoryFlowCard';
import { GuestPhotoMemoryVaultsCard } from './GuestPhotoMemoryVaultsCard';
import { GuestPhotoMomentAlbumsCard } from './GuestPhotoMomentAlbumsCard';
import { GuestPhotoMomentsCard } from './GuestPhotoMomentsCard';
import { GuestPhotoOrganizerCard } from './GuestPhotoOrganizerCard';
import { GuestPhotoQuickStartBanner } from './GuestPhotoQuickStartBanner';
import { GuestPhotoRecapSharingCard } from './GuestPhotoRecapSharingCard';
import { GuestPhotoReviewCard } from './GuestPhotoReviewCard';
import { GuestPhotoSlideshowCard } from './GuestPhotoSlideshowCard';
import { GuestPhotoSlideshowDraftCard } from './GuestPhotoSlideshowDraftCard';
import { GuestPhotoStatsCards } from './GuestPhotoStatsCards';

export type GuestPhotoDashboardLiveContentProps = {
  albumControlsProps: ComponentProps<typeof GuestPhotoAlbumControls>;
  albumCreateCardProps: ComponentProps<typeof GuestPhotoAlbumCreateCard>;
  albumListStateProps: ComponentProps<typeof GuestPhotoAlbumListState>;
  bucketListProps: ComponentProps<typeof GuestPhotoBucketList>;
  coupleAlbumsCardProps: ComponentProps<typeof GuestPhotoCoupleAlbumsCard>;
  followupCardProps: ComponentProps<typeof GuestPhotoFollowupCard>;
  guestbookCardProps: ComponentProps<typeof GuestPhotoGuestbookCard>;
  heroCardProps: ComponentProps<typeof GuestPhotoHeroCard>;
  hubControlsCardProps: ComponentProps<typeof GuestPhotoHubControlsCard>;
  hubQrCardProps: ComponentProps<typeof GuestPhotoHubQrCard>;
  memoryFlowCardProps: ComponentProps<typeof GuestPhotoMemoryFlowCard>;
  memoryVaultsCardProps: ComponentProps<typeof GuestPhotoMemoryVaultsCard>;
  momentAlbumsCardProps: ComponentProps<typeof GuestPhotoMomentAlbumsCard>;
  momentsCardProps: ComponentProps<typeof GuestPhotoMomentsCard>;
  onQuickStartContinue: () => void;
  organizerCardProps: ComponentProps<typeof GuestPhotoOrganizerCard>;
  recapSharingCardProps: ComponentProps<typeof GuestPhotoRecapSharingCard>;
  reviewCardProps: ComponentProps<typeof GuestPhotoReviewCard>;
  shouldRenderAlbumListState: boolean;
  shouldRenderFollowupCard: boolean;
  shouldRenderGuestHubControlsCard: boolean;
  shouldRenderGuestHubQrCard: boolean;
  shouldRenderGuestPhotoRecapSharingCard: boolean;
  shouldRenderGuestbookCard: boolean;
  shouldRenderOrganizerCard: boolean;
  shouldRenderQuickStartBanner: boolean;
  slideshowCardProps: ComponentProps<typeof GuestPhotoSlideshowCard>;
  slideshowDraftCardProps: ComponentProps<typeof GuestPhotoSlideshowDraftCard>;
  statsCardsProps: ComponentProps<typeof GuestPhotoStatsCards>;
};

export function GuestPhotoDashboardLiveContent({
  albumControlsProps,
  albumCreateCardProps,
  albumListStateProps,
  bucketListProps,
  coupleAlbumsCardProps,
  followupCardProps,
  guestbookCardProps,
  heroCardProps,
  hubControlsCardProps,
  hubQrCardProps,
  memoryFlowCardProps,
  memoryVaultsCardProps,
  momentAlbumsCardProps,
  momentsCardProps,
  onQuickStartContinue,
  organizerCardProps,
  recapSharingCardProps,
  reviewCardProps,
  shouldRenderAlbumListState,
  shouldRenderFollowupCard,
  shouldRenderGuestHubControlsCard,
  shouldRenderGuestHubQrCard,
  shouldRenderGuestPhotoRecapSharingCard,
  shouldRenderGuestbookCard,
  shouldRenderOrganizerCard,
  shouldRenderQuickStartBanner,
  slideshowCardProps,
  slideshowDraftCardProps,
  statsCardsProps,
}: GuestPhotoDashboardLiveContentProps) {
  return (
    <div className="space-y-7">
      {shouldRenderQuickStartBanner && (
        <GuestPhotoQuickStartBanner onContinue={onQuickStartContinue} />
      )}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_320px]">
        <article className="rounded-[20px] border border-border bg-white p-5 shadow-none">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Memory collection</p>
            <h2 className="mt-3 font-serif text-2xl font-normal text-text-primary">Share once, collect in one place.</h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">Give guests one easy place to upload photos, leave guestbook notes, and add recap moments without needing an app.</p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface-subtle/30 p-4">
              <p className="text-sm font-semibold text-text-primary">Photo sharing</p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">Upload link and QR for guests.</p>
              <p className="mt-4 text-sm font-semibold text-primary">Share link</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-subtle/30 p-4">
              <p className="text-sm font-semibold text-text-primary">Albums</p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">Create albums for moments, events, or the parts of the weekend guests understand instinctively.</p>
              <p className="mt-4 text-sm font-semibold text-primary">Create album</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-subtle/30 p-4">
              <p className="text-sm font-semibold text-text-primary">Guestbook</p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">Prompts, notes, and messages stay together with photo sharing.</p>
              <p className="mt-4 text-sm font-semibold text-primary">Open</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-subtle/30 p-4">
              <p className="text-sm font-semibold text-text-primary">Memory vaults</p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">Private keepsakes and anniversary capsules can stay tucked away without getting lost.</p>
              <p className="mt-4 text-sm font-semibold text-primary">Manage</p>
            </div>
          </div>
        </article>

        <aside className="rounded-[20px] border border-border bg-white p-5 shadow-none">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Guest-facing flow</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-border bg-surface-subtle/30 p-4 text-sm text-text-secondary">1. Share a photo link or QR once</div>
            <div className="rounded-xl border border-border bg-surface-subtle/30 p-4 text-sm text-text-secondary">2. Let guests upload to the right moment or album</div>
            <div className="rounded-xl border border-border bg-surface-subtle/30 p-4 text-sm text-text-secondary">3. Review, recap, and keep the best memories close</div>
          </div>
        </aside>
      </section>

      <GuestPhotoHeroCard {...heroCardProps} />
      <GuestPhotoMemoryVaultsCard {...memoryVaultsCardProps} />
      <div id="photos-tool-memory-flow">
        <GuestPhotoMemoryFlowCard {...memoryFlowCardProps} />
      </div>

      {shouldRenderGuestHubQrCard && <GuestPhotoHubQrCard {...hubQrCardProps} />}
      {shouldRenderGuestPhotoRecapSharingCard && (
        <div id="photos-tool-recap">
          <GuestPhotoRecapSharingCard {...recapSharingCardProps} />
        </div>
      )}
      {shouldRenderGuestHubControlsCard && (
        <div id="photos-tool-hub-controls">
          <GuestPhotoHubControlsCard {...hubControlsCardProps} />
        </div>
      )}
      {shouldRenderFollowupCard && <GuestPhotoFollowupCard {...followupCardProps} />}
      {shouldRenderGuestbookCard && (
        <div id="photos-tool-guestbook">
          <GuestPhotoGuestbookCard {...guestbookCardProps} />
        </div>
      )}

      <GuestPhotoCoupleAlbumsCard {...coupleAlbumsCardProps} />
      <GuestPhotoStatsCards {...statsCardsProps} />
      <GuestPhotoSlideshowDraftCard {...slideshowDraftCardProps} />
      <GuestPhotoMomentsCard {...momentsCardProps} />
      <GuestPhotoMomentAlbumsCard {...momentAlbumsCardProps} />
      <div id="photos-tool-review">
        <GuestPhotoReviewCard {...reviewCardProps} />
      </div>
      {shouldRenderOrganizerCard && <GuestPhotoOrganizerCard {...organizerCardProps} />}
      <GuestPhotoSlideshowCard {...slideshowCardProps} />
      <GuestPhotoAlbumCreateCard {...albumCreateCardProps} />

      <section className="rounded-[20px] border border-border bg-white p-6 shadow-none">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Album workspace</p>
            <h2 className="mt-3 text-lg font-semibold text-text-primary">Sort the uploads into moments guests will recognize later.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              Create the albums, adjust the buckets, and review the shared uploads here once the public collection flow is already in motion.
            </p>
          </div>
          <div className="inline-flex flex-wrap gap-2 text-xs text-text-tertiary">
            <span className="rounded-lg border border-border bg-surface-subtle/30 px-3 py-1">Albums and buckets</span>
            <span className="rounded-lg border border-border bg-surface-subtle/30 px-3 py-1">Organizer view</span>
            <span className="rounded-lg border border-border bg-surface-subtle/30 px-3 py-1">Best for review later</span>
          </div>
        </div>
        <GuestPhotoAlbumControls {...albumControlsProps} />
        {shouldRenderAlbumListState ? (
          <GuestPhotoAlbumListState {...albumListStateProps} />
        ) : (
          <GuestPhotoBucketList {...bucketListProps} />
        )}
      </section>
    </div>
  );
}
