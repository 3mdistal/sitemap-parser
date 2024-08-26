export function normalizeUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname}`.toLowerCase().replace(/\/$/, '');
  } catch (error) {
    console.error(`Invalid URL: ${url}`);
    return url;
  }
}
