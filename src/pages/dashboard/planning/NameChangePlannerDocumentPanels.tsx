import React from 'react';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeDocumentIntakeSnapshot,
  NameChangeExtractedFieldInput,
  NameChangeExtractionContractSnapshot,
} from '../../../lib/nameChange/types';
import type { NameChangeDocumentRepairQueueItem } from '../../../lib/nameChange/documentRepairQueue';
import {
  NameChangeDocumentDetailsPanel,
  NameChangeDocumentFieldsPanel,
} from './NameChangePlannerDocumentWorkspaceSections';

interface NameChangeDocumentWorkspacePanelProps {
  draftLegalBasis: NameChangeCaseInput['legal_basis'];
  documents: NameChangeDocumentInput[];
  extractedFields: NameChangeExtractedFieldInput[];
  documentIntakeSnapshot: NameChangeDocumentIntakeSnapshot;
  documentRepairQueue: NameChangeDocumentRepairQueueItem[];
  documentSnapshotDrafts: Record<string, string>;
  setDocumentSnapshotDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onDocumentsChange: (documents: NameChangeDocumentInput[]) => void;
  extractionContractSnapshot: NameChangeExtractionContractSnapshot;
  onExtractedFieldsChange: (fields: NameChangeExtractedFieldInput[]) => void;
}

export function NameChangeDocumentWorkspacePanel({
  draftLegalBasis,
  documents,
  extractedFields,
  documentIntakeSnapshot,
  documentRepairQueue,
  documentSnapshotDrafts,
  setDocumentSnapshotDrafts,
  onDocumentsChange,
  extractionContractSnapshot,
  onExtractedFieldsChange,
}: NameChangeDocumentWorkspacePanelProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <NameChangeDocumentDetailsPanel
        documents={documents}
        documentIntakeSnapshot={documentIntakeSnapshot}
        documentRepairQueue={documentRepairQueue}
        documentSnapshotDrafts={documentSnapshotDrafts}
        setDocumentSnapshotDrafts={setDocumentSnapshotDrafts}
        onDocumentsChange={onDocumentsChange}
      />
      <NameChangeDocumentFieldsPanel
        draftLegalBasis={draftLegalBasis}
        documents={documents}
        extractedFields={extractedFields}
        documentIntakeSnapshot={documentIntakeSnapshot}
        extractionContractSnapshot={extractionContractSnapshot}
        onExtractedFieldsChange={onExtractedFieldsChange}
      />
    </div>
  );
}
