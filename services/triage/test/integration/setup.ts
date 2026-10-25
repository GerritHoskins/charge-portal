import { Client } from 'pg'

/** Shared environment for integration tests. The database URL must come from the caller. */
export function integrationEnv() {
  const databaseUrl = process.env.TRIAGE_DATABASE_URL
  if (!databaseUrl) {
    throw new Error(
      'TRIAGE_DATABASE_URL is required for integration tests, e.g. postgres://triage:triage@localhost:5432/triage_wp02',
    )
  }
  const internalToken = process.env.TRIAGE_INTERNAL_TOKEN ?? 'synthetic-test-internal-token'
  process.env.TRIAGE_INTERNAL_TOKEN = internalToken
  // Integration tests run the rules provider; a developer's real key must never make them call the network.
  delete process.env.ANTHROPIC_API_KEY
  return { databaseUrl, internalToken }
}

export async function withClient<T>(databaseUrl: string, run: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: databaseUrl })
  await client.connect()
  try {
    return await run(client)
  } finally {
    await client.end()
  }
}

/**
 * Wipes the `public` schema so a test starts from nothing and proves the migration path.
 * DESTRUCTIVE: use a dedicated test database (triage_test, triage_wp02, ...). The compose/CI database
 * named exactly `triage` is only reset when CI=true (GitHub Actions) or TRIAGE_ALLOW_DB_RESET=1.
 */
export async function resetDatabase(databaseUrl: string): Promise<void> {
  const name = new URL(databaseUrl).pathname.replace(/^\//, '')
  if (name === 'triage' && process.env.CI !== 'true' && process.env.TRIAGE_ALLOW_DB_RESET !== '1') {
    throw new Error(
      'Refusing to wipe the development database "triage". Point TRIAGE_DATABASE_URL at a test database ' +
        '(e.g. triage_test) or set TRIAGE_ALLOW_DB_RESET=1.',
    )
  }
  await withClient(databaseUrl, async (client) => {
    await client.query('DROP SCHEMA public CASCADE')
    await client.query('CREATE SCHEMA public')
  })
}
