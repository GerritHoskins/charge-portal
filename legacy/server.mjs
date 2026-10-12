// Stand-in for a server-side rendered monolith (the real thing would be PHP).
// It renders full HTML pages per request, owns the login session, and exposes a
// small JSON API that the Nuxt BFF consumes. It is deliberately imperfect
// markup: it is the thing being migrated.
import { createServer } from 'node:http'
import { clearCookie, COOKIE, createAuth, parseCookies, safeNext, sessionCookie } from './auth.mjs'
import { invoices, resetInvoices, sessions, stations } from './data.mjs'
import { createDispute } from './invoices.mjs'
import { layout, pages } from './pages.mjs'

const PORT = Number(process.env.LEGACY_PORT ?? 8080)
const SECURE = process.env.COOKIE_SECURE === '1'
const auth = createAuth()

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

const loginPage = (next, error) =>
  layout(
    'Login (legacy)',
    `${error ? `<p><font color="red">${escapeHtml(error)}</font></p>` : ''}
<form method="post" action="/login">
<input type="hidden" name="next" value="${escapeHtml(next)}">
<p><label for="username">User</label> <input id="username" name="username" autocomplete="username"></p>
<p><label for="password">Password</label> <input id="password" name="password" type="password" autocomplete="current-password"></p>
<p><input type="submit" value="Log in"></p>
</form>`,
  )

const json = (res, status, data) => {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(data))
}
const html = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', ...headers })
  res.end(body)
}
const redirect = (res, location, headers = {}) => {
  res.writeHead(302, { location, ...headers })
  res.end()
}

const MAX_BODY = 10_000
const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > MAX_BODY) {
        reject(new Error('body too large'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })

const readForm = (req) =>
  new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 10_000) {
        reject(new Error('body too large'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(new URLSearchParams(body)))
    req.on('error', reject)
  })

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const path = url.pathname.replace(/\/$/, '')
  const sessionId = parseCookies(req.headers.cookie)[COOKIE]
  const user = auth.lookup(sessionId)

  if (path === '/login' && req.method === 'GET') {
    const next = safeNext(url.searchParams.get('next'))
    return user ? redirect(res, next) : html(res, 200, loginPage(next))
  }

  if (path === '/login' && req.method === 'POST') {
    const form = await readForm(req).catch(() => new URLSearchParams())
    const next = safeNext(form.get('next'))
    const id = auth.login(form.get('username'), form.get('password'))
    if (!id) return html(res, 401, loginPage(next, 'Invalid user or password'))
    return redirect(res, next, { 'set-cookie': sessionCookie(id, { secure: SECURE }) })
  }

  if (path === '/logout' && req.method === 'POST') {
    auth.logout(sessionId)
    return redirect(res, '/login', { 'set-cookie': clearCookie({ secure: SECURE }) })
  }

  // Test hook, only when explicitly enabled (Playwright config). Not part of the API.
  if (path === '/__test/reset' && req.method === 'POST' && process.env.LEGACY_ALLOW_RESET === '1') {
    resetInvoices()
    return json(res, 200, { ok: true })
  }

  // Everything below requires a session.
  if (path.startsWith('/api/')) {
    if (!user) return json(res, 401, { error: 'unauthenticated' })
    if (path === '/api/v1/me') return json(res, 200, { data: user })
    if (path === '/api/v1/stations') return json(res, 200, { data: stations })
    if (path === '/api/v1/sessions') return json(res, 200, { data: sessions })
    if (path === '/api/v1/invoices') return json(res, 200, { data: invoices })
    const dispute = path.match(/^\/api\/v1\/invoices\/([A-Za-z0-9-]+)\/disputes$/)
    if (dispute && req.method === 'POST') {
      // JSON only: a cross-site HTML form cannot send this content type without a CORS preflight.
      if (!String(req.headers['content-type']).startsWith('application/json')) return json(res, 415, { error: 'json_required' })
      const input = await readBody(req).then(JSON.parse).catch(() => undefined)
      if (input === undefined) return json(res, 400, { error: 'bad_json' })
      const { status, body } = createDispute(dispute[1], input)
      return json(res, status, body)
    }
    return json(res, 404, { error: 'not_found' })
  }

  if (pages[path]) {
    if (!user) return redirect(res, `/login?next=${encodeURIComponent(path)}`)
    return html(res, 200, pages[path]())
  }

  json(res, 404, { error: 'not_found' })
}).listen(PORT, () => console.log(`legacy stand-in listening on :${PORT}`))
