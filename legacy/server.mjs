// Stand-in for a server-side rendered monolith (the real thing would be PHP).
// It renders full HTML pages per request and exposes a small JSON API that the
// Nuxt BFF consumes. It is deliberately imperfect markup: it is the thing being migrated.
import { createServer } from 'node:http'
import { sessions, stations } from './data.mjs'

const PORT = Number(process.env.LEGACY_PORT ?? 8080)

const layout = (title, body) => `<!DOCTYPE html>
<html><head><title>${title}</title></head>
<body bgcolor="#eeeeee">
<font size="2"><a href="/portal/stations">Stations</a> | <a href="/portal/sessions">Sessions</a> | <a href="/portal/invoices">Invoices</a></font>
<h2>${title}</h2>
${body}
<!-- legacy-rendered -->
</body></html>`

const pages = {
  // /portal/sessions was migrated to Nuxt; its HTML page is decommissioned here.
  '/portal/invoices': () => layout('Invoices (legacy)', '<p>No invoices in the demo data.</p>'),
}

const json = (res, status, data) => {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(data))
}

createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost')
  const path = pathname.replace(/\/$/, '')

  if (path === '/api/v1/stations') return json(res, 200, { data: stations })
  if (path === '/api/v1/sessions') return json(res, 200, { data: sessions })
  if (pages[path]) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    return res.end(pages[path]())
  }
  json(res, 404, { error: 'not_found' })
}).listen(PORT, () => console.log(`legacy stand-in listening on :${PORT}`))
