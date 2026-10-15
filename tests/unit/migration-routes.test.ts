import { describe, expect, it } from 'vitest'
// @ts-expect-error plain .mjs module without type declarations
import { summarize, validate } from '../../scripts/lib/migration-routes.mjs'

const route = (over: Record<string, unknown> = {}) => ({ path: '/a', status: 'migrated', adr: '0001', files: ['app/pages/a.vue'], ...over })
const ok = { exists: () => true, pageFiles: ['app/pages/a.vue'] }

describe('summarize', () => {
  it('counts progress over migratable routes only', () => {
    const s = summarize([route(), route({ path: '/b' }), route({ path: '/c', status: 'legacy' }), route({ path: '/api', status: 'stays-legacy' })])
    expect(s).toEqual({ migrated: 2, remaining: 1, staysLegacy: 1, total: 3, percent: 67 })
  })

  it('is 100% when nothing is left to migrate', () => {
    expect(summarize([]).percent).toBe(100)
  })
})

describe('validate', () => {
  it('accepts a consistent inventory', () => {
    expect(validate([route()], ok)).toEqual([])
  })

  it('flags a page that is not in the inventory', () => {
    expect(validate([route()], { ...ok, pageFiles: ['app/pages/a.vue', 'app/pages/new.vue'] })).toEqual([
      'page app/pages/new.vue is not in the inventory (add its route to docs/migration-routes.json)',
    ])
  })

  it('flags a listed file that does not exist', () => {
    expect(validate([route()], { ...ok, exists: () => false })[0]).toContain('does not exist')
  })

  it.each([
    ['without an ADR', { adr: undefined }, 'ADR'],
    ['without files', { files: [] }, 'files'],
    ['with an unknown status', { status: 'half' }, 'unknown status'],
  ])('flags a migrated route %s', (_label, over, fragment) => {
    expect(validate([route(over)], { exists: () => true, pageFiles: [] }).join()).toContain(fragment)
  })

  it('flags duplicate routes', () => {
    expect(validate([route(), route()], ok).join()).toContain('duplicate route')
  })
})
