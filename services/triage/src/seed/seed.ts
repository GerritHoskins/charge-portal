import { ALL_FIXTURES } from '@charge-portal/fault-taxonomy'
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
