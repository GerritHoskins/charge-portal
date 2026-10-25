import { describe, expect, it } from 'vitest'
import { AuditService } from '../../src/audit/audit.service'

describe('AuditService surface', () => {
  it('exposes only the insert and read paths: no update, delete or save method exists', () => {
    const methods = Object.getOwnPropertyNames(AuditService.prototype).filter((name) => name !== 'constructor')
    expect(methods.sort()).toEqual(['forTicket', 'record'])
    for (const name of ['update', 'delete', 'remove', 'save', 'upsert', 'clear', 'truncate']) {
      expect(AuditService.prototype).not.toHaveProperty(name)
    }
  })
})
