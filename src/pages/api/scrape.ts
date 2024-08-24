import { scrapeWebsite } from "../../scripts/scraper";
import type { APIContext } from "astro";

export async function GET({ request }: APIContext) {
  const url = new URL(request.url).searchParams.get("url");
  const sitemapOnly =
    new URL(request.url).searchParams.get("sitemapOnly") === "true";

  if (!url) {
    return new Response("Missing URL parameter", { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendEvent = async (data: any) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  const scrape = async () => {
    try {
      await scrapeWebsite(
        url,
        async (foundUrl) => {
          await sendEvent({ type: "url", url: foundUrl });
        },
        sitemapOnly
      );

      await sendEvent({ type: "complete" });
    } catch (error) {
      let errorMessage = "An unknown error occurred while scraping the website";
      if (error instanceof Error) {
        errorMessage = `Error scraping website: ${error.message}`;
      }
      await sendEvent({ type: "error", message: errorMessage });
    } finally {
      writer.close();
    }
  };

  scrape();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
