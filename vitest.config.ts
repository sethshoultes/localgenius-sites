import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@lib': '/Users/sethshoultes/Local Sites/localgenius-sites/src/lib',
      '@components': '/Users/sethshoultes/Local Sites/localgenius-sites/src/components',
    },
  },
});
