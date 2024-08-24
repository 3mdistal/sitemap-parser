import axios from "axios";
import { parse } from "node-html-parser";
import { parseString } from "xml2js";
import fs from "fs/promises";

export async function scrapeWebsite(inputUrl: string): Promise<string[]> {
  const baseUrl = new URL(inputUrl).origin;
  const urls: Set<string> = new Set();

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
        urls.add(url);
        console.log(`Found URL from sitemap: ${url}`);
      });
    }
  } catch (error) {
    console.error(`Error fetching sitemap: ${error}`);
  }

  // Always scrape URLs, even if sitemap was found
  await scrapeUrls(inputUrl, urls, baseUrl);

  const sortedUrls = Array.from(urls).sort();
  await writeUrlsToFile(sortedUrls);
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
          .filter((url: string) => url.startsWith(baseUrl));
        resolve(urls);
      }
    });
  });
}

async function scrapeUrls(url: string, urls: Set<string>, baseUrl: string) {
  if (urls.has(url)) return;
  urls.add(url);
  console.log(`Found URL: ${url}`);

  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const root = parse(response.data);
    const links = root.querySelectorAll("a");

    for (const link of links) {
      const href = link.getAttribute("href");
      if (href) {
        let fullUrl: string;
        if (href.startsWith("http")) {
          fullUrl = href;
        } else if (href.startsWith("/")) {
          fullUrl = `${baseUrl}${href}`;
        } else {
          fullUrl = new URL(href, url).toString();
        }

        if (fullUrl.startsWith(baseUrl) && !urls.has(fullUrl)) {
          await scrapeUrls(fullUrl, urls, baseUrl);
        }
      }
    }
  } catch (error) {
    console.error(`Error scraping ${url}: ${error}`);
  }
}

async function writeUrlsToFile(urls: string[]) {
  await fs.writeFile("scraped_urls.txt", urls.join("\n"));
}
