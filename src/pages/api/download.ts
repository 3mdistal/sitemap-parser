import type { APIContext } from "astro";
import fs from "fs/promises";

export async function GET({ request }: APIContext) {
  const format = new URL(request.url).searchParams.get("format");
  let filename: string;
  let contentType: string;

  switch (format) {
    case "xml":
      filename = "sitemap.xml";
      contentType = "application/xml";
      break;
    case "json":
      filename = "sitemap.json";
      contentType = "application/json";
      break;
    case "txt":
      filename = "scraped_urls.txt";
      contentType = "text/plain";
      break;
    default:
      return new Response("Invalid format", { status: 400 });
  }

  try {
    const content = await fs.readFile(filename, "utf-8");
    return new Response(content, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return new Response("File not found", { status: 404 });
  }
}
