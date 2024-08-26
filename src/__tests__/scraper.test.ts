import { expect, test, vi } from 'vitest';
import { scrapeWebsite } from '../scripts/scraper';
import axios from 'axios';
import * as sitemapParser from '../scripts/sitemapParser';
import * as parallelScraper from '../scripts/parallelScraper';
import * as fileWriter from '../scripts/fileWriter';

vi.mock('axios');
vi.mock('../scripts/sitemapParser');
vi.mock('../scripts/parallelScraper');
vi.mock('../scripts/fileWriter');

test('scrapeWebsite function', async () => {
  const mockOnUrlFound = vi.fn();

  vi.spyOn(sitemapParser, 'checkSitemap').mockResolvedValue();
  vi.spyOn(parallelScraper, 'scrapeUrlsParallel').mockResolvedValue();
  vi.spyOn(fileWriter, 'writeUrlsToFile').mockResolvedValue();
  vi.spyOn(fileWriter, 'generateSitemapXml').mockResolvedValue();
  vi.spyOn(fileWriter, 'generateSitemapJson').mockResolvedValue();

  (axios.create as any).mockReturnValue({
    head: vi.fn().mockResolvedValue({}),
  });

  const result = await scrapeWebsite('https://example.com', mockOnUrlFound);

  expect(sitemapParser.checkSitemap).toHaveBeenCalled();
  expect(parallelScraper.scrapeUrlsParallel).toHaveBeenCalled();
  expect(fileWriter.writeUrlsToFile).toHaveBeenCalled();
  expect(fileWriter.generateSitemapXml).toHaveBeenCalled();
  expect(fileWriter.generateSitemapJson).toHaveBeenCalled();
  expect(result).toEqual(expect.any(Array));
});

test('scrapeWebsite with sitemapOnly', async () => {
  const mockOnUrlFound = vi.fn();

  vi.spyOn(sitemapParser, 'checkSitemap').mockResolvedValue();
  vi.spyOn(parallelScraper, 'scrapeUrlsParallel').mockResolvedValue();

  await scrapeWebsite('https://example.com', mockOnUrlFound, true);

  expect(sitemapParser.checkSitemap).toHaveBeenCalled();
  expect(parallelScraper.scrapeUrlsParallel).not.toHaveBeenCalled();
});

test('scrapeWebsite error handling', async () => {
  const mockOnUrlFound = vi.fn();

  vi.spyOn(sitemapParser, 'checkSitemap').mockRejectedValue(new Error('Sitemap error'));
  vi.spyOn(console, 'error').mockImplementation(() => {});

  await expect(scrapeWebsite('https://example.com', mockOnUrlFound)).rejects.toThrow('Sitemap error');
});
