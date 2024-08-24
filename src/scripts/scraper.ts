import axios from "axios";
import { parse } from "node-html-parser";
import { parseString } from "xml2js";
import fs from "fs/promises";

export async function scrapeWebsite(
  inputUrl: string,
  onUrlFound?: (url: string) => void
): Promise<string[]> {
  const baseUrl = new URL(inputUrl).origin;
  const urls: Set<string> = new Set();

  const addUrl = (url: string) => {
    if (!url.includes("#")) {
      urls.add(url);
      console.log(`Found URL: ${url}`);
      onUrlFound?.(url);
    }
  };

  // Check for sitemap
  const sitemapUrl = `${baseUrl}/sitemap.xml`;
  try {
    const sitemapResponse = await axios.get(sitemapUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (sitemapResponse.status === 200) {
      const sitemapXml = sitemapResponse.data;
      const sitemapUrls = await parseSitemap(sitemapXml, inputUrl);
      sitemapUrls.forEach((url) => {
        addUrl(url);
      });
    }
  } catch (error) {
    console.error(`Error fetching sitemap: ${error}`);
  }

  // Always scrape URLs, even if sitemap was found
  await scrapeUrls(inputUrl, urls, baseUrl, addUrl);

  const sortedUrls = Array.from(urls).sort();
  await writeUrlsToFile(sortedUrls);
  await generateSitemapXml(sortedUrls);
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

async function scrapeUrls(
  url: string,
  urls: Set<string>,
  baseUrl: string,
  addUrl: (url: string) => void
) {
  if (urls.has(url)) return;
  addUrl(url);

  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const root = parse(response.data);
    const links = root.querySelectorAll("a");

    for (const link of links) {
      const href = link.getAttribute("href");
      if (href && !href.includes("#")) {
        let fullUrl: string;
        if (href.startsWith("http")) {
          fullUrl = href;
        } else if (href.startsWith("/")) {
          fullUrl = `${baseUrl}${href}`;
        } else {
          fullUrl = new URL(href, url).toString();
        }

        if (
          fullUrl.startsWith(baseUrl) &&
          !urls.has(fullUrl) &&
          !fullUrl.includes("#")
        ) {
          await scrapeUrls(fullUrl, urls, baseUrl, addUrl);
        }
      }
    }
  } catch (error) {
    console.error(`Error scraping ${url}: ${error}`);
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
