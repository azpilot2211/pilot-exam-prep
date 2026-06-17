const RETRYABLE = new Set(["overloaded_error", "rate_limit_error"]);

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 4,
  baseDelayMs = 5000
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: unknown) {
      attempt++;
      const type =
        err instanceof Error
          ? (err as { error?: { error?: { type?: string } } }).error?.error?.type
          : undefined;
      if (attempt >= maxAttempts || !RETRYABLE.has(type ?? "")) throw err;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      console.warn(`  ⚠ ${type} — retrying in ${delay / 1000}s (attempt ${attempt}/${maxAttempts})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
