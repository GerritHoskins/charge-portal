import { describe, expect, it } from 'vitest'
import { ALL_FIXTURES, FIXTURES_BY_VENDOR } from '../src/fixtures'
import { normalise } from '../src/normalise'
import { ocppStatusNotificationSchema } from '../src/ocpp'
import { VENDOR_TABLES } from '../src/vendors'

describe('fixtures', () => {
  it('covers every vendor with at least one known and one unknown code', () => {
    for (const table of VENDOR_TABLES) {
      const fixtures = FIXTURES_BY_VENDOR[table.vendorId as keyof typeof FIXTURES_BY_VENDOR]
      expect(fixtures.length, table.vendorId).toBeGreaterThanOrEqual(3)
      expect(fixtures.some((f) => f.expectedTaxonomyCode === 'UNCLASSIFIED'), table.vendorId).toBe(true)
      expect(fixtures.some((f) => f.expectedTaxonomyCode !== 'UNCLASSIFIED'), table.vendorId).toBe(true)
    }
  })

  it('flattens to ALL_FIXTURES', () => {
    const total = Object.values(FIXTURES_BY_VENDOR).reduce((n, list) => n + list.length, 0)
    expect(ALL_FIXTURES).toHaveLength(total)
  })

  it('has unique labels', () => {
    const labels = ALL_FIXTURES.map((f) => f.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it.each(ALL_FIXTURES.map((f) => [f.label, f] as const))('%s is a valid notification that normalises as declared', (_label, fixture) => {
    expect(ocppStatusNotificationSchema.safeParse(fixture.notification).success).toBe(true)
    expect(normalise(fixture.notification).fault?.taxonomyCode).toBe(fixture.expectedTaxonomyCode)
  })

  it('only uses synthetic station ids from the legacy seed', () => {
    for (const f of ALL_FIXTURES) expect(f.notification.stationId).toMatch(/^st-00[1-5]$/)
  })
})
