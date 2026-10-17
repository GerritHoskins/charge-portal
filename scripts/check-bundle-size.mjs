// Informational total for the gzipped client JS emitted by `nuxt build`.
// Per-route initial JS is the hard performance gate. Run after `npm run build`.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const DIR = '.output/public/_nuxt'
const BUDGET_KB = Number(process.env.JS_BUDGET_KB ?? 120) // total gzipped client JS

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })

let files
try {
  files = walk(DIR).filter((f) => f.endsWith('.js'))
} catch {
  console.error(`No build output at ${DIR}. Run "npm run build" first.`)
  process.exit(2)
}

const sizes = files
  .map((f) => ({ file: f, kb: gzipSync(readFileSync(f)).length / 1024 }))
  .sort((a, b) => b.kb - a.kb)
const total = sizes.reduce((sum, s) => sum + s.kb, 0)

for (const s of sizes.slice(0, 5)) console.log(`${s.kb.toFixed(1).padStart(7)} KB  ${s.file}`)
console.log(`\nTotal gzipped client JS: ${total.toFixed(1)} KB (former aggregate reference ${BUDGET_KB} KB; informational only)`)

if (total > BUDGET_KB) {
  console.log('Total exceeds the former aggregate reference; per-route budgets remain the hard gate.')
}
