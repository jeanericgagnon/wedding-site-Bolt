import { buildNameChangeDmvFormSnapshot } from './dmvForm';
import { buildNameChangeSs5FormSnapshot } from './ss5Form';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangeFormPayloadSnapshot,
} from './types';

export type NameChangeFormBuilder = (
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
) => NameChangeFormPayloadSnapshot;

export const NAME_CHANGE_FORM_BUILDERS: Record<'ss5' | 'dmv', NameChangeFormBuilder> = {
  ss5: buildNameChangeSs5FormSnapshot,
  dmv: buildNameChangeDmvFormSnapshot,
};
