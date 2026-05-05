/**
 * Races a promise against a timeout. Resolves with the original promise's
 * value if it settles in time, otherwise rejects with a `new Error(message)`.
 * Always clears the underlying setTimeout in `finally` so the timer never
 * leaks (important on React Native, where stray timers can keep the JS thread
 * busy and delay app sleep).
 *
 * Note: the input promise is NOT cancelled on timeout — it just stops being
 * awaited. Callers that need true cancellation should pair this with an
 * AbortSignal at the network layer.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message = 'Request timed out. Saved locally and will retry later.',
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
