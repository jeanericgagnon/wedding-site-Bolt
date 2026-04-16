type ExistingEventRow = { event_name?: string | null };

type SeedRow = {
  event_name: string;
  [key: string]: unknown;
};

export const filterMissingOnboardingEventSeeds = (
  existingRows: ExistingEventRow[],
  seeds: SeedRow[]
): SeedRow[] => {
  const existingNames = new Set(
    existingRows
      .map((row) => (row.event_name || '').trim().toLowerCase())
      .filter(Boolean)
  );

  return seeds.filter((seed) => !existingNames.has((seed.event_name || '').trim().toLowerCase()));
};
