import { buildNameChangeDmvFormSnapshot } from './dmvForm';
import { buildNameChangeEmployerPacketSnapshot } from './employerPacket';
import { buildNameChangePassportFormSnapshot } from './passportForm';
import { buildNameChangeSs5FormSnapshot } from './ss5Form';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangeFormBuilderKey,
  NameChangeFormPayloadSnapshot,
} from './types';

export type NameChangeFormBuilder = (
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
) => NameChangeFormPayloadSnapshot;

export const NAME_CHANGE_FORM_BUILDERS: Record<NameChangeFormBuilderKey, NameChangeFormBuilder> = {
  ss5: buildNameChangeSs5FormSnapshot,
  dmv: buildNameChangeDmvFormSnapshot,
  passport: buildNameChangePassportFormSnapshot,
  employer: buildNameChangeEmployerPacketSnapshot,
};
