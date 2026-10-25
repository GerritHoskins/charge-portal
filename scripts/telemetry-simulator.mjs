// Synthetic station telemetry for the triage service (WP-08). No real hardware, no dependencies.
//
//   npm run simulate:telemetry -- [--interval ms] [--stations st-001,st-002] [--seed n] [--once]
//
// Environment: TRIAGE_ORIGIN (default http://127.0.0.1:4100), TRIAGE_INTERNAL_TOKEN (required, sent as
// x-internal-token), TELEMETRY_INTERVAL_MS (default for --interval, 5000).
//
// Scenario (station ids match the legacy seed, legacy/data.mjs):
//   st-003  develops a recurring connector-lock fault (also sent to `ingestFault` as an OCPP notification)
//   st-002  heats up until it stays above 70 degrees C
//   st-005  stops reporting after a few ticks (becomes offline)
//   others  stay healthy
//
// Everything a tick contains is a pure function of (seed, station, tick), see `generateTick`.
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

export const DEFAULT_STATIONS = ['st-001', 'st-002', 'st-003', 'st-004', 'st-005']
export const DEFAULT_INTERVAL_MS = 5000
const DEFAULT_ORIGIN = 'http://127.0.0.1:4100'
const ACTOR = 'telemetry-simulator'
const REQUEST_TIMEOUT_MS = 10_000

/** Same values as TAXONOMY['CON.LOCK_FAILURE'] in @charge-portal/fault-taxonomy (the unit test guards against drift). */
const LOCK_FAILURE = Object.freeze({ taxonomyCode: 'CON.LOCK_FAILURE', component: 'connector', severity: 'major', requiresSiteVisit: true })

// Scenario knobs.
const LOCK_FAULT_EVERY_TICKS = 4 // st-003 is faulted in ticks 1, 5, 9, ...
const LOCK_FAULT_TICK_OFFSET = 1
const HEAT_START_C = 40
const HEAT_STEP_C = 3 // per tick, until the plateau
const HEAT_PLATEAU_C = 75
const DROPOUT_AFTER_TICK = 3 // st-005 reports in ticks 0..3 only

/** mulberry32: small seedable PRNG returning floats in [0, 1). */
export function createRng(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** FNV-1a over a string: derives one independent PRNG seed per (seed, station, tick). */
function hash32(text) {
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

const round1 = (value) => Math.round(value * 10) / 10

function healthyReading(rng) {
  // Always three draws, so the sequence does not depend on which branch is taken.
  const chargingDraw = rng()
  const temperatureDraw = rng()
  const powerDraw = rng()
  const charging = chargingDraw < 0.4
  return {
    status: charging ? 'Charging' : 'Available',
    temperatureC: round1(32 + temperatureDraw * 6),
    powerKw: charging ? round1(7 + powerDraw * 15) : 0,
    noise: temperatureDraw,
  }
}

function lockFaultNotification(stationId, at) {
  // Same shape and codes as the voltreon "connector lock stuck" fixture of @charge-portal/fault-taxonomy.
  return { stationId, connectorId: 1, errorCode: 'OtherError', status: 'Faulted', timestamp: at, vendorId: 'voltreon', vendorErrorCode: '1012' }
}

/**
 * One tick of the scenario: the telemetry samples to ingest and the OCPP fault notifications to send.
 * Pure and order independent: the same (seed, station, tick) always yields the same values.
 */
export function generateTick({ stations = DEFAULT_STATIONS, seed = 1, tick, startAtMs, intervalMs = DEFAULT_INTERVAL_MS }) {
  const at = new Date(startAtMs + tick * intervalMs).toISOString()
  const samples = []
  const faults = []
  for (const stationId of stations) {
    const reading = healthyReading(createRng(hash32(`${seed}:${stationId}:${tick}`)))
    const sample = { stationId, at, status: reading.status, temperatureC: reading.temperatureC, powerKw: reading.powerKw }

    if (stationId === 'st-005' && tick > DROPOUT_AFTER_TICK) continue // stops reporting

    if (stationId === 'st-002') {
      const ramp = Math.min(HEAT_START_C + HEAT_STEP_C * tick, HEAT_PLATEAU_C)
      sample.temperatureC = round1(ramp + (reading.noise * 2 - 1))
    }

    if (stationId === 'st-003' && tick % LOCK_FAULT_EVERY_TICKS === LOCK_FAULT_TICK_OFFSET) {
      sample.status = 'Faulted'
      sample.powerKw = 0
      sample.faultClass = LOCK_FAILURE
      faults.push(lockFaultNotification(stationId, at))
    }
    samples.push(sample)
  }
  return { samples, faults }
}

const TELEMETRY_MUTATION = 'mutation Telemetry($sample: JSON!) { ingestTelemetry(sample: $sample) { stationId state } }'
const FAULT_MUTATION = 'mutation Fault($notification: JSON!) { ingestFault(notification: $notification) { ignored } }'

export function buildTelemetryRequest(sample) {
  return { query: TELEMETRY_MUTATION, variables: { sample } }
}

export function buildFaultRequest(notification) {
  return { query: FAULT_MUTATION, variables: { notification } }
}

/**
 * POSTs one GraphQL request. Never throws: a refused connection, an HTTP error or a GraphQL error (for example
 * `ingestFault` not being deployed yet) is returned as `{ ok: false, errors }` so the simulator keeps running.
 */
export async function postGraphql({ origin, token, request, fetchImpl = fetch, timeoutMs = REQUEST_TIMEOUT_MS }) {
  try {
    const response = await fetchImpl(`${origin}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-token': token, 'x-actor': ACTOR },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(timeoutMs),
    })
    let body
    try {
      body = await response.json()
    } catch {
      return { ok: false, errors: [response.ok ? 'Response is not JSON' : `HTTP ${response.status}`] }
    }
    // Apollo answers validation errors (such as an unknown mutation) with HTTP 400 and a JSON error list.
    if (Array.isArray(body?.errors) && body.errors.length > 0) {
      return { ok: false, errors: body.errors.map((error) => String(error?.message ?? 'Unknown GraphQL error')) }
    }
    if (!response.ok) return { ok: false, errors: [`HTTP ${response.status}`] }
    return { ok: true, errors: [] }
  } catch (error) {
    return { ok: false, errors: [error instanceof Error ? error.message : String(error)] }
  }
}

function positiveInteger(name, value) {
  if (!/^[1-9]\d*$/.test(value)) throw new Error(`${name} must be a positive integer`)
  return Number(value)
}

/** Parses argv and environment. Throws an Error with a user-readable message on invalid input. */
export function parseSimulatorArgs(argv, env = process.env) {
  const { values } = parseArgs({
    args: argv,
    options: {
      interval: { type: 'string' },
      stations: { type: 'string' },
      seed: { type: 'string' },
      once: { type: 'boolean', default: false },
    },
    allowPositionals: false,
    strict: true,
  })

  const intervalSource = values.interval ?? env.TELEMETRY_INTERVAL_MS
  const intervalMs = intervalSource === undefined || intervalSource === '' ? DEFAULT_INTERVAL_MS : positiveInteger('--interval', intervalSource)

  let stations = DEFAULT_STATIONS
  if (values.stations !== undefined) {
    stations = values.stations.split(',').map((id) => id.trim()).filter(Boolean)
    if (stations.length === 0) throw new Error('--stations needs at least one station id')
    if (stations.some((id) => !/^[A-Za-z0-9._-]{1,100}$/.test(id))) throw new Error('--stations contains an invalid station id')
    if (new Set(stations).size !== stations.length) throw new Error('--stations contains a duplicate station id')
  }

  let seed = 1
  if (values.seed !== undefined) {
    if (!/^-?\d+$/.test(values.seed)) throw new Error('--seed must be an integer')
    seed = Number(values.seed)
  }

  return {
    intervalMs,
    stations,
    seed,
    once: values.once === true,
    origin: (env.TRIAGE_ORIGIN?.trim() || DEFAULT_ORIGIN).replace(/\/+$/, ''),
    token: env.TRIAGE_INTERNAL_TOKEN?.trim() || undefined,
  }
}

/**
 * Sends one tick. Failures are counted and logged (each distinct message once per run, tracked in `seen`),
 * never thrown.
 */
export async function runTick({ options, tick, startAtMs, post, log, seen = new Set() }) {
  const { samples, faults } = generateTick({ ...options, tick, startAtMs })
  const outcomes = []
  await Promise.all(samples.map(async (sample) => outcomes.push({ kind: 'ingestTelemetry', ...(await post({ request: buildTelemetryRequest(sample) })) })))
  await Promise.all(faults.map(async (fault) => outcomes.push({ kind: 'ingestFault', ...(await post({ request: buildFaultRequest(fault) })) })))

  let failures = 0
  for (const outcome of outcomes) {
    if (outcome.ok) continue
    failures += 1
    for (const message of outcome.errors) {
      const line = `${outcome.kind} failed: ${message}`
      if (seen.has(line)) continue
      seen.add(line)
      log(`${line} (identical errors are not repeated)`)
    }
  }
  return { samples: samples.length, faults: faults.length, failures }
}

const defaultSleep = (ms, signal) =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => (clearTimeout(timer), resolve()), { once: true })
  })

/** Runs ticks until `--once` is done or `signal` aborts. */
export async function runSimulator({ options, post, sleep, log, startAtMs = Date.now(), signal }) {
  const seen = new Set()
  let ticks = 0
  for (;;) {
    const summary = await runTick({ options, tick: ticks, startAtMs, post, log, seen })
    log(`tick ${ticks}: ${summary.samples} samples, ${summary.faults} faults, ${summary.failures} failed requests`)
    ticks += 1
    if (options.once || signal?.aborted) break
    await sleep(options.intervalMs)
    if (signal?.aborted) break
  }
  return { ticks }
}

async function main() {
  let options
  try {
    options = parseSimulatorArgs(process.argv.slice(2))
    if (!options.token) throw new Error('TRIAGE_INTERNAL_TOKEN is required (the same value the triage service uses)')
  } catch (error) {
    console.error(`telemetry-simulator: ${error instanceof Error ? error.message : error}`)
    console.error('usage: telemetry-simulator [--interval ms] [--stations st-001,st-002] [--seed n] [--once]')
    process.exitCode = 2
    return
  }

  const controller = new AbortController()
  for (const signalName of ['SIGINT', 'SIGTERM']) process.once(signalName, () => controller.abort())

  const log = (message) => console.log(`[telemetry-simulator] ${message}`)
  log(`sending to ${options.origin} every ${options.intervalMs} ms for ${options.stations.join(', ')} (seed ${options.seed})`)
  const post = ({ request }) => postGraphql({ origin: options.origin, token: options.token, request })
  await runSimulator({ options, post, sleep: (ms) => defaultSleep(ms, controller.signal), log, signal: controller.signal })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
