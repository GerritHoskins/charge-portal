import { describe, expect, it } from 'vitest'
// @ts-expect-error plain .mjs module without type declarations
import { summarize, validate } from '../../scripts/lib/migration-routes.mjs'

const route = (over: Record<string, unknown> = {}) => ({ path: '/a', status: 'migrated', adr: '0001', files: ['app/pages/a.vue'], ...over })
const ok = { exists: () => true, pageFiles: ['app/pages/a.vue'] }

describe('summarize', () => {
  it('counts progress over migratable routes only', () => {
    const s = summarize([route(), route({ path: '/b' }), route({ path: '/c', status: 'legacy' }), route({ path: '/api', status: 'stays-legacy' })])
    expect(s).toEqual({ migrated: 2, remaining: 1, staysLegacy: 1, native: 0, total: 3, percent: 67 })
  })

  it('is 100% when nothing is left to migrate', () => {
    expect(summarize([]).percent).toBe(100)
  })

  it('ignores nuxt-native routes in progress and counts them as native', () => {
    const s = summarize([route(), route({ path: '/shop', status: 'nuxt-native' }), route({ path: '/c', status: 'legacy' })])
    expect(s).toEqual({ migrated: 1, remaining: 1, staysLegacy: 0, native: 1, total: 2, percent: 50 })
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

  it('accepts a nuxt-native route with an ADR and existing files', () => {
    expect(validate([route({ status: 'nuxt-native' })], ok)).toEqual([])
  })

  it.each([
    ['without an ADR', { adr: undefined }, '/a: migrated and nuxt-native routes must reference the ADR that decided it'],
    ['without files', { files: [] }, '/a: migrated and nuxt-native routes must list the files that implement them'],
  ])('flags a nuxt-native route %s', (_label, over, expected) => {
    expect(validate([route({ status: 'nuxt-native', ...over })], { exists: () => true, pageFiles: [] }))
      .toContain(expected)
  })

  it('flags a nuxt-native route file that does not exist', () => {
    expect(validate([route({ status: 'nuxt-native' })], { ...ok, exists: () => false }))
      .toContain('/a: listed file app/pages/a.vue does not exist')
  })

  it('flags duplicate routes', () => {
    expect(validate([route(), route()], ok).join()).toContain('duplicate route')
  })
})
