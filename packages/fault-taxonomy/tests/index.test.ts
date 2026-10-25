import { describe, expect, it } from 'vitest'
import * as api from '../src/index'

describe('public API', () => {
  it('exports what later packages use', () => {
    for (const name of [
      'normalise', 'TAXONOMY', 'UNCLASSIFIED_FAULT', 'faultClassSchema', 'taxonomyCodeSchema', 'componentSchema', 'severitySchema',
      'ocppStatusNotificationSchema', 'ocppErrorCodeSchema', 'ocppStatusSchema', 'VENDOR_TABLES', 'findVendorTable',
      'ALL_FIXTURES', 'FIXTURES_BY_VENDOR',
    ]) {
      expect(api, name).toHaveProperty(name)
    }
  })
})
