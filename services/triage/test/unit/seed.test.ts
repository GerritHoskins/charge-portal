import { ALL_FIXTURES } from '@charge-portal/fault-taxonomy'
import { describe, expect, it, vi } from 'vitest'
import { rollupStationState } from '../../src/telemetry/rollup'
import { telemetrySampleSchema } from '../../src/telemetry/sample'
import {
  assertE2eDatabase,
  recreateDatabase,
  resetTelemetryData,
  resetTriageData,
  seedFaults,
  seedTelemetry,
  silenceStation,
  SILENT_STATION_ID,
  telemetryScenario,
} from '../../src/seed/seed'

interface Call {
  url: string
  headers: Record<string, string>
  body: { query: string; variables: { n?: unknown; s?: unknown } }
}

function fakeFetch(respond: (call: Call, index: number) => unknown, status = 200) {
  const calls: Call[] = []
  const impl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const call: Call = {
      url: String(url),
      headers: init?.headers as Record<string, string>,
      body: JSON.parse(String(init?.body)),
    }
    calls.push(call)
    return new Response(JSON.stringify(respond(call, calls.length - 1)), { status })
  })
  return { calls, impl: impl as unknown as typeof fetch }
}

const created = () => ({ data: { ingestFault: { ignored: false, ticket: { id: 'x' } } } })

describe('assertE2eDatabase', () => {
  it('accepts a database whose name ends in _e2e and returns the name', () => {
    expect(assertE2eDatabase('postgres://triage:triage@localhost:5432/triage_e2e')).toBe('triage_e2e')
  })

  it.each(['triage', 'triage_wp02', 'postgres', 'triage_e2e_backup', ''])('refuses the database %j', (name) => {
    expect(() => assertE2eDatabase(`postgres://triage:triage@localhost:5432/${name}`)).toThrow(/_e2e/)
  })

  it('refuses a value that is not a URL without echoing it', () => {
    expect(() => assertE2eDatabase('secret-not-a-url')).toThrow(/valid URL/)
    expect(() => assertE2eDatabase('secret-not-a-url')).not.toThrow(/secret-not-a-url/)
  })

  it('guards the destructive helpers before any connection is attempted', async () => {
    const url = 'postgres://triage:triage@localhost:1/triage'
    await expect(recreateDatabase(url)).rejects.toThrow(/_e2e/)
    await expect(resetTriageData(url)).rejects.toThrow(/_e2e/)
    await expect(resetTelemetryData(url)).rejects.toThrow(/_e2e/)
    await expect(silenceStation(url, 'st-005', 60_000)).rejects.toThrow(/_e2e/)
  })
})

describe('seedFaults', () => {
  const options = { graphqlUrl: 'http://127.0.0.1:4100/graphql', internalToken: 'synthetic-token' }

  it('ingests every WP-01 fixture through the GraphQL API with the internal token', async () => {
    const { calls, impl } = fakeFetch(created)
    const result = await seedFaults({ ...options, fetch: impl })

    expect(result).toEqual({ created: ALL_FIXTURES.length, ignored: 0 })
    expect(calls).toHaveLength(ALL_FIXTURES.length)
    expect(calls.map((c) => c.body.variables.n)).toEqual(ALL_FIXTURES.map((f) => f.notification))
    for (const call of calls) {
      expect(call.url).toBe(options.graphqlUrl)
      expect(call.headers['x-internal-token']).toBe('synthetic-token')
      expect(call.body.query).toContain('ingestFault')
    }
  })

  it('ingests sequentially so ticket creation order is deterministic', async () => {
    let running = 0
    let overlap = false
    const impl = (async () => {
      running++
      overlap ||= running > 1
      await new Promise((resolve) => setTimeout(resolve, 1))
      running--
      return new Response(JSON.stringify(created()))
    }) as unknown as typeof fetch
    await seedFaults({ ...options, fetch: impl })
    expect(overlap).toBe(false)
  })

  it('counts ignored notifications', async () => {
    const { impl } = fakeFetch((_call, index) => ({
      data: { ingestFault: { ignored: index === 0, ticket: index === 0 ? null : { id: 'x' } } },
    }))
    expect(await seedFaults({ ...options, fetch: impl })).toEqual({ created: ALL_FIXTURES.length - 1, ignored: 1 })
  })

  it('stops with a readable error on GraphQL errors, without leaking the token', async () => {
    const { impl } = fakeFetch(() => ({ errors: [{ message: 'Unauthorized' }] }))
    const failure = seedFaults({ ...options, fetch: impl })
    await expect(failure).rejects.toThrow(/Unauthorized/)
    await expect(failure).rejects.not.toThrow(/synthetic-token/)
  })

  it('stops on a non-2xx answer', async () => {
    const { impl } = fakeFetch(() => ({}), 502)
    await expect(seedFaults({ ...options, fetch: impl })).rejects.toThrow(/HTTP 502/)
  })

  it('stops on an unexpected response shape', async () => {
    const { impl } = fakeFetch(() => ({ data: { somethingElse: true } }))
    await expect(seedFaults({ ...options, fetch: impl })).rejects.toThrow(/unexpected response/i)
  })
})

describe('telemetryScenario', () => {
  const now = new Date('2026-10-25T10:00:00.000Z')
  const scenario = telemetryScenario(now)
  const health = Object.fromEntries(
    scenario.map((sample) => [sample.stationId, rollupStationState(null, telemetrySampleSchema.parse(sample), now).state]),
  )

  it('reports every synthetic legacy station once, with valid samples taken at the given time', () => {
    expect(scenario.map((s) => s.stationId)).toEqual(['st-001', 'st-002', 'st-003', 'st-004', 'st-005'])
    for (const sample of scenario) {
      expect(telemetrySampleSchema.safeParse(sample).success).toBe(true)
      expect(sample.at).toBe(now.toISOString())
    }
  })

  it('makes st-003 need a visit (an active connector lock fault) and st-002 degraded (too warm)', () => {
    expect(health['st-003']).toBe('needs-visit')
    expect(scenario.find((s) => s.stationId === 'st-003')?.faultClass?.taxonomyCode).toBe('CON.LOCK_FAILURE')
    expect(health['st-002']).toBe('degraded')
  })

  it('keeps the other stations ok, and st-005 is the one that goes silent', () => {
    expect(health['st-001']).toBe('ok')
    expect(health['st-004']).toBe('ok')
    expect(health['st-005']).toBe('ok') // it reported once; being silent is a matter of the receive time
    expect(SILENT_STATION_ID).toBe('st-005')
  })
})

describe('seedTelemetry', () => {
  const options = { graphqlUrl: 'http://127.0.0.1:4100/graphql', internalToken: 'synthetic-token', now: new Date('2026-10-25T10:00:00.000Z') }
  const ingested = () => ({ data: { ingestTelemetry: { stationId: 'x', state: 'ok' } } })

  it('sends every scenario sample through ingestTelemetry with the internal token, one after the other', async () => {
    const { calls, impl } = fakeFetch(ingested)
    const result = await seedTelemetry({ ...options, fetch: impl })

    expect(result).toEqual({ ingested: 5 })
    expect(calls.map((c) => (c.body.variables.s as { stationId: string }).stationId)).toEqual(['st-001', 'st-002', 'st-003', 'st-004', 'st-005'])
    for (const call of calls) {
      expect(call.url).toBe(options.graphqlUrl)
      expect(call.headers['x-internal-token']).toBe('synthetic-token')
      expect(call.body.query).toContain('ingestTelemetry')
    }
  })

  it('stops with a readable error on GraphQL errors, without leaking the token', async () => {
    const { impl } = fakeFetch(() => ({ errors: [{ message: 'Invalid telemetry sample: status: nope' }] }))
    const failure = seedTelemetry({ ...options, fetch: impl })
    await expect(failure).rejects.toThrow(/Invalid telemetry sample/)
    await expect(failure).rejects.not.toThrow(/synthetic-token/)
  })

  it('stops on a non-2xx answer and on an unexpected response shape', async () => {
    await expect(seedTelemetry({ ...options, fetch: fakeFetch(() => ({}), 502).impl })).rejects.toThrow(/HTTP 502/)
    await expect(seedTelemetry({ ...options, fetch: fakeFetch(() => ({ data: { nothing: 1 } })).impl })).rejects.toThrow(/unexpected response/i)
  })
})
