import AxeBuilder from '@axe-core/playwright'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { TRIAGE_E2E_DATABASE_URL, TRIAGE_GRAPHQL_URL, TRIAGE_INTERNAL_TOKEN } from '../../playwright.config'
import { resetTriageData, seedFaults } from '../../services/triage/src/seed/seed'

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const TENANTS = ['default', 'stadtwerke-demo', 'fleet-demo']
const FIXTURE_COUNT = 12 // WP-01 fixtures, one draft ticket each

interface TicketRow {
  id: string
  stationId: string
  taxonomyCode: string
}

// Every test starts from the same twelve drafts: the decision tests change service state.
test.beforeEach(async () => {
  await resetTriageData(TRIAGE_E2E_DATABASE_URL)
  const result = await seedFaults({ graphqlUrl: TRIAGE_GRAPHQL_URL, internalToken: TRIAGE_INTERNAL_TOKEN })
  expect(result).toEqual({ created: FIXTURE_COUNT, ignored: 0 })
})

const findTicket = async (request: APIRequestContext, stationId: string, taxonomyCode: string) => {
  const res = await request.get('/api/triage/tickets?state=draft')
  expect(res.status()).toBe(200)
  const { data } = (await res.json()) as { data: TicketRow[] }
  const ticket = data.find((t) => t.stationId === stationId && t.taxonomyCode === taxonomyCode)
  expect(ticket, `draft ticket ${stationId} ${taxonomyCode}`).toBeDefined()
  return ticket!
}

// Voltreon "connector lock stuck" on st-003 (rules provider: major, site visit).
const lockTicket = (request: APIRequestContext) => findTicket(request, 'st-003', 'CON.LOCK_FAILURE')

const hydrated = (page: Page) => expect(page.locator('html')).toHaveAttribute('data-hydrated', '')

const openReview = async (page: Page, id: string, tenant = 'default') => {
  await page.goto(`/portal/triage/${id}${tenant === 'default' ? '' : `?tenant=${tenant}`}`)
  await hydrated(page)
  await expect(page.getByRole('heading', { level: 1, name: 'Ticket für Station st-003' })).toBeVisible()
}

const axe = async (page: Page) => (await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations

const countDecisionPosts = (page: Page) => {
  const posts = { count: 0 }
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/decision')) posts.count++
  })
  return posts
}

test.describe('new route: /portal/triage (Nuxt, queue)', () => {
  test('lists the seeded drafts with class, severity, site visit and provider as text', async ({ page }) => {
    await page.goto('/portal/triage')
    await expect(page.getByRole('heading', { level: 1, name: 'Störungs-Triage' })).toBeVisible()
    await expect(page.getByRole('row')).toHaveCount(FIXTURE_COUNT + 1) // header + drafts
    await expect(page.locator('main').getByRole('status')).toHaveText(`${FIXTURE_COUNT} Tickets angezeigt`)

    const lock = page.getByRole('row', { name: /st-003.*CON\.LOCK_FAILURE/ })
    await expect(lock).toContainText('Verriegelung des Ladeanschlusses blockiert')
    await expect(lock).toContainText('Erheblich') // severity: text, not colour alone
    await expect(lock.getByRole('cell').nth(2)).toHaveText('Ja') // site visit
    await expect(lock).toContainText('rules')
    await expect(lock.locator('time')).toHaveCount(1)

    const link = lock.getByRole('link', { name: /Prüfen/ })
    await expect(link).toHaveAccessibleName(/st-003.*Verriegelung/)
  })

  test('is rendered by Nuxt, not by the legacy backend', async ({ page }) => {
    await page.goto('/portal/triage')
    await hydrated(page)
    expect(await page.content()).not.toContain('legacy-rendered')
  })

  test('is reachable from the main navigation', async ({ page }) => {
    await page.goto('/portal/stations')
    await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Störungs-Triage' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Störungs-Triage' })).toBeVisible()
  })

  test('filters by state and announces the result', async ({ page }) => {
    await page.goto('/portal/triage')
    await hydrated(page)
    await page.getByLabel('Status', { exact: true }).selectOption('rejected')
    await expect(page.locator('main').getByRole('status')).toHaveText('0 Tickets angezeigt')
    await expect(page.getByText('Keine Tickets für diesen Status.')).toBeVisible()
    await page.getByLabel('Status', { exact: true }).selectOption('all')
    await expect(page.getByRole('row')).toHaveCount(FIXTURE_COUNT + 1)
  })

  test('shows a decided ticket under its new state only', async ({ page, request }) => {
    const ticket = await lockTicket(request)
    expect((await request.post(`/api/triage/tickets/${ticket.id}/decision`, { data: { action: 'approve' } })).status()).toBe(200)

    await page.goto('/portal/triage')
    await expect(page.getByRole('row')).toHaveCount(FIXTURE_COUNT) // header + 11 drafts
    await hydrated(page)
    await page.getByLabel('Status', { exact: true }).selectOption('approved')
    await expect(page.getByRole('row')).toHaveCount(2)
    await expect(page.getByRole('row', { name: /st-003.*CON\.LOCK_FAILURE/ })).toBeVisible()
  })
})

test.describe('review: /portal/triage/[id]', () => {
  test('shows the fault, the draft with provenance and the audit trail', async ({ page, request }) => {
    const ticket = await lockTicket(request)
    await openReview(page, ticket.id)

    const fault = page.getByRole('region', { name: 'Gemeldete Störung' })
    await expect(fault).toContainText('st-003')
    await expect(fault.getByText('OtherError', { exact: true })).toBeVisible()
    await expect(fault.getByText('voltreon', { exact: true })).toBeVisible()
    await expect(fault.getByText('1012', { exact: true })).toBeVisible()
    await expect(fault).toContainText('CON.LOCK_FAILURE')
    await expect(fault).toContainText('Herstellertabelle')

    const draft = page.getByRole('region', { name: 'Entwurf des Agenten' })
    await expect(draft).toContainText('rules')
    await expect(draft).toContainText(/90\s*%/)
    await expect(draft.getByText('Wahrscheinliche Ursache')).toBeVisible()
    await expect(draft.getByText('Empfohlene Maßnahme')).toBeVisible()

    const audit = page.getByRole('region', { name: 'Verlauf' }).getByRole('listitem')
    await expect(audit).toHaveCount(1)
    await expect(audit.first()).toContainText('Entwurf erstellt')
    await expect(audit.first()).toContainText('agent:rules')

    await expect(page.getByRole('button', { name: 'Freigeben', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Bearbeiten', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ablehnen', exact: true })).toBeVisible()
  })

  test('an unknown ticket is a 404 page', async ({ page }) => {
    const res = await page.goto('/portal/triage/00000000-0000-4000-8000-000000000000')
    expect(res?.status()).toBe(404)
    const malformed = await page.goto('/portal/triage/not-a-ticket')
    expect(malformed?.status()).toBe(404)
  })

  test('approve: updates the state, announces it and extends the audit trail', async ({ page, request }) => {
    const ticket = await lockTicket(request)
    await openReview(page, ticket.id)
    await page.getByRole('button', { name: 'Freigeben', exact: true }).click()

    await expect(page.locator('main').getByRole('status')).toHaveText('Ticket wurde freigegeben.')
    await expect(page.getByRole('region', { name: 'Entscheidung' })).toContainText('Freigegeben')
    await expect(page.getByRole('button', { name: 'Freigeben', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Bearbeiten', exact: true })).toHaveCount(0)

    const audit = page.getByRole('region', { name: 'Verlauf' }).getByRole('listitem')
    await expect(audit).toHaveCount(2)
    await expect(audit.nth(0)).toContainText('Entwurf erstellt')
    await expect(audit.nth(1)).toContainText('Freigegeben')
    await expect(audit.nth(1)).toContainText('Demo Operator')

    // The decision survives a reload (it is in the service, not only in the page).
    await page.reload()
    await hydrated(page)
    await expect(page.getByRole('region', { name: 'Entscheidung' })).toContainText('Demo Operator')
    await expect(page.getByRole('button', { name: 'Freigeben', exact: true })).toHaveCount(0)
  })

  test('edit: changes the cause, shows "edited" in the state and the audit trail', async ({ page, request }) => {
    const ticket = await lockTicket(request)
    await openReview(page, ticket.id)
    await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click()

    const cause = page.getByLabel('Wahrscheinliche Ursache')
    await expect(cause).toBeVisible()
    await expect(cause).not.toHaveValue('')
    await cause.fill('Verriegelungsmotor blockiert durch Fremdkörper im Steckergehäuse.')
    await page.getByRole('button', { name: 'Mit Änderungen freigeben' }).click()

    await expect(page.locator('main').getByRole('status')).toHaveText('Ticket wurde mit Änderungen freigegeben.')
    await expect(page.getByRole('region', { name: 'Entwurf des Agenten' })).toContainText('Fremdkörper im Steckergehäuse')
    await expect(page.getByRole('region', { name: 'Entscheidung' })).toContainText('Bearbeitet')

    const audit = page.getByRole('region', { name: 'Verlauf' }).getByRole('listitem')
    await expect(audit).toHaveCount(2)
    await expect(audit.nth(1)).toContainText('Bearbeitet')
    await expect(audit.nth(1)).toContainText('Geändert: Wahrscheinliche Ursache')
    await expect(audit.nth(1)).not.toContainText('Empfohlene Maßnahme')
  })

  test('edit: can change class and site visit, and refuses an edit without any change', async ({ page, request }) => {
    const ticket = await lockTicket(request)
    await openReview(page, ticket.id)
    await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click()
    const posts = countDecisionPosts(page)

    await page.getByRole('button', { name: 'Mit Änderungen freigeben' }).click()
    await expect(page.getByRole('alert')).toBeFocused()
    await expect(page.getByRole('alert').getByRole('link')).toHaveText(['Bitte ändern Sie mindestens ein Feld.'])
    expect(posts.count).toBe(0)

    await page.getByLabel('Fehlerklasse').selectOption('PWR.OVERCURRENT')
    await page.getByLabel('Serviceeinsatz erforderlich').uncheck()
    await page.getByRole('button', { name: 'Mit Änderungen freigeben' }).click()
    await expect(page.locator('main').getByRole('status')).toHaveText('Ticket wurde mit Änderungen freigegeben.')

    const audit = page.getByRole('region', { name: 'Verlauf' }).getByRole('listitem').nth(1)
    await expect(audit).toContainText('Fehlerklasse')
    await expect(audit).toContainText('Serviceeinsatz erforderlich')
    await expect(page.getByRole('region', { name: 'Entwurf des Agenten' })).toContainText('PWR.OVERCURRENT')
  })

  test('edit: an empty cause is an accessible field error and nothing is sent', async ({ page, request }) => {
    const ticket = await lockTicket(request)
    await openReview(page, ticket.id)
    await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click()
    const posts = countDecisionPosts(page)

    await page.getByLabel('Wahrscheinliche Ursache').fill('   ')
    await page.getByRole('button', { name: 'Mit Änderungen freigeben' }).click()

    await expect(page.getByRole('alert')).toBeFocused()
    const cause = page.getByLabel('Wahrscheinliche Ursache')
    await expect(cause).toHaveAttribute('aria-invalid', 'true')
    await expect(cause).toHaveAccessibleDescription(/Bitte füllen Sie das Feld „Wahrscheinliche Ursache“ aus/)
    expect(posts.count).toBe(0)
  })

  test('reject without a reason: focused error summary, field tied by aria-describedby, nothing sent', async ({ page, request }) => {
    const ticket = await lockTicket(request)
    await openReview(page, ticket.id)
    await page.getByRole('button', { name: 'Ablehnen', exact: true }).click()
    const posts = countDecisionPosts(page)

    await page.getByRole('button', { name: 'Ablehnung bestätigen' }).click()

    const summary = page.getByRole('alert')
    await expect(summary).toBeFocused()
    await expect(summary.getByRole('heading', { name: 'Bitte korrigieren Sie ein Feld' })).toBeVisible()
    await expect(summary.getByRole('link')).toHaveText(['Bitte füllen Sie das Feld „Begründung der Ablehnung“ aus.'])

    const reason = page.getByLabel('Begründung der Ablehnung')
    await expect(reason).toHaveAttribute('aria-invalid', 'true')
    await expect(reason).toHaveAccessibleDescription(/Bitte füllen Sie das Feld „Begründung der Ablehnung“ aus/)
    await summary.getByRole('link').click()
    await expect(reason).toBeFocused()

    expect(posts.count).toBe(0)
    expect(await axe(page)).toEqual([])

    // The ticket is still a draft.
    const res = await request.get(`/api/triage/tickets/${ticket.id}`)
    expect((await res.json()).data.state).toBe('draft')
  })

  test('reject with a reason: rejected, reason shown, audit extended', async ({ page, request }) => {
    const ticket = await lockTicket(request)
    await openReview(page, ticket.id)
    await page.getByRole('button', { name: 'Ablehnen', exact: true }).click()
    await page.getByRole('button', { name: 'Ablehnung bestätigen' }).click()
    await expect(page.getByRole('alert')).toBeFocused()

    await page.getByLabel('Begründung der Ablehnung').fill('Doppelte Meldung, Station bereits in Wartung.')
    await page.getByRole('button', { name: 'Ablehnung bestätigen' }).click()

    await expect(page.locator('main').getByRole('status')).toHaveText('Ticket wurde abgelehnt.')
    const decision = page.getByRole('region', { name: 'Entscheidung' })
    await expect(decision).toContainText('Abgelehnt')
    await expect(decision).toContainText('Doppelte Meldung, Station bereits in Wartung.')
    await expect(page.getByRole('alert')).toHaveCount(0)

    const audit = page.getByRole('region', { name: 'Verlauf' }).getByRole('listitem')
    await expect(audit).toHaveCount(2)
    await expect(audit.nth(1)).toContainText('Abgelehnt')
  })

  test('cancel closes the form and returns focus to the button that opened it', async ({ page, request }) => {
    const ticket = await lockTicket(request)
    await openReview(page, ticket.id)
    await page.getByRole('button', { name: 'Ablehnen', exact: true }).click()
    await page.getByRole('button', { name: 'Abbrechen' }).click()
    await expect(page.getByRole('button', { name: 'Ablehnen', exact: true })).toBeFocused()
    await expect(page.getByLabel('Begründung der Ablehnung')).toHaveCount(0)
  })

  test('a ticket decided elsewhere meanwhile: clear message, then read-only', async ({ page, request }) => {
    const ticket = await lockTicket(request)
    await openReview(page, ticket.id)
    const other = await request.post(`/api/triage/tickets/${ticket.id}/decision`, { data: { action: 'reject', reason: 'Bereits erledigt.' } })
    expect(other.status()).toBe(200)

    await page.getByRole('button', { name: 'Freigeben', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Dieses Ticket wurde bereits entschieden')
    await expect(page.getByRole('button', { name: 'Freigeben', exact: true })).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Entscheidung' })).toContainText('Abgelehnt')
  })

  test('approve with the keyboard only', async ({ page, request }) => {
    const ticket = await lockTicket(request)
    await openReview(page, ticket.id)
    const approve = page.getByRole('button', { name: 'Freigeben', exact: true })

    let reached = false
    for (let i = 0; i < 60 && !reached; i++) {
      await page.keyboard.press('Tab')
      reached = await approve.evaluate((el) => el === document.activeElement)
    }
    expect(reached, 'the approve button must be reachable with Tab').toBe(true)
    await page.keyboard.press('Enter')

    await expect(page.locator('main').getByRole('status')).toHaveText('Ticket wurde freigegeben.')
    // The buttons are gone, so focus moves to the decision heading instead of falling back to the page.
    await expect(page.getByRole('heading', { level: 2, name: 'Entscheidung' })).toBeFocused()
  })

  test('edit and reject can be completed with the keyboard only', async ({ page, request }) => {
    const ticket = await lockTicket(request)
    await openReview(page, ticket.id)
    await page.getByRole('button', { name: 'Ablehnen', exact: true }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Begründung der Ablehnung')).toBeFocused()
    await page.keyboard.type('Nicht reproduzierbar.')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Ablehnung bestätigen' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('main').getByRole('status')).toHaveText('Ticket wurde abgelehnt.')
  })
})

test.describe('accessibility (axe, WCAG 2.2 AA) in every tenant theme', () => {
  for (const tenant of TENANTS) {
    test(`queue and review: ${tenant}`, async ({ page, request }) => {
      await page.goto(`/portal/triage${tenant === 'default' ? '' : `?tenant=${tenant}`}`)
      await hydrated(page)
      await expect(page.getByRole('row')).toHaveCount(FIXTURE_COUNT + 1)
      expect(await axe(page), 'queue').toEqual([])

      const ticket = await lockTicket(request)
      await openReview(page, ticket.id, tenant)
      expect(await axe(page), 'review (draft)').toEqual([])

      await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click()
      await expect(page.getByLabel('Wahrscheinliche Ursache')).toBeVisible()
      expect(await axe(page), 'edit form').toEqual([])
      await page.getByRole('button', { name: 'Mit Änderungen freigeben' }).click()
      await expect(page.getByRole('alert')).toBeVisible()
      expect(await axe(page), 'edit form with error').toEqual([])
      await page.getByRole('button', { name: 'Abbrechen' }).click()

      await page.getByRole('button', { name: 'Ablehnen', exact: true }).click()
      await page.getByRole('button', { name: 'Ablehnung bestätigen' }).click()
      await expect(page.getByRole('alert')).toBeVisible()
      expect(await axe(page), 'reject form with error').toEqual([])
      await page.getByLabel('Begründung der Ablehnung').fill('Falscher Alarm.')
      await page.getByRole('button', { name: 'Ablehnung bestätigen' }).click()
      await expect(page.getByRole('region', { name: 'Entscheidung' })).toContainText('Abgelehnt')
      expect(await axe(page), 'review (rejected, read-only)').toEqual([])
    })
  }

  test('an approved and an edited review pass axe', async ({ page, request }) => {
    const approved = await lockTicket(request)
    await request.post(`/api/triage/tickets/${approved.id}/decision`, { data: { action: 'approve' } })
    const edited = await findTicket(request, 'st-002', 'CON.LOCK_FAILURE')
    await request.post(`/api/triage/tickets/${edited.id}/decision`, { data: { action: 'edit', suggestedAction: 'Stecker tauschen.' } })

    for (const id of [approved.id, edited.id]) {
      await page.goto(`/portal/triage/${id}`)
      await hydrated(page)
      await expect(page.getByRole('region', { name: 'Verlauf' })).toBeVisible()
      expect(await axe(page)).toEqual([])
    }
  })
})

test.describe('mobile', () => {
  for (const width of [320, 375]) {
    test(`queue and review do not scroll sideways at ${width}px`, async ({ page, request }) => {
      await page.setViewportSize({ width, height: 700 })
      const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

      await page.goto('/portal/triage')
      await expect(page.getByRole('row')).toHaveCount(FIXTURE_COUNT + 1)
      expect(await overflow()).toBeLessThanOrEqual(0)
      expect(await axe(page)).toEqual([])

      const ticket = await lockTicket(request)
      await openReview(page, ticket.id)
      expect(await overflow()).toBeLessThanOrEqual(0)
      expect(await axe(page)).toEqual([])
    })
  }
})

test.describe('logged-out browser', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('the pages redirect to login and the BFF answers 401', async ({ page, request }) => {
    await page.goto('/portal/triage')
    await expect(page).toHaveURL(/\/login\?next=/)

    const list = await request.get('/api/triage/tickets')
    expect(list.status()).toBe(401)
    const decision = await request.post('/api/triage/tickets/00000000-0000-4000-8000-000000000000/decision', { data: { action: 'approve' } })
    expect(decision.status()).toBe(401)
  })
})

test.describe('BFF decisions', () => {
  test('a second decision is a 409 and an invalid one a 422 with issues', async ({ request }) => {
    const ticket = await lockTicket(request)
    const url = `/api/triage/tickets/${ticket.id}/decision`

    const invalid = await request.post(url, { data: { action: 'reject', reason: 'x' } })
    expect(invalid.status()).toBe(422)
    expect((await invalid.json()).data.issues[0].path).toBe('reason')

    expect((await request.post(url, { data: { action: 'approve' } })).status()).toBe(200)
    expect((await request.post(url, { data: { action: 'reject', reason: 'Zu spät.' } })).status()).toBe(409)
  })
})
