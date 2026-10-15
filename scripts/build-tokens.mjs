// tokens/tokens.json -> app/assets/css/tokens.css
//   npm run tokens             writes the CSS
//   npm run tokens -- --check  exits 1 if the committed CSS differs from what the JSON generates
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildCss } from './lib/tokens.mjs'

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const out = join(root, 'app/assets/css/tokens.css')
const css = buildCss(JSON.parse(readFileSync(join(root, 'tokens/tokens.json'), 'utf8')))

if (process.argv.includes('--check')) {
  const current = readFileSync(out, 'utf8').replaceAll('\r\n', '\n')
  if (current !== css) {
    console.error('tokens.css is out of date with tokens/tokens.json. Run `npm run tokens` (and edit the JSON, not the CSS).')
    process.exit(1)
  }
  console.log('tokens.css matches tokens/tokens.json')
} else {
  writeFileSync(out, css)
  console.log('wrote app/assets/css/tokens.css')
}
