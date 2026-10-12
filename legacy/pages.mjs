// Fallback HTML pages of the legacy stand-in. They were decommissioned when each route
// migrated; they exist again so the rollout switch (ADR 0005) has something real to roll
// back to. Deliberately dated markup: this is the thing being migrated away from.
import { invoices, sessions, stations } from './data.mjs'

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

export const layout = (title, body) => `<!DOCTYPE html>
<html><head><title>${escapeHtml(title)}</title></head>
<body bgcolor="#eeeeee">
<font size="2"><a href="/portal/stations">Stations</a> | <a href="/portal/sessions">Sessions</a> | <a href="/portal/invoices">Invoices</a></font>
<h2>${escapeHtml(title)}</h2>
${body}
<!-- legacy-rendered -->
</body></html>`

const table = (headers, rows) =>
  `<table border="1" cellpadding="4"><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>${rows
    .map((row) => `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
    .join('')}</table>`

export const pages = {
  '/portal/stations': () =>
    layout('Stations (legacy)', table(['Name', 'City', 'Status', 'Connectors', 'Max kW'], stations.map((s) => [s.name, s.city, s.status, s.connectors, s.maxPowerKw]))),
  '/portal/sessions': () =>
    layout('Sessions (legacy)', table(['Session', 'Station', 'Started', 'kWh', 'Status'], sessions.map((s) => [s.id, s.stationId, s.startedAt, s.energyKwh, s.status]))),
  '/portal/invoices': () =>
    layout('Invoices (legacy)', table(['Invoice', 'Issued', 'EUR', 'Status'], invoices.map((i) => [i.number, i.issuedAt.slice(0, 10), (i.amountCents / 100).toFixed(2), i.status]))),
}
