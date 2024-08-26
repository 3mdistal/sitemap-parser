import { Worker } from "worker_threads";
import { Queue } from 'queue-typescript';
import Logger from "./logger";
import { normalizeUrl } from "./urlProcessor";

const logger = Logger.getInstance();

export async function scrapeUrlsParallel(
  startUrl: string,
  discoveredUrls: Set<string>,
  baseUrl: string,
  addUrlToSet: (url: string) => Promise<void>
) {
  const workerCount = 4;
  const workers: Worker[] = [];
  const urlsToScrape = new Queue<string>();
  urlsToScrape.enqueue(startUrl);

  logger.info(`Starting parallel scraping with ${workerCount} workers`);

  const timeout = setTimeout(() => {
    logger.warn("Scraping timed out");
    for (const worker of workers) {
      worker.terminate();
    }
  }, 5 * 60 * 1000);

  for (let i = 0; i < workerCount; i++) {
    const worker = new Worker(new URL("./scraper.worker.ts", import.meta.url));
    workers.push(worker);

    worker.on("message", async (message) => {
      if (message.type === "result") {
        logger.verbose(`Worker ${worker.threadId} found ${message.urls.length} URLs`);
        for (const url of message.urls) {
          const normalizedUrl = normalizeUrl(url);
          if (!discoveredUrls.has(normalizedUrl)) {
            await addUrlToSet(url);
            urlsToScrape.enqueue(url);
          }
        }
      } else if (message.type === "error") {
        logger.error(`Worker ${worker.threadId} error: ${message.error}`);
      }
    });
  }

  while (urlsToScrape.length > 0 || workers.some((w) => w.threadId !== -1)) {
    for (const worker of workers) {
      if (worker.threadId !== -1 && urlsToScrape.length > 0) {
        const url = urlsToScrape.dequeue()!;
        const normalizedUrl = normalizeUrl(url);
        if (!discoveredUrls.has(normalizedUrl)) {
          discoveredUrls.add(normalizedUrl);
          worker.postMessage({ url, baseUrl });
          logger.verbose(`Assigned URL to worker ${worker.threadId}: ${url}`);
          await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  clearTimeout(timeout);

  for (const worker of workers) {
    worker.terminate();
    logger.verbose(`Terminated worker ${worker.threadId}`);
  }

  logger.info("Parallel scraping completed");
}
