// Migration progress: how many routes does Nuxt own, how many are left?
//   npm run migration:status            prints the numbers
//   npm run migration:status -- --check also fails (exit 1) if docs/migration-routes.json drifts from the repo
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { summarize, validate } from './lib/migration-routes.mjs'

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const { routes } = JSON.parse(readFileSync(join(root, 'docs/migration-routes.json'), 'utf8'))

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]))
const pageFiles = walk(join(root, 'app/pages'))
  .filter((f) => f.endsWith('.vue'))
  .map((f) => relative(root, f).replaceAll('\\', '/'))

const s = summarize(routes)
console.log(`Migrated ${s.migrated} of ${s.total} routes (${s.percent}%), ${s.remaining} remaining, ${s.staysLegacy} deliberately staying in legacy${s.native ? `, ${s.native} Nuxt-native (excluded from the percentage)` : ''}.`)
for (const r of routes.filter((x) => x.status === 'legacy')) console.log(`  todo: ${r.path}`)

if (process.argv.includes('--check')) {
  const problems = validate(routes, { exists: (f) => existsSync(join(root, f)), pageFiles })
  for (const p of problems) console.error(`  ✗ ${p}`)
  if (problems.length) process.exit(1)
  console.log('  inventory matches the repository')
}
