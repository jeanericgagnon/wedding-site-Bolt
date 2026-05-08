import { useCallback, useState } from 'react';

import { buildAiPhotoOpsPlan, type AiPhotoOpsPlan } from '../../../lib/aiPhotoOps';
import {
  analyzeGuestPhotoUploads,
  createGuestPhotoBucketCorrection,
  moveGuestPhotoUploadToBucket,
  persistGuestPhotoAiOpsPlan,
} from '../guestPhotoSharingService';
import {
  safePhotoOwnerError,
  type PhotoAiBucketCorrectionRow,
  type PhotoBucketRow,
  type PhotoUploadAiAnalysisRow,
  type PhotoUploadRow,
} from '../guestPhotoSharingUtils';

interface UseGuestPhotoAiActionsArgs {
  buckets: PhotoBucketRow[];
  bucketDisplayName: (bucket: PhotoBucketRow | undefined | null) => string;
  load: () => Promise<void>;
  setAiBucketCorrections: React.Dispatch<React.SetStateAction<PhotoAiBucketCorrectionRow[]>>;
  setAiPhotoOpsPlan: React.Dispatch<React.SetStateAction<AiPhotoOpsPlan | null>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setSuccess: React.Dispatch<React.SetStateAction<string | null>>;
  setUploadAnalyses: React.Dispatch<React.SetStateAction<PhotoUploadAiAnalysisRow[]>>;
  setUploads: React.Dispatch<React.SetStateAction<PhotoUploadRow[]>>;
  siteId: string | null;
  siteSlug: string | null;
  unanalyzedUploads: PhotoUploadRow[];
  uploadAnalyses: PhotoUploadAiAnalysisRow[];
  uploads: PhotoUploadRow[];
  visionHighConfidenceMoves: PhotoUploadAiAnalysisRow[];
}

export function useGuestPhotoAiActions({
  buckets,
  bucketDisplayName,
  load,
  setAiBucketCorrections,
  setAiPhotoOpsPlan,
  setError,
  setSuccess,
  setUploadAnalyses,
  setUploads,
  siteId,
  siteSlug,
  unanalyzedUploads,
  uploadAnalyses,
  uploads,
  visionHighConfidenceMoves,
}: UseGuestPhotoAiActionsArgs) {
  const [aiPhotoOpsBusy, setAiPhotoOpsBusy] = useState(false);
  const [aiPhotoMovesBusy, setAiPhotoMovesBusy] = useState(false);
  const [visionAiBusy, setVisionAiBusy] = useState(false);
  const [visionMovesBusy, setVisionMovesBusy] = useState(false);

  const persistAiPhotoOpsPlanState = useCallback(async (plan: AiPhotoOpsPlan) => {
    if (!siteId) return;
    await persistGuestPhotoAiOpsPlan(siteId, plan);
  }, [siteId]);

  const recordVisionCorrection = useCallback(async (
    analysis: PhotoUploadAiAnalysisRow,
    action: PhotoAiBucketCorrectionRow['action'],
    chosenBucketId: string | null,
    reason: string,
  ) => {
    if (!siteId) return;
    const nextCorrection = await createGuestPhotoBucketCorrection(siteId, analysis, action, chosenBucketId, reason);
    setAiBucketCorrections((prev) => [nextCorrection, ...prev].slice(0, 100));
  }, [setAiBucketCorrections, siteId]);

  const generateAiPhotoOpsPlan = useCallback(async () => {
    if (!siteId) return;
    if (uploads.length === 0) {
      setError('Upload a few guest photos before organizing them.');
      return;
    }
    if (buckets.length === 0) {
      setError('Create at least one photo album before organizing uploads.');
      return;
    }

    setAiPhotoOpsBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const bucketCounts = new Map<string, number>();
      uploads.forEach((upload) => bucketCounts.set(upload.photo_album_id, (bucketCounts.get(upload.photo_album_id) ?? 0) + 1));
      const bucketById = new Map(buckets.map((bucket) => [bucket.id, bucket]));
      const plan = await buildAiPhotoOpsPlan({
        coupleLabel: siteSlug ?? 'this wedding',
        buckets: buckets.map((bucket) => ({
          id: bucket.id,
          name: bucket.name,
          slug: bucket.slug,
          parentBucketId: bucket.parent_album_id,
          hierarchyLabel: bucketDisplayName(bucket),
          isActive: bucket.is_active,
          uploadCount: bucketCounts.get(bucket.id) ?? 0,
        })),
        uploads: uploads
          .filter((upload) => !upload.is_hidden && !upload.is_flagged)
          .map((upload) => {
            const bucket = bucketById.get(upload.photo_album_id);
            return {
              id: upload.id,
              currentBucketId: upload.photo_album_id,
              currentBucketName: bucketDisplayName(bucket),
              filename: upload.original_filename,
              guestName: upload.guest_name,
              note: upload.note,
              mimeType: upload.mime_type,
              uploadedAt: upload.uploaded_at,
            };
          }),
      });
      setAiPhotoOpsPlan(plan);
      await persistAiPhotoOpsPlanState(plan);
      setSuccess('Organized the photo board and saved a slideshow plan.');
    } catch (err) {
      setError(safePhotoOwnerError(err, 'Couldn’t organize the photo uploads yet.'));
    } finally {
      setAiPhotoOpsBusy(false);
    }
  }, [
    bucketDisplayName,
    buckets,
    persistAiPhotoOpsPlanState,
    setAiPhotoOpsPlan,
    setError,
    setSuccess,
    siteId,
    siteSlug,
    uploads,
  ]);

  const applyHighConfidencePhotoMoves = useCallback(async (aiPhotoOpsPlan: AiPhotoOpsPlan | null) => {
    if (!siteId || !aiPhotoOpsPlan) return;
    const moves = aiPhotoOpsPlan.bucketSuggestions.filter(
      (suggestion) => suggestion.confidence >= 0.74 && suggestion.targetBucketId !== suggestion.currentBucketId,
    );

    if (moves.length === 0) {
      setSuccess('No high-confidence album moves to apply yet.');
      return;
    }

    setAiPhotoMovesBusy(true);
    setError(null);
    setSuccess(null);
    try {
      for (const move of moves) {
        await moveGuestPhotoUploadToBucket(siteId, move.uploadId, move.targetBucketId);
      }

      setUploads((prev) => prev.map((upload) => {
        const move = moves.find((entry) => entry.uploadId === upload.id);
        return move ? { ...upload, photo_album_id: move.targetBucketId } : upload;
      }));
      setSuccess(`Moved ${moves.length} upload${moves.length === 1 ? '' : 's'} into stronger albums.`);
    } catch (err) {
      setError(safePhotoOwnerError(err, 'Couldn’t move those photos yet.'));
    } finally {
      setAiPhotoMovesBusy(false);
    }
  }, [setError, setSuccess, setUploads, siteId]);

  const applyVisionSuggestion = useCallback(async (analysis: PhotoUploadAiAnalysisRow) => {
    if (!siteId || !analysis.suggested_bucket_id) return;
    setVisionMovesBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await moveGuestPhotoUploadToBucket(siteId, analysis.upload_id, analysis.suggested_bucket_id);
      await recordVisionCorrection(analysis, 'accepted', analysis.suggested_bucket_id, 'Accepted album suggestion.');
      setUploads((prev) => prev.map((upload) => upload.id === analysis.upload_id ? { ...upload, photo_album_id: analysis.suggested_bucket_id as string } : upload));
      setUploadAnalyses((prev) => prev.map((entry) => entry.upload_id === analysis.upload_id ? { ...entry, photo_album_id: analysis.suggested_bucket_id } : entry));
      setSuccess('Moved the photo and saved the preference.');
    } catch {
      setError('Couldn’t move that photo right now. Please try again.');
    } finally {
      setVisionMovesBusy(false);
    }
  }, [recordVisionCorrection, setError, setSuccess, setUploadAnalyses, setUploads, siteId]);

  const rejectVisionSuggestion = useCallback(async (analysis: PhotoUploadAiAnalysisRow) => {
    if (!siteId) return;
    setVisionMovesBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await recordVisionCorrection(analysis, 'rejected', analysis.photo_album_id, 'Rejected album suggestion.');
      setSuccess('Saved. Future sorting will use that correction.');
    } catch (err) {
      setError(safePhotoOwnerError(err, 'Couldn’t save that preference yet.'));
    } finally {
      setVisionMovesBusy(false);
    }
  }, [recordVisionCorrection, setError, setSuccess, siteId]);

  const analyzeUploadsWithVision = useCallback(async (force = false) => {
    if (!siteId) return;
    if (uploads.length === 0) {
      setError('Upload photos before sorting them.');
      return;
    }

    setVisionAiBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const targetUploads = force ? uploads.filter((upload) => !upload.is_hidden && !upload.is_flagged) : unanalyzedUploads;
      const uploadIds = targetUploads.slice(0, 40).map((upload) => upload.id);
      if (uploadIds.length === 0) {
        setSuccess('All visible uploads already have saved photo details.');
        return;
      }

      const data = await analyzeGuestPhotoUploads(siteId, uploadIds, force, force ? 'vision' : 'auto');
      const nextResults = data.results ?? [];
      setUploadAnalyses((prev) => {
        const byId = new Map(prev.map((analysis) => [analysis.upload_id, analysis]));
        nextResults.forEach((analysis) => byId.set(analysis.upload_id, analysis));
        return Array.from(byId.values()).sort((a, b) => new Date(b.analyzed_at).getTime() - new Date(a.analyzed_at).getTime());
      });
      setSuccess(`Photo details updated for ${data.analyzed ?? nextResults.length} upload${(data.analyzed ?? nextResults.length) === 1 ? '' : 's'}.`);
      await load();
    } catch (err) {
      setError(safePhotoOwnerError(err, 'Couldn’t review those photos yet.'));
    } finally {
      setVisionAiBusy(false);
    }
  }, [load, setError, setSuccess, setUploadAnalyses, siteId, unanalyzedUploads, uploads]);

  const applyHighConfidenceVisionMoves = useCallback(async () => {
    if (!siteId) return;
    const moves = visionHighConfidenceMoves;
    if (moves.length === 0) {
      setSuccess('No high-confidence album moves to apply yet.');
      return;
    }

    setVisionMovesBusy(true);
    setError(null);
    setSuccess(null);
    try {
      for (const move of moves) {
        if (!move.suggested_bucket_id) continue;
        await moveGuestPhotoUploadToBucket(siteId, move.upload_id, move.suggested_bucket_id);
        await recordVisionCorrection(move, 'accepted', move.suggested_bucket_id, 'Accepted high-confidence album suggestion.');
      }

      setUploads((prev) => prev.map((upload) => {
        const move = moves.find((entry) => entry.upload_id === upload.id);
        return move?.suggested_bucket_id ? { ...upload, photo_album_id: move.suggested_bucket_id } : upload;
      }));
      setUploadAnalyses((prev) => prev.map((analysis) => {
        const move = moves.find((entry) => entry.upload_id === analysis.upload_id);
        return move?.suggested_bucket_id ? { ...analysis, photo_album_id: move.suggested_bucket_id } : analysis;
      }));
      setSuccess(`Applied ${moves.length} confirmed album move${moves.length === 1 ? '' : 's'}.`);
    } catch (err) {
      setError(safePhotoOwnerError(err, 'Couldn’t apply album moves.'));
    } finally {
      setVisionMovesBusy(false);
    }
  }, [recordVisionCorrection, setError, setSuccess, setUploadAnalyses, setUploads, siteId, visionHighConfidenceMoves]);

  return {
    aiPhotoMovesBusy,
    aiPhotoOpsBusy,
    analyzeUploadsWithVision,
    applyHighConfidencePhotoMoves,
    applyHighConfidenceVisionMoves,
    applyVisionSuggestion,
    generateAiPhotoOpsPlan,
    rejectVisionSuggestion,
    visionAiBusy,
    visionMovesBusy,
  };
}
