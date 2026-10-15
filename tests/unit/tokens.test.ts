import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
// @ts-expect-error plain .mjs module without type declarations
import { buildCss, contrast, resolveTenant } from '../../scripts/lib/tokens.mjs'

const tokens = JSON.parse(readFileSync('tokens/tokens.json', 'utf8'))
const tenants = ['default', ...Object.keys(tokens.tenants)]

describe('token pipeline', () => {
  it('the committed tokens.css is exactly what tokens.json generates', () => {
    const committed = readFileSync('app/assets/css/tokens.css', 'utf8').replaceAll('\r\n', '\n')
    expect(committed).toBe(buildCss(tokens))
  })

  it('emits a :root block and one block per tenant', () => {
    const css = buildCss(tokens)
    expect(css).toContain(':root {')
    for (const t of Object.keys(tokens.tenants)) expect(css).toContain(`[data-tenant='${t}'] {`)
  })

  it('tenants only override tokens that exist in the base layer', () => {
    for (const vars of Object.values(tokens.tenants) as Record<string, string>[]) {
      for (const key of Object.keys(vars)) expect(tokens.base).toHaveProperty(key)
    }
  })
})

describe('contrast maths', () => {
  it('black on white is 21:1 and equal colours are 1:1', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrast('#336699', '#336699')).toBeCloseTo(1, 5)
  })
})

// Fast feedback before axe runs in a browser: every text pairing meets WCAG AA (4.5:1) in every tenant.
describe.each(tenants)('WCAG AA contrast of the %s theme', (tenant) => {
  const t = resolveTenant(tokens, tenant) as Record<string, string>
  const pairs: [string, string][] = [
    ['--color-text', '--color-bg'],
    ['--color-text', '--color-surface'],
    ['--color-text-muted', '--color-bg'],
    ['--color-brand', '--color-bg'],
    ['--color-brand', '--color-surface'],
    ['--color-brand-contrast', '--color-brand'],
    ['--color-error', '--color-bg'],
    ...['available', 'charging', 'faulted', 'offline'].map((s): [string, string] => [`--status-${s}-fg`, `--status-${s}-bg`]),
  ]
  it.each(pairs)('%s on %s', (fg, bg) => {
    expect(contrast(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(4.5)
  })
})
