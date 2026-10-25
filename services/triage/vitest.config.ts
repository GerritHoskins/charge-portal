import { defineConfig } from 'vitest/config'
import { swcPlugin } from './swc.plugin.ts'

// Unit tests: no database. The SWC plugin provides decorator metadata (Nest DI, TypeORM, GraphQL) and
// compiles workspace TypeScript dependencies such as @charge-portal/fault-taxonomy (see swc.plugin.ts).
export default defineConfig({
  plugins: [swcPlugin()],
  test: {
    include: ['test/unit/**/*.test.ts'],
    environment: 'node',
  },
})
