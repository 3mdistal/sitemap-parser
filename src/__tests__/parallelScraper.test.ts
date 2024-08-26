import { expect, test, vi, beforeEach, afterEach, describe } from 'vitest';
import { scrapeUrlsParallel } from '../scripts/parallelScraper';
import { Worker } from 'worker_threads';
import { Queue } from 'queue-typescript';
import * as urlProcessor from '../scripts/urlProcessor';

vi.mock('worker_threads');
vi.mock('queue-typescript');
vi.mock('../scripts/urlProcessor');

describe('parallelScraper', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(urlProcessor, 'normalizeUrl').mockImplementation((url) => url);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  test('scrapeUrlsParallel function', async () => {
    const mockWorker = {
      on: vi.fn(),
      postMessage: vi.fn(),
      terminate: vi.fn(),
      threadId: 1,
    };

    (Worker as any).mockImplementation(() => mockWorker);
    const mockQueue = {
      enqueue: vi.fn(),
      dequeue: vi.fn().mockReturnValueOnce('https://kit.svelte.dev').mockReturnValue(undefined),
      length: 1,
    };
    (Queue as any).mockImplementation(() => mockQueue);

    const startUrl = 'https://kit.svelte.dev';
    const discoveredUrls = new Set<string>();
    const baseUrl = 'https://kit.svelte.dev';
    const addUrlToSet = vi.fn();

    const scrapePromise = scrapeUrlsParallel(startUrl, discoveredUrls, baseUrl, addUrlToSet);

    // Simulate worker messages
    const workerMessageHandler = mockWorker.on.mock.calls.find(call => call[0] === 'message')?.[1];
    if (workerMessageHandler) {
      workerMessageHandler({ type: 'result', urls: ['https://kit.svelte.dev/docs', 'https://kit.svelte.dev/faq'] });
    }

    // Simulate completion of scraping
    mockQueue.length = 0;
    if (workerMessageHandler) {
      workerMessageHandler({ type: 'result', urls: [] });
    }

    await scrapePromise;

    expect(Worker).toHaveBeenCalledTimes(4);
    expect(mockWorker.on).toHaveBeenCalledWith('message', expect.any(Function));
    expect(mockWorker.postMessage).toHaveBeenCalled();
    expect(mockWorker.terminate).toHaveBeenCalled();
    expect(addUrlToSet).toHaveBeenCalledTimes(2);
  });

  test('scrapeUrlsParallel error handling', async () => {
    const mockWorker = {
      on: vi.fn(),
      postMessage: vi.fn(),
      terminate: vi.fn(),
      threadId: 1,
    };

    (Worker as any).mockImplementation(() => mockWorker);
    const mockQueue = {
      enqueue: vi.fn(),
      dequeue: vi.fn(),
      length: 0,
    };
    (Queue as any).mockImplementation(() => mockQueue);

    const startUrl = 'https://kit.svelte.dev';
    const discoveredUrls = new Set<string>();
    const baseUrl = 'https://kit.svelte.dev';
    const addUrlToSet = vi.fn();

    const scrapePromise = scrapeUrlsParallel(startUrl, discoveredUrls, baseUrl, addUrlToSet);

    // Simulate worker error
    const workerMessageHandler = mockWorker.on.mock.calls.find(call => call[0] === 'message')?.[1];
    if (workerMessageHandler) {
      workerMessageHandler({ type: 'error', error: 'Test error' });
    }

    await scrapePromise;

    expect(Worker).toHaveBeenCalledTimes(4);
    expect(mockWorker.on).toHaveBeenCalledWith('message', expect.any(Function));
    expect(mockWorker.terminate).toHaveBeenCalled();
  });

  test('scrapeUrlsParallel timeout', async () => {
    const mockWorker = {
      on: vi.fn(),
      postMessage: vi.fn(),
      terminate: vi.fn(),
      threadId: 1,
    };

    (Worker as any).mockImplementation(() => mockWorker);
    const mockQueue = {
      enqueue: vi.fn(),
      dequeue: vi.fn(),
      length: 1,
    };
    (Queue as any).mockImplementation(() => mockQueue);

    const startUrl = 'https://kit.svelte.dev';
    const discoveredUrls = new Set<string>();
    const baseUrl = 'https://kit.svelte.dev';
    const addUrlToSet = vi.fn();

    const scrapePromise = scrapeUrlsParallel(startUrl, discoveredUrls, baseUrl, addUrlToSet);

    // Advance time to trigger timeout
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);

    await scrapePromise;

    expect(Worker).toHaveBeenCalledTimes(4);
    expect(mockWorker.terminate).toHaveBeenCalledTimes(4);
  });
});
