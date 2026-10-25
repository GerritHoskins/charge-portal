import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { componentSchema, severitySchema, TAXONOMY } from '@charge-portal/fault-taxonomy'
import { FIELD_ERRORS } from '#shared/contracts/triage-rules'
import {
  auditActionSchema,
  editableFieldSchema,
  faultSourceSchema,
  stationAlertKindSchema,
  stationHealthSchema,
  ticketStateSchema,
} from '#shared/contracts/triage'

type Tree = { [key: string]: string | Tree }
const load = (locale: string): Tree => JSON.parse(readFileSync(`i18n/locales/${locale}.json`, 'utf8'))
const lookup = (tree: Tree, path: string): unknown =>
  path.split('.').reduce<unknown>((node, part) => (node as Tree | undefined)?.[part], tree)

// The triage screens translate values that come from the contract; a new value without text would
// render as a raw key. Every locale must have text for every value.
const wanted: Record<string, readonly string[]> = {
  'triage.taxonomy': Object.keys(TAXONOMY),
  'triage.component': componentSchema.options,
  'triage.severity': severitySchema.options,
  'triage.source': faultSourceSchema.options,
  'triage.state': ticketStateSchema.options,
  'triage.audit.action': auditActionSchema.options,
  'triage.field': editableFieldSchema.options,
  'triage.error': FIELD_ERRORS,
  // The stations page (WP-09) translates the live state and the alerts by kind, never the service's English message.
  'stations.live.state': stationHealthSchema.options,
  'stations.live.alert': stationAlertKindSchema.options,
}

describe.each(['de', 'en'])('triage catalogue (%s)', (locale) => {
  const tree = load(locale)
  for (const [prefix, values] of Object.entries(wanted)) {
    it(`has text for every value under ${prefix}`, () => {
      const missing = values.filter((value) => typeof lookup(tree, `${prefix}.${value}`) !== 'string')
      expect(missing).toEqual([])
    })
  }
})

describe('triage contract import', () => {
  it('does not pull the whole taxonomy package (vendor tables) into the client bundle', () => {
    const source = readFileSync('shared/contracts/triage.ts', 'utf8')
    expect(source).not.toMatch(/from '@charge-portal\/fault-taxonomy'/)
  })

  it('the taxonomy package is side-effect free and offers subpath exports', () => {
    const pkg = JSON.parse(readFileSync('packages/fault-taxonomy/package.json', 'utf8')) as {
      sideEffects?: unknown
      exports: Record<string, string>
    }
    expect(pkg.sideEffects).toBe(false)
    expect(pkg.exports['./taxonomy']).toBeDefined()
    expect(pkg.exports['./ocpp']).toBeDefined()
  })
})
