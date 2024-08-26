import { expect, test, vi, beforeEach, describe, type Mock } from 'vitest';
import { parse } from 'node-html-parser';
import axios from 'axios';
import { parentPort } from 'worker_threads';

vi.mock('node-html-parser');
vi.mock('axios');
vi.mock('worker_threads', () => ({
  parentPort: {
    on: vi.fn(),
    postMessage: vi.fn(),
  },
}));

// Import the worker code
const workerCode = await import('../scripts/scraper.worker');

describe('scraper.worker.ts', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('normalizeUrl function', () => {
    const normalizeUrl = workerCode.normalizeUrl;
    expect(normalizeUrl('https://example.com/path/')).toBe('https://example.com/path');
    expect(normalizeUrl('https://Example.com/Path')).toBe('https://example.com/path');
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
  });

  test('constructFullUrl function', () => {
    const constructFullUrl = workerCode.constructFullUrl;
    expect(constructFullUrl('https://example.com', 'https://current.com', 'https://base.com')).toBe('https://example.com');
    expect(constructFullUrl('/path', 'https://current.com', 'https://base.com')).toBe('https://base.com/path');
    expect(constructFullUrl('relative', 'https://current.com/page', 'https://base.com')).toBe('https://current.com/relative');
  });

  test('scrapeUrl function', async () => {
    const scrapeUrl = workerCode.scrapeUrl;
    const mockHtml = '<html><body><a href="https://example.com">Link</a></body></html>';
    (parse as Mock).mockReturnValue({
      querySelectorAll: vi.fn().mockReturnValue([{ getAttribute: () => 'https://example.com' }]),
    });
    (axios.create as Mock).mockReturnValue({
      get: vi.fn().mockResolvedValue({ data: mockHtml }),
    });

    const result = await scrapeUrl('https://test.com', 'https://test.com');
    expect(result).toEqual(['https://example.com']);
  });

  test('worker message handling', async () => {
    const messageHandler = (parentPort?.on as vi.Mock).mock.calls[0][1];
    const mockScrapeUrl = vi.fn().mockResolvedValue(['https://example.com']);
    workerCode.scrapeUrl = mockScrapeUrl;

    await messageHandler({ url: 'https://test.com', baseUrl: 'https://test.com' });

    expect(mockScrapeUrl).toHaveBeenCalledWith('https://test.com', 'https://test.com');
    expect(parentPort?.postMessage).toHaveBeenCalledWith({
      type: 'result',
      urls: ['https://example.com'],
    });
  });

  test('worker error handling', async () => {
    const messageHandler = (parentPort?.on as Mock).mock.calls[0][1];
    const mockScrapeUrl = vi.fn().mockRejectedValue(new Error('Test error'));
    workerCode.scrapeUrl = mockScrapeUrl;

    await messageHandler({ url: 'https://test.com', baseUrl: 'https://test.com' });

    expect(mockScrapeUrl).toHaveBeenCalledWith('https://test.com', 'https://test.com');
    expect(parentPort?.postMessage).toHaveBeenCalledWith({
      type: 'error',
      error: 'Test error',
    });
  });
});
