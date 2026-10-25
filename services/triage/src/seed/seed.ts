import { ALL_FIXTURES, TAXONOMY } from '@charge-portal/fault-taxonomy'
import { Client } from 'pg'
import { z } from 'zod'

// Data for end-to-end runs (WP-07): a throwaway database and the synthetic WP-01 fixtures, ingested
// through the real GraphQL API so tickets are drafted exactly as in production (rules provider,
// audit entry). Nothing here is bundled into the service; `cli.ts` is its own build entry.

/** Only databases with this suffix may be dropped or truncated. */
export const E2E_DATABASE_SUFFIX = '_e2e'

/** Returns the database name of a connection URL, and throws unless it is a dedicated E2E database. */
export function assertE2eDatabase(databaseUrl: string): string {
  let name: string
  try {
    name = decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\//, ''))
  } catch {
    // The URL contains the password: never echo it.
    throw new Error('The database URL is not a valid URL')
  }
  if (!new RegExp(`^[A-Za-z0-9_]+${E2E_DATABASE_SUFFIX}$`).test(name)) {
    throw new Error(`Refusing to touch database "${name}": only databases whose name ends in ${E2E_DATABASE_SUFFIX} may be reset`)
  }
  return name
}

async function withClient<T>(connectionString: string, run: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString })
  await client.connect()
  try {
    return await run(client)
  } finally {
    await client.end()
  }
}

/** Drops and creates the E2E database (connected through the maintenance database `postgres`). */
export async function recreateDatabase(databaseUrl: string): Promise<void> {
  const name = assertE2eDatabase(databaseUrl)
  const admin = new URL(databaseUrl)
  admin.pathname = '/postgres'
  await withClient(admin.toString(), async (client) => {
    // `name` matched a strict identifier pattern above, so quoting it is enough.
    await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)
    await client.query(`CREATE DATABASE "${name}"`)
  })
}

/** Empties the triage tables (keeps the schema, so a running service stays usable). */
export async function resetTriageData(databaseUrl: string): Promise<void> {
  assertE2eDatabase(databaseUrl)
  await withClient(databaseUrl, async (client) => {
    await client.query('TRUNCATE audit_entries, tickets, faults CASCADE')
  })
}

/** Empties the station telemetry tables (states and alerts). Separate from the fault data: specs seed the two independently. */
export async function resetTelemetryData(databaseUrl: string): Promise<void> {
  assertE2eDatabase(databaseUrl)
  await withClient(databaseUrl, async (client) => {
    await client.query('TRUNCATE station_alert, station_state')
  })
}

/**
 * Makes a station look silent: moves the time the service last heard from it into the past. "Offline" is judged on the
 * service's receive time (3 x TELEMETRY_INTERVAL_MS), which a sample cannot fake, so E2E sets it in the database.
 */
export async function silenceStation(databaseUrl: string, stationId: string, silentForMs: number): Promise<void> {
  assertE2eDatabase(databaseUrl)
  await withClient(databaseUrl, async (client) => {
    await client.query("UPDATE station_state SET last_received_at = now() - ($2::double precision * interval '1 millisecond') WHERE station_id = $1", [
      stationId,
      silentForMs,
    ])
  })
}

const ingestResponseSchema = z.object({
  data: z.object({ ingestFault: z.object({ ignored: z.boolean(), ticket: z.object({ id: z.string() }).nullable() }) }).nullish(),
  errors: z.array(z.object({ message: z.string() })).optional(),
})

const INGEST = 'mutation Ingest($n: JSON!) { ingestFault(notification: $n) { ignored ticket { id } } }'

export interface SeedOptions {
  /** Full URL of the GraphQL endpoint, e.g. http://127.0.0.1:4100/graphql. */
  graphqlUrl: string
  internalToken: string
  fetch?: typeof fetch
}

export interface SeedResult {
  created: number
  ignored: number
}

/** Ingests every fixture, one after the other (so tickets are created in fixture order). */
export async function seedFaults({ graphqlUrl, internalToken, fetch: fetchImpl = fetch }: SeedOptions): Promise<SeedResult> {
  const result: SeedResult = { created: 0, ignored: 0 }
  for (const { label, notification } of ALL_FIXTURES) {
    const response = await fetchImpl(graphqlUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-token': internalToken },
      body: JSON.stringify({ query: INGEST, variables: { n: notification } }),
    })
    if (!response.ok) throw new Error(`Seeding "${label}" failed: HTTP ${response.status}`)

    const parsed = ingestResponseSchema.safeParse(await response.json())
    if (!parsed.success || (!parsed.data.errors && !parsed.data.data)) {
      throw new Error(`Seeding "${label}" failed: unexpected response from the triage service`)
    }
    if (parsed.data.errors?.length) {
      throw new Error(`Seeding "${label}" failed: ${parsed.data.errors.map((error) => error.message).join('; ')}`)
    }
    if (parsed.data.data!.ingestFault.ignored) result.ignored++
    else result.created++
  }
  return result
}

/** The station E2E makes silent (see `silenceStation`) so that every health state is on screen. */
export const SILENT_STATION_ID = 'st-005'

export interface ScenarioSample {
  stationId: string
  at: string
  status: string
  temperatureC: number
  powerKw: number
  faultClass?: (typeof TAXONOMY)[keyof typeof TAXONOMY]
}

/**
 * One reading for each synthetic legacy station (legacy/data.mjs), taken at `now`:
 * st-003 reports an active connector lock fault (needs a visit), st-002 runs warm (degraded),
 * st-001 and st-004 are fine, st-005 is fine too but is meant to be silenced afterwards (offline).
 */
export function telemetryScenario(now: Date): ScenarioSample[] {
  const at = now.toISOString()
  return [
    { stationId: 'st-001', at, status: 'Available', temperatureC: 28, powerKw: 0 },
    { stationId: 'st-002', at, status: 'Charging', temperatureC: 66, powerKw: 21.5 },
    { stationId: 'st-003', at, status: 'Faulted', temperatureC: 38, powerKw: 0, faultClass: TAXONOMY['CON.LOCK_FAILURE'] },
    { stationId: 'st-004', at, status: 'Charging', temperatureC: 35, powerKw: 118.2 },
    { stationId: SILENT_STATION_ID, at, status: 'Available', temperatureC: 30, powerKw: 0 },
  ]
}

const telemetryResponseSchema = z.object({
  data: z.object({ ingestTelemetry: z.object({ stationId: z.string() }) }).nullish(),
  errors: z.array(z.object({ message: z.string() })).optional(),
})

const INGEST_TELEMETRY = 'mutation IngestTelemetry($s: JSON!) { ingestTelemetry(sample: $s) { stationId state } }'

export interface SeedTelemetryOptions extends SeedOptions {
  /** The time of the readings; defaults to the current time. */
  now?: Date
}

/** Ingests the scenario through the real GraphQL API (so the service rolls the states up itself), one sample after the other. */
export async function seedTelemetry({ graphqlUrl, internalToken, now = new Date(), fetch: fetchImpl = fetch }: SeedTelemetryOptions): Promise<{ ingested: number }> {
  let ingested = 0
  for (const sample of telemetryScenario(now)) {
    const label = `telemetry for ${sample.stationId}`
    const response = await fetchImpl(graphqlUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-token': internalToken },
      body: JSON.stringify({ query: INGEST_TELEMETRY, variables: { s: sample } }),
    })
    if (!response.ok) throw new Error(`Seeding ${label} failed: HTTP ${response.status}`)

    const parsed = telemetryResponseSchema.safeParse(await response.json())
    if (!parsed.success || (!parsed.data.errors && !parsed.data.data)) {
      throw new Error(`Seeding ${label} failed: unexpected response from the triage service`)
    }
    if (parsed.data.errors?.length) {
      throw new Error(`Seeding ${label} failed: ${parsed.data.errors.map((error) => error.message).join('; ')}`)
    }
    ingested++
  }
  return { ingested }
}
