import axios from "axios";
import { parse } from "node-html-parser";
import { parseString } from "xml2js";
import fs from "fs/promises";

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

    try {
      const response = await axios.head(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        validateStatus: (status) =>
          status === 200 || status === 301 || status === 302,
      });

      discoveredUrls.add(url);
      console.log(`Found URL: ${url}`);
      onUrlFound?.(url);
    } catch (error) {
      console.error(`Error checking URL ${url}: ${error}`);
    }
  }

  // Check for sitemap
  const sitemapUrl = `${baseUrl}/sitemap.xml`;
  try {
    const sitemapResponse = await axios.get(sitemapUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (sitemapResponse.status === 200) {
      const sitemapXml = sitemapResponse.data;
      const sitemapUrls = await parseSitemap(sitemapXml, inputUrl);
      for (const url of sitemapUrls) {
        await addUrlToSet(url);
      }
    }
  } catch (error) {
    console.error(`Error fetching sitemap: ${error}`);
  }

  // Scrape URLs if sitemapOnly is false
  if (!sitemapOnly) {
    await scrapeUrlsRecursively(inputUrl, discoveredUrls, baseUrl, addUrlToSet);
  }

  const sortedUrls = Array.from(discoveredUrls).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  await writeUrlsToFile(sortedUrls);
  await generateSitemapXml(sortedUrls);
  await generateSitemapJson(sortedUrls);

  return sortedUrls;
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

async function scrapeUrlsRecursively(
  url: string,
  discoveredUrls: Set<string>,
  baseUrl: string,
  addUrlToSet: (url: string) => Promise<void>
) {
  if (discoveredUrls.has(url)) return;
  await addUrlToSet(url);

  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 500,
    });

    if (response.status >= 200 && response.status < 300) {
      const root = parse(response.data);
      const links = root.querySelectorAll("a");

      for (const link of links) {
        const href = link.getAttribute("href");
        if (href && !href.includes("#")) {
          const fullUrl = constructFullUrl(href, url, baseUrl);

          if (
            fullUrl.startsWith(baseUrl) &&
            !discoveredUrls.has(fullUrl) &&
            !fullUrl.includes("#")
          ) {
            await scrapeUrlsRecursively(
              fullUrl,
              discoveredUrls,
              baseUrl,
              addUrlToSet
            );
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error scraping ${url}: ${error}`);
  }
}

function constructFullUrl(
  href: string,
  currentUrl: string,
  baseUrl: string
): string {
  if (href.startsWith("http")) {
    return href;
  } else if (href.startsWith("/")) {
    return `${baseUrl}${href}`;
  } else {
    return new URL(href, currentUrl).toString();
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
