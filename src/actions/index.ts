import { scrapeWebsite } from "../scripts/scraper";
import { defineAction, z } from "astro:actions";

export const server = {
  scrape: defineAction({
    accept: "form",
    input: z.object({
      url: z.string().url(),
    }),
    handler: async ({ url }, { request, response }) => {
      response.headers.set("Content-Type", "text/event-stream");
      response.headers.set("Cache-Control", "no-cache");
      response.headers.set("Connection", "keep-alive");

      const encoder = new TextEncoder();
      const stream = new TransformStream();
      const writer = stream.writable.getWriter();

      const sendEvent = async (data: any) => {
        await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        await scrapeWebsite(url, async (foundUrl) => {
          await sendEvent({ type: "url", url: foundUrl });
        });
        await sendEvent({ type: "complete" });
      } catch (error) {
        let errorMessage =
          "An unknown error occurred while scraping the website";
        if (error instanceof Error) {
          errorMessage = `Error scraping website: ${error.message}`;
        }
        await sendEvent({ type: "error", message: errorMessage });
      } finally {
        writer.close();
      }

      return new Response(stream.readable, {
        headers: response.headers,
      });
    },
  }),
};
