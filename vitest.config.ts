import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary'],
      // Only what unit tests can reach on their own: design system, pure shared logic and the
      // framework-free server utilities. Pages and Nitro handlers (which need the Nuxt runtime
      // and a legacy backend) are covered by the Playwright suites instead; coverage of them
      // is intentionally not claimed here.
      include: [
        'app/components/ds/**/*.vue',
        'shared/**/*.ts',
        'server/utils/{csrf-token,rate-limit,login-throttle,public-api,vitals-store}.ts',
        'scripts/lib/**/*.mjs',
      ],
      // A floor, not a target: it exists to make a drop visible in review.
      thresholds: { lines: 90, functions: 90, statements: 90, branches: 80 },
    },
  },
})
