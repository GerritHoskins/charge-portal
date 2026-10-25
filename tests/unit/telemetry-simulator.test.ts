import { normalise, ocppStatusNotificationSchema, TAXONOMY } from '@charge-portal/fault-taxonomy'
import { describe, expect, it, vi } from 'vitest'
// The service modules below are plain TypeScript without decorators; using the real rollup proves the scenario
// triggers the real rules instead of a copy of them.
import { effectiveHealth, rollupStationState, type StationState } from '../../services/triage/src/telemetry/rollup'
import { telemetrySampleSchema, type TelemetrySample } from '../../services/triage/src/telemetry/sample'
// @ts-expect-error plain .mjs module without type declarations
import * as simulatorModule from '../../scripts/telemetry-simulator.mjs'

interface Fault {
  stationId: string
  timestamp: string
}
interface Request {
  query: string
  variables: Record<string, unknown>
}
interface PostResult {
  ok: boolean
  errors: string[]
}
interface Simulator {
  DEFAULT_STATIONS: string[]
  createRng(seed: number): () => number
  generateTick(args: Record<string, unknown>): { samples: TelemetrySample[]; faults: Fault[] }
  buildTelemetryRequest(sample: TelemetrySample): Request
  buildFaultRequest(fault: Fault): Request
  parseSimulatorArgs(argv: string[], env: Record<string, string>): Record<string, unknown> & { intervalMs: number }
  postGraphql(args: Record<string, unknown>): Promise<PostResult>
  runTick(args: Record<string, unknown>): Promise<{ samples: number; faults: number; failures: number }>
  runSimulator(args: Record<string, unknown>): Promise<{ ticks: number }>
}

const { DEFAULT_STATIONS, buildFaultRequest, buildTelemetryRequest, createRng, generateTick, parseSimulatorArgs, postGraphql, runSimulator, runTick } =
  simulatorModule as unknown as Simulator

const START = Date.parse('2026-10-25T10:00:00Z')
const INTERVAL = 5000
const base = { stations: DEFAULT_STATIONS, seed: 42, startAtMs: START, intervalMs: INTERVAL }
const tick = (n: number, over: Record<string, unknown> = {}) => generateTick({ ...base, tick: n, ...over })

/** Folds the generated ticks for one station through the real rollup; `now` is the station's own clock. */
function levels(stationId: string, ticks: number): string[] {
  let state: StationState | null = null
  const result: string[] = []
  for (let n = 0; n < ticks; n += 1) {
    const sample = tick(n).samples.find((s: TelemetrySample) => s.stationId === stationId)
    if (!sample) continue
    state = rollupStationState(state, sample, new Date(sample.at))
    result.push(state.state)
  }
  return result
}

describe('createRng', () => {
  it('is deterministic per seed and stays in [0, 1)', () => {
    const a = createRng(7)
    const b = createRng(7)
    const first = Array.from({ length: 20 }, () => a())
    expect(first).toEqual(Array.from({ length: 20 }, () => b()))
    expect(first.every((value) => value >= 0 && value < 1)).toBe(true)
    expect(Array.from({ length: 20 }, createRng(8))).not.toEqual(first)
  })
})

describe('generateTick', () => {
  it('defaults to the five legacy seed stations', () => {
    expect(DEFAULT_STATIONS).toEqual(['st-001', 'st-002', 'st-003', 'st-004', 'st-005'])
  })

  it('produces the same samples and faults for the same seed', () => {
    const run = () => Array.from({ length: 40 }, (_, n) => tick(n))
    expect(run()).toEqual(run())
  })

  it('does not depend on which ticks were generated before', () => {
    expect(tick(9)).toEqual(generateTick({ ...base, tick: 9 }))
  })

  it('differs for a different seed', () => {
    const a = Array.from({ length: 10 }, (_, n) => tick(n))
    const b = Array.from({ length: 10 }, (_, n) => tick(n, { seed: 43 }))
    expect(a).not.toEqual(b)
  })

  it('timestamps samples on the interval grid', () => {
    const { samples } = tick(3)
    expect(new Set(samples.map((sample: TelemetrySample) => sample.at))).toEqual(new Set([new Date(START + 3 * INTERVAL).toISOString()]))
  })

  it('only emits samples that satisfy the service schema', () => {
    for (let n = 0; n < 60; n += 1) {
      for (const sample of tick(n).samples) expect(telemetrySampleSchema.safeParse(sample).success).toBe(true)
    }
  })

  it('keeps healthy stations ok', () => {
    expect(new Set(levels('st-001', 80))).toEqual(new Set(['ok']))
    expect(new Set(levels('st-004', 80))).toEqual(new Set(['ok']))
  })

  it('makes st-003 develop a recurring connector-lock fault that reaches needs-visit', () => {
    const states = levels('st-003', 40)
    expect(states[0]).toBe('ok')
    expect(states).toContain('needs-visit')
    const faultTicks = Array.from({ length: 40 }, (_, n) => n).filter((n) => tick(n).faults.length > 0)
    expect(faultTicks.length).toBeGreaterThanOrEqual(3)
    expect(faultTicks[1]! - faultTicks[0]!).toBeGreaterThan(1) // recurring (fault, recovery, fault), not one long fault
  })

  it('makes st-002 heat up through degraded to needs-visit', () => {
    const states = levels('st-002', 40)
    expect(states[0]).toBe('ok')
    expect(states.indexOf('degraded')).toBeGreaterThan(0)
    expect(states.indexOf('needs-visit')).toBeGreaterThan(states.indexOf('degraded'))
  })

  it('makes st-005 stop reporting, so it becomes offline', () => {
    const lastTick = Array.from({ length: 40 }, (_, n) => n).filter((n) => tick(n).samples.some((s: TelemetrySample) => s.stationId === 'st-005')).pop()
    expect(lastTick).toBeDefined()
    expect(lastTick).toBeLessThan(10)
    const last = tick(lastTick!).samples.find((s: TelemetrySample) => s.stationId === 'st-005')
    const state = rollupStationState(null, last, new Date(START + lastTick! * INTERVAL))
    const silentFor = new Date(START + lastTick! * INTERVAL + 3 * INTERVAL)
    expect(effectiveHealth(state, silentFor, INTERVAL)).toBe('offline')
  })

  it('sends fault notifications for st-003 that normalise to the connector-lock class', () => {
    const { samples, faults } = tick(1)
    expect(faults).toHaveLength(1)
    const parsed = ocppStatusNotificationSchema.parse(faults[0])
    expect(parsed.stationId).toBe('st-003')
    expect(normalise(faults[0]).fault).toEqual(TAXONOMY['CON.LOCK_FAILURE'])
    const faulty = samples.find((s: TelemetrySample) => s.stationId === 'st-003')
    expect(faulty).toMatchObject({ status: 'Faulted', faultClass: TAXONOMY['CON.LOCK_FAILURE'] })
    expect(faults[0].timestamp).toBe(faulty.at)
  })

  it('sends no fault notification when nothing is faulted', () => {
    expect(tick(0).faults).toEqual([])
  })

  it('treats unknown station ids as healthy', () => {
    const { samples } = tick(0, { stations: ['st-900'] })
    expect(samples).toHaveLength(1)
    expect(samples[0]).toMatchObject({ stationId: 'st-900', status: expect.stringMatching(/Available|Charging/) })
  })
})

describe('request building', () => {
  const sample = tick(0).samples[0]

  it('builds the ingestTelemetry mutation with the sample as a JSON variable', () => {
    const request = buildTelemetryRequest(sample)
    expect(request.query).toContain('mutation')
    expect(request.query).toContain('ingestTelemetry(sample: $sample)')
    expect(request.variables).toEqual({ sample })
  })

  it('builds the ingestFault mutation with the notification as a JSON variable', () => {
    const notification = tick(1).faults[0]
    const request = buildFaultRequest(notification)
    expect(request.query).toContain('ingestFault(notification: $notification)')
    expect(request.variables).toEqual({ notification })
  })
})

describe('parseSimulatorArgs', () => {
  it('has defaults', () => {
    expect(parseSimulatorArgs([], {})).toEqual({
      intervalMs: 5000,
      stations: ['st-001', 'st-002', 'st-003', 'st-004', 'st-005'],
      seed: 1,
      once: false,
      origin: 'http://127.0.0.1:4100',
      token: undefined,
    })
  })

  it('reads flags and the environment', () => {
    const options = parseSimulatorArgs(['--interval', '1000', '--stations', 'st-003, st-005', '--seed', '9', '--once'], {
      TRIAGE_ORIGIN: 'http://triage.example.test:4100/',
      TRIAGE_INTERNAL_TOKEN: 'synthetic-token',
    })
    expect(options).toEqual({
      intervalMs: 1000,
      stations: ['st-003', 'st-005'],
      seed: 9,
      once: true,
      origin: 'http://triage.example.test:4100',
      token: 'synthetic-token',
    })
  })

  it('takes the default interval from TELEMETRY_INTERVAL_MS', () => {
    expect(parseSimulatorArgs([], { TELEMETRY_INTERVAL_MS: '2000' }).intervalMs).toBe(2000)
  })

  it.each([
    [['--interval', '0']],
    [['--interval', 'fast']],
    [['--interval']],
    [['--seed', '1.5']],
    [['--stations', ' , ']],
    [['--stations', 'st-001,st-001']],
    [['--bogus']],
    [['positional']],
  ])('rejects %j', (args) => {
    expect(() => parseSimulatorArgs(args, {})).toThrow()
  })
})

describe('postGraphql', () => {
  const request = { query: '{ health { status } }', variables: {} }
  const target = { origin: 'http://127.0.0.1:4100', token: 'synthetic-token' }
  const respond = (body: unknown, status = 200) => vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body })

  it('posts JSON with the internal token and an actor header', async () => {
    const fetchImpl = respond({ data: { ok: true } })
    await expect(postGraphql({ ...target, request, fetchImpl })).resolves.toEqual({ ok: true, errors: [] })
    const [url, init] = fetchImpl.mock.calls[0]!
    expect(url).toBe('http://127.0.0.1:4100/graphql')
    expect(init.method).toBe('POST')
    expect(init.headers['x-internal-token']).toBe('synthetic-token')
    expect(init.headers['x-actor']).toBe('telemetry-simulator')
    expect(JSON.parse(init.body)).toEqual(request)
  })

  it('reports GraphQL errors instead of throwing (ingestFault may not exist yet)', async () => {
    const fetchImpl = respond({ errors: [{ message: 'Cannot query field "ingestFault" on type "Mutation".' }] })
    await expect(postGraphql({ ...target, request, fetchImpl })).resolves.toEqual({
      ok: false,
      errors: ['Cannot query field "ingestFault" on type "Mutation".'],
    })
  })

  it('reports an HTTP failure', async () => {
    const result = await postGraphql({ ...target, request, fetchImpl: respond({}, 502) })
    expect(result).toEqual({ ok: false, errors: ['HTTP 502'] })
  })

  it('reports a network failure without leaking the token', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:4100'))
    const result = await postGraphql({ ...target, request, fetchImpl })
    expect(result.ok).toBe(false)
    expect(result.errors).toEqual(['connect ECONNREFUSED 127.0.0.1:4100'])
    expect(JSON.stringify(result)).not.toContain('synthetic-token')
  })

  it('reports a response that is not JSON', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => Promise.reject(new SyntaxError('Unexpected token')) })
    expect((await postGraphql({ ...target, request, fetchImpl })).ok).toBe(false)
  })
})

describe('runTick', () => {
  const options = { origin: 'http://127.0.0.1:4100', token: 'synthetic-token', stations: DEFAULT_STATIONS, seed: 42, intervalMs: INTERVAL }

  it('posts one telemetry mutation per sample and one ingestFault per fault notification', async () => {
    const post = vi.fn().mockResolvedValue({ ok: true, errors: [] })
    const summary = await runTick({ options, tick: 1, startAtMs: START, post, log: vi.fn() })
    const queries = post.mock.calls.map(([call]: [{ request: Request }]) => call.request.query)
    expect(queries.filter((query) => query.includes('ingestTelemetry'))).toHaveLength(5)
    expect(queries.filter((query) => query.includes('ingestFault'))).toHaveLength(1)
    expect(summary).toEqual({ samples: 5, faults: 1, failures: 0 })
  })

  it('tolerates a failing ingestFault and keeps going, logging each distinct error once', async () => {
    const post = vi.fn(async ({ request }: { request: Request }) =>
      request.query.includes('ingestFault') ? { ok: false, errors: ['Cannot query field "ingestFault"'] } : { ok: true, errors: [] },
    )
    const log = vi.fn()
    const seen = new Set<string>()
    const first = await runTick({ options, tick: 1, startAtMs: START, post, log, seen })
    const second = await runTick({ options, tick: 5, startAtMs: START, post, log, seen })
    expect(first).toEqual({ samples: 5, faults: 1, failures: 1 })
    expect(second.failures).toBe(1)
    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0]![0]).toContain('ingestFault')
  })
})

describe('runSimulator', () => {
  const options = { origin: 'http://127.0.0.1:4100', token: 'synthetic-token', stations: ['st-001', 'st-003'], seed: 1, intervalMs: INTERVAL }

  it('--once sends tick 0 and returns without waiting', async () => {
    const post = vi.fn().mockResolvedValue({ ok: true, errors: [] })
    const sleep = vi.fn()
    const result = await runSimulator({ options: { ...options, once: true }, post, sleep, log: vi.fn(), startAtMs: START })
    expect(result).toEqual({ ticks: 1 })
    expect(post).toHaveBeenCalledTimes(2)
    expect(sleep).not.toHaveBeenCalled()
  })

  it('keeps ticking every interval until aborted', async () => {
    const post = vi.fn().mockResolvedValue({ ok: true, errors: [] })
    const controller = new AbortController()
    const sleep = vi.fn(async () => {
      if (sleep.mock.calls.length === 3) controller.abort()
    })
    const result = await runSimulator({ options: { ...options, once: false }, post, sleep, log: vi.fn(), startAtMs: START, signal: controller.signal })
    expect(result.ticks).toBe(3)
    expect(sleep).toHaveBeenCalledWith(INTERVAL)
  })

  it('does not crash when every request fails', async () => {
    const post = vi.fn().mockResolvedValue({ ok: false, errors: ['connect ECONNREFUSED'] })
    const log = vi.fn()
    await expect(runSimulator({ options: { ...options, once: true }, post, sleep: vi.fn(), log, startAtMs: START })).resolves.toEqual({ ticks: 1 })
    expect(log).toHaveBeenCalled()
  })
})
