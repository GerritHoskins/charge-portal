// Fake data for the legacy stand-in. Synthetic; no real operator data.
export const stations = [
  { id: 'st-001', name: 'Hauptbahnhof Nord', city: 'Köln', status: 'available', connectors: 4, maxPowerKw: 150 },
  { id: 'st-002', name: 'Rheinpark P2', city: 'Köln', status: 'charging', connectors: 2, maxPowerKw: 22 },
  { id: 'st-003', name: 'Depot Ehrenfeld', city: 'Köln', status: 'faulted', connectors: 6, maxPowerKw: 50 },
  { id: 'st-004', name: 'Messe Süd', city: 'Nürnberg', status: 'available', connectors: 8, maxPowerKw: 300 },
  { id: 'st-005', name: 'Logistikpark West', city: 'Hamburg', status: 'offline', connectors: 2, maxPowerKw: 22 },
]

export const sessions = [
  { id: 'se-1001', stationId: 'st-002', startedAt: '2026-10-10T07:12:00Z', energyKwh: 18.4, status: 'running' },
  { id: 'se-1000', stationId: 'st-001', startedAt: '2026-10-09T16:40:00Z', energyKwh: 42.1, status: 'completed' },
  { id: 'se-0999', stationId: 'st-004', startedAt: '2026-10-09T09:05:00Z', energyKwh: 63.8, status: 'completed' },
]

const seedInvoices = () => [
  { id: 'inv-0042', number: 'RE-2026-0042', issuedAt: '2026-10-01T00:00:00Z', amountCents: 4210, currency: 'EUR', status: 'open' },
  { id: 'inv-0041', number: 'RE-2026-0041', issuedAt: '2026-09-01T00:00:00Z', amountCents: 12875, currency: 'EUR', status: 'paid' },
  { id: 'inv-0040', number: 'RE-2026-0040', issuedAt: '2026-08-01T00:00:00Z', amountCents: 9980, currency: 'EUR', status: 'open' },
]

// Mutable on purpose: disputing an invoice changes its status.
export let invoices = seedInvoices()
export const disputes = []
export const resetInvoices = () => {
  invoices = seedInvoices()
  disputes.length = 0
}
