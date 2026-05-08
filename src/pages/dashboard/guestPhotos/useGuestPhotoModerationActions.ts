import { useState } from 'react';
import {
  manageGuestPhotoAlbum,
  moderateGuestPhotoUploads,
  moderateGuestbookEntry as moderateGuestbookEntryFromService,
} from '../guestPhotoSharingService';
import {
  safePhotoOwnerError,
  type GuestbookEntryRow,
  type PhotoBucketRow,
  type PhotoUploadRow,
} from '../guestPhotoSharingUtils';

type LogPhotoAction = (
  type: string,
  summary: string,
  metadata?: Record<string, unknown>,
  targetId?: string | null,
  targetLabel?: string | null
) => void;

type UseGuestPhotoModerationActionsArgs = {
  buckets: PhotoBucketRow[];
  load: () => Promise<void>;
  logPhotoAction: LogPhotoAction;
  reviewUploads: Array<{ upload: PhotoUploadRow }>;
  setError: (value: string | null) => void;
  setGuestbookEntries: React.Dispatch<React.SetStateAction<GuestbookEntryRow[]>>;
  setSuccess: (value: string | null) => void;
  showFlaggedOnly: boolean;
  showHidden: boolean;
  similarPhotoGroups: Array<{ duplicateIds: string[] }>;
  uploads: PhotoUploadRow[];
};

export function useGuestPhotoModerationActions({
  buckets,
  load,
  logPhotoAction,
  reviewUploads,
  setError,
  setGuestbookEntries,
  setSuccess,
  showFlaggedOnly,
  showHidden,
  similarPhotoGroups,
  uploads,
}: UseGuestPhotoModerationActionsArgs) {
  const [bulkModerating, setBulkModerating] = useState(false);
  const [bulkUpdatingStatus, setBulkUpdatingStatus] = useState(false);
  const [moderatingGuestbookId, setModeratingGuestbookId] = useState('');

  const updateGuestbookEntry = async (
    entryId: string,
    patch: Partial<Pick<GuestbookEntryRow, 'is_hidden' | 'is_flagged'>>
  ) => {
    try {
      setModeratingGuestbookId(entryId);
      await moderateGuestbookEntryFromService(entryId, patch);
      setGuestbookEntries((prev) => prev.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry)));
      logPhotoAction('guestbook_entry_moderated', 'Guestbook entry moderation was updated.', patch, entryId, 'Guestbook entry');
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t update that guestbook note yet.'));
    } finally {
      setModeratingGuestbookId('');
    }
  };

  const setUploadsHiddenByFilter = async (hide: boolean) => {
    const target = uploads.filter((upload) => (showFlaggedOnly ? upload.is_flagged : true) && (showHidden || !upload.is_hidden));
    if (target.length === 0) {
      setSuccess('No uploads match current filters.');
      return;
    }

    try {
      setBulkModerating(true);
      setError(null);
      const ids = target.map((upload) => upload.id);
      await moderateGuestPhotoUploads(ids, { is_hidden: hide });
      await load();
      logPhotoAction(hide ? 'uploads_hidden_bulk' : 'uploads_unhidden_bulk', `${hide ? 'Hidden' : 'Unhidden'} uploads from the filtered photo view.`, {
        uploadCount: ids.length,
        showFlaggedOnly,
        showHidden,
      });
      setSuccess(`${hide ? 'Hidden' : 'Unhidden'} ${ids.length} upload(s) from current view.`);
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t update those photos yet.'));
    } finally {
      setBulkModerating(false);
    }
  };

  const hideReviewUploads = async () => {
    const targetIds = reviewUploads.map((entry) => entry.upload.id);
    if (targetIds.length === 0) {
      setSuccess('No review uploads to hide.');
      return;
    }

    try {
      setBulkModerating(true);
      setError(null);
      await moderateGuestPhotoUploads(targetIds, { is_hidden: true });
      await load();
      logPhotoAction('review_uploads_hidden_bulk', 'Review uploads were hidden in bulk.', { uploadCount: targetIds.length });
      setSuccess(`Hidden ${targetIds.length} review upload${targetIds.length === 1 ? '' : 's'}.`);
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t hide those review photos yet.'));
    } finally {
      setBulkModerating(false);
    }
  };

  const hideDuplicateExtras = async () => {
    const targetIds = Array.from(new Set(similarPhotoGroups.flatMap((group) => group.duplicateIds)));
    if (targetIds.length === 0) {
      setSuccess('No similar extras to tuck away.');
      return;
    }

    try {
      setBulkModerating(true);
      setError(null);
      await moderateGuestPhotoUploads(targetIds, { is_hidden: true });
      await load();
      logPhotoAction('duplicate_uploads_hidden_bulk', 'Duplicate extra uploads were hidden in bulk.', { uploadCount: targetIds.length });
      setSuccess(`Kept the best shot in each set and hid ${targetIds.length} extra similar photo${targetIds.length === 1 ? '' : 's'}.`);
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t hide the extra similar photos yet.'));
    } finally {
      setBulkModerating(false);
    }
  };

  const restoreHiddenUploads = async () => {
    const targetIds = uploads.filter((upload) => upload.is_hidden).map((upload) => upload.id);
    if (targetIds.length === 0) {
      setSuccess('No hidden uploads to restore.');
      return;
    }

    try {
      setBulkModerating(true);
      setError(null);
      await moderateGuestPhotoUploads(targetIds, { is_hidden: false });
      await load();
      logPhotoAction('hidden_uploads_restored_bulk', 'Hidden uploads were restored in bulk.', { uploadCount: targetIds.length });
      setSuccess(`Restored ${targetIds.length} hidden upload${targetIds.length === 1 ? '' : 's'}.`);
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t restore hidden photos yet.'));
    } finally {
      setBulkModerating(false);
    }
  };

  const setUploadsFlaggedByFilter = async (flagged: boolean) => {
    const target = uploads.filter((upload) => (showHidden || !upload.is_hidden));
    if (target.length === 0) {
      setSuccess('No uploads match current filters.');
      return;
    }

    try {
      setBulkModerating(true);
      setError(null);
      const ids = target.map((upload) => upload.id);
      await moderateGuestPhotoUploads(ids, { is_flagged: flagged });
      await load();
      logPhotoAction(flagged ? 'uploads_flagged_bulk' : 'uploads_unflagged_bulk', `${flagged ? 'Flagged' : 'Unflagged'} uploads from the filtered photo view.`, {
        uploadCount: ids.length,
        showHidden,
      });
      setSuccess(`${flagged ? 'Flagged' : 'Unflagged'} ${ids.length} upload(s) from current view.`);
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t update those photos yet.'));
    } finally {
      setBulkModerating(false);
    }
  };

  const setAllBucketsActive = async (isActive: boolean) => {
    const targetBuckets = buckets.filter((bucket) => bucket.is_active !== isActive);
    if (targetBuckets.length === 0) {
      setSuccess(isActive ? 'All albums are already active.' : 'All albums are already paused.');
      return;
    }

    try {
      setBulkUpdatingStatus(true);
      setError(null);
      setSuccess(null);

      for (const bucket of targetBuckets) {
        await manageGuestPhotoAlbum({ action: 'set_active', albumId: bucket.id, isActive });
      }

      await load();
      logPhotoAction(isActive ? 'buckets_activated_bulk' : 'buckets_paused_bulk', `${isActive ? 'Opened' : 'Paused'} photo albums in bulk.`, {
        bucketCount: targetBuckets.length,
      });
      setSuccess(`${isActive ? 'Activated' : 'Paused'} ${targetBuckets.length} album${targetBuckets.length === 1 ? '' : 's'}.`);
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t update album sharing yet.'));
    } finally {
      setBulkUpdatingStatus(false);
    }
  };

  const moderateUpload = async (
    uploadId: string,
    patch: Partial<Pick<PhotoUploadRow, 'is_hidden' | 'is_flagged' | 'recap_hidden' | 'recap_featured' | 'recap_story'>>
  ) => {
    try {
      setError(null);
      await moderateGuestPhotoUploads([uploadId], patch);
      await load();
      logPhotoAction('upload_moderated', 'Photo upload moderation was updated.', patch, uploadId, 'Photo upload');
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t update that photo yet.'));
    }
  };

  return {
    bulkModerating,
    bulkUpdatingStatus,
    hideDuplicateExtras,
    hideReviewUploads,
    moderateUpload,
    moderatingGuestbookId,
    restoreHiddenUploads,
    setAllBucketsActive,
    setUploadsFlaggedByFilter,
    setUploadsHiddenByFilter,
    updateGuestbookEntry,
  };
}
