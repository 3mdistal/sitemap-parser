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
        const urls: string[] = [];
        await scrapeWebsite(url, (foundUrl) => {
          urls.push(foundUrl);
        });
        return { success: true, urls };
      } catch (error) {
        let errorMessage =
          "An unknown error occurred while scraping the website";
        if (error instanceof Error) {
          errorMessage = `Error scraping website: ${error.message}`;
        }
        return { success: false, error: errorMessage };
      }
    },
  }),
};
