import { Card } from '../../../components/ui/Card';
import type { MemoryFlowReadiness } from '../../../lib/memoryFlowReadiness';

type GuestPhotoMemoryFlowCardProps = {
  memoryFlowReadiness: MemoryFlowReadiness;
};

export function GuestPhotoMemoryFlowCard({ memoryFlowReadiness }: GuestPhotoMemoryFlowCardProps) {
  return (
    <Card className="p-6 border border-neutral-200 bg-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-text-tertiary">No-app memory flow</p>
          <h2 className="mt-2 text-xl font-semibold text-text-primary">Know what is ready before the QR goes on a sign.</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
            This keeps upload links, guestbook notes, moderation, recap, and follow-up in one launch checklist instead of scattered album controls.
          </p>
        </div>
        <span className="inline-flex w-fit items-center rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1.5 text-sm font-medium text-text-primary">
          {memoryFlowReadiness.readyCount} of {memoryFlowReadiness.steps.length} ready
        </span>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {memoryFlowReadiness.summaryBadges.map((badge) => (
          <div key={badge} className="rounded-lg border border-border-subtle bg-white px-3 py-2">
            <p className="text-xs font-medium text-text-secondary">{badge}</p>
          </div>
        ))}
      </div>
      {memoryFlowReadiness.mainGapLabel && (
        <p className="mt-3 text-xs text-text-tertiary">{memoryFlowReadiness.mainGapLabel}</p>
      )}
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {memoryFlowReadiness.lanes.map((lane) => (
          <div key={lane.id} className="rounded-lg border border-border-subtle bg-surface-subtle/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-text-primary">{lane.label}</p>
              <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-medium ${
                lane.status === 'ready'
                  ? 'bg-success/10 text-success'
                  : lane.status === 'needs-action'
                    ? 'bg-warning/10 text-warning'
                    : lane.status === 'planned'
                      ? 'bg-surface-subtle text-text-tertiary'
                      : 'bg-white text-text-tertiary'
              }`}>
                {lane.status === 'ready' ? 'Ready' : lane.status === 'needs-action' ? 'Needs action' : lane.status === 'planned' ? 'Planned' : 'Empty'}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-text-secondary">{lane.detail}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {memoryFlowReadiness.steps.map((step) => (
          <div key={step.id} className="rounded-lg border border-border-subtle bg-surface-subtle/50 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-text-primary">{step.label}</p>
              <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-medium ${
                step.status === 'ready'
                  ? 'bg-success/10 text-success'
                  : step.status === 'needs-action'
                    ? 'bg-warning/10 text-warning'
                    : step.status === 'planned'
                      ? 'bg-surface-subtle text-text-tertiary'
                      : 'bg-white text-text-tertiary'
              }`}>
                {step.status === 'ready' ? 'Ready' : step.status === 'needs-action' ? 'Needs action' : step.status === 'planned' ? 'Planned' : 'Empty'}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-text-secondary">{step.detail}</p>
          </div>
        ))}
      </div>
      {memoryFlowReadiness.blockers.length > 0 && (
        <div className="mt-4 rounded-lg border border-warning/20 bg-warning/5 p-4">
          <p className="text-sm font-semibold text-text-primary">Before sharing broadly</p>
          <ul className="mt-2 space-y-1 text-xs text-text-secondary">
            {memoryFlowReadiness.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
