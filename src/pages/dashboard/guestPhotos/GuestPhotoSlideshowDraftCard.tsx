import { Clapperboard, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';

type GuestPhotoSlideshowDraftCardProps = {
  slideshowReadyBucketCount: number;
  aiPhotoOpsBusy: boolean;
  uploadCount: number;
  bucketCount: number;
  onGenerateAiPhotoOpsPlan: () => void;
};

export function GuestPhotoSlideshowDraftCard({
  slideshowReadyBucketCount,
  aiPhotoOpsBusy,
  uploadCount,
  bucketCount,
  onGenerateAiPhotoOpsPlan,
}: GuestPhotoSlideshowDraftCardProps) {
  return (
    <Card className="p-6 border border-border-subtle bg-white">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clapperboard className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-text-primary">Slideshow draft</h2>
          </div>
          <p className="text-sm text-text-secondary">
            Turn uploaded guest photos into a simple slideshow. Start with your strongest moments, preview the sequence, then polish later.
          </p>
          <p className="mt-2 text-xs text-text-tertiary">
            Ready now: <span className="font-semibold text-text-primary">{slideshowReadyBucketCount}</span> album{slideshowReadyBucketCount === 1 ? '' : 's'} with 3+ uploads.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="accent"
            onClick={onGenerateAiPhotoOpsPlan}
            disabled={aiPhotoOpsBusy || uploadCount === 0 || bucketCount === 0}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {aiPhotoOpsBusy ? 'Organizing...' : 'Organize uploads'}
          </Button>
          <Button variant="outline">
            <Clapperboard className="w-4 h-4 mr-2" />
            Slideshow draft ready
          </Button>
        </div>
      </div>
    </Card>
  );
}
