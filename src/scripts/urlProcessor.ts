export function normalizeUrl(url: string): string {
  const parsedUrl = new URL(url);
  return `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname}`.toLowerCase().replace(/\/$/, '');
}
