export function isAuthishSupabaseError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? '').toLowerCase();
  return message.includes('invalid jwt')
    || message.includes('jwt')
    || message.includes('401')
    || message.includes('auth');
}

export async function retryOnceAfterRefresh<T>(args: {
  action: () => Promise<T>;
  refresh: () => Promise<unknown>;
  shouldRetry?: (error: unknown) => boolean;
}): Promise<T> {
  try {
    return await args.action();
  } catch (error) {
    const shouldRetry = args.shouldRetry ?? isAuthishSupabaseError;
    if (!shouldRetry(error)) throw error;
    await args.refresh();
    return args.action();
  }
}
