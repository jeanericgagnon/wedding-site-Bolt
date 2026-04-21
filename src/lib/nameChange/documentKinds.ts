import type { NameChangeDocumentInput } from './types';

export function canonicalizeNameChangeDocumentKind(
  kind: NameChangeDocumentInput['document_kind'],
): NameChangeDocumentInput['document_kind'] {
  return kind === 'court_order_name_change' ? 'court_order' : kind;
}

export function matchesNameChangeDocumentKind(
  actualKind: NameChangeDocumentInput['document_kind'],
  expectedKind: NameChangeDocumentInput['document_kind'],
) {
  return canonicalizeNameChangeDocumentKind(actualKind) === canonicalizeNameChangeDocumentKind(expectedKind);
}
