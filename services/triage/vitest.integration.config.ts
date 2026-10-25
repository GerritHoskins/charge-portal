import { defineConfig } from 'vitest/config'
import { swcPlugin } from './swc.plugin.ts'

// Integration tests: boot the whole Nest app against real PostgreSQL (TRIAGE_DATABASE_URL, ADR 0009).
export default defineConfig({
  plugins: [swcPlugin()],
  test: {
    include: ['test/integration/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // One database, one schema: never run integration files in parallel.
    fileParallelism: false,
  },
})
