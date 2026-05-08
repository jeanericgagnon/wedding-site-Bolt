import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';

type GuestPhotoQuickStartBannerProps = {
  onContinue: () => void;
};

export function GuestPhotoQuickStartBanner({ onContinue }: GuestPhotoQuickStartBannerProps) {
  return (
    <Card className="p-4 border border-primary/20 bg-primary/5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-primary">Next up: add photos, then review your draft</p>
          <p className="text-xs text-text-secondary mt-1">Upload couple photos here. When you are ready, continue to your wedding home to review the draft and keep shaping the site.</p>
        </div>
        <Button variant="outline" size="sm" onClick={onContinue}>
          Continue to review
        </Button>
      </div>
    </Card>
  );
}
