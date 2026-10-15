import { defineConfig } from '@playwright/test'

export const AUTH_STATE = 'tests/.auth/state.json'

// Ports are overridable so a full stack can run next to a dev server that is already
// using :3000/:8080 (E2E_APP_PORT=3100 E2E_LEGACY_PORT=8180 npx playwright test).
export const APP_PORT = Number(process.env.E2E_APP_PORT ?? 3000)
export const ROLLBACK_PORT = APP_PORT + 100 // second Nuxt with NUXT_ROLLOUT set, for rollout.spec.ts
export const LEGACY_PORT = Number(process.env.E2E_LEGACY_PORT ?? 8080)

export default defineConfig({
  testDir: 'tests/e2e',
  // The app follows the browser language (de default, en supported); tests pin German.
  use: { baseURL: `http://localhost:${APP_PORT}`, locale: 'de-DE' },
  projects: [
    // Logs in once through the real legacy login form and saves the cookie.
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'app',
      testMatch: /(portal|invoices|mobile)\.spec\.ts/,
      dependencies: ['setup'],
      use: { storageState: AUTH_STATE },
    },
    // Auth behaviour itself is tested from a logged-out browser.
    { name: 'auth', testMatch: /auth\.spec\.ts/ },
    { name: 'storybook', testMatch: /storybook\.spec\.ts/ },
    // Real legacy responses parsed with the shared contracts (also runnable against another legacy).
    // It mutates legacy state (one dispute), so it runs after the specs that reset that state.
    { name: 'contract', testMatch: /contract\.spec\.ts/, dependencies: ['app'] },
    // Rollback switch, against the second Nuxt below.
    { name: 'rollout', testMatch: /rollout\.spec\.ts/ },
  ],
  // Both processes are needed: the legacy stand-in and the Nuxt app in front of it.
  webServer: [
    { command: 'npm run legacy', url: `http://localhost:${LEGACY_PORT}/login`, reuseExistingServer: true, env: { LEGACY_ALLOW_RESET: '1', LEGACY_PORT: String(LEGACY_PORT) } },
    { command: `npx nuxt dev --port ${APP_PORT}`, url: `http://localhost:${APP_PORT}/login`, reuseExistingServer: true, timeout: 120_000, env: { LEGACY_ORIGIN: `http://localhost:${LEGACY_PORT}` } },
    // Same app with /portal/invoices rolled back to legacy (NUXT_ROLLOUT).
    {
      command: `npx nuxt dev --port ${ROLLBACK_PORT}`,
      url: `http://localhost:${ROLLBACK_PORT}/login`,
      reuseExistingServer: true,
      timeout: 120_000,
      env: { LEGACY_ORIGIN: `http://localhost:${LEGACY_PORT}`, NUXT_ROLLOUT: '/portal/invoices=0', NUXT_IGNORE_LOCK: '1' },
    },
    // Static Storybook build, served for the design-system a11y tests.
    { command: 'npm run build-storybook && npx vite preview --outDir storybook-static --port 6006 --strictPort', url: 'http://localhost:6006/iframe.html', reuseExistingServer: true, timeout: 180_000, env: { STORYBOOK_DISABLE_TELEMETRY: '1' } },
  ],
})
