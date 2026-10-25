import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { ROLLBACK_PORT, TRIAGE_E2E_DATABASE_URL, TRIAGE_GRAPHQL_URL, TRIAGE_INTERNAL_TOKEN } from '../../playwright.config'
import { resetTelemetryData, seedTelemetry, silenceStation, SILENT_STATION_ID } from '../../services/triage/src/seed/seed'
import { stationStateListResponseSchema } from '../../shared/contracts/triage'

// Live station state on /portal/stations (WP-09). The real triage service runs with its own database
// (playwright.config.ts). Every test starts from the same five readings (seedTelemetry): st-003 reports
// an active connector lock fault (needs a visit), st-002 runs warm (degraded), st-001 and st-004 are fine,
// and st-005 is made silent in the database (offline). The service judges "offline" on the time it last
// heard from a station (3 x TELEMETRY_INTERVAL_MS, set to 60 s for E2E), which a sample cannot fake.
//
// Fault tickets are not touched here: triage.spec.ts resets and seeds them in parallel, so the ticket
// filter is tested against a stubbed queue.

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const TENANTS = ['stadtwerke-demo', 'fleet-demo']
const SILENT_FOR_MS = 60 * 60 * 1000

test.beforeEach(async () => {
  await resetTelemetryData(TRIAGE_E2E_DATABASE_URL)
  const result = await seedTelemetry({ graphqlUrl: TRIAGE_GRAPHQL_URL, internalToken: TRIAGE_INTERNAL_TOKEN })
  expect(result).toEqual({ ingested: 5 })
  await silenceStation(TRIAGE_E2E_DATABASE_URL, SILENT_STATION_ID, SILENT_FOR_MS)
})

const hydrated = (page: Page) => expect(page.locator('html')).toHaveAttribute('data-hydrated', '')

// The live state arrives after hydration; wait for it before looking at the table.
const openStations = async (page: Page, query = '') => {
  await page.goto(`/portal/stations${query}`)
  await hydrated(page)
  await expect(page.getByRole('row', { name: /st-003|Depot Ehrenfeld/ })).toContainText('Serviceeinsatz nötig')
}

const axe = async (page: Page, tags = WCAG) => (await new AxeBuilder({ page }).withTags(tags).analyze()).violations

const row = (page: Page, name: string) => page.getByRole('row', { name })
const attention = (page: Page) => page.getByRole('region', { name: 'Handlungsbedarf' })

test.describe('BFF: GET /api/triage/stations/state', () => {
  test('answers the contract: needs-visit mapped from the wire, most urgent first, active alerts only', async ({ request }) => {
    const res = await request.get('/api/triage/stations/state')
    expect(res.status()).toBe(200)
    const { data } = stationStateListResponseSchema.parse(await res.json())

    expect(data.map((s) => `${s.stationId}:${s.state}`)).toEqual([
      'st-003:needs-visit',
      'st-005:offline',
      'st-002:degraded',
      'st-001:ok',
      'st-004:ok',
    ])
    expect(data.find((s) => s.stationId === 'st-003')?.alerts.map((a) => a.kind)).toEqual(['site_visit_fault'])
    expect(data.find((s) => s.stationId === 'st-002')?.alerts.map((a) => a.kind)).toEqual(['high_temperature'])
    expect(data.find((s) => s.stationId === 'st-005')?.alerts.map((a) => a.kind)).toEqual(['offline'])
    expect(data.find((s) => s.stationId === 'st-001')?.alerts).toEqual([])
  })

  test('does not send the service English alert text or the wire spelling to the browser', async ({ request }) => {
    const text = await (await request.get('/api/triage/stations/state')).text()
    expect(text).not.toContain('needs_visit')
    expect(text).not.toContain('needs a visit')
    expect(text).not.toContain('"message"')
  })

  test.describe('logged out', () => {
    test.use({ storageState: { cookies: [], origins: [] } })

    test('is 401 without a session', async ({ request }) => {
      expect((await request.get('/api/triage/stations/state')).status()).toBe(401)
    })
  })
})

test.describe('/portal/stations: live state', () => {
  test('shows the live state of each station next to the legacy data, as text', async ({ page }) => {
    await openStations(page)
    await expect(page.getByRole('columnheader', { name: 'Live-Zustand' })).toBeVisible()
    await expect(page.getByRole('row')).toHaveCount(6) // header + 5 stations, unchanged

    const lock = row(page, /Depot Ehrenfeld/)
    await expect(lock).toContainText('Störung') // legacy status, still there
    await expect(lock).toContainText('Serviceeinsatz nötig')
    await expect(row(page, /Rheinpark P2/)).toContainText('Eingeschränkt')
    await expect(row(page, /Hauptbahnhof Nord/)).toContainText('In Ordnung')
    await expect(row(page, /Messe Süd/)).toContainText('In Ordnung')
    await expect(row(page, /Logistikpark West/)).toContainText('Keine Verbindung')
    await expect(lock.locator('time')).toHaveCount(1)
  })

  test('lists the stations that need attention above the table, most urgent first, with alerts translated by kind', async ({ page }) => {
    await openStations(page)
    const region = attention(page)
    await expect(region).toBeVisible()

    const items = region.getByRole('listitem').filter({ has: page.getByRole('link') })
    await expect(items).toHaveCount(3) // st-003 needs a visit, st-005 offline, st-002 degraded; the ok ones are not listed
    await expect(items.nth(0)).toContainText('Depot Ehrenfeld')
    await expect(items.nth(0)).toContainText('Serviceeinsatz nötig')
    await expect(items.nth(0)).toContainText('Aktive Störung erfordert einen Serviceeinsatz')
    await expect(items.nth(1)).toContainText('Logistikpark West')
    await expect(items.nth(1)).toContainText('Station meldet sich nicht mehr')
    await expect(items.nth(2)).toContainText('Rheinpark P2')
    await expect(items.nth(2)).toContainText('Erhöhte Temperatur')

    // The service's English message is never shown.
    await expect(page.locator('main')).not.toContainText('needs a visit')
    await expect(region).not.toContainText('Hauptbahnhof Nord')
  })

  test('each alert links to the station draft tickets in the triage queue', async ({ page }) => {
    await openStations(page)
    const link = attention(page).getByRole('link', { name: /Tickets zu Depot Ehrenfeld/ })
    await expect(link).toHaveAttribute('href', '/portal/triage?station=st-003')
    await link.click()
    await expect(page).toHaveURL(/\/portal\/triage\?station=st-003$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Störungs-Triage' })).toBeVisible()
    await expect(page.getByText('Gefiltert nach Station st-003')).toBeVisible()
  })

  test('the status filter still works and the announcement stays a single live region', async ({ page }) => {
    await openStations(page)
    await page.getByLabel('Status', { exact: true }).selectOption('faulted')
    await expect(page.getByRole('row')).toHaveCount(2)
    await expect(page.locator('main').getByRole('status')).toHaveText('1 Stationen angezeigt')
  })

  test('has no WCAG 2.2 AA violations with live state on screen', async ({ page }) => {
    await openStations(page)
    await expect(attention(page)).toBeVisible()
    expect(await axe(page)).toEqual([])
  })

  for (const tenant of TENANTS) {
    test(`tenant ${tenant} stays AA-compliant with live state on screen`, async ({ page }) => {
      await openStations(page, `?tenant=${tenant}`)
      await expect(page.locator('html')).toHaveAttribute('data-tenant', tenant)
      await expect(attention(page)).toBeVisible()
      expect(await axe(page, WCAG)).toEqual([])
    })
  }

  for (const width of [320, 375]) {
    test(`does not scroll sideways at ${width}px and passes axe`, async ({ page }) => {
      await page.setViewportSize({ width, height: 700 })
      await openStations(page)
      await expect(attention(page)).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
      expect(await axe(page)).toEqual([])
    })
  }

  test('shows stations that never reported as "Nicht gemeldet"', async ({ page }) => {
    await page.route('**/api/triage/stations/state', (route) =>
      route.fulfill({ json: { data: [{ stationId: 'st-003', state: 'needs-visit', updatedAt: '2026-10-25T10:00:00.000Z', alerts: [] }] } }),
    )
    await page.goto('/portal/stations')
    await hydrated(page)
    await expect(row(page, /Depot Ehrenfeld/)).toContainText('Serviceeinsatz nötig')
    await expect(row(page, /Hauptbahnhof Nord/)).toContainText('Nicht gemeldet')
  })
})

test.describe('/portal/stations: triage service unavailable', () => {
  // The BFF answers 502 for an outage, a broken contract or a service error: the page sees the same thing.
  const unavailable = (page: Page) =>
    page.route('**/api/triage/stations/state', (route) =>
      route.fulfill({ status: 502, json: { statusCode: 502, statusMessage: 'Triage service unreachable' } }),
    )

  test('still renders the legacy data and shows a non-blocking alert', async ({ page }) => {
    await unavailable(page)
    await page.goto('/portal/stations')
    await hydrated(page)

    await expect(page.getByRole('heading', { level: 1, name: 'Stationen' })).toBeVisible()
    await expect(page.getByRole('row')).toHaveCount(6)
    await expect(row(page, /Depot Ehrenfeld/)).toContainText('Störung')
    await expect(page.getByRole('alert')).toContainText('Der Live-Zustand ist derzeit nicht verfügbar')
    await expect(attention(page)).toHaveCount(0)
    await expect(page.getByText('Serviceeinsatz nötig')).toHaveCount(0)

    // The filter keeps working and the single live region keeps its text.
    await page.getByLabel('Status', { exact: true }).selectOption('faulted')
    await expect(page.getByRole('row')).toHaveCount(2)
    await expect(page.locator('main').getByRole('status')).toHaveText('1 Stationen angezeigt')
  })

  test.describe('really unreachable', () => {
    // The second Nuxt app (rollout.spec.ts) is started without a triage service behind it; the login cookie
    // is valid there too (cookies do not depend on the port).
    test.use({ baseURL: `http://localhost:${ROLLBACK_PORT}` })

    test('the BFF answers 502 and the page still lists the stations', async ({ page, request }) => {
      expect((await request.get('/api/triage/stations/state')).status()).toBe(502)

      await page.goto('/portal/stations')
      await hydrated(page)
      await expect(page.getByRole('row')).toHaveCount(6)
      await expect(page.getByRole('alert')).toContainText('Der Live-Zustand ist derzeit nicht verfügbar')
      await expect(row(page, /Depot Ehrenfeld/)).toContainText('Störung')
      expect(await axe(page)).toEqual([])
    })
  })

  test('has no WCAG 2.2 AA violations with the alert', async ({ page }) => {
    await unavailable(page)
    await page.goto('/portal/stations')
    await hydrated(page)
    await expect(page.getByRole('alert')).toBeVisible()
    expect(await axe(page)).toEqual([])
  })

  test('is not shown while the live state is fine', async ({ page }) => {
    await openStations(page)
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
})

test.describe('/portal/triage?station=<id>', () => {
  const ticket = (id: string, stationId: string) => ({
    id,
    faultId: '9b1d7c0a-1d2e-4c7b-8f3a-5e6d7c8b9a01',
    stationId,
    state: 'draft',
    taxonomyCode: 'CON.LOCK_FAILURE',
    probableCause: 'The lock motor is stalled.',
    suggestedAction: 'Replace the lock.',
    requiresSiteVisit: true,
    confidence: 0.9,
    provider: 'rules',
    rejectReason: null,
    createdAt: '2026-10-25T10:00:00.000Z',
    decidedAt: null,
    decidedBy: null,
    fault: { taxonomyCode: 'CON.LOCK_FAILURE', component: 'connector', severity: 'major', requiresSiteVisit: true },
  })
  // The browser stubs only what it requests itself, so these tests reach the queue by clicking a link on
  // the stations page (client-side navigation); a direct load would be rendered on the server from the real queue.
  const stubQueue = (page: Page) =>
    page.route('**/api/triage/tickets*', (route) =>
      route.fulfill({
        json: {
          data: [
            ticket('3f0c2a8e-6a55-4a5e-9a3c-0d1f6f1d2b10', 'st-003'),
            ticket('3f0c2a8e-6a55-4a5e-9a3c-0d1f6f1d2b11', 'st-001'),
            ticket('3f0c2a8e-6a55-4a5e-9a3c-0d1f6f1d2b12', 'st-003'),
          ],
        },
      }),
    )

  test('names the station on a direct load too', async ({ page }) => {
    await page.goto('/portal/triage?station=st-003')
    await hydrated(page)
    await expect(page.getByText('Gefiltert nach Station st-003')).toBeVisible()
  })

  test('shows only the drafts of that station, says so, and the filter can be removed', async ({ page }) => {
    await stubQueue(page)
    await openStations(page)
    await attention(page).getByRole('link', { name: /Tickets zu Depot Ehrenfeld/ }).click()
    await expect(page.getByRole('row')).toHaveCount(3) // header + 2 tickets of st-003
    await expect(page.locator('main').getByRole('status')).toHaveText('2 Tickets angezeigt')
    await expect(page.getByText('Gefiltert nach Station st-003')).toBeVisible()
    await expect(page.getByRole('row', { name: /st-001/ })).toHaveCount(0)

    await page.getByRole('link', { name: 'Filter entfernen' }).click()
    await expect(page.getByRole('row')).toHaveCount(4)
    await expect(page.getByText('Gefiltert nach Station')).toHaveCount(0)
  })

  test('says so when the station has no tickets in this state, and passes axe', async ({ page }) => {
    await stubQueue(page)
    await page.route('**/api/triage/stations/state', (route) =>
      route.fulfill({
        json: {
          data: [
            {
              stationId: 'st-009',
              state: 'needs-visit',
              updatedAt: '2026-10-25T10:00:00.000Z',
              alerts: [{ id: '0d4e9a3c-2b1f-4a6e-8c7d-9e0f1a2b3c4d', stationId: 'st-009', kind: 'recurring_fault', raisedAt: '2026-10-25T10:00:00.000Z' }],
            },
          ],
        },
      }),
    )
    await page.goto('/portal/stations')
    await hydrated(page)
    await attention(page).getByRole('link', { name: /Tickets zu st-009/ }).click()
    await expect(page.getByText('Keine Tickets für diese Station und diesen Status.')).toBeVisible()
    expect(await axe(page)).toEqual([])
  })

  test('the queue without the parameter is unchanged', async ({ page }) => {
    await stubQueue(page)
    await openStations(page)
    await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Störungs-Triage' }).click()
    await expect(page.getByRole('row')).toHaveCount(4)
    await expect(page.getByText('Gefiltert nach Station')).toHaveCount(0)
  })
})
