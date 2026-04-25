export async function runScraper(retailer: string, zip: string, query: string) {
  // Simulate 1-3s scrape time
  await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
  // Simulate occasional failure
  if (Math.random() < 0.15) throw new Error(`Scraper failed for ${retailer}`);
  return {
    retailer, zip, query,
    results: [
      { name: `${query} brand A`, price: 4.99 },
      { name: `${query} brand B`, price: 5.49 },
    ],
    scraped_at: new Date().toISOString(),
  };
}