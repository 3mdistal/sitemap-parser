import { defineConfig } from 'vitest/config';
import { getViteConfig } from 'astro/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  ...getViteConfig({}),
  plugins: [svelte({ hot: !process.env.VITEST })],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
