export const createBuilderV2CommandPaletteExecutionGuard = () => {
  const executedCommandIds = new Set<string>();

  return {
    canExecute(commandId: string) {
      if (executedCommandIds.has(commandId)) {
        return false;
      }

      executedCommandIds.add(commandId);
      return true;
    },
    reset() {
      executedCommandIds.clear();
    },
  };
};
