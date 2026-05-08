import React, { type ComponentProps } from 'react';
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
    <div className="space-y-6">
      {shouldRenderQuickStartBanner && (
        <GuestPhotoQuickStartBanner onContinue={onQuickStartContinue} />
      )}

      <GuestPhotoHeroCard {...heroCardProps} />
      <GuestPhotoMemoryVaultsCard {...memoryVaultsCardProps} />
      <GuestPhotoMemoryFlowCard {...memoryFlowCardProps} />

      {shouldRenderGuestHubQrCard && <GuestPhotoHubQrCard {...hubQrCardProps} />}
      {shouldRenderGuestPhotoRecapSharingCard && <GuestPhotoRecapSharingCard {...recapSharingCardProps} />}
      {shouldRenderGuestHubControlsCard && <GuestPhotoHubControlsCard {...hubControlsCardProps} />}
      {shouldRenderFollowupCard && <GuestPhotoFollowupCard {...followupCardProps} />}
      {shouldRenderGuestbookCard && <GuestPhotoGuestbookCard {...guestbookCardProps} />}

      <GuestPhotoCoupleAlbumsCard {...coupleAlbumsCardProps} />
      <GuestPhotoStatsCards {...statsCardsProps} />
      <GuestPhotoSlideshowDraftCard {...slideshowDraftCardProps} />
      <GuestPhotoMomentsCard {...momentsCardProps} />
      <GuestPhotoMomentAlbumsCard {...momentAlbumsCardProps} />
      <GuestPhotoReviewCard {...reviewCardProps} />
      {shouldRenderOrganizerCard && <GuestPhotoOrganizerCard {...organizerCardProps} />}
      <GuestPhotoSlideshowCard {...slideshowCardProps} />
      <GuestPhotoAlbumCreateCard {...albumCreateCardProps} />

      <div className="rounded-lg border border-border-subtle bg-white p-6">
        <GuestPhotoAlbumControls {...albumControlsProps} />
        {shouldRenderAlbumListState ? (
          <GuestPhotoAlbumListState {...albumListStateProps} />
        ) : (
          <GuestPhotoBucketList {...bucketListProps} />
        )}
      </div>
    </div>
  );
}
