import { Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { safePhotoAnalysisText } from '../../../lib/photoAnalysisCustomerCopy';
import type { AiPhotoOpsPlan } from '../../../lib/aiPhotoOps';
import { tagLabel } from '../guestPhotoSharingUtils';

type GuestPhotoOrganizerCardProps = {
  aiPhotoOpsPlan: AiPhotoOpsPlan;
  aiSlideshowFrameCount: number;
  aiPhotoMovesBusy: boolean;
  aiHighConfidenceMoveCount: number;
  copied: string;
  onApplyHighConfidencePhotoMoves: () => void;
  onCopyOrganizerNotes: () => void;
};

export function GuestPhotoOrganizerCard({
  aiPhotoOpsPlan,
  aiSlideshowFrameCount,
  aiPhotoMovesBusy,
  aiHighConfidenceMoveCount,
  copied,
  onApplyHighConfidencePhotoMoves,
  onCopyOrganizerNotes,
}: GuestPhotoOrganizerCardProps) {
  return (
    <Card className="p-6 border border-border-subtle bg-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-text-primary">Photo organizer</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
            {safePhotoAnalysisText(aiPhotoOpsPlan.summary, 'Created an organization and slideshow plan for review.')}
          </p>
          <p className="mt-2 text-xs text-text-tertiary">
            {aiPhotoOpsPlan.bucketSuggestions.length} photos reviewed · {aiSlideshowFrameCount} slideshow frames drafted
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="border-border-subtle text-text-primary hover:bg-surface-subtle"
            disabled={aiPhotoMovesBusy || aiHighConfidenceMoveCount === 0}
            onClick={onApplyHighConfidencePhotoMoves}
          >
            {aiPhotoMovesBusy ? 'Applying...' : `Apply ${aiHighConfidenceMoveCount} suggested move${aiHighConfidenceMoveCount === 1 ? '' : 's'}`}
          </Button>
          <Button
            variant="outline"
            className="border-border-subtle text-text-primary hover:bg-surface-subtle"
            onClick={onCopyOrganizerNotes}
          >
            {copied === 'ai-photo-plan' ? 'Copied notes' : 'Copy organizer notes'}
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 px-4 py-4">
          <p className="text-sm font-semibold text-text-primary">Suggested album moves</p>
          <div className="mt-3 space-y-2">
            {aiPhotoOpsPlan.bucketSuggestions.slice(0, 6).map((suggestion) => (
              <div key={suggestion.uploadId} className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-neutral-900">{suggestion.targetBucketName}</p>
                  <span className="rounded-lg bg-white px-2 py-0.5 text-xs font-medium text-text-secondary ring-1 ring-border-subtle">{Math.round(suggestion.confidence * 100)}%</span>
                </div>
                <p className="mt-1 text-xs text-neutral-600">
                  {safePhotoAnalysisText(suggestion.reason, 'This looks like the best fit for the album.')}
                </p>
                {(suggestion.detectedMoment || (suggestion.tags?.length ?? 0) > 0) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {suggestion.detectedMoment && (
                      <span className="rounded-lg bg-white px-2 py-0.5 text-[11px] font-medium text-text-secondary ring-1 ring-border-subtle">
                        {suggestion.detectedMoment}
                      </span>
                    )}
                    {suggestion.tags?.slice(0, 5).map((tag) => (
                      <span key={`${suggestion.uploadId}-${tag}`} className="rounded-lg bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-600 ring-1 ring-neutral-200">
                        {tagLabel(tag)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 px-4 py-4">
          <p className="text-sm font-semibold text-text-primary">{aiPhotoOpsPlan.slideshow.title}</p>
          <p className="mt-1 text-xs text-text-tertiary">{aiPhotoOpsPlan.slideshow.mood}</p>
          <div className="mt-3 space-y-2">
            {aiPhotoOpsPlan.slideshow.frames.slice(0, 5).map((frame, index) => (
              <div key={`${frame.uploadId}-${index}`} className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                <p className="text-xs font-semibold text-neutral-500">Frame {index + 1} · {frame.bucketName}</p>
                <p className="mt-1 text-sm text-neutral-800">
                  {safePhotoAnalysisText(frame.caption, 'A warm wedding moment.')}
                </p>
                {(frame.tags?.length ?? 0) > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {frame.tags?.slice(0, 4).map((tag) => (
                      <span key={`${frame.uploadId}-${tag}`} className="rounded-lg bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-600 ring-1 ring-neutral-200">
                        {tagLabel(tag)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
