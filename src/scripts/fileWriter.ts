import fs from "fs/promises";
import Logger from "./logger";

const logger = Logger.getInstance();

export async function writeUrlsToFile(urls: string[]) {
  const formattedUrls = urls.map((url) => `/fetch ${url}`);
  await fs.writeFile("scraped_urls.txt", formattedUrls.join("\n"));
  logger.info(`Wrote ${urls.length} URLs to scraped_urls.txt`);
}

export async function generateSitemapXml(urls: string[]) {
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
  logger.info(`Generated sitemap.xml with ${urls.length} URLs`);
}

export async function generateSitemapJson(urls: string[]) {
  const jsonContent = JSON.stringify({ urls }, null, 2);
  await fs.writeFile("sitemap.json", jsonContent);
  logger.info(`Generated sitemap.json with ${urls.length} URLs`);
}
