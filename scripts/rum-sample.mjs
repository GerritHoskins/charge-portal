// Drives the public shop funnel against a production build and prints in-memory telemetry.
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'

const APP_PORT = 3000
const LEGACY_PORT = Number(process.env.RUM_LEGACY_PORT ?? 8080)
const APP = `http://localhost:${APP_PORT}`
const LEGACY = `http://localhost:${LEGACY_PORT}`
const RUN_INTERVAL_MS = 6_000

const parseArgs = (args) => {
  const options = { runs: 30, base: APP, cpu: 4, noStart: false }
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--runs') options.runs = Number(args[++index])
    else if (argument === '--base') options.base = args[++index]
    else if (argument === '--cpu') options.cpu = Number(args[++index])
    else if (argument === '--json') {
      options.json = args[++index]
      if (!options.json) throw new Error('--json requires a file path')
    }
    else if (argument === '--no-start') options.noStart = true
    else throw new Error(`Unknown argument: ${argument}`)
  }
  if (!Number.isInteger(options.runs) || options.runs < 1) throw new Error('--runs must be a positive integer')
  if (!Number.isFinite(options.cpu) || options.cpu < 1) throw new Error('--cpu must be at least 1')
  if (!options.base) throw new Error('--base requires a URL')
  return options
}

const children = []
const start = (cmd, args, env = {}) => {
  const childEnv = { ...process.env, ...env }
  const child = spawn(cmd, args, { stdio: 'inherit', env: childEnv })
  children.push(child)
  return child
}
const stop = () => children.forEach((child) => child.kill())

const isPortInUse = (port) => new Promise((resolveResult, reject) => {
  const server = createServer()
  server.unref()
  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE' || error.code === 'EACCES') resolveResult(true)
    else reject(error)
  })
  server.listen({ port, exclusive: true }, () => server.close(() => resolveResult(false)))
})

const waitFor = async (url) => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await fetch(url, { redirect: 'manual' }).then(() => true, () => false)) return
    await new Promise((resolveResult) => setTimeout(resolveResult, 500))
  }
  throw new Error(`${url} did not start`)
}

const waitForShopEvent = (page, type) => page.waitForResponse((response) => {
  if (!response.url().endsWith('/api/events') || response.request().method() !== 'POST') return false
  try {
    return JSON.parse(response.request().postData() ?? '').type === type
  } catch {
    return false
  }
})

const waitForListingRequest = (page) => page.waitForResponse((response) => (
  response.url().includes('/api/shop/listing/wallboxes') && response.request().method() === 'GET'
))

const percent = (value) => value === null || value === undefined ? '—' : `${(value * 100).toFixed(1)}%`
const metricCell = (metric, name) => {
  if (!metric) return 'n/a / 0'
  const value = name === 'CLS' ? metric.p75.toFixed(3) : `${Math.round(metric.p75)} ms`
  return `${value} / ${metric.count}`
}

const printSummary = (summary, funnel) => {
  console.log('\nSynthetic RUM p75 by lifecycle route (ms except CLS; p75 / samples)')
  console.log('Route                 LCP             INP             CLS')
  for (const route of ['/shop/c/:category', '/shop/:slug', '/shop/cart']) {
    const metrics = summary[route]
    console.log(`${route.padEnd(21)} ${metricCell(metrics?.LCP, 'LCP').padEnd(15)} ${metricCell(metrics?.INP, 'INP').padEnd(15)} ${metricCell(metrics?.CLS, 'CLS')}`)
  }
  console.log('\nFunnel totals and distinct-tab conversion rates')
  console.log(`listingViews=${funnel.listingViews} productViews=${funnel.productViews} addToCarts=${funnel.addToCarts} viewToProduct=${percent(funnel.viewToProductRate)} productToCart=${percent(funnel.productToCartRate)}`)
}

let code = 1
try {
  const options = parseArgs(process.argv.slice(2))
  const base = new URL(options.base)
  if (!['http:', 'https:'].includes(base.protocol)) throw new Error('--base must use http or https')

  if (!options.noStart) {
    if (base.protocol !== 'http:' || !['localhost', '127.0.0.1', '::1'].includes(base.hostname)) {
      throw new Error('--base must be a local http URL when --no-start is not used')
    }
    if (!Number.isInteger(LEGACY_PORT) || LEGACY_PORT < 1 || LEGACY_PORT > 65535) {
      throw new Error('RUM_LEGACY_PORT must be an integer from 1 to 65535')
    }
    const appPort = Number(base.port || 80)
    for (const [url, port] of [[`${base.origin}`, appPort], [LEGACY, LEGACY_PORT]]) {
      if (await isPortInUse(port)) throw new Error(`${url} is already in use; stop the server before starting this build.`)
    }
    start(process.execPath, ['legacy/server.mjs'], { LEGACY_PORT: String(LEGACY_PORT) })
    start(process.execPath, ['.output/server/index.mjs'], {
      PORT: String(appPort),
      NITRO_PORT: String(appPort),
      NUXT_LEGACY_ORIGIN: LEGACY,
    })
  }
  await waitFor(`${base.origin}/shop/c/wallboxes`)
  if (!options.noStart) await waitFor(`${LEGACY}/login`)

  const browser = await chromium.launch({ headless: true })
  const beaconResponses = []
  const eventResponses = []
  const interactionDiagnostics = []
  const failedTelemetryRequests = []
  try {
    const origin = base.origin
    for (let run = 0; run < options.runs; run += 1) {
      // The fixed 6-second start interval keeps up to ten reports per tab below the endpoint's
      // 120/min IP limit; it is rate-limit pacing, not a random user delay.
      if (run > 0) await new Promise((resolveResult) => setTimeout(resolveResult, RUN_INTERVAL_MS))
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1, locale: 'de-DE' })
      const page = await context.newPage()
      const pendingTelemetry = new Map()
      const trackTelemetryRequest = (request) => {
        if (!/\/api\/(?:vitals|events)(?:\/|$)/.test(new URL(request.url()).pathname)) return
        let finish
        const settled = new Promise((resolveResult) => { finish = resolveResult })
        pendingTelemetry.set(request, { settled, finish })
      }
      const finishTelemetryRequest = (request) => {
        const tracked = pendingTelemetry.get(request)
        if (!tracked) return
        pendingTelemetry.delete(request)
        tracked.finish()
      }
      page.on('response', (response) => {
        if (response.url().endsWith('/api/vitals')) beaconResponses.push(response.status())
        if (response.url().endsWith('/api/events')) eventResponses.push(response.status())
        finishTelemetryRequest(response.request())
      })
      page.on('request', trackTelemetryRequest)
      page.on('requestfinished', finishTelemetryRequest)
      page.on('requestfailed', (request) => {
        if (!pendingTelemetry.has(request)) return
        failedTelemetryRequests.push({ url: request.url(), error: request.failure()?.errorText ?? 'unknown' })
        finishTelemetryRequest(request)
      })
      let cdp
      try {
        cdp = await context.newCDPSession(page)
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: options.cpu })

        const listingEvent = waitForShopEvent(page, 'listing_view')
        await page.goto(`${origin}/shop/c/wallboxes`)
        await page.locator('html').waitFor({ state: 'attached' })
        await page.waitForFunction(() => document.documentElement.hasAttribute('data-hydrated'))
        await page.locator('ul.product-grid > li').nth(2).waitFor({ state: 'visible' })
        await listingEvent

        let listingRequest = waitForListingRequest(page)
        await page.locator('#connector').selectOption('type2')
        await page.waitForURL(/connector=type2/)
        await listingRequest
        await page.locator('ul.product-grid > li').nth(2).waitFor({ state: 'visible' })

        listingRequest = waitForListingRequest(page)
        await page.locator('#order').selectOption('price-desc')
        await page.waitForURL(/order=price-desc/)
        await listingRequest
        const thirdProduct = page.locator('ul.product-grid > li').nth(2)
        await thirdProduct.waitFor({ state: 'visible' })
        const productEvent = waitForShopEvent(page, 'product_view')
        await thirdProduct.getByRole('link').click()
        await page.getByRole('heading', { level: 1 }).waitFor({ state: 'visible' })
        await productEvent

        const addButton = page.getByRole('button', { name: 'In den Warenkorb' })
        await addButton.waitFor({ state: 'visible' })
        if (!(await addButton.isEnabled())) throw new Error(`Run ${run + 1}: third filtered product is unavailable`)
        const cartEvent = waitForShopEvent(page, 'add_to_cart')
        await addButton.click()
        await cartEvent
        await page.waitForFunction(() => [...document.querySelectorAll('[role="status"][aria-live="polite"]')]
          .some((element) => Boolean(element.textContent?.trim())))
        interactionDiagnostics.push(await page.evaluate(() => {
          const eventEntries = performance.getEntriesByType('event')
          return {
            eventEntrySupported: PerformanceObserver.supportedEntryTypes.includes('event'),
            eventEntries: eventEntries.length,
            interactionIds: eventEntries.filter((entry) => 'interactionId' in entry && entry.interactionId > 0).length,
            firstInputEntries: performance.getEntriesByType('first-input').length,
          }
        }))

        // Product-card links and cart navigation are full document loads in the same context.
        await page.goto(`${origin}/shop/cart`)
        await page.getByRole('heading', { level: 1 }).waitFor({ state: 'visible' })
        await page.waitForFunction(() => document.documentElement.hasAttribute('data-hydrated'))
        await page.waitForLoadState('networkidle')
        await page.goto('about:blank')
        await page.waitForLoadState('load')
        const pending = Promise.all([...pendingTelemetry.values()].map(({ settled }) => settled))
        let timeout
        try {
          await Promise.race([pending, new Promise((_, reject) => {
            timeout = setTimeout(() => reject(new Error('Telemetry requests did not settle after navigating to about:blank')), 10_000)
          })])
        } finally {
          clearTimeout(timeout)
        }
        await cdp.detach()
      } finally {
        if (cdp) await cdp.detach().catch(() => undefined)
        await context.close()
      }
      const runStatuses = eventResponses.slice(run * 3, (run + 1) * 3)
      if (runStatuses.length !== 3 || runStatuses.some((status) => status !== 204)) {
        throw new Error(`Run ${run + 1}: expected three accepted funnel event responses, received ${runStatuses.join(', ') || 'none'}`)
      }
      console.log(`Completed run ${run + 1}/${options.runs}`)
    }
  } finally {
    await browser.close()
  }

  const [vitalsResponse, funnelResponse] = await Promise.all([
    fetch(`${base.origin}/api/vitals/summary`),
    fetch(`${base.origin}/api/events/funnel`),
  ])
  if (!vitalsResponse.ok || !funnelResponse.ok) throw new Error(`Telemetry summary failed: vitals=${vitalsResponse.status}, funnel=${funnelResponse.status}`)
  const vitals = await vitalsResponse.json()
  const funnel = await funnelResponse.json()
  const coverageIssues = []
  for (const route of ['/shop/c/:category', '/shop/:slug', '/shop/cart']) {
    for (const name of ['LCP', 'CLS']) {
      if ((vitals[route]?.[name]?.count ?? 0) < options.runs) {
        coverageIssues.push(`${route} ${name}: ${vitals[route]?.[name]?.count ?? 0}/${options.runs}`)
      }
    }
  }
  const rejected = beaconResponses.filter((status) => status === 429).length
  const failedBeacons = beaconResponses.filter((status) => status !== 204)
  const failedEvents = eventResponses.filter((status) => status !== 204)
  if (failedBeacons.length || failedEvents.length || failedTelemetryRequests.length) {
    throw new Error(`Telemetry failures: vitals ${failedBeacons.length}/${beaconResponses.length} non-204, events ${failedEvents.length}/${eventResponses.length} non-204, ${failedTelemetryRequests.length} requests failed`)
  }
  const result = {
    label: 'WP-19 synthetic RUM baseline',
    measuredAt: new Date().toISOString(),
    options,
    routeAttribution: 'Web Vitals are labeled by the active route when a lifecycle callback fires. Product-card links and the cart URL are full document navigations; connector and sort changes update the listing route in the same document.',
    beaconResponses: { accepted: beaconResponses.filter((status) => status >= 200 && status < 300).length, rejected429: rejected, otherStatuses: beaconResponses.filter((status) => status < 200 || status >= 300).filter((status) => status !== 429) },
    eventResponses: { accepted: eventResponses.filter((status) => status >= 200 && status < 300).length, rejected429: eventResponses.filter((status) => status === 429).length },
    failedTelemetryRequests,
    coverageIssues,
    interactionDiagnostics: {
      eventEntrySupported: interactionDiagnostics.some(({ eventEntrySupported }) => eventEntrySupported),
      eventEntries: interactionDiagnostics.reduce((total, { eventEntries }) => total + eventEntries, 0),
      interactions: interactionDiagnostics.reduce((total, { interactionIds }) => total + interactionIds, 0),
      firstInputEntries: interactionDiagnostics.reduce((total, { firstInputEntries }) => total + firstInputEntries, 0),
    },
    vitals,
    funnel,
  }
  printSummary(vitals, funnel)
  console.log(`Vitals POSTs: ${result.beaconResponses.accepted} accepted, ${rejected} rate-limited, ${result.beaconResponses.otherStatuses.length} other failures`)
  console.log(`Funnel POSTs: ${result.eventResponses.accepted} accepted, ${result.eventResponses.rejected429} rate-limited`)
  console.log(`Interaction entries: supported=${result.interactionDiagnostics.eventEntrySupported} entries=${result.interactionDiagnostics.eventEntries} interactions=${result.interactionDiagnostics.interactions} first-input=${result.interactionDiagnostics.firstInputEntries}`)
  if (coverageIssues.length) console.error(`Insufficient expected vital coverage: ${coverageIssues.join(', ')}`)
  if (options.json) {
    const outputPath = resolve(options.json)
    await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
    console.log(`Wrote ${outputPath}`)
  }
  code = coverageIssues.length ? 1 : 0
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
} finally {
  stop()
}
process.exit(code)
