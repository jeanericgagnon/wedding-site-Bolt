export interface MigrationRecoveryInput {
  coupleName1: string;
  coupleName2: string;
  venue?: string;
  location?: string;
  city?: string;
  story?: string;
  ceremonyTime?: string;
  receptionTime?: string;
}

export interface MigrationRecoveryOutput {
  story: string;
  venue: string | undefined;
  location: string | undefined;
  ceremonyTime: string | undefined;
  receptionTime: string | undefined;
}

export function buildMigrationRecoveryDefaults(input: MigrationRecoveryInput): MigrationRecoveryOutput {
  const story = input.story?.trim() || `${input.coupleName1} and ${input.coupleName2} are excited to celebrate with the people they love most.`;
  const venue = input.venue?.trim() || undefined;
  const location = input.location?.trim() || input.city?.trim() || undefined;
  const ceremonyTime = input.ceremonyTime?.trim() || undefined;
  const receptionTime = input.receptionTime?.trim() || undefined;

  return {
    story,
    venue,
    location,
    ceremonyTime,
    receptionTime,
  };
}
