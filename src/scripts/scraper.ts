import axios, { type AxiosInstance } from "axios";
import { parseString } from "xml2js";
import fs from "fs/promises";
import { Worker } from "worker_threads";
import { Queue } from 'queue-typescript';

const axiosInstance: AxiosInstance = axios.create({
  headers: { "User-Agent": "Mozilla/5.0" },
  maxRedirects: 5,
  validateStatus: (status) => [200, 301, 302, 304, 307, 308].includes(status),
});

function normalizeUrl(url: string): string {
  const parsedUrl = new URL(url);
  return `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname}`.toLowerCase().replace(/\/$/, '');
}

export async function scrapeWebsite(
  inputUrl: string,
  onUrlFound?: (url: string) => void,
  sitemapOnly: boolean = false
): Promise<string[]> {
  const baseUrl = new URL(inputUrl).origin;
  const discoveredUrls: Set<string> = new Set();

  async function addUrlToSet(url: string) {
    if (url.includes("#")) return; // Ignore URLs with fragments
    if (url.includes("?")) return; // Ignore URLs with query parameters

    const normalizedUrl = normalizeUrl(url);
    if (discoveredUrls.has(normalizedUrl)) return;

    try {
      await axiosInstance.head(url);

      discoveredUrls.add(normalizedUrl);
      console.log(`Found URL: ${url}`);
      onUrlFound?.(url);
    } catch (error) {
      console.error(`Error checking URL ${url}: ${error}`);
    }
  }

  await checkSitemap(baseUrl, inputUrl, addUrlToSet);

  if (!sitemapOnly) {
    await scrapeUrlsParallel(inputUrl, discoveredUrls, baseUrl, addUrlToSet);
  }

  const sortedUrls = Array.from(discoveredUrls).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  await writeUrlsToFile(sortedUrls);
  await generateSitemapXml(sortedUrls);
  await generateSitemapJson(sortedUrls);

  return sortedUrls;
}

async function checkSitemap(baseUrl: string, inputUrl: string, addUrlToSet: (url: string) => Promise<void>) {
  const sitemapUrl = `${baseUrl}/sitemap.xml`;
  try {
    const sitemapResponse = await axiosInstance.get(sitemapUrl);
    const sitemapXml = sitemapResponse.data;
    const sitemapUrls = await parseSitemap(sitemapXml, inputUrl);
    for (const url of sitemapUrls) {
      await addUrlToSet(url);
    }
  } catch (error) {
    console.error(`Error fetching sitemap: ${error}`);
  }
}

async function parseSitemap(xml: string, baseUrl: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    parseString(xml, (err: Error | null, result: any) => {
      if (err) {
        reject(err);
      } else {
        const urls = result.urlset.url
          .map((item: any) => item.loc[0])
          .filter(
            (url: string) => url.startsWith(baseUrl) && !url.includes("#")
          );
        resolve(urls);
      }
    });
  });
}

async function scrapeUrlsParallel(
  startUrl: string,
  discoveredUrls: Set<string>,
  baseUrl: string,
  addUrlToSet: (url: string) => Promise<void>
) {
  const workerCount = 4;
  const workers: Worker[] = [];
  const urlsToScrape = new Queue<string>();
  urlsToScrape.enqueue(startUrl);
  const scrapedUrls: Set<string> = new Set();

  const timeout = setTimeout(() => {
    console.log("Scraping timed out");
    for (const worker of workers) {
      worker.terminate();
    }
  }, 5 * 60 * 1000);

  for (let i = 0; i < workerCount; i++) {
    const worker = new Worker(new URL("./scraper.worker.js", import.meta.url));
    workers.push(worker);

    worker.on("message", async (message) => {
      if (message.type === "result") {
        for (const url of message.urls) {
          const normalizedUrl = normalizeUrl(url);
          if (!scrapedUrls.has(normalizedUrl) && !discoveredUrls.has(normalizedUrl)) {
            await addUrlToSet(url);
            urlsToScrape.enqueue(url);
          }
        }
      } else if (message.type === "error") {
        console.error(`Worker error: ${message.error}`);
      }
    });
  }

  while (urlsToScrape.length > 0 || workers.some((w) => w.threadId !== -1)) {
    for (const worker of workers) {
      if (worker.threadId !== -1 && urlsToScrape.length > 0) {
        const url = urlsToScrape.dequeue()!;
        const normalizedUrl = normalizeUrl(url);
        if (!scrapedUrls.has(normalizedUrl)) {
          scrapedUrls.add(normalizedUrl);
          worker.postMessage({ url, baseUrl });
          await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  clearTimeout(timeout);

  for (const worker of workers) {
    worker.terminate();
  }
}

async function writeUrlsToFile(urls: string[]) {
  const formattedUrls = urls.map((url) => `/fetch ${url}`);
  await fs.writeFile("scraped_urls.txt", formattedUrls.join("\n"));
}

async function generateSitemapXml(urls: string[]) {
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url}</loc>
  </url>`
  )
  .join("\n")}
</urlset>`;

  await fs.writeFile("sitemap.xml", xmlContent);
}

async function generateSitemapJson(urls: string[]) {
  const jsonContent = JSON.stringify({ urls }, null, 2);
  await fs.writeFile("sitemap.json", jsonContent);
}
