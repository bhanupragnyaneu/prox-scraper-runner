const breakers = new Map<string, { failures: number; openedAt: number | null }>();
const THRESHOLD = 5;
const COOLDOWN_MS = 60_000;

export function canCall(retailer: string): boolean {
  const b = breakers.get(retailer);
  if (!b || !b.openedAt) return true;
  if (Date.now() - b.openedAt > COOLDOWN_MS) {
    breakers.set(retailer, { failures: 0, openedAt: null });
    return true;
  }
  return false;
}

export function recordSuccess(retailer: string) {
  breakers.set(retailer, { failures: 0, openedAt: null });
}

export function recordFailure(retailer: string) {
  const b = breakers.get(retailer) ?? { failures: 0, openedAt: null };
  b.failures += 1;
  if (b.failures >= THRESHOLD) b.openedAt = Date.now();
  breakers.set(retailer, b);
}