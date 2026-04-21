export interface RegistryRefreshBudgetStateInput {
  storedMonthKey: string | null;
  storedCount: number;
  currentMonthKey?: string;
}

export interface RegistryRefreshBudgetState {
  monthKey: string;
  count: number;
  shouldReset: boolean;
}

export function getCurrentMonthKey(now = new Date()): string {
  return now.toISOString().slice(0, 7);
}

export function resolveRegistryRefreshBudgetState({
  storedMonthKey,
  storedCount,
  currentMonthKey = getCurrentMonthKey(),
}: RegistryRefreshBudgetStateInput): RegistryRefreshBudgetState {
  const normalizedCount = Number.isFinite(storedCount) ? Math.max(0, storedCount) : 0;
  const shouldReset = !storedMonthKey || storedMonthKey !== currentMonthKey;

  return {
    monthKey: currentMonthKey,
    count: shouldReset ? 0 : normalizedCount,
    shouldReset,
  };
}
