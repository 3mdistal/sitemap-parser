<script lang="ts">
import { onMount } from 'svelte';

let results: string[] = [];
let isLoading = false;
let error: string | null = null;
let eventSource: EventSource | null = null;
let isComplete = false;

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

  if (eventSource) {
    eventSource.close();
  }

  eventSource = new EventSource(`/api/scrape?url=${encodeURIComponent(url)}`);

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'url') {
      results = [...results, data.url];
    } else if (data.type === 'complete') {
      isLoading = false;
      results = results.sort((a, b) => a.localeCompare(b)); // Sort alphabetically
      isComplete = true;
      eventSource?.close();
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
</script>

<form on:submit={handleSubmit}>
    <label for="url">Website URL:</label>
    <input type="url" id="url" name="url" required>
    <button type="submit" disabled={isLoading}>
        {isLoading ? 'Scraping...' : 'Scrape'}
    </button>
</form>

<div id="result">
    {#if isLoading}
        <p>Scraping in progress...</p>
    {:else if error}
        <p>Error: {error}</p>
    {/if}

    {#if results.length > 0}
        <h2>
            {#if isComplete}
                Scraped URLs (Alphabetical Order):
            {:else}
                Scraped URLs:
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
</style>
