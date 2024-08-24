<script lang="ts">
import { actions } from "astro:actions";

const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const result = await actions.scrape(formData);
    console.log(result);
};

</script>

<form method="POST" on:submit={handleSubmit}>
    <label for="url">Website URL:</label>
    <input type="url" id="url" name="url" required>
    <button type="submit">Scrape</button>
</form>

<div id="result"></div>

<style>
    form {
        margin-bottom: 20px;
    }
    label, input, button {
        display: block;
        margin-bottom: 10px;
    }
</style>
