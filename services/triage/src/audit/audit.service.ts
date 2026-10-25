import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { type EntityManager, type QueryDeepPartialEntity, Repository } from 'typeorm'
import { type AuditAction, AuditEntry } from './audit-entry.entity'

export interface AuditRecord {
  ticketId: string
  action: AuditAction
  actor: string
  before: Record<string, unknown> | null
  after: Record<string, unknown>
}

/**
 * The only way entries enter the audit log, and it is insert-only. `record` takes the caller's
 * EntityManager so the entry commits (or rolls back) together with the change it describes.
 */
@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditEntry) private readonly entries: Repository<AuditEntry>) {}

  async record(manager: EntityManager, record: AuditRecord): Promise<AuditEntry> {
    const entry = Object.assign(new AuditEntry(), { id: randomUUID(), ...record, at: new Date() })
    // jsonb columns hold arbitrary objects, which TypeORM's deep-partial insert type does not model.
    await manager.insert(AuditEntry, entry as QueryDeepPartialEntity<AuditEntry>)
    return entry
  }

  /** The trail of one ticket, oldest first. */
  forTicket(ticketId: string): Promise<AuditEntry[]> {
    return this.entries.find({ where: { ticketId }, order: { at: 'ASC' } })
  }
}
