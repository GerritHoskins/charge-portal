import { expect, test } from '@playwright/test'
import { disputeResponseSchema, invoiceListResponseSchema, validationErrorSchema } from '../../shared/contracts/invoice'
import { parseLegacyLogin } from '../../shared/contracts/login'
import { meResponseSchema } from '../../shared/contracts/me'
import { sessionListResponseSchema } from '../../shared/contracts/session'
import { stationListResponseSchema } from '../../shared/contracts/station'
import { LEGACY_PORT } from '../../playwright.config'
import { DEMO_LOGIN } from './demo-login'

// Consumer-driven contract test: the shared zod schemas (what the BFF will accept) are run
// against the REAL responses of a running legacy. Unit tests only prove the schemas reject
// bad data; this proves the actual backend still produces data they accept.
// Point it at another implementation with E2E_LEGACY_ORIGIN (e.g. the PHP container).
const LEGACY = process.env.E2E_LEGACY_ORIGIN ?? `http://localhost:${LEGACY_PORT}`

test.describe(`legacy API contract (${LEGACY})`, () => {
  let cookie = ''

  test.beforeAll(async ({ playwright }) => {
    const api = await playwright.request.newContext()
    const login = await api.post(`${LEGACY}/login`, {
      form: { username: DEMO_LOGIN.username, password: DEMO_LOGIN.password },
      maxRedirects: 0,
    })
    const setCookies = login.headersArray().filter((h) => h.name.toLowerCase() === 'set-cookie').map((h) => h.value)
    // The same parser the BFF uses, so a legacy that changes its login answer fails here first.
    const parsed = parseLegacyLogin(login.status(), setCookies)
    expect(parsed.kind).toBe('ok')
    cookie = setCookies.map((c) => c.split(';')[0]).join('; ')
    await api.dispose()
  })

  const get = (request: import('@playwright/test').APIRequestContext, path: string) =>
    request.get(`${LEGACY}${path}`, { headers: { cookie } })

  test('wrong credentials answer 401, not a redirect', async ({ request }) => {
    const res = await request.post(`${LEGACY}/login`, { form: { username: DEMO_LOGIN.username, password: 'nope' }, maxRedirects: 0 })
    expect(parseLegacyLogin(res.status(), [])).toEqual({ kind: 'invalid' })
  })

  test('every API endpoint requires a session', async ({ request }) => {
    for (const path of ['/api/v1/me', '/api/v1/stations', '/api/v1/sessions', '/api/v1/invoices']) {
      expect((await request.get(`${LEGACY}${path}`)).status(), path).toBe(401)
    }
  })

  test('GET /api/v1/me matches the contract', async ({ request }) => {
    const res = await get(request, '/api/v1/me')
    expect(res.status()).toBe(200)
    expect(meResponseSchema.safeParse(await res.json()).success).toBe(true)
  })

  test('GET /api/v1/stations matches the contract', async ({ request }) => {
    const parsed = stationListResponseSchema.safeParse(await (await get(request, '/api/v1/stations')).json())
    expect(parsed.error?.issues ?? []).toEqual([])
  })

  test('GET /api/v1/sessions matches the contract', async ({ request }) => {
    const parsed = sessionListResponseSchema.safeParse(await (await get(request, '/api/v1/sessions')).json())
    expect(parsed.error?.issues ?? []).toEqual([])
  })

  test('GET /api/v1/invoices matches the contract', async ({ request }) => {
    const parsed = invoiceListResponseSchema.safeParse(await (await get(request, '/api/v1/invoices')).json())
    expect(parsed.error?.issues ?? []).toEqual([])
  })

  test('POST dispute: invalid input answers 422 with the validation contract', async ({ request }) => {
    const res = await request.post(`${LEGACY}/api/v1/invoices/inv-0040/disputes`, { headers: { cookie }, data: { reason: 'other', message: 'kurz' } })
    expect(res.status()).toBe(422)
    expect(validationErrorSchema.safeParse(await res.json()).success).toBe(true)
  })

  test('POST dispute: unknown invoice answers 404, non-JSON content type answers 415', async ({ request }) => {
    const unknown = await request.post(`${LEGACY}/api/v1/invoices/inv-9999/disputes`, {
      headers: { cookie },
      data: { reason: 'other', message: 'Eine ausreichend lange Beschreibung.' },
    })
    expect(unknown.status()).toBe(404)
    const form = await request.post(`${LEGACY}/api/v1/invoices/inv-0040/disputes`, { headers: { cookie }, form: { reason: 'other' } })
    expect(form.status()).toBe(415)
  })

  test('POST dispute: a valid dispute answers 201 with the response contract (needs LEGACY_ALLOW_RESET to repeat)', async ({ request }) => {
    const reset = await request.post(`${LEGACY}/__test/reset`)
    test.skip(!reset.ok(), 'legacy has no reset hook; a disputed invoice cannot be disputed twice')
    const res = await request.post(`${LEGACY}/api/v1/invoices/inv-0042/disputes`, {
      headers: { cookie },
      data: { reason: 'wrong-amount', message: 'Der Betrag stimmt nicht mit dem Zähler überein.' },
    })
    expect(res.status()).toBe(201)
    expect(disputeResponseSchema.safeParse(await res.json()).success).toBe(true)
    await request.post(`${LEGACY}/__test/reset`)
  })
})
