import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    mode: 'directory',
    functionPerRoute: false,
    runtime: {
      mode: 'local',
      type: 'pages',
      bindings: {
        DB: { type: 'd1' },
        SITE_ASSETS: { type: 'r2' },
      },
    },
  }),
  vite: {
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    },
  },
});
