const RETRYABLE = new Set(["overloaded_error", "rate_limit_error"]);

/**
 * Thrown for transient generation failures (malformed/empty/truncated model
 * output) that are worth re-requesting. A fresh attempt usually succeeds, so
 * these should not crash a long-running pipeline.
 */
export class RetryableError extends Error {}

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
      const retryable = err instanceof RetryableError || RETRYABLE.has(type ?? "");
      if (attempt >= maxAttempts || !retryable) throw err;
      const label = err instanceof RetryableError ? (err.message || "malformed response") : type;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      console.warn(`  ⚠ ${label} — retrying in ${delay / 1000}s (attempt ${attempt}/${maxAttempts})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
