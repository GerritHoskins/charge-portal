import { defineConfig } from 'vitest/config'
import { swcPlugin } from './swc.plugin.ts'

// Live tests call the real Anthropic API and cost money, so they are opt-in (`npm run test:live`), never part
// of `check`, and skip themselves when ANTHROPIC_API_KEY is not set.
export default defineConfig({
  plugins: [swcPlugin()],
  test: {
    include: ['test/live/**/*.live.test.ts'],
    environment: 'node',
    testTimeout: 300_000,
  },
})
