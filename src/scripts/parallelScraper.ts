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
): Promise<void> {
  const workerCount = 4;
  const workers: Worker[] = [];
  const urlsToScrape = new Queue<string>();
  urlsToScrape.enqueue(startUrl);

  logger.info(`Starting parallel scraping with ${workerCount} workers`);

  let activeWorkers = 0;
  let isTimedOut = false;

  const timeout = setTimeout(() => {
    logger.warn("Scraping timed out");
    isTimedOut = true;
  }, 5 * 60 * 1000);

  return new Promise((resolve) => {
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(new URL("./scraper.worker.js", import.meta.url));
      workers.push(worker);

      worker.on("message", async (message) => {
        if (message.type === "result") {
          logger.verbose(`Worker ${worker.threadId} found ${message.urls.length} URLs`);
          for (const url of message.urls) {
            const normalizedUrl = normalizeUrl(url);
            if (normalizedUrl && !discoveredUrls.has(normalizedUrl)) {
              await addUrlToSet(url);
              urlsToScrape.enqueue(url);
            }
          }
        } else if (message.type === "error") {
          logger.error(`Worker ${worker.threadId} error: ${message.error}`);
        }

        activeWorkers--;
        checkCompletion();
      });

      worker.on("error", (error) => {
        logger.error(`Worker ${worker.threadId} error: ${error}`);
        activeWorkers--;
        checkCompletion();
      });
    }

    function checkCompletion() {
      if (urlsToScrape.length === 0 && activeWorkers === 0) {
        clearTimeout(timeout);
        for (const worker of workers) {
          worker.terminate();
        }
        logger.info("Parallel scraping completed");
        resolve();
      } else if (!isTimedOut) {
        processNextUrl();
      }
    }

    function processNextUrl() {
      while (urlsToScrape.length > 0 && activeWorkers < workerCount) {
        const url = urlsToScrape.dequeue()!;
        const normalizedUrl = normalizeUrl(url);
        if (normalizedUrl && !discoveredUrls.has(normalizedUrl)) {
          discoveredUrls.add(normalizedUrl);
          const worker = workers.find(w => w.threadId !== -1);
          if (worker) {
            activeWorkers++;
            worker.postMessage({ url, baseUrl });
            logger.verbose(`Assigned URL to worker ${worker.threadId}: ${url}`);
          }
        }
      }
    }

    processNextUrl();
  });
}
