import { parse } from "node-html-parser";
import axios, { type AxiosInstance } from "axios";
import { parentPort } from 'worker_threads';
import Logger from "./logger";

const logger = Logger.getInstance();

const axiosInstance: AxiosInstance = axios.create({
  headers: { "User-Agent": "Mozilla/5.0" },
  maxRedirects: 5,
  validateStatus: (status) => [200, 301, 302, 304, 307, 308].includes(status),
});

function normalizeUrl(url: string): string {
  const parsedUrl = new URL(url);
  return `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname}`.toLowerCase().replace(/\/$/, '');
}

parentPort?.on('message', async (message: { url: string, baseUrl: string }) => {
  try {
    const { url, baseUrl } = message;
    logger.info(`Worker received message to scrape: ${url}`);
    const discoveredUrls = await scrapeUrl(url, baseUrl);
    logger.info(`Worker finished scraping ${url}, found ${discoveredUrls.length} URLs`);
    parentPort?.postMessage({ type: "result", urls: discoveredUrls });
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Worker encountered an error: ${error.message}`);
      parentPort?.postMessage({ type: "error", error: error.message });
    }
  }
});

async function scrapeUrl(url: string, baseUrl: string): Promise<string[]> {
  const discoveredUrls = new Set<string>();

  try {
    logger.debug(`Fetching URL: ${url}`);
    const response = await axiosInstance.get(url);
    const root = parse(response.data);
    const links = root.querySelectorAll("a");

    logger.debug(`Found ${links.length} links on ${url}`);

    for (const link of links) {
      const href = link.getAttribute("href");
      if (href && !href.includes("#")) {
        const fullUrl = constructFullUrl(href, url, baseUrl);
        const normalizedUrl = normalizeUrl(fullUrl);

        if (normalizedUrl.startsWith(normalizeUrl(baseUrl))) {
          discoveredUrls.add(normalizedUrl);
          logger.verbose(`Discovered URL: ${normalizedUrl}`);
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error scraping ${url}: ${error.message}`);
    }
  }

  return Array.from(discoveredUrls);
}

function constructFullUrl(href: string, currentUrl: string, baseUrl: string): string {
  if (href.startsWith("http")) {
    return href;
  } else if (href.startsWith("/")) {
    return `${baseUrl}${href}`;
  } else {
    return new URL(href, currentUrl).toString();
  }
}

export { scrapeUrl, constructFullUrl, normalizeUrl };
