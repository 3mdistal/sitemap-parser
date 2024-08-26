import { defineConfig } from "astro/config";

import svelte from "@astrojs/svelte";

// https://astro.build/config
export default defineConfig({
  output: "server",
  experimental: {
    actions: true
  },
  integrations: [svelte()],
  vite: {
    worker: {
      format: "es"
    },
    test: {
      globals: true,
      environment: "jsdom"
    }
  }
});
