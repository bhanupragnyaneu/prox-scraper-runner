import express from 'express';
import { scrapeQueue } from './queue.js';

const app = express();
app.use(express.json());

app.post('/scrape', async (req, res) => {
  const { retailer, zip, query } = req.body;
  const job = await scrapeQueue.add('scrape', { retailer, zip, query }, {
    attempts: 4,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 100,
  });
  res.json({ jobId: job.id });
});

app.get('/scrape/:id', async (req, res) => {
  const job = await scrapeQueue.getJob(req.params.id);
  if (!job) return res.status(404).end();
  const state = await job.getState();
  res.json({ state, result: job.returnvalue, failedReason: job.failedReason });
});

app.listen(3000, () => console.log('http://localhost:3000'));