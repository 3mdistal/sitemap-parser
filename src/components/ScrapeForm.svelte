<script lang="ts">
import { actions } from "astro:actions";

let results: string[] = [];
let isLoading = false;
let error: string | null = null;

const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    isLoading = true;
    error = null;
    results = [];

    try {
        const result = await actions.scrape(formData);
        if (!result.data?.success) {
            throw new Error(result.data?.error);
        }

        results = result.data.urls || [];
    } catch (err) {
        error = err instanceof Error ? err.message : 'An unknown error occurred';
    } finally {
        isLoading = false;
    }
};

</script>

<form method="POST" on:submit={handleSubmit}>
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
    {:else if results.length > 0}
        <h2>Scraped URLs:</h2>
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
