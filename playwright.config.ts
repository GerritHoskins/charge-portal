import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://localhost:3000' },
  // Both processes are needed: the legacy stand-in and the Nuxt app in front of it.
  webServer: [
    { command: 'npm run legacy', url: 'http://localhost:8080/api/v1/stations', reuseExistingServer: true },
    { command: 'npx nuxt dev --port 3000', url: 'http://localhost:3000/portal/stations', reuseExistingServer: true, timeout: 120_000 },
  ],
})
