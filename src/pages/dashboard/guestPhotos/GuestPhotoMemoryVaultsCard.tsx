import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';

type GuestPhotoMemoryVaultsCardProps = {
  onOpenVaults: () => void;
};

export function GuestPhotoMemoryVaultsCard({ onOpenVaults }: GuestPhotoMemoryVaultsCardProps) {
  return (
    <Card className="border border-stone-200 bg-stone-50/80 text-neutral-900">
      <div className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-medium text-text-tertiary">Memories and vaults</p>
          <h2 className="mt-2 text-xl font-semibold text-text-primary">Albums collect the weekend. Vaults keep the pieces you want to revisit later.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">Use albums for easy guest uploads, then save the most meaningful notes and media for anniversaries and quiet moments after the wedding.</p>
        </div>
        <Button variant="outline" onClick={onOpenVaults}>
          Open Vaults
        </Button>
      </div>
    </Card>
  );
}
