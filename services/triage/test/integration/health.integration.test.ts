import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { integrationEnv, resetDatabase, withClient } from './setup'

const { databaseUrl, internalToken } = integrationEnv()
const schemaFile = fileURLToPath(new URL('../../schema.gql', import.meta.url))

let app: INestApplication
let url: string
let committedSchema: string

async function query(body: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(`${url}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  return { status: response.status, body: (await response.json()) as { data?: unknown; errors?: { message: string }[] } }
}

const healthQuery = { query: '{ health { status database } }' }

beforeAll(async () => {
  // Start from an empty database so the test proves the migration path, not leftovers.
  await resetDatabase(databaseUrl)
  // Read before boot: Nest rewrites schema.gql on startup, so this is the committed version.
  committedSchema = readFileSync(schemaFile, 'utf8')
  // Imported lazily so TRIAGE_* are set (integrationEnv above) before the module graph evaluates.
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

describe('triage service against PostgreSQL', () => {
  it('runs migrations at startup', async () => {
    await withClient(databaseUrl, async (client) => {
      const meta = await client.query("SELECT to_regclass('public.schema_meta') AS name")
      expect(meta.rows[0].name).toBe('schema_meta')
      const applied = await client.query('SELECT name FROM migrations ORDER BY id')
      expect(applied.rows.map((row: { name: string }) => row.name)).toEqual([expect.stringMatching(/^Init\d+$/)])
    })
  })

  it('answers the health query with database connectivity', async () => {
    const { status, body } = await query(healthQuery, { 'x-internal-token': internalToken, 'x-actor': 'ops@example.test' })
    expect(status).toBe(200)
    expect(body).toEqual({ data: { health: { status: 'ok', database: true } } })
  })

  it('rejects a request without the internal token', async () => {
    const { body } = await query(healthQuery)
    expect(body.data ?? null).toBeNull()
    expect(body.errors?.[0]?.message).toBe('Unauthorized')
  })

  it('rejects a request with a wrong internal token', async () => {
    const { body } = await query(healthQuery, { 'x-internal-token': 'wrong' })
    expect(body.data ?? null).toBeNull()
    expect(body.errors?.[0]?.message).toBe('Unauthorized')
  })

  it('keeps the committed schema.gql in sync with the code-first schema', () => {
    // Nest regenerated schema.gql during startup; it must equal what was committed.
    const normalise = (sdl: string) => sdl.replace(/\r\n/g, '\n').replace(/^#.*\n/gm, '').trim()
    expect(normalise(readFileSync(schemaFile, 'utf8'))).toBe(normalise(committedSchema))
  })
})
