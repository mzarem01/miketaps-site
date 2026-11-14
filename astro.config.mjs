import { defineConfig } from 'astro/config';

// Fully static build. Everything in dist/ is plain HTML, CSS and a little JS.
export default defineConfig({
  site: 'https://miketaps.com',
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
});
