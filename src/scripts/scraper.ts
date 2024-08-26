import axios, { type AxiosInstance } from "axios";
import Logger from "./logger";
import { checkSitemap } from './sitemapParser';
import { normalizeUrl } from './urlProcessor';
import { writeUrlsToFile, generateSitemapXml, generateSitemapJson } from './fileWriter';
import { scrapeUrlsParallel } from './parallelScraper';

const logger = Logger.getInstance();

const axiosInstance: AxiosInstance = axios.create({
  headers: { "User-Agent": "Mozilla/5.0" },
  maxRedirects: 5,
  validateStatus: (status) => [200, 301, 302, 304, 307, 308].includes(status),
});

export async function scrapeWebsite(
  inputUrl: string,
  onUrlFound?: (url: string) => void,
  sitemapOnly: boolean = false
): Promise<string[]> {
  const baseUrl = new URL(inputUrl).origin;
  const discoveredUrls: Set<string> = new Set();

  logger.info(`Starting to scrape website: ${inputUrl}`);
  logger.info(`Base URL: ${baseUrl}`);
  logger.info(`Sitemap only: ${sitemapOnly}`);

  async function addUrlToSet(url: string) {
    if (url.includes("#")) {
      logger.verbose(`Ignoring URL with fragment: ${url}`);
      return;
    }
    if (url.includes("?")) {
      logger.verbose(`Ignoring URL with query parameters: ${url}`);
      return;
    }

    const normalizedUrl = normalizeUrl(url);
    if (discoveredUrls.has(normalizedUrl)) {
      logger.verbose(`URL already discovered: ${url}`);
      return;
    }

    try {
      await axiosInstance.head(url);

      discoveredUrls.add(normalizedUrl);
      logger.info(`Found URL: ${url}`);
      onUrlFound?.(url);
    } catch (error) {
      logger.error(`Error checking URL ${url}: ${error}`);
    }
  }

  await checkSitemap(baseUrl, inputUrl, addUrlToSet);

  if (!sitemapOnly) {
    await scrapeUrlsParallel(inputUrl, discoveredUrls, baseUrl, addUrlToSet);
  }

  const sortedUrls = Array.from(discoveredUrls).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  logger.info(`Total URLs discovered: ${sortedUrls.length}`);

  await writeUrlsToFile(sortedUrls);
  await generateSitemapXml(sortedUrls);
  await generateSitemapJson(sortedUrls);

  return sortedUrls;
}
