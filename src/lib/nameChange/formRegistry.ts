import { buildNameChangeBankPacketSnapshot } from './bankPacket';
import { buildNameChangeDmvFormSnapshot } from './dmvForm';
import { buildNameChangeEmployerPacketSnapshot } from './employerPacket';
import { buildNameChangeInsurancePacketSnapshot } from './insurancePacket';
import { buildNameChangePassportFormSnapshot } from './passportForm';
import { buildNameChangeSs5FormSnapshot } from './ss5Form';
import { buildNameChangeTsaPacketSnapshot } from './tsaPacket';
import { buildNameChangeVoterPacketSnapshot } from './voterPacket';
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
  banks: buildNameChangeBankPacketSnapshot,
  insurance: buildNameChangeInsurancePacketSnapshot,
  ss5: buildNameChangeSs5FormSnapshot,
  dmv: buildNameChangeDmvFormSnapshot,
  passport: buildNameChangePassportFormSnapshot,
  employer: buildNameChangeEmployerPacketSnapshot,
  tsa: buildNameChangeTsaPacketSnapshot,
  voter: buildNameChangeVoterPacketSnapshot,
};
