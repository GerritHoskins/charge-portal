import { defineConfig } from '@playwright/test'

export const AUTH_STATE = 'tests/.auth/state.json'

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://localhost:3000' },
  projects: [
    // Logs in once through the real legacy login form and saves the cookie.
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'app',
      testMatch: /portal\.spec\.ts/,
      dependencies: ['setup'],
      use: { storageState: AUTH_STATE },
    },
    // Auth behaviour itself is tested from a logged-out browser.
    { name: 'auth', testMatch: /auth\.spec\.ts/ },
    { name: 'storybook', testMatch: /storybook\.spec\.ts/ },
  ],
  // Both processes are needed: the legacy stand-in and the Nuxt app in front of it.
  webServer: [
    { command: 'npm run legacy', url: 'http://localhost:8080/login', reuseExistingServer: true },
    { command: 'npx nuxt dev --port 3000', url: 'http://localhost:3000/login', reuseExistingServer: true, timeout: 120_000 },
    // Static Storybook build, served for the design-system a11y tests.
    { command: 'npm run build-storybook && npx vite preview --outDir storybook-static --port 6006 --strictPort', url: 'http://localhost:6006/iframe.html', reuseExistingServer: true, timeout: 180_000, env: { STORYBOOK_DISABLE_TELEMETRY: '1' } },
  ],
})
