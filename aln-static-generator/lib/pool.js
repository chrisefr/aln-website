// Tiny bounded-concurrency async map, no dependency needed. Runs
// `worker(item, index)` for every item in `items`, at most `concurrency` at
// a time, and returns results in the same order as `items` (not completion
// order) so callers don't need to worry about scheduling reordering things
// that are supposed to stay deterministic (e.g. slug collision order).
async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runOne() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await worker(items[i], i);
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, runOne));
  return results;
}

module.exports = { mapWithConcurrency };
