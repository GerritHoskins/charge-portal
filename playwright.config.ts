import { defineConfig } from '@playwright/test'

export const AUTH_STATE = 'tests/.auth/state.json'

// Ports are overridable so a full stack can run next to a dev server that is already
// using :3000/:8080 (E2E_APP_PORT=3100 E2E_LEGACY_PORT=8180 npx playwright test).
export const APP_PORT = Number(process.env.E2E_APP_PORT ?? 3000)
export const ROLLBACK_PORT = APP_PORT + 100 // second Nuxt with NUXT_ROLLOUT set, for rollout.spec.ts
export const LEGACY_PORT = Number(process.env.E2E_LEGACY_PORT ?? 8080)

// Fault triage service (services/triage) with its own throwaway database. The name must end in _e2e:
// the seed helpers refuse to drop or truncate anything else. Locally the shared Postgres container
// (user/password triage) is used; CI has the same credentials. The token must match what the Nuxt BFF
// sends (NUXT_TRIAGE_INTERNAL_TOKEN): CI sets TRIAGE_INTERNAL_TOKEN, the default is the synthetic dev token.
export const TRIAGE_PORT = Number(process.env.E2E_TRIAGE_PORT ?? 4100)
export const TRIAGE_GRAPHQL_URL = `http://127.0.0.1:${TRIAGE_PORT}/graphql`
export const TRIAGE_E2E_DATABASE_URL = process.env.E2E_TRIAGE_DATABASE_URL ?? 'postgres://triage:triage@localhost:5432/triage_e2e'
export const TRIAGE_INTERNAL_TOKEN = process.env.TRIAGE_INTERNAL_TOKEN ?? 'synthetic-dev-internal-token'

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
    // Back-office triage screens; the spec resets and seeds the triage database before every test.
    { name: 'triage', testMatch: /triage\.spec\.ts/, dependencies: ['setup'], use: { storageState: AUTH_STATE } },
    // Live station state on /portal/stations; the spec resets and seeds the telemetry before every test.
    { name: 'stations-state', testMatch: /stations-state\.spec\.ts/, dependencies: ['setup'], use: { storageState: AUTH_STATE } },
    // Auth behaviour itself is tested from a logged-out browser.
    { name: 'auth', testMatch: /auth\.spec\.ts/ },
    // Public shop routes and APIs are tested without a saved login state.
    { name: 'shop', testMatch: /shop.*\.spec\.ts/ },
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
    {
      command: `npx nuxt dev --port ${APP_PORT}`,
      url: `http://localhost:${APP_PORT}/login`,
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        LEGACY_ORIGIN: `http://localhost:${LEGACY_PORT}`,
        NUXT_TRIAGE_ORIGIN: `http://127.0.0.1:${TRIAGE_PORT}`,
        NUXT_TRIAGE_INTERNAL_TOKEN: TRIAGE_INTERNAL_TOKEN,
      },
    },
    // Triage service: builds the bundle, recreates the _e2e database, then starts the service (it runs its
    // migrations at startup). Never reused: a stale service could be wired to another database.
    {
      command: 'npm run e2e:serve -w @charge-portal/triage',
      url: TRIAGE_GRAPHQL_URL,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        TRIAGE_DATABASE_URL: TRIAGE_E2E_DATABASE_URL,
        TRIAGE_INTERNAL_TOKEN,
        TRIAGE_PORT: String(TRIAGE_PORT),
        TRIAGE_HOST: '127.0.0.1',
        ANTHROPIC_API_KEY: '', // blank = rules provider; E2E never calls a model
        // A station counts as offline after 3 x this interval without a sample. 60 s keeps freshly seeded
        // stations online for the whole test; stations-state.spec.ts silences one station in the database.
        TELEMETRY_INTERVAL_MS: '60000',
      },
    },
    // Same app with /portal/invoices rolled back to legacy (NUXT_ROLLOUT).
    {
      command: `npx nuxt dev --port ${ROLLBACK_PORT}`,
      url: `http://localhost:${ROLLBACK_PORT}/login`,
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        LEGACY_ORIGIN: `http://localhost:${LEGACY_PORT}`,
        NUXT_ROLLOUT: '/portal/invoices=0',
        NUXT_IGNORE_LOCK: '1',
        // This app has no triage service behind it (port 1 refuses connections): stations-state.spec.ts uses it
        // to see the stations page with a really unreachable service.
        NUXT_TRIAGE_ORIGIN: 'http://127.0.0.1:1',
      },
    },
    // Static Storybook build, served for the design-system a11y tests.
    { command: 'npm run build-storybook && npx vite preview --outDir storybook-static --port 6006 --strictPort', url: 'http://localhost:6006/iframe.html', reuseExistingServer: true, timeout: 180_000, env: { STORYBOOK_DISABLE_TELEMETRY: '1' } },
  ],
})
