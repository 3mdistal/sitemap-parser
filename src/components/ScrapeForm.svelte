<script lang="ts">
import { onMount } from 'svelte';

let results: string[] = [];
let isLoading = false;
let error: string | null = null;
let eventSource: EventSource | null = null;
let isComplete = false;
let sitemapOnly = false;
let urlCount = 0;

onMount(() => {
  return () => {
    if (eventSource) {
      eventSource.close();
    }
  };
});

const handleSubmit = async (event: Event) => {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  const formData = new FormData(form);
  const url = formData.get('url') as string;

  isLoading = true;
  error = null;
  results = [];
  isComplete = false;
  urlCount = 0;

  if (eventSource) {
    eventSource.close();
  }

  eventSource = new EventSource(`/api/scrape?url=${encodeURIComponent(url)}&sitemapOnly=${sitemapOnly}`);

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'url') {
      results = [...results, data.url];
      urlCount++;
    } else if (data.type === 'complete') {
      isLoading = false;
      results = results.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())); // Sort alphabetically, case-insensitive
      isComplete = true;
      eventSource?.close();
      alert('Scraping complete. sitemap.xml, sitemap.json, and scraped_urls.txt have been generated.');
    } else if (data.type === 'error') {
      error = data.message;
      isLoading = false;
      eventSource?.close();
    }
  };

  eventSource.onerror = () => {
    error = 'Connection error';
    isLoading = false;
    eventSource?.close();
  };
};

const downloadSitemap = (format: 'xml' | 'json' | 'txt') => {
  const filename = `sitemap.${format}`;
  const link = document.createElement('a');
  link.href = `/api/download?format=${format}`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
</script>

<form on:submit={handleSubmit}>
    <label for="url">Website URL:</label>
    <input type="url" id="url" name="url" required>
    <label>
        <input type="checkbox" bind:checked={sitemapOnly}>
        Sitemap only
    </label>
    <button type="submit" disabled={isLoading}>
        {isLoading ? 'Generating Sitemap...' : 'Generate Sitemap'}
    </button>
</form>

<div id="result">
    {#if isLoading}
        <p>Sitemap generation in progress... {urlCount} URLs found so far</p>
    {:else if error}
        <p>Error: {error}</p>
    {/if}

    {#if isComplete}
        <h2>Download Sitemap:</h2>
        <button on:click={() => downloadSitemap('xml')}>Download XML</button>
        <button on:click={() => downloadSitemap('json')}>Download JSON</button>
        <button on:click={() => downloadSitemap('txt')}>Download TXT</button>
    {/if}

    {#if results.length > 0}
        <h2>
            {#if isComplete}
                Generated URLs (Alphabetical Order):
            {:else}
                Generated URLs:
            {/if}
        </h2>
        <ul>
            {#each results as url}
                <li>{url}</li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    form {
        margin-bottom: 20px;
    }
    label, input, button {
        display: block;
        margin-bottom: 10px;
    }
    ul {
        list-style-type: none;
        padding: 0;
    }
    li {
        margin-bottom: 5px;
    }
    label {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
    }
    input[type="checkbox"] {
        margin-right: 5px;
    }
</style>
