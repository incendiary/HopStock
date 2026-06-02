import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Run test files sequentially — each file mocks the db module
    // and imports app fresh; parallel runs would share module cache
    pool: 'forks',
  },
});
