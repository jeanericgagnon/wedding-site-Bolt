import { Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { safeOptionalPhotoAnalysisText, safePhotoAnalysisList, safePhotoAnalysisText } from '../../../lib/photoAnalysisCustomerCopy';
import { analysisSourceLabel, type PhotoUploadAiAnalysisRow, type PhotoUploadMetadataRow, type PhotoUploadRow } from '../guestPhotoSharingUtils';

type GuestPhotoMomentsCardProps = {
  uploadAnalyses: PhotoUploadAiAnalysisRow[];
  uploads: PhotoUploadRow[];
  metadataByUploadId: Map<string, PhotoUploadMetadataRow>;
  visionReadyCount: number;
  visionFallbackCount: number;
  unanalyzedUploadCount: number;
  metadataExifCount: number;
  metadataGpsCount: number;
  metadataEventMatchCount: number;
  aiAcceptedCorrectionCount: number;
  aiRejectedCorrectionCount: number;
  visionAiBusy: boolean;
  visionMovesBusy: boolean;
  visionHighConfidenceMoveCount: number;
  onAnalyzeNewPhotos: () => void;
  onAnalyzeVisiblePhotos: () => void;
  onApplyHighConfidenceMoves: () => void;
  onApplyVisionSuggestion: (analysis: PhotoUploadAiAnalysisRow) => void;
  onRejectVisionSuggestion: (analysis: PhotoUploadAiAnalysisRow) => void;
  formatDateTime: (value: string | null | undefined) => string;
};

export function GuestPhotoMomentsCard({
  uploadAnalyses,
  uploads,
  metadataByUploadId,
  visionReadyCount,
  visionFallbackCount,
  unanalyzedUploadCount,
  metadataExifCount,
  metadataGpsCount,
  metadataEventMatchCount,
  aiAcceptedCorrectionCount,
  aiRejectedCorrectionCount,
  visionAiBusy,
  visionMovesBusy,
  visionHighConfidenceMoveCount,
  onAnalyzeNewPhotos,
  onAnalyzeVisiblePhotos,
  onApplyHighConfidenceMoves,
  onApplyVisionSuggestion,
  onRejectVisionSuggestion,
  formatDateTime,
}: GuestPhotoMomentsCardProps) {
  return (
    <Card className="p-6 border border-border-subtle bg-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-text-primary">Photo moments</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
            Sort new guest photos into the moments they belong to, then reuse that work for albums, slideshow order, captions, and quality checks.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-secondary">
            <span className="rounded-xl border border-border-subtle bg-surface-subtle px-3 py-1">{uploadAnalyses.length} reviewed</span>
            <span className="rounded-xl border border-border-subtle bg-surface-subtle px-3 py-1">{visionReadyCount} ready</span>
            <span className="rounded-xl border border-border-subtle bg-surface-subtle px-3 py-1">{visionFallbackCount} waiting</span>
            <span className="rounded-xl border border-border-subtle bg-surface-subtle px-3 py-1">{unanalyzedUploadCount} new photos</span>
            <span className="rounded-xl border border-border-subtle bg-surface-subtle px-3 py-1">{metadataExifCount} with time details</span>
            <span className="rounded-xl border border-border-subtle bg-surface-subtle px-3 py-1">{metadataGpsCount} with private place details</span>
            <span className="rounded-xl border border-border-subtle bg-surface-subtle px-3 py-1">{metadataEventMatchCount} matched to the day</span>
            <span className="rounded-xl border border-border-subtle bg-surface-subtle px-3 py-1">{aiAcceptedCorrectionCount} accepted changes</span>
            <span className="rounded-xl border border-border-subtle bg-surface-subtle px-3 py-1">{aiRejectedCorrectionCount} kept as-is</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="accent" disabled={visionAiBusy || uploads.length === 0} onClick={onAnalyzeNewPhotos}>
            <Sparkles className="w-4 h-4 mr-2" />
            {visionAiBusy ? 'Reviewing...' : 'Sort new photos'}
          </Button>
          <Button variant="outline" disabled={visionAiBusy || uploads.length === 0} onClick={onAnalyzeVisiblePhotos}>
            Review visible
          </Button>
          <Button variant="outline" disabled={visionMovesBusy || visionHighConfidenceMoveCount === 0} onClick={onApplyHighConfidenceMoves}>
            {visionMovesBusy ? 'Applying...' : `Apply ${visionHighConfidenceMoveCount} album move${visionHighConfidenceMoveCount === 1 ? '' : 's'}`}
          </Button>
        </div>
      </div>

      {uploadAnalyses.length > 0 && (
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {uploadAnalyses.slice(0, 6).map((analysis) => {
            const upload = uploads.find((entry) => entry.id === analysis.upload_id);
            const metadata = metadataByUploadId.get(analysis.upload_id);
            return (
              <div key={analysis.id} className="rounded-2xl border border-border-subtle bg-surface-subtle px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{safePhotoAnalysisText(analysis.detected_moment, 'Photo')}</p>
                    <p className="mt-1 text-xs text-text-tertiary">{upload?.original_filename ?? 'Upload'} · {analysisSourceLabel(analysis)}</p>
                  </div>
                  <span className="rounded-xl border border-border-subtle bg-white px-2 py-0.5 text-xs font-medium text-text-secondary">{Math.round(analysis.bucket_confidence * 100)}% sure</span>
                </div>
                <p className="mt-2 text-sm leading-5 text-neutral-700">{safePhotoAnalysisText(analysis.caption, 'No caption yet.')}</p>
                {safeOptionalPhotoAnalysisText(analysis.suggested_bucket_name) && (
                  <p className="mt-2 text-xs font-medium text-text-primary">
                    Best album: {safeOptionalPhotoAnalysisText(analysis.suggested_bucket_name)}
                  </p>
                )}
                {metadata && (
                  <p className="mt-2 text-xs text-text-tertiary">
                    {metadata.taken_at ? `Taken ${formatDateTime(metadata.taken_at)}` : 'Time not available'} · {metadata.width && metadata.height ? `${metadata.width}x${metadata.height}` : 'Size unavailable'}{metadata.has_gps ? ' · place details stay private' : ''}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-1">
                  {safePhotoAnalysisList(analysis.tags).slice(0, 4).map((tag) => (
                    <span key={tag} className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{tag}</span>
                  ))}
                </div>
                {analysis.suggested_bucket_id && analysis.suggested_bucket_id !== analysis.photo_album_id && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={visionMovesBusy} onClick={() => onApplyVisionSuggestion(analysis)}>
                      Move photo
                    </Button>
                    <Button size="sm" variant="outline" disabled={visionMovesBusy} onClick={() => onRejectVisionSuggestion(analysis)}>
                      Keep here
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
