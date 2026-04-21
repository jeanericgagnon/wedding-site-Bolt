import type { NameChangeDocumentInput } from './types';

export function canonicalizeNameChangeDocumentKind(
  kind: NameChangeDocumentInput['document_kind'],
): NameChangeDocumentInput['document_kind'] {
  return kind === 'court_order_name_change' ? 'court_order' : kind;
}

export function getNameChangeDocumentKindAliases(
  kind: NameChangeDocumentInput['document_kind'],
): NameChangeDocumentInput['document_kind'][] {
  const canonicalKind = canonicalizeNameChangeDocumentKind(kind);
  return canonicalKind === 'court_order' ? ['court_order', 'court_order_name_change'] : [canonicalKind];
}

export function matchesNameChangeDocumentKind(
  actualKind: NameChangeDocumentInput['document_kind'],
  expectedKind: NameChangeDocumentInput['document_kind'],
) {
  return canonicalizeNameChangeDocumentKind(actualKind) === canonicalizeNameChangeDocumentKind(expectedKind);
}
