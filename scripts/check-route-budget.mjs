import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { gzipSync } from 'node:zlib'
import { chromium } from '@playwright/test'
import {
  evaluate,
  parseLegacyPort,
  parseBudgets,
  REQUIRED_ROUTES,
  validateBudgetCoverage,
} from './lib/route-budget.mjs'

const LEGACY_PORT = parseLegacyPort(process.env.ROUTE_BUDGET_LEGACY_PORT)
const LEGACY = `http://localhost:${LEGACY_PORT}`
const APP = 'http://localhost:3000'
const ASSET_ROOT = resolve('.output/public/_nuxt')
const BUDGET_FILE = 'scripts/route-budgets.json'

const children = []
const start = (script, env = {}) => {
  const child = spawn(process.execPath, [script], {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  })
  children.push(child)
  return child
}
const stop = () => children.forEach((child) => child.kill())

const responds = (url) => fetch(url, { redirect: 'manual' }).then(() => true, () => false)
const isPortInUse = (port) => new Promise((resolvePort, reject) => {
  const server = createServer()
  server.unref()
  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE' || error.code === 'EACCES') resolvePort(true)
    else reject(error)
  })
  server.listen({ port, exclusive: true }, () => server.close(() => resolvePort(false)))
})
const waitFor = async (url) => {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await responds(url)) return
    await new Promise((resolveWait) => setTimeout(resolveWait, 500))
  }
  throw new Error(`${url} did not start`)
}

const sessionCookies = async () => {
  const login = await fetch(`${LEGACY}/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      username: 'demo',
      password: 'demo-password',
      next: '/portal/stations',
    }),
  })
  if (login.status !== 302) throw new Error(`Demo login failed with HTTP ${login.status}`)

  const cookies = login.headers.getSetCookie().map((header) => {
    const [pair] = header.split(';')
    const separator = pair.indexOf('=')
    return {
      name: pair.slice(0, separator),
      value: pair.slice(separator + 1),
      url: APP,
    }
  })
  if (cookies.length === 0 || cookies.some(({ name }) => !name)) {
    throw new Error('Demo login failed: no valid session cookie')
  }
  return cookies
}

const localAsset = (pathname) => {
  const marker = '/_nuxt/'
  const markerIndex = pathname.indexOf(marker)
  if (markerIndex === -1 || !pathname.endsWith('.js')) return null

  const assetPath = decodeURIComponent(pathname.slice(markerIndex + marker.length))
  const file = resolve(ASSET_ROOT, assetPath)
  const fromRoot = relative(ASSET_ROOT, file)
  if (fromRoot.startsWith(`..${sep}`) || fromRoot === '..' || isAbsolute(fromRoot)) {
    throw new Error(`Refusing client asset outside ${ASSET_ROOT}: ${pathname}`)
  }
  return file
}

const measureRoute = async (browser, route, cookies) => {
  const context = await browser.newContext()
  try {
    if (route.startsWith('/portal/')) await context.addCookies(cookies)
    const page = await context.newPage()
    const assets = new Set()
    page.on('response', (response) => {
      const url = new URL(response.url())
      if (url.origin !== APP) return
      const file = localAsset(url.pathname)
      if (file) assets.add(file)
    })

    const response = await page.goto(`${APP}${route}`, { waitUntil: 'domcontentloaded' })
    if (!response || response.status() !== 200) {
      throw new Error(`${route} returned HTTP ${response?.status() ?? 'no response'}`)
    }
    await page.locator('html[data-hydrated]').waitFor({ state: 'attached' })
    await page.waitForLoadState('networkidle')
    if (new URL(page.url()).pathname !== route) {
      throw new Error(`${route} redirected to ${new URL(page.url()).pathname}`)
    }
    if (assets.size === 0) throw new Error(`${route} loaded no client JavaScript`)

    const bytes = [...assets].reduce((sum, file) => {
      try {
        return sum + gzipSync(readFileSync(file)).length
      } catch (error) {
        throw new Error(`Cannot measure emitted client asset ${file}: ${error.message}`, { cause: error })
      }
    }, 0)
    return { route, kb: bytes / 1024 }
  } finally {
    await context.close()
  }
}

let browser
let exitCode = 1
try {
  const budgets = parseBudgets(readFileSync(BUDGET_FILE, 'utf8'))
  validateBudgetCoverage(budgets)

  for (const [url, port] of [[LEGACY, LEGACY_PORT], [APP, 3000]]) {
    if (await isPortInUse(port)) {
      throw new Error(`${url} is already in use; stop the stale server before measuring this build`)
    }
  }

  start('legacy/server.mjs', { LEGACY_PORT: String(LEGACY_PORT) })
  start('.output/server/index.mjs', {
    PORT: '3000',
    NITRO_PORT: '3000',
    NUXT_LEGACY_ORIGIN: LEGACY,
  })
  await Promise.all([waitFor(`${LEGACY}/login`), waitFor(`${APP}/login`)])

  const cookies = await sessionCookies()
  browser = await chromium.launch()
  const measurements = []
  for (const route of REQUIRED_ROUTES) {
    measurements.push(await measureRoute(browser, route, cookies))
  }

  const results = evaluate(measurements, budgets)
  for (const result of results) {
    const budget = result.budgetKb === null ? 'missing' : `${result.budgetKb.toFixed(1)} KB`
    const provisional = budgets[result.route]?.provisional ? ', provisional' : ''
    console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.route}: ${result.kb.toFixed(3)} KB gz (budget ${budget}${provisional})`)
  }
  exitCode = results.every(({ ok }) => ok) ? 0 : 1
  if (exitCode !== 0) console.error('One or more routes exceed or lack a JavaScript budget.')
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
} finally {
  if (browser) await browser.close()
  stop()
}

process.exit(exitCode)
