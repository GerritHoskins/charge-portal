import { expect, test } from '@playwright/test'

type TelemetryCall = { url: string; at: number }
type TelemetryTiming = { loadAt: number | null; calls: TelemetryCall[] }

test('defers the initial shop telemetry beacon until 250 ms after document load', async ({ page }) => {
  await page.addInitScript(() => {
    const target = window as Window & { __shopTelemetryTiming?: TelemetryTiming }
    const timing: TelemetryTiming = { loadAt: null, calls: [] }
    target.__shopTelemetryTiming = timing
    window.addEventListener('load', () => {
      timing.loadAt = performance.now()
    }, { once: true })

    const originalSendBeacon = navigator.sendBeacon.bind(navigator)
    navigator.sendBeacon = (url, data) => {
      if (url.includes('/api/events') || url.includes('/api/vitals')) {
        timing.calls.push({ url: String(url), at: performance.now() })
      }
      return originalSendBeacon(url, data)
    }

    const originalFetch = window.fetch.bind(window)
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      if (url.includes('/api/events') || url.includes('/api/vitals')) {
        timing.calls.push({ url, at: performance.now() })
      }
      return originalFetch(input, init)
    }
  })

  await page.goto('/shop/c/wallboxes')
  await expect(page.locator('html')).toHaveAttribute('data-hydrated', '')
  await expect.poll(() => page.evaluate(() => (
    (window as Window & { __shopTelemetryTiming?: TelemetryTiming }).__shopTelemetryTiming?.calls.length ?? 0
  ))).toBeGreaterThan(0)

  const timing = await page.evaluate(() => (
    (window as Window & { __shopTelemetryTiming?: TelemetryTiming }).__shopTelemetryTiming
  ))
  expect(timing?.loadAt, 'document load should be recorded').not.toBeNull()
  const firstCall = timing?.calls[0]
  expect(firstCall, 'initial shop telemetry should be delivered').toBeDefined()
  expect(firstCall!.url).toContain('/api/events')
  expect(firstCall!.at - timing!.loadAt!).toBeGreaterThanOrEqual(250)
})

test('flushes a queued listing event on real navigation during the startup window', async ({ page, request }) => {
  let releaseImages!: () => void
  const imagesHeld = new Promise<void>((resolve) => { releaseImages = resolve })
  let imageRequestSeen = false

  await page.addInitScript(() => {
    const target = window as Window & { __shopLoadAt?: number }
    const trace = { loadAt: -1, sentAt: -1, pagehide: false, body: '', accepted: false }
    const save = () => sessionStorage.setItem('wp25d-exit', JSON.stringify(trace))
    const beacon = navigator.sendBeacon.bind(navigator)
    navigator.sendBeacon = (url, data) => {
      const accepted = beacon(url, data)
      if (String(url).endsWith('/api/events')) {
        Object.assign(trace, { body: String(data), sentAt: performance.now(), accepted })
        save()
      }
      return accepted
    }
    target.__shopLoadAt = -1
    window.addEventListener('load', () => {
      target.__shopLoadAt = performance.now()
      trace.loadAt = target.__shopLoadAt
    }, { once: true })
    window.addEventListener('pagehide', () => {
      trace.pagehide = true
      save()
    })
  })
  await page.route(/\/_ipx\//, async (route) => {
    imageRequestSeen = true
    await imagesHeld
    try { await route.abort() } catch { /* Navigation may already have canceled it. */ }
  })

  try {
    await page.goto('/shop/c/wallboxes', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', '')
    await expect.poll(() => imageRequestSeen).toBe(true)
    expect(await page.evaluate(() => (window as Window & { __shopLoadAt?: number }).__shopLoadAt)).toBe(-1)
    expect(await page.evaluate(() => sessionStorage.getItem('wp25d-exit'))).toBeNull()
    const tabId = await page.evaluate(() => sessionStorage.getItem('charge-portal-shop-tab-id'))
    const before = await (await request.get('/api/events/funnel')).json() as { listingViews: number }

    // A pre-load abort did not emit lifecycle events in Chromium. Navigate in the
    // next task after load to exercise real pagehide before the 250ms gate opens.
    // Same-origin storage survives navigation even when the old response is not
    // associated with Playwright's old page; server ingestion is checked separately.
    await page.evaluate(() => {
      window.addEventListener('load', () => {
        window.setTimeout(() => location.replace('/shop/cart'), 0)
      }, { once: true })
    })
    const navigation = page.waitForURL('**/shop/cart')
    releaseImages()
    await navigation
    const trace = await page.evaluate(() => JSON.parse(sessionStorage.getItem('wp25d-exit') ?? 'null')) as {
      loadAt: number; sentAt: number; pagehide: boolean; body: string; accepted: boolean
    }
    expect(trace).toMatchObject({ accepted: true, pagehide: true })
    expect(trace.sentAt - trace.loadAt).toBeGreaterThanOrEqual(0)
    expect(trace.sentAt - trace.loadAt).toBeLessThan(250)
    expect(JSON.parse(trace.body)).toEqual({ type: 'listing_view', route: '/shop/c/wallboxes', tabId })
    expect(tabId).toMatch(/\S/)
    await expect.poll(async () => {
      const summary = await (await request.get('/api/events/funnel')).json() as { listingViews: number }
      return summary.listingViews
    }).toBeGreaterThan(before.listingViews)
  } finally {
    releaseImages()
  }
})
