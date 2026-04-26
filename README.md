# Prox Scraper Runner

> Track A submission for the Prox Software Engineering Intern technical assessment.

A cost-aware, fault-tolerant execution layer for running retailer scrapers at scale. Designed for the case where 5,000 users submit ~15,000 daily search requests across 6+ retailers, but the system can't actually scrape that many times — proxies cost money, retailers rate-limit, and most queries are duplicates.

## What it does

- Accepts scrape requests via HTTP and queues them
- Runs them through a worker pool with per-retailer concurrency and rate limits
- **Caches results** so repeat queries don't re-scrape (default 30-min TTL)
- **Deduplicates in-flight requests** so 100 simultaneous "tide pods" searches → 1 actual scrape
- **Retries with exponential backoff** on transient failures
- **Circuit-breaks per retailer** when failure rate spikes — protects budget and prevents cascading failures
- Logs structured JSON so traces can be reconstructed in production

## Quick start

```bash
docker compose up -d   # start Redis
npm install
npm run worker         # terminal 1
npm run server         # terminal 2

# in a third terminal:
curl -X POST localhost:3000/scrape \
  -H 'content-type: application/json' \
  -d '{"retailer":"walmart","zip":"90210","query":"tide"}'

# returns {"jobId":"1"}, then check the result:
curl localhost:3000/scrape/1
```

Run the same scrape request twice — the second one will hit the cache instantly. Watch the worker logs to see `scrape ok` → `cache hit`.

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for the full diagram and explanation.

Short version: requests → BullMQ queue → worker pool → cache check → dedup check → circuit breaker check → scraper. Each layer exists to avoid an unnecessary scrape.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — system design, job flow, failure isolation
- [`docs/scale-and-cost.md`](docs/scale-and-cost.md) — how this scales to 5,000 users and stays cheap
- [`docs/runbook.md`](docs/runbook.md) — deploy, debug, common operational scenarios

## Tech stack and why

- **Node.js + TypeScript** — fits the existing scraper ecosystem (Playwright, Puppeteer)
- **BullMQ** — gives retries, backoff, concurrency limits, and rate limiting out of the box. Reimplementing these primitives would have eaten the whole time budget for no real gain
- **Redis** — fast shared cache + queue backend. One dependency, two jobs
- **Express** — tiny HTTP surface area. Could be Fastify or Hono with no real change
- **Pino** — structured JSON logging that ships cleanly to CloudWatch / Datadog

## Tradeoffs and what I'd do next

**The scraper itself is stubbed.** The assessment said to assume scrapers exist as CLI tools, so `src/scrapers/fake.ts` simulates a scrape with a sleep + random failure. Wiring a real scraper in is a one-line change in `src/worker.ts` — call the CLI via `child_process.execFile` and parse the JSON output.

**Dedup is in-process.** The in-memory `Map` works for a single worker instance. Multi-instance deployment needs a Redis `SETNX` lock keyed on the cache key with a short TTL — straightforward addition.

**Single shared queue.** In production this should be one queue per retailer so a misbehaving retailer can't starve workers needed for healthy ones. Trivial to split.

**Cache TTL is global** (30 min). Should be per-data-type — prices ~30 min, product metadata ~24h. Easy follow-up.

**No persistence layer for scrape history.** A real deployment would write to Postgres for analytics (cache hit rate trends, failure rate per retailer). Not needed for the runtime path.

## Demo

See `demo.mp4` (the link in the submission email). Shows:

1. A first scrape runs and returns results
2. The same query repeated → instant cache hit, no scrape
3. Multiple identical requests in parallel → one scrape, all share the result (dedup)
4. Forced failures → exponential-backoff retries → circuit opens after threshold
