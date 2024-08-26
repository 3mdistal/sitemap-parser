import { parseString } from "xml2js";
import axios from "axios";
import Logger from "./logger";

const logger = Logger.getInstance();

export async function checkSitemap(baseUrl: string, inputUrl: string, addUrlToSet: (url: string) => Promise<void>) {
  const sitemapUrl = `${baseUrl}/sitemap.xml`;
  logger.info(`Checking sitemap: ${sitemapUrl}`);
  try {
    const sitemapResponse = await axios.get(sitemapUrl);
    const sitemapXml = sitemapResponse.data;
    const sitemapUrls = await parseSitemap(sitemapXml, inputUrl);
    logger.info(`Found ${sitemapUrls.length} URLs in sitemap`);
    for (const url of sitemapUrls) {
      await addUrlToSet(url);
    }
  } catch (error) {
    logger.error(`Error fetching sitemap: ${error}`);
  }
}

async function parseSitemap(xml: string, baseUrl: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    parseString(xml, (err: Error | null, result: any) => {
      if (err) {
        logger.error(`Error parsing sitemap XML: ${err}`);
        reject(err);
      } else {
        const urls = result.urlset.url
          .map((item: any) => item.loc[0])
          .filter(
            (url: string) => url.startsWith(baseUrl) && !url.includes("#")
          );
        logger.verbose(`Parsed ${urls.length} URLs from sitemap`);
        resolve(urls);
      }
    });
  });
}
