import { buildNameChangeBankPacketSnapshot } from './bankPacket';
import { buildNameChangeCourtOrderPacketSnapshot } from './courtOrderPacket';
import { buildNameChangeCourtesyPacketSnapshot } from './courtesyPacket';
import { buildNameChangeDmvFormSnapshot } from './dmvForm';
import { buildNameChangeEmployerPacketSnapshot } from './employerPacket';
import { buildNameChangeInsurancePacketSnapshot } from './insurancePacket';
import { buildNameChangeLicensePacketSnapshot } from './licensePacket';
import { buildNameChangeMedicalPacketSnapshot } from './medicalPacket';
import { buildNameChangePassportFormSnapshot } from './passportForm';
import { buildNameChangeSs5FormSnapshot } from './ss5Form';
import { buildNameChangeTsaPacketSnapshot } from './tsaPacket';
import { buildNameChangeUtilitiesPacketSnapshot } from './utilitiesPacket';
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
  courtOrder: buildNameChangeCourtOrderPacketSnapshot,
  courtesy: buildNameChangeCourtesyPacketSnapshot,
  banks: buildNameChangeBankPacketSnapshot,
  insurance: buildNameChangeInsurancePacketSnapshot,
  licenses: buildNameChangeLicensePacketSnapshot,
  medical: buildNameChangeMedicalPacketSnapshot,
  ss5: buildNameChangeSs5FormSnapshot,
  dmv: buildNameChangeDmvFormSnapshot,
  passport: buildNameChangePassportFormSnapshot,
  employer: buildNameChangeEmployerPacketSnapshot,
  tsa: buildNameChangeTsaPacketSnapshot,
  utilities: buildNameChangeUtilitiesPacketSnapshot,
  voter: buildNameChangeVoterPacketSnapshot,
};
