import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { FileStack, Sparkles } from 'lucide-react';
import { NAME_CHANGE_DOCUMENT_CONTRACTS } from '../../../lib/nameChange/documentContract';
import { upsertDraftNameChangeExtractedField } from '../../../lib/nameChange/intakeDraft';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeDocumentIntakeSnapshot,
  NameChangeExtractedFieldInput,
  NameChangeExtractionContractSnapshot,
} from '../../../lib/nameChange/types';
import type { NameChangeDocumentRepairQueueItem } from '../../../lib/nameChange/documentRepairQueue';
import {
  NAME_CHANGE_DOCUMENT_OPTIONS,
  NAME_CHANGE_EXTRACTION_FIELD_LABELS,
  NAME_CHANGE_EXTRACTION_FIELD_PLACEHOLDERS,
  ensureDocument,
  findContractDocument,
  findContractExtractedField,
  getDocumentDetailLabel,
  getDocumentStorageModeLabel,
  getIntakeStatusLabel,
  getRepairSeverityLabel,
  matchesContractDocumentKind,
  parseDocumentSnapshotDraft,
  updateDocument,
} from './nameChangePlannerUi';

interface NameChangeDocumentDetailsPanelProps {
  documents: NameChangeDocumentInput[];
  documentIntakeSnapshot: NameChangeDocumentIntakeSnapshot;
  documentRepairQueue: NameChangeDocumentRepairQueueItem[];
  documentSnapshotDrafts: Record<string, string>;
  setDocumentSnapshotDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onDocumentsChange: (documents: NameChangeDocumentInput[]) => void;
}

interface NameChangeDocumentFieldsPanelProps {
  draftLegalBasis: NameChangeCaseInput['legal_basis'];
  documents: NameChangeDocumentInput[];
  extractedFields: NameChangeExtractedFieldInput[];
  documentIntakeSnapshot: NameChangeDocumentIntakeSnapshot;
  extractionContractSnapshot: NameChangeExtractionContractSnapshot;
  onExtractedFieldsChange: (fields: NameChangeExtractedFieldInput[]) => void;
}

export function NameChangeDocumentDetailsPanel({
  documents,
  documentIntakeSnapshot,
  documentRepairQueue,
  documentSnapshotDrafts,
  setDocumentSnapshotDrafts,
  onDocumentsChange,
}: NameChangeDocumentDetailsPanelProps) {
  return (
    <Card>
      <div className="flex items-center gap-2">
        <FileStack className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Document details</h3>
          <p className="text-sm text-text-secondary">Add only the details you want to track. No file upload is required.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {NAME_CHANGE_DOCUMENT_OPTIONS.map((option) => {
          const present = documents.some((document) => document.document_kind === option.key);
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => present
                ? onDocumentsChange(documents.filter((document) => document.document_kind !== option.key))
                : onDocumentsChange(ensureDocument(documents, option.key, option.label))}
              className={`rounded-xl border px-3 py-1.5 text-sm ${present ? 'border-primary bg-primary/10 text-primary' : 'border-border-subtle text-text-secondary'}`}
            >
              {present ? 'Added · ' : 'Add · '}{option.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border-subtle p-3">
          <p className="text-xs text-text-tertiary">Required ready</p>
          <p className="mt-2 text-sm font-semibold text-text-primary">{documentIntakeSnapshot.summary.requiredReady}</p>
        </div>
        <div className="rounded-xl border border-border-subtle p-3">
          <p className="text-xs text-text-tertiary">Required missing</p>
          <p className="mt-2 text-sm font-semibold text-text-primary">{documentIntakeSnapshot.summary.requiredMissing}</p>
        </div>
        <div className="rounded-xl border border-border-subtle p-3">
          <p className="text-xs text-text-tertiary">Document details ready</p>
          <p className="mt-2 text-sm font-semibold text-text-primary">{documentIntakeSnapshot.summary.metadataReady}</p>
        </div>
        <div className="rounded-xl border border-border-subtle p-3">
          <p className="text-xs text-text-tertiary">Document details to add</p>
          <p className="mt-2 text-sm font-semibold text-text-primary">{documentIntakeSnapshot.summary.metadataGaps}</p>
        </div>
      </div>

      {documentRepairQueue.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-border-subtle p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-text-primary">Document check list</h4>
              <p className="text-xs text-text-secondary">The document details most worth checking before you keep going.</p>
            </div>
            <span className="rounded-xl bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
              {documentRepairQueue.filter((item) => item.severity === 'blocking').length} needed · {documentRepairQueue.filter((item) => item.severity === 'attention').length} worth checking
            </span>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {documentRepairQueue.slice(0, 6).map((item) => (
              <div id={`document-${item.kind}`} key={item.kind} className="rounded-2xl border border-border-subtle p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                    <p className="mt-1 text-xs text-text-secondary">{item.required ? 'Required' : 'Helpful'} · {getIntakeStatusLabel(item.intakeStatus ?? 'not_started')}</p>
                  </div>
                  <span className={`rounded-xl px-2 py-1 text-xs ${item.severity === 'blocking' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>
                    {getRepairSeverityLabel(item.severity)}
                  </span>
                </div>

                <p className="mt-3 text-sm text-text-secondary">{item.impactSummary}</p>
                <p className="mt-2 text-xs text-text-secondary">Payoff: {item.payoffSummary}</p>

                {(item.metadataMissing ?? []).length > 0 ? (
                  <p className="mt-2 text-xs text-text-secondary">Details to add: {(item.metadataMissing ?? []).join(', ')}</p>
                ) : null}
                {item.missingExtractionFields.length > 0 ? (
                  <p className="mt-2 text-xs text-text-secondary">Saved fields missing: {item.missingExtractionFields.join(', ')}</p>
                ) : null}
                {item.impactedTargets.length > 0 ? (
                  <p className="mt-2 text-xs text-text-secondary">Unblocks: {item.impactedTargets.join(', ')}</p>
                ) : null}
                {(item.impactedFields ?? []).length > 0 ? (
                  <p className="mt-2 text-xs text-text-secondary">
                    Helps with: {(item.impactedFields ?? []).slice(0, 4).map((field) => `${field.label} (${field.targetLabel})`).join(', ')}
                  </p>
                ) : null}
                {item.nextActions.length > 0 ? (
                  <div className="mt-3 rounded-xl bg-surface-subtle/60 p-3">
                    <p className="text-xs text-text-tertiary">Next details to check</p>
                    <ul className="mt-2 space-y-2 text-xs text-text-secondary">
                      {item.nextActions.map((action) => (
                        <li key={`${action.category}:${action.label}`} className="rounded-xl border border-border-subtle bg-white/70 px-3 py-2">
                          <p className="font-medium text-text-primary">{action.label}</p>
                          <p className="mt-1 whitespace-pre-line text-xs text-text-secondary">{action.detail}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {documents.length === 0 ? (
          <p className="text-sm text-text-tertiary">No document details yet. That is fine. The planner can still work from what you enter here.</p>
        ) : documents.map((document) => (
          <div key={document.document_kind} className="rounded-2xl border border-border-subtle p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-text-primary">{document.display_name}</p>
                <p className="text-xs text-text-secondary">{getDocumentStorageModeLabel(document.storage_mode)} · {getDocumentDetailLabel(document.document_kind)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-xl px-2 py-1 text-xs ${document.intake_status === 'reviewed' ? 'bg-success/10 text-success' : document.intake_status === 'uploaded' ? 'bg-warning/10 text-warning' : 'bg-surface-subtle text-text-secondary'}`}>{getIntakeStatusLabel(document.intake_status)}</span>
                <Button variant="ghost" size="sm" onClick={() => onDocumentsChange(documents.filter((item) => item.document_kind !== document.document_kind))}>Remove</Button>
              </div>
            </div>

            {(() => {
              const contractStatus = documentIntakeSnapshot.documents.find((item) => item.kind === document.document_kind);
              if (!contractStatus) return null;

              return (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-surface-subtle/60 p-3">
                    <p className="text-xs text-text-tertiary">Detail completeness</p>
                    <p className="mt-2 text-xs text-text-secondary">
                      {contractStatus.metadataMissing.length === 0
                        ? 'Ready for the next steps.'
                        : `Missing: ${contractStatus.metadataMissing.join(', ')}`}
                    </p>
                  </div>
                  <div className="rounded-xl bg-surface-subtle/60 p-3">
                    <p className="text-xs text-text-tertiary">Saved fields</p>
                    <p className="mt-2 text-xs text-text-secondary">
                      {contractStatus.missingExtractionFields.length === 0
                        ? 'All expected fields are saved.'
                        : `Missing: ${contractStatus.missingExtractionFields.join(', ')}`}
                    </p>
                  </div>
                </div>
              );
            })()}

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-text-secondary">Document name</span>
                <input
                  className="w-full rounded-xl border border-border px-3 py-2"
                  value={document.display_name}
                  onChange={(e) => onDocumentsChange(updateDocument(documents, document.document_kind, { display_name: e.target.value }))}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-text-secondary">Intake status</span>
                <select
                  className="w-full rounded-xl border border-border px-3 py-2"
                  value={document.intake_status}
                  onChange={(e) => onDocumentsChange(updateDocument(documents, document.document_kind, { intake_status: e.target.value as NameChangeDocumentInput['intake_status'] }))}
                >
                  <option value="not_started">Not started</option>
                  <option value="uploaded">Uploaded / captured</option>
                  <option value="reviewed">Reviewed</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-text-secondary">Masked filename</span>
                <input
                  className="w-full rounded-xl border border-border px-3 py-2"
                  value={document.file_name_masked ?? ''}
                  onChange={(e) => onDocumentsChange(updateDocument(documents, document.document_kind, { file_name_masked: e.target.value || null }))}
                  placeholder="license-•••.pdf"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-text-secondary">Issuing authority</span>
                <input
                  className="w-full rounded-xl border border-border px-3 py-2"
                  value={document.issuing_authority ?? ''}
                  onChange={(e) => onDocumentsChange(updateDocument(documents, document.document_kind, { issuing_authority: e.target.value || null }))}
                  placeholder="State DMV / county clerk / recorder"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-text-secondary">Issued on</span>
                <input
                  type="date"
                  className="w-full rounded-xl border border-border px-3 py-2"
                  value={document.issued_on ?? ''}
                  onChange={(e) => onDocumentsChange(updateDocument(documents, document.document_kind, { issued_on: e.target.value || null }))}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-text-secondary">Expires on</span>
                <input
                  type="date"
                  className="w-full rounded-xl border border-border px-3 py-2"
                  value={document.expires_on ?? ''}
                  onChange={(e) => onDocumentsChange(updateDocument(documents, document.document_kind, { expires_on: e.target.value || null }))}
                />
              </label>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-text-secondary">Confidence</span>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  className="w-full rounded-xl border border-border px-3 py-2"
                  value={document.extraction_confidence ?? ''}
                  onChange={(e) => onDocumentsChange(updateDocument(documents, document.document_kind, {
                    extraction_confidence: e.target.value === '' ? null : Math.max(0, Math.min(1, Number(e.target.value))),
                  }))}
                  placeholder="0.92"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-text-secondary">How this is saved</span>
                <select
                  className="w-full rounded-xl border border-border px-3 py-2"
                  value={document.storage_mode}
                  onChange={(e) => onDocumentsChange(updateDocument(documents, document.document_kind, { storage_mode: e.target.value as NameChangeDocumentInput['storage_mode'] }))}
                >
                  <option value="metadata_only">Details only</option>
                  <option value="none">No file stored</option>
                </select>
              </label>
            </div>

            <label className="mt-4 block text-sm">
              <span className="mb-1 block text-xs font-medium text-text-secondary">Saved detail notes</span>
              <textarea
                className="min-h-[92px] w-full rounded-xl border border-border px-3 py-2 text-sm"
                value={documentSnapshotDrafts[document.document_kind] ?? ''}
                onChange={(e) => {
                  const rawValue = e.target.value;
                  setDocumentSnapshotDrafts((current) => ({
                    ...current,
                    [document.document_kind]: rawValue,
                  }));

                  const parsedSnapshot = parseDocumentSnapshotDraft(rawValue);
                  if (parsedSnapshot.ok) {
                    onDocumentsChange(updateDocument(documents, document.document_kind, { extracted_snapshot: parsedSnapshot.snapshot }));
                  }
                }}
                placeholder='{"issuer":"County Clerk","reviewNotes":"Name legible"}'
              />
            </label>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function NameChangeDocumentFieldsPanel({
  draftLegalBasis,
  documents,
  extractedFields,
  documentIntakeSnapshot,
  extractionContractSnapshot,
  onExtractedFieldsChange,
}: NameChangeDocumentFieldsPanelProps) {
  return (
    <Card>
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Saved document fields</h3>
          <p className="text-sm text-text-secondary">Document-specific fields this planner can use to help prepare later forms.</p>
        </div>
      </div>

      {extractionContractSnapshot.summary.conflictCount > 0 && (
        <div className="mt-4 rounded-2xl border border-warning/30 bg-warning/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-text-primary">Conflicting details to resolve</h4>
              <p className="text-xs text-text-secondary">Saved answers and document details do not match yet. Check this before using them on forms.</p>
            </div>
            <span className="rounded-xl bg-warning/10 px-2 py-1 text-xs text-warning">
              {extractionContractSnapshot.summary.conflictCount} conflict{extractionContractSnapshot.summary.conflictCount === 1 ? '' : 's'}
            </span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {extractionContractSnapshot.conflicts.map((conflict) => (
              <div key={conflict.key} className="rounded-xl border border-warning/20 bg-white/70 p-3">
                <p className="text-sm font-medium text-text-primary">{conflict.label}</p>
                <p className="mt-2 text-xs text-text-secondary">Saved answer: {conflict.canonicalValue ?? 'missing'} · Document detail: {conflict.extractedValue}</p>
                <p className="mt-2 text-xs text-text-secondary">{conflict.documentKind} · {conflict.fieldKey}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-4">
        {NAME_CHANGE_DOCUMENT_CONTRACTS
          .filter((contract) => contract.extractionFields.length > 0)
          .filter((contract) => contract.requiredFor.includes('all') || contract.requiredFor.includes(draftLegalBasis) || documents.some((document) => matchesContractDocumentKind(document.document_kind, contract.kind)))
          .map((contract) => {
            const status = documentIntakeSnapshot.documents.find((document) => document.kind === contract.kind);
            const contractDocument = findContractDocument(documents, contract.kind);
            const typedSnapshot = contract.kind === 'marriage_certificate'
              ? extractionContractSnapshot.marriageCertificate
              : contract.kind === 'court_order'
                ? extractionContractSnapshot.courtOrder
                : contract.kind === 'current_passport'
                  ? extractionContractSnapshot.currentPassport
                  : contract.kind === 'current_drivers_license'
                    ? extractionContractSnapshot.currentDriversLicense
                    : null;

            return (
              <div key={contract.kind} className="rounded-2xl border border-border-subtle p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{contract.label}</p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {status?.required ? 'required' : 'supporting'} · {status?.preferredForAutofill ? 'helps with forms' : 'reference only'}
                    </p>
                  </div>
                  <span className={`rounded-xl px-2 py-1 text-xs ${status?.intakeStatus === 'reviewed' ? 'bg-success/10 text-success' : status?.intakeStatus === 'uploaded' ? 'bg-warning/10 text-warning' : 'bg-surface-subtle text-text-secondary'}`}>
                    {status?.intakeStatus ?? 'not started'}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {contract.extractionFields.map((fieldKey) => {
                    const current = findContractExtractedField(extractedFields, contractDocument?.id, fieldKey);
                    const isCaptured = status?.capturedExtractionFields.includes(fieldKey) ?? false;
                    return (
                      <label key={`${contract.kind}-${fieldKey}`} className="block text-sm">
                        <span className="mb-1 flex items-center justify-between gap-2 text-xs font-medium text-text-secondary">
                          <span>{NAME_CHANGE_EXTRACTION_FIELD_LABELS[fieldKey]}</span>
                          <span className={`rounded-xl px-2 py-0.5 text-[10px] ${isCaptured ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                            {isCaptured ? 'captured' : 'missing'}
                          </span>
                        </span>
                        <input
                          className="w-full rounded-xl border border-border px-3 py-2"
                          value={current?.field_value_masked ?? ''}
                          onChange={(e) => onExtractedFieldsChange(upsertDraftNameChangeExtractedField(
                            extractedFields,
                            contractDocument?.id,
                            fieldKey,
                            NAME_CHANGE_EXTRACTION_FIELD_LABELS[fieldKey],
                            e.target.value,
                          ))}
                          placeholder={NAME_CHANGE_EXTRACTION_FIELD_PLACEHOLDERS[fieldKey] ?? 'Saved document value'}
                        />
                      </label>
                    );
                  })}
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-surface-subtle/60 p-3">
                    <p className="text-xs text-text-tertiary">Accepted signals</p>
                    <p className="mt-2 text-xs text-text-secondary">{contract.acceptedSignals.join(' · ')}</p>
                  </div>
                  <div className="rounded-xl bg-surface-subtle/60 p-3">
                    <p className="text-xs text-text-tertiary">Saved field preview</p>
                    <p className="mt-2 text-xs text-text-secondary break-words">
                      {typedSnapshot ? JSON.stringify(typedSnapshot) : 'No saved field preview for this document yet.'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </Card>
  );
}
