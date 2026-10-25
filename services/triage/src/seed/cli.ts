import { recreateDatabase, resetTriageData, seedFaults } from './seed'

// Build entry (dist/seed.js), run by the package scripts and by the Playwright webServer:
//   node dist/seed.js prepare   drop and create the E2E database (name must end in _e2e)
//   node dist/seed.js seed      ingest the WP-01 fixtures into the running service
//   node dist/seed.js reset     empty the triage tables, then seed
// Environment: TRIAGE_DATABASE_URL, TRIAGE_INTERNAL_TOKEN, TRIAGE_PORT (default 4100).

const required = (name: string): string => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function main(command: string | undefined): Promise<void> {
  if (command === 'prepare') {
    await recreateDatabase(required('TRIAGE_DATABASE_URL'))
    process.stdout.write('E2E database recreated\n')
    return
  }
  if (command === 'seed' || command === 'reset') {
    if (command === 'reset') await resetTriageData(required('TRIAGE_DATABASE_URL'))
    const port = process.env.TRIAGE_PORT?.trim() || '4100'
    const result = await seedFaults({ graphqlUrl: `http://127.0.0.1:${port}/graphql`, internalToken: required('TRIAGE_INTERNAL_TOKEN') })
    process.stdout.write(`Seeded ${result.created} draft tickets (${result.ignored} ignored)\n`)
    return
  }
  throw new Error('Usage: seed.js prepare | seed | reset')
}

main(process.argv[2]).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
