import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { integrationEnv, resetDatabase, withClient } from './setup'

const { databaseUrl, internalToken } = integrationEnv()

let app: INestApplication
let url: string

interface AlertView {
  id: string
  stationId: string
  kind: string
  message: string
  raisedAt: string
  clearedAt: string | null
}
interface StateView {
  stationId: string
  state: string
  lastStatus: string
  activeFault: Record<string, unknown> | null
  alerts: AlertView[]
}
interface Data {
  ingestTelemetry: StateView
  stationState: StateView | null
  stationStates: StateView[]
}
interface GraphqlResponse {
  data?: Partial<Data>
  errors?: { message: string }[]
}

async function gql(
  query: string,
  variables: Record<string, unknown> = {},
  headers: Record<string, string> = { 'x-internal-token': internalToken },
): Promise<GraphqlResponse> {
  const response = await fetch(`${url}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ query, variables }),
  })
  return (await response.json()) as GraphqlResponse
}

const STATE_FIELDS = `
  stationId state lastSampleAt lastReceivedAt lastStatus temperatureC powerKw
  activeFault { taxonomyCode component severity requiresSiteVisit }
  alerts { id stationId kind message raisedAt clearedAt }`
const INGEST = `mutation ($sample: JSON!) { ingestTelemetry(sample: $sample) { ${STATE_FIELDS} } }`
const STATE = `query ($id: ID!) { stationState(stationId: $id) { ${STATE_FIELDS} } }`
const STATES = `{ stationStates { ${STATE_FIELDS} } }`

const T0 = Date.parse('2026-10-25T10:00:00Z')
const LOCK = { taxonomyCode: 'CON.LOCK_FAILURE', component: 'connector', severity: 'major', requiresSiteVisit: true }
const sample = (stationId: string, offsetSeconds: number, over: Record<string, unknown> = {}) => ({
  stationId,
  at: new Date(T0 + offsetSeconds * 1000).toISOString(),
  status: 'Available',
  temperatureC: 31,
  powerKw: 0,
  ...over,
})

beforeAll(async () => {
  await resetDatabase(databaseUrl)
  const { AppModule } = await import('../../src/app.module')
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
  app = moduleRef.createNestApplication()
  await app.init()
  await app.listen(0, '127.0.0.1')
  url = await app.getUrl()
})

afterAll(async () => {
  await app?.close()
})

describe('telemetry rollup against PostgreSQL', () => {
  it('creates the station_state and station_alert tables through the migration', async () => {
    await withClient(databaseUrl, async (client) => {
      const tables = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('station_state', 'station_alert') ORDER BY 1",
      )
      expect(tables.rows.map((row: { table_name: string }) => row.table_name)).toEqual(['station_alert', 'station_state'])
    })
  })

  it('rolls a faulting station up to needs-visit with an alert, and a recovery clears it', async () => {
    const healthy = await gql(INGEST, { sample: sample('st-003', 0) })
    expect(healthy.errors).toBeUndefined()
    expect(healthy.data?.ingestTelemetry).toMatchObject({ stationId: 'st-003', state: 'ok', alerts: [], activeFault: null })

    const faulty = await gql(INGEST, { sample: sample('st-003', 5, { status: 'Faulted', faultClass: LOCK }) })
    expect(faulty.errors).toBeUndefined()
    const needsVisit = faulty.data!.ingestTelemetry!
    expect(needsVisit).toMatchObject({ stationId: 'st-003', state: 'needs_visit', lastStatus: 'Faulted', activeFault: LOCK })
    expect(needsVisit.alerts).toHaveLength(1)
    expect(needsVisit.alerts[0]).toMatchObject({
      stationId: 'st-003',
      kind: 'site_visit_fault',
      message: 'Station st-003 needs a visit: fault CON.LOCK_FAILURE requires on-site work.',
      clearedAt: null,
    })

    // The same fault repeated in the next sample must not raise a second alert.
    const repeated = await gql(INGEST, { sample: sample('st-003', 10, { status: 'Faulted', faultClass: LOCK }) })
    expect(repeated.data?.ingestTelemetry?.alerts).toHaveLength(1)
    expect(repeated.data?.ingestTelemetry?.alerts[0]?.id).toBe(needsVisit.alerts[0].id)

    const read = await gql(STATE, { id: 'st-003' })
    expect(read.data?.stationState?.state).toBe('needs_visit')
    expect(read.data?.stationState?.alerts).toHaveLength(1)

    const recovered = await gql(INGEST, { sample: sample('st-003', 15) })
    expect(recovered.data?.ingestTelemetry).toMatchObject({ state: 'ok', alerts: [], activeFault: null })

    await withClient(databaseUrl, async (client) => {
      const rows = await client.query("SELECT kind, cleared_at FROM station_alert WHERE station_id = 'st-003' ORDER BY raised_at")
      expect(rows.rows).toHaveLength(1)
      expect(rows.rows[0].kind).toBe('site_visit_fault')
      expect(rows.rows[0].cleared_at).toBeInstanceOf(Date)
    })
  })

  it('reaches needs-visit for a heating station only after three hot samples', async () => {
    const states: string[] = []
    for (const [index, temperature] of [58, 66, 72, 73, 74].entries()) {
      const result = await gql(INGEST, { sample: sample('st-002', index * 5, { temperatureC: temperature }) })
      states.push(result.data?.ingestTelemetry?.state ?? 'missing')
    }
    expect(states).toEqual(['ok', 'degraded', 'degraded', 'degraded', 'needs_visit'])
    const read = await gql(STATE, { id: 'st-002' })
    expect(read.data?.stationState?.alerts.map((alert) => alert.kind).sort()).toEqual([
      'high_temperature',
      'sustained_overheating',
    ])
  })

  it('lists every known station with its active alerts only', async () => {
    const result = await gql(STATES)
    expect(result.errors).toBeUndefined()
    const byId = Object.fromEntries((result.data?.stationStates ?? []).map((s) => [s.stationId, s]))
    expect(Object.keys(byId)).toEqual(['st-002', 'st-003'])
    expect(byId['st-003'].alerts).toEqual([])
    expect(byId['st-002'].alerts).toHaveLength(2)
  })

  it('returns null for a station that never reported', async () => {
    const result = await gql(STATE, { id: 'st-404' })
    expect(result.errors).toBeUndefined()
    expect(result.data?.stationState).toBeNull()
  })

  it('computes offline at read time, raises one offline alert and clears it with the next sample', async () => {
    const { TelemetryService } = await import('../../src/telemetry/telemetry.service')
    const service = app.get(TelemetryService)
    const later = new Date(Date.now() + 60_000)

    const first = (await service.stationStates(later)).find((s) => s.stationId === 'st-003')
    expect(first?.state).toBe('offline')
    expect(first?.alerts.map((alert) => alert.kind)).toEqual(['offline'])
    expect(first?.alerts[0]?.message).toMatch(/^Station st-003 is offline: no telemetry for \d+ s\.$/)

    // Reading again must not duplicate the alert.
    const second = (await service.stationState('st-003', new Date(later.getTime() + 1000)))!
    expect(second.state).toBe('offline')
    expect(second.alerts).toHaveLength(1)
    expect(second.alerts[0]?.id).toBe(first?.alerts[0]?.id)

    // The stored rollup state is unchanged: a fresh sample brings the station back and clears the alert.
    const back = await gql(INGEST, { sample: sample('st-003', 20, { temperatureC: 30 }) })
    expect(back.data?.ingestTelemetry).toMatchObject({ state: 'ok', alerts: [] })
    await withClient(databaseUrl, async (client) => {
      const rows = await client.query("SELECT cleared_at FROM station_alert WHERE station_id = 'st-003' AND kind = 'offline'")
      expect(rows.rows).toHaveLength(1)
      expect(rows.rows[0].cleared_at).toBeInstanceOf(Date)
    })
  })

  it('keeps one row and consistent alerts when samples for a new station arrive concurrently', async () => {
    const results = await Promise.all(
      [0, 5, 10, 15, 20].map((offset) => gql(INGEST, { sample: sample('st-004', offset, { status: 'Faulted', faultClass: LOCK }) })),
    )
    for (const result of results) expect(result.errors).toBeUndefined()
    await withClient(databaseUrl, async (client) => {
      const states = await client.query("SELECT 1 FROM station_state WHERE station_id = 'st-004'")
      expect(states.rows).toHaveLength(1)
      const alerts = await client.query("SELECT 1 FROM station_alert WHERE station_id = 'st-004' AND cleared_at IS NULL")
      expect(alerts.rows).toHaveLength(1)
    })
  })

  it('rejects an invalid sample with a message that names the field', async () => {
    const result = await gql(INGEST, { sample: sample('st-001', 0, { temperatureC: 'hot' }) })
    expect(result.data ?? null).toBeNull()
    expect(result.errors?.[0]?.message).toMatch(/^Invalid telemetry sample: temperatureC/)
    const read = await gql(STATE, { id: 'st-001' })
    expect(read.data?.stationState).toBeNull()
  })

  it('rejects a sample that is not an object', async () => {
    const result = await gql(INGEST, { sample: 'st-001' })
    expect(result.errors?.[0]?.message).toMatch(/^Invalid telemetry sample/)
  })

  it('accepts the sample inline as a literal JSON object', async () => {
    const result = await gql(
      `mutation { ingestTelemetry(sample: { stationId: "st-001", at: "2026-10-25T10:00:00Z", status: "Available", temperatureC: 30.5, powerKw: 0 }) { stationId state } }`,
    )
    expect(result.errors).toBeUndefined()
    expect(result.data?.ingestTelemetry).toEqual({ stationId: 'st-001', state: 'ok' })
  })

  it('requires the internal token', async () => {
    const result = await gql(STATES, {}, {})
    expect(result.data ?? null).toBeNull()
    expect(result.errors?.[0]?.message).toBe('Unauthorized')
    const mutation = await gql(INGEST, { sample: sample('st-001', 0) }, {})
    expect(mutation.errors?.[0]?.message).toBe('Unauthorized')
  })
})
