import { Worker } from 'bullmq';
import pino from 'pino';
import { runScraper } from './scrapers/fake.js';
import { cacheKey, getCached, setCached, dedupe } from './cache.js';
import { canCall, recordSuccess, recordFailure } from './breaker.js';

const log = pino({ transport: { target: 'pino-pretty' } });
const connection = { host: 'localhost', port: 6379 };

new Worker('scrape', async (job) => {
  const { retailer, zip, query } = job.data;
  const key = cacheKey(retailer, zip, query);

  const cached = await getCached(key);
  if (cached) { log.info({ key }, 'cache hit'); return cached; }

  if (!canCall(retailer)) {
    log.warn({ retailer }, 'circuit open');
    throw new Error(`circuit_open:${retailer}`);
  }

  return dedupe(key, async () => {
    try {
      const result = await runScraper(retailer, zip, query);
      await setCached(key, result);
      recordSuccess(retailer);
      log.info({ key }, 'scrape ok');
      return result;
    } catch (e) {
      recordFailure(retailer);
      throw e;
    }
  });
}, {
  connection,
  concurrency: 10,
  limiter: { max: 5, duration: 1000 }, // 5 jobs/sec across the worker
});