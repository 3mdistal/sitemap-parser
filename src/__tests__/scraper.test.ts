import { expect, test, vi, beforeEach } from 'vitest';
import { scrapeWebsite } from '../scripts/scraper';
import axios from 'axios';
import * as sitemapParser from '../scripts/sitemapParser';
import * as parallelScraper from '../scripts/parallelScraper';
import * as fileWriter from '../scripts/fileWriter';

vi.mock('axios');
vi.mock('../scripts/sitemapParser');
vi.mock('../scripts/parallelScraper');
vi.mock('../scripts/fileWriter');

beforeEach(() => {
  vi.useFakeTimers();
});

test('scrapeWebsite function', async () => {
  const mockOnUrlFound = vi.fn();

  vi.spyOn(sitemapParser, 'checkSitemap').mockResolvedValue();
  vi.spyOn(parallelScraper, 'scrapeUrlsParallel').mockImplementation(async () => {
    await mockOnUrlFound('https://kit.svelte.dev/docs');
    await mockOnUrlFound('https://kit.svelte.dev/faq');
  });
  vi.spyOn(fileWriter, 'writeUrlsToFile').mockResolvedValue();
  vi.spyOn(fileWriter, 'generateSitemapXml').mockResolvedValue();
  vi.spyOn(fileWriter, 'generateSitemapJson').mockResolvedValue();

  (axios.create as any).mockReturnValue({
    head: vi.fn().mockResolvedValue({}),
  });

  const scrapePromise = scrapeWebsite('https://kit.svelte.dev', mockOnUrlFound);

  await vi.runAllTimersAsync();

  const result = await scrapePromise;

  expect(sitemapParser.checkSitemap).toHaveBeenCalled();
  expect(parallelScraper.scrapeUrlsParallel).toHaveBeenCalled();
  expect(fileWriter.writeUrlsToFile).toHaveBeenCalled();
  expect(fileWriter.generateSitemapXml).toHaveBeenCalled();
  expect(fileWriter.generateSitemapJson).toHaveBeenCalled();
  expect(mockOnUrlFound).toHaveBeenCalledTimes(2);
  expect(result).toEqual(expect.any(Array));
});

test('scrapeWebsite with sitemapOnly', async () => {
  const mockOnUrlFound = vi.fn();

  vi.spyOn(sitemapParser, 'checkSitemap').mockResolvedValue();
  vi.spyOn(parallelScraper, 'scrapeUrlsParallel').mockResolvedValue();

  await scrapeWebsite('https://kit.svelte.dev', mockOnUrlFound, true);

  expect(sitemapParser.checkSitemap).toHaveBeenCalled();
  expect(parallelScraper.scrapeUrlsParallel).not.toHaveBeenCalled();
});

test('scrapeWebsite error handling', async () => {
  const mockOnUrlFound = vi.fn();

  vi.spyOn(sitemapParser, 'checkSitemap').mockRejectedValue(new Error('Sitemap error'));
  vi.spyOn(console, 'error').mockImplementation(() => {});

  await expect(scrapeWebsite('https://kit.svelte.dev', mockOnUrlFound)).rejects.toThrow('Sitemap error');
});
