import React from 'react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { CheckCircle2, FileCheck2, FileStack, MapPinned, Sparkles } from 'lucide-react';
import type {
  DualPartnerTrackCard,
  InstitutionCoverageCategory,
  InstitutionPacketCard,
  PlannerExportCard,
  StatePlaybookViewModel,
} from './NameChangePlannerPanelTypes';

interface NameChangeStatePlaybookPanelProps {
  statePlaybook: StatePlaybookViewModel;
}

interface NameChangeInstitutionCoveragePanelProps {
  categories: InstitutionCoverageCategory[];
  getExecutionSummaryTone: (status: string) => string;
}

interface NameChangeInstitutionPacketsPanelProps {
  institutionPackets: InstitutionPacketCard[];
  copiedInstitutionPacketNotice: {
    key: string;
    mode: 'copied' | 'downloaded';
  } | null;
  copyingInstitutionPacketKey: string | null;
  copyInstitutionPacket: (key: string, text: string, fileName: string) => Promise<void>;
  getExecutionSummaryTone: (status: string) => string;
}

interface NameChangeDualPartnerRolloutPanelProps {
  tracks: DualPartnerTrackCard[];
  getExecutionSummaryTone: (status: string) => string;
}

interface NameChangePlannerExportsPanelProps {
  plannerExports: PlannerExportCard[];
  copiedPlannerExportNotice: {
    key: string;
    mode: 'copied' | 'downloaded';
  } | null;
  copyingPlannerExportKey: string | null;
  copyPlannerExport: (key: string, text: string, fileName: string) => Promise<void>;
}

export function NameChangeStatePlaybookPanel({
  statePlaybook,
}: NameChangeStatePlaybookPanelProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MapPinned className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-text-primary">State playbook</h3>
          </div>
          <p className="mt-1 text-sm text-text-secondary">A grounded jurisdiction note for the certificate chain, resident-ID handoff, and downstream proof packet.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-text-secondary">
          <span className="rounded-xl bg-surface-subtle px-2 py-1">{statePlaybook.matchedStateLabel}</span>
          <span className="rounded-xl bg-primary/10 px-2 py-1 text-primary">{statePlaybook.supportLabel}</span>
        </div>
      </div>

      <p className="mt-4 text-sm text-text-primary">{statePlaybook.summary}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-border-subtle p-4">
          <p className="text-xs text-text-tertiary">Office path</p>
          <p className="mt-2 text-sm font-semibold text-text-primary">{statePlaybook.officeLabel}</p>
          <p className="mt-2 text-sm text-text-secondary">{statePlaybook.officeDetail}</p>
        </div>
        <div className="rounded-2xl border border-border-subtle p-4">
          <p className="text-xs text-text-tertiary">County grounding</p>
          <p className="mt-2 text-sm text-text-secondary">{statePlaybook.countyDetail}</p>
        </div>
        <div className="rounded-2xl border border-border-subtle p-4">
          <p className="text-xs text-text-tertiary">Proof packet</p>
          <p className="mt-2 text-sm text-text-secondary">{statePlaybook.proofPacketDetail}</p>
        </div>
        <div className="rounded-2xl border border-border-subtle p-4">
          <p className="text-xs text-text-tertiary">Downstream handoff</p>
          <p className="mt-2 text-sm text-text-secondary">{statePlaybook.downstreamDetail}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-xs text-primary">Partner note</p>
        <p className="mt-2 text-sm text-text-primary">{statePlaybook.partnerDetail}</p>
        <ul className="mt-3 space-y-1 text-xs text-text-secondary">
          {statePlaybook.checklist.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

export function NameChangeInstitutionCoveragePanel({
  categories,
  getExecutionSummaryTone,
}: NameChangeInstitutionCoveragePanelProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-text-primary">Institution coverage map</h3>
          </div>
          <p className="mt-1 text-sm text-text-secondary">See which downstream lanes are already represented in the planner so rollout feels like a system, not a short checklist.</p>
        </div>
        <span className="rounded-xl bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
          {categories.length} lanes
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {categories.map((category) => (
          <div key={category.id} className="rounded-2xl border border-border-subtle p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">{category.label}</p>
                <p className="mt-1 text-sm text-text-secondary">{category.summary}</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className={`rounded-xl px-2 py-1 text-xs ${getExecutionSummaryTone(category.status)}`}>
                  {category.status}
                </span>
                <span className="rounded-xl bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
                  {category.targetCount} targets
                </span>
              </div>
            </div>
            <p className="mt-3 text-xs text-text-secondary">Planner keys: {category.institutionKeys.join(' · ')}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function NameChangeInstitutionPacketsPanel({
  institutionPackets,
  copiedInstitutionPacketNotice,
  copyingInstitutionPacketKey,
  copyInstitutionPacket,
  getExecutionSummaryTone,
}: NameChangeInstitutionPacketsPanelProps) {
  if (institutionPackets.length === 0) return null;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileStack className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-text-primary">Institution handoff packets</h3>
          </div>
          <p className="mt-1 text-sm text-text-secondary">Carry a cluster-specific packet into banking, payroll, insurance, travel, or household follow-through without rebuilding the proof story from scratch.</p>
        </div>
        <span className="rounded-xl bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
          {institutionPackets.length} packets
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {institutionPackets.map((packet) => (
          <div key={packet.key} className="rounded-2xl border border-border-subtle p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">{packet.label}</p>
                <p className="mt-2 text-sm text-text-secondary">{packet.summary}</p>
              </div>
              <span className={`rounded-xl px-2 py-1 text-xs ${getExecutionSummaryTone(packet.readiness)}`}>
                {packet.readiness}
              </span>
            </div>
            <p className="mt-3 text-xs text-text-secondary">Includes: {packet.institutionLabels.join(' · ')}</p>
            <p className="mt-2 text-xs text-text-secondary">Proof to have handy: {packet.proofDocuments.join(' · ')}</p>
            <p className="mt-2 text-xs text-text-secondary">Completion check: {packet.completionCheck}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-4"
              disabled={Boolean(copyingInstitutionPacketKey)}
              onClick={() => void copyInstitutionPacket(packet.key, packet.text, packet.fileName)}
            >
              {copiedInstitutionPacketNotice?.key === packet.key
                ? copiedInstitutionPacketNotice.mode === 'downloaded'
                  ? `Downloaded ${packet.label.toLowerCase()}`
                  : `Copied ${packet.label.toLowerCase()}`
                : copyingInstitutionPacketKey === packet.key
                  ? 'Copying...'
                  : `Copy ${packet.label.toLowerCase()}`}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function NameChangeDualPartnerRolloutPanel({
  tracks,
  getExecutionSummaryTone,
}: NameChangeDualPartnerRolloutPanelProps) {
  if (tracks.length === 0) return null;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-text-primary">Dual-partner rollout</h3>
          </div>
          <p className="mt-1 text-sm text-text-secondary">Keep proof, updated-ID, and downstream confirmations separated per partner so one timeline does not hide the other.</p>
        </div>
        <span className="rounded-xl bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
          {tracks.length} partner tracks
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {tracks.map((track) => (
          <div key={track.id} className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">{track.label}</p>
                <p className="mt-1 text-xs text-text-secondary">Depends on: {track.dependsOnStepIds.join(' → ')}</p>
              </div>
              <span className={`rounded-xl px-2 py-1 text-xs ${getExecutionSummaryTone(track.status)}`}>
                {track.status}
              </span>
            </div>
            <p className="mt-3 text-xs text-text-secondary">Proof packet: {track.requiredProof.join(' · ')}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function NameChangePlannerExportsPanel({
  plannerExports,
  copiedPlannerExportNotice,
  copyingPlannerExportKey,
  copyPlannerExport,
}: NameChangePlannerExportsPanelProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-text-primary">Wedding identity exports</h3>
          </div>
          <p className="mt-1 text-sm text-text-secondary">Carry a working packet into a bank, insurer, payroll conversation, or shared handoff without rebuilding the planner context from memory.</p>
        </div>
        <span className="rounded-xl bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
          {plannerExports.length} exports
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {plannerExports.map((exportItem) => (
          <div key={exportItem.key} className="rounded-2xl border border-border-subtle p-4">
            <p className="text-sm font-semibold text-text-primary">{exportItem.label}</p>
            <p className="mt-2 text-sm text-text-secondary">{exportItem.summary}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-4"
              disabled={Boolean(copyingPlannerExportKey)}
              onClick={() => void copyPlannerExport(exportItem.key, exportItem.text, exportItem.fileName)}
            >
              {copiedPlannerExportNotice?.key === exportItem.key
                ? copiedPlannerExportNotice.mode === 'downloaded'
                  ? `Downloaded ${exportItem.label.toLowerCase()}`
                  : `Copied ${exportItem.label.toLowerCase()}`
                : copyingPlannerExportKey === exportItem.key
                  ? 'Copying...'
                  : `Copy ${exportItem.label.toLowerCase()}`}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
