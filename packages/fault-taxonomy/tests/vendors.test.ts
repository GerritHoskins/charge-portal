import { describe, expect, it } from 'vitest'
import { TAXONOMY } from '../src/taxonomy'
import { VENDOR_TABLES, findVendorTable, vendorTableSchema } from '../src/vendors'
import { kestrelEv } from '../src/vendors/kestrel-ev'
import { lumenwatt } from '../src/vendors/lumenwatt'
import { orbisPower } from '../src/vendors/orbis-power'
import { voltreon } from '../src/vendors/voltreon'

describe('vendor tables', () => {
  it('has the four fictional vendors', () => {
    expect(VENDOR_TABLES.map((t) => t.vendorId).sort()).toEqual(['kestrel-ev', 'lumenwatt', 'orbis-power', 'voltreon'])
  })

  describe.each(VENDOR_TABLES.map((t) => [t.vendorId, t] as const))('%s', (_id, table) => {
    const entries = Object.entries(table.codes)

    it('has 6 to 10 codes', () => {
      expect(entries.length).toBeGreaterThanOrEqual(6)
      expect(entries.length).toBeLessThanOrEqual(10)
    })

    it('passes the table schema', () => {
      expect(vendorTableSchema.safeParse(table).success).toBe(true)
    })

    it.each(entries)('maps %j to a class in TAXONOMY', (_code, taxonomyCode) => {
      expect(TAXONOMY).toHaveProperty(taxonomyCode)
      expect(taxonomyCode).not.toBe('UNCLASSIFIED')
    })

    it.each(entries)('stores %j in canonical form and fits vendorErrorCode (<= 50)', (code) => {
      expect(table.canonicalise(code)).toBe(code)
      expect(code.length).toBeLessThanOrEqual(50)
    })
  })

  it('reaches the same class through all four vendor spellings (at least six classes)', () => {
    const perVendor = VENDOR_TABLES.map((t) => new Set(Object.values(t.codes)))
    const shared = [...perVendor[0]!].filter((c) => perVendor.every((s) => s.has(c)))
    expect(shared.length).toBeGreaterThanOrEqual(6)
  })

  it('looks tables up by vendorId, ignoring case and surrounding whitespace', () => {
    expect(findVendorTable('voltreon')).toBe(voltreon)
    expect(findVendorTable('  Kestrel-EV ')).toBe(kestrelEv)
    expect(findVendorTable('LUMENWATT')).toBe(lumenwatt)
    expect(findVendorTable('orbis-power')).toBe(orbisPower)
    expect(findVendorTable('acme')).toBeUndefined()
    expect(findVendorTable(undefined)).toBeUndefined()
  })

  describe('canonical forms', () => {
    it('voltreon: numeric codes as strings, trimmed', () => {
      expect(voltreon.canonicalise(' 1012 ')).toBe('1012')
      expect(voltreon.codes).toHaveProperty('1012')
    })

    it('kestrel-ev: prefixed codes, trimmed and upper-cased', () => {
      expect(kestrelEv.canonicalise(' kst-e-0042 ')).toBe('KST-E-0042')
      expect(kestrelEv.codes).toHaveProperty('KST-E-0042')
    })

    it('lumenwatt: free text, trimmed and lower-cased', () => {
      expect(lumenwatt.canonicalise('  Lock Motor STALLED ')).toBe('lock motor stalled')
      expect(lumenwatt.codes).toHaveProperty('lock motor stalled')
    })

    it('orbis-power: hex codes, case-insensitive', () => {
      expect(orbisPower.canonicalise(' 0x1f04 ')).toBe('0x1F04')
      expect(orbisPower.canonicalise('0X1F04')).toBe('0x1F04')
      expect(orbisPower.codes).toHaveProperty('0x1F04')
    })
  })
})

describe('vendorTableSchema', () => {
  const good = {
    vendorId: 'test-vendor',
    canonicalise: (c: string) => c.trim(),
    codes: { A1: 'CON.LOCK_FAILURE' },
  }

  it('accepts a valid table', () => {
    expect(vendorTableSchema.safeParse(good).success).toBe(true)
  })

  it('rejects an entry that maps to a class outside TAXONOMY', () => {
    expect(vendorTableSchema.safeParse({ ...good, codes: { A1: 'XXX.NOT_A_CLASS' } }).success).toBe(false)
  })

  it('rejects an entry that maps to UNCLASSIFIED', () => {
    expect(vendorTableSchema.safeParse({ ...good, codes: { A1: 'UNCLASSIFIED' } }).success).toBe(false)
  })

  it('rejects a key that is not in canonical form', () => {
    expect(vendorTableSchema.safeParse({ ...good, codes: { ' a1 ': 'CON.LOCK_FAILURE' } }).success).toBe(false)
  })

  it('rejects a key longer than 50 characters', () => {
    const key = 'x'.repeat(51)
    expect(vendorTableSchema.safeParse({ ...good, codes: { [key]: 'CON.LOCK_FAILURE' } }).success).toBe(false)
  })

  it('rejects an empty table and an empty vendorId', () => {
    expect(vendorTableSchema.safeParse({ ...good, codes: {} }).success).toBe(false)
    expect(vendorTableSchema.safeParse({ ...good, vendorId: '' }).success).toBe(false)
  })
})
