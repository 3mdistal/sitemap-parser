import { scrapeWebsite } from "../scripts/scraper";
import { defineAction, z } from "astro:actions";

export const server = {
  scrape: defineAction({
    accept: "form",
    input: z.object({
      url: z.string().url(),
    }),
    handler: async ({ url }) => {
      try {
        const scrapedUrls = await scrapeWebsite(url);
        return {
          success: true,
          data: scrapedUrls,
        };
      } catch (error) {
        if (error instanceof Error) {
          return {
            success: false,
            error: `Error scraping website: ${error.message}`,
          };
        } else {
          return {
            success: false,
            error: "An unknown error occurred while scraping the website",
          };
        }
      }
    },
  }),
};
