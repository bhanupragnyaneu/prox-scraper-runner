## Local dev
docker compose up -d
npm install
npm run worker     # terminal 1
npm run server     # terminal 2

## Submit a job
curl -X POST localhost:3000/scrape \
  -H 'content-type: application/json' \
  -d '{"retailer":"walmart","zip":"90210","query":"tide pods"}'

## Check job
curl localhost:3000/scrape/<jobId>

## Common issues
- Redis not running → `docker compose up -d`
- Circuit open → wait 60s or restart worker
- Stuck jobs → BullMQ dashboard at /admin (if added)