import Redis from 'ioredis';
const redis = new Redis();

const CACHE_TTL = 30 * 60; // seconds
const inflight = new Map<string, Promise<any>>();

export function cacheKey(retailer: string, zip: string, query: string) {
  return `scrape:${retailer}:${zip}:${query.toLowerCase().trim()}`;
}

export async function getCached(key: string) {
  const v = await redis.get(key);
  return v ? JSON.parse(v) : null;
}

export async function setCached(key: string, value: any) {
  await redis.set(key, JSON.stringify(value), 'EX', CACHE_TTL);
}

export function dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (inflight.has(key)) return inflight.get(key) as Promise<T>;
  const p = fn().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}