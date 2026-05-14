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
          <p className="text-sm font-semibold text-text-primary">Next up: add photos, then continue your site</p>
          <p className="text-xs text-text-secondary mt-1">Upload couple photos here. When you’re ready, continue to your wedding to review your site and keep shaping it.</p>
        </div>
        <Button variant="outline" size="sm" onClick={onContinue}>
          Continue your site
        </Button>
      </div>
    </Card>
  );
}
