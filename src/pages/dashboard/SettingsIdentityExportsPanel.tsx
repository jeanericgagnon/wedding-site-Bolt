import { Copy, Image, Layout, Palette } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '../../components/ui';
import { getFlowStatusLabel } from '../../lib/flowLabels';
import type { WeddingIdentityExportKit, WeddingIdentityPrintAsset } from '../../lib/weddingIdentityExports';

type SettingsIdentityExportsPanelProps = {
  publicSiteUrl: string;
  onCopyIdentityManifest: () => void;
  onCopyIdentityStyleKit: () => void;
  onDownloadIdentityStoryGraphic: () => void;
  onDownloadIdentityPrintPack: () => void;
  weddingIdentityExportKit: WeddingIdentityExportKit;
  weddingIdentityPrintAssets: WeddingIdentityPrintAsset[];
  hasStoryGraphic: boolean;
};

export function SettingsIdentityExportsPanel({
  publicSiteUrl,
  onCopyIdentityManifest,
  onCopyIdentityStyleKit,
  onDownloadIdentityStoryGraphic,
  onDownloadIdentityPrintPack,
  weddingIdentityExportKit,
  weddingIdentityPrintAssets,
  hasStoryGraphic,
}: SettingsIdentityExportsPanelProps) {
  return (
    <Card variant="bordered" padding="lg">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Wedding identity exports</CardTitle>
            <CardDescription>Prepare one consistent kit for QR cards, inserts, signage, and planner handoff.</CardDescription>
          </div>
          <Badge variant={weddingIdentityExportKit.warnings.length > 0 ? 'warning' : 'success'}>
            {weddingIdentityExportKit.readyCount} of {weddingIdentityExportKit.items.length} ready
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Input
            label="Public site URL"
            value={publicSiteUrl || 'Not set'}
            readOnly
            helperText="These exports only use the public site path, never private invite links."
          />

          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Export confidence</p>
              <p className="mt-1 text-sm font-semibold text-text-primary">{weddingIdentityExportKit.confidenceTitle}</p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{weddingIdentityExportKit.confidenceDetail}</p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Delivery rule</p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{weddingIdentityExportKit.deliveryNote}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {weddingIdentityExportKit.items.map((item) => (
              <div key={item.id} className="rounded-lg border border-border-subtle bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                    <p className="mt-1 text-xs text-text-secondary">{item.description}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-medium ${
                      item.status === 'ready'
                        ? 'bg-success/10 text-success'
                        : item.status === 'needs-info'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-surface-subtle text-text-tertiary'
                    }`}
                  >
                    {item.status === 'ready' ? 'Ready' : item.status === 'needs-info' ? 'Needs info' : 'Planned'}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-text-tertiary">{item.format}</p>
                {item.blockers.length > 0 && (
                  <p className="mt-2 text-[11px] leading-4 text-text-secondary">{item.blockers.join(' ')}</p>
                )}
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 p-4">
            <div className="mb-4 grid gap-3 lg:grid-cols-3">
              {weddingIdentityExportKit.handoffSequence.map((step) => (
                <div key={step.id} className="rounded-lg border border-border-subtle bg-white px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-text-primary">{step.title}</p>
                    <span className="rounded-full border border-border-subtle bg-surface-subtle px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                      {getFlowStatusLabel(step.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-text-secondary">{step.detail}</p>
                </div>
              ))}
            </div>
            <div className="mb-4 grid gap-3 lg:grid-cols-3">
              {weddingIdentityExportKit.quickPacks.map((pack) => (
                <div key={pack.id} className="rounded-lg border border-border-subtle bg-white px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-text-primary">{pack.label}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${pack.readiness === 'ready' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                      {pack.readiness === 'ready' ? 'Ready' : 'Needs info'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">{pack.detail}</p>
                  <p className="mt-2 text-[11px] text-text-tertiary">{pack.bestFor}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {pack.includes.map((item) => (
                      <span key={item} className="rounded-full border border-border-subtle bg-surface-subtle px-2 py-0.5 text-[11px] text-text-secondary">
                        {item}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] leading-5 text-text-secondary">{pack.nextStep}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {weddingIdentityExportKit.manifest.map((entry) => (
                <div key={entry.label}>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">{entry.label}</p>
                  <p className="mt-0.5 truncate text-sm text-text-primary">{entry.value}</p>
                </div>
              ))}
            </div>
            {weddingIdentityExportKit.warnings.length > 0 && (
              <div className="mt-3 space-y-1 text-xs text-text-secondary">
                {weddingIdentityExportKit.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onCopyIdentityManifest}>
                <Copy className="mr-1 h-3.5 w-3.5" />
                Copy manifest
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={onCopyIdentityStyleKit}>
                <Palette className="mr-1 h-3.5 w-3.5" />
                Copy style kit
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={weddingIdentityPrintAssets.length === 0}
                onClick={onDownloadIdentityPrintPack}
              >
                <Layout className="mr-1 h-3.5 w-3.5" />
                Save print pack
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasStoryGraphic}
                onClick={onDownloadIdentityStoryGraphic}
              >
                <Image className="mr-1 h-3.5 w-3.5" />
                Save story graphic
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
