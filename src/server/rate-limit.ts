type RateLimitWindow = {
  count: number;
  resetAt: number;
};

const windows = new Map<string, RateLimitWindow>();

export function checkRateLimit({
  key,
  limit,
  windowMs,
  now = Date.now(),
}: {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}) {
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    if (windows.size > 5_000) {
      for (const [windowKey, window] of windows) {
        if (window.resetAt <= now) {
          windows.delete(windowKey);
        }
      }
      while (windows.size > 5_000) {
        const oldestKey = windows.keys().next().value;
        if (oldestKey === undefined) {
          break;
        }
        windows.delete(oldestKey);
      }
    }

    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

