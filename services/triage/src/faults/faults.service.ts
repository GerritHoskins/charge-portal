import { randomUUID } from 'node:crypto'
import { normalise, ocppStatusNotificationSchema } from '@charge-portal/fault-taxonomy'
import { Injectable } from '@nestjs/common'
import { GraphQLError } from 'graphql'
import { Between, DataSource, type QueryDeepPartialEntity } from 'typeorm'
import { AuditService } from '../audit/audit.service'
import { DraftingService } from '../drafting/drafting.service'
import { RECURRENCE_WINDOW_MS } from '../drafting/rules-draft-provider'
import { TicketsService } from '../tickets/tickets.service'
import { ticketSnapshot } from '../tickets/ticket-snapshot'
import { Fault } from './fault.entity'
import type { IngestResult } from './ingest-result.model'

/** Context handed to the provider: station history shorter than this, newest first. */
const RECENT_FAULT_LIMIT = 100

@Injectable()
export class FaultsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly drafting: DraftingService,
    private readonly tickets: TicketsService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Normalises one OCPP StatusNotification, drafts a ticket for it and stores fault, ticket and
   * `draft-created` audit entry in one transaction. A `NoError` notification is acknowledged and
   * not stored. The provider runs before the transaction opens, so a slow (model-backed) provider never
   * holds a database transaction; the fault gets its id up front for that reason.
   */
  async ingest(notification: unknown): Promise<IngestResult> {
    const parsed = ocppStatusNotificationSchema.safeParse(notification)
    if (!parsed.success) {
      throw new GraphQLError('Invalid OCPP StatusNotification', {
        extensions: {
          code: 'BAD_USER_INPUT',
          // Paths and messages only; zod does not echo the submitted values.
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.map((part) => (typeof part === 'symbol' ? part.toString() : part)),
            message: issue.message,
            code: issue.code,
          })),
        },
      })
    }

    const normalised = normalise(parsed.data)
    if (normalised.fault === null) return { ticket: null, ignored: true }

    const fault = Object.assign(new Fault(), {
      id: randomUUID(),
      stationId: normalised.raw.stationId,
      connectorId: normalised.raw.connectorId,
      ocppErrorCode: normalised.raw.errorCode,
      vendorId: normalised.raw.vendorId ?? null,
      vendorErrorCode: normalised.raw.vendorErrorCode ?? null,
      taxonomyCode: normalised.fault.taxonomyCode,
      component: normalised.fault.component,
      severity: normalised.fault.severity,
      requiresSiteVisit: normalised.fault.requiresSiteVisit,
      source: normalised.source,
      raw: { ...normalised.raw },
      occurredAt: new Date(normalised.raw.timestamp),
      receivedAt: new Date(),
    })

    const draft = await this.drafting.draft(fault, { recentFaults: await this.recentFaults(fault) })

    const ticket = await this.dataSource.transaction(async (manager) => {
      await manager.insert(Fault, fault as QueryDeepPartialEntity<Fault>)
      const created = await this.tickets.createDraft(manager, fault, draft)
      await this.audit.record(manager, {
        ticketId: created.id,
        action: 'draft-created',
        actor: `agent:${draft.provider}`,
        before: null,
        after: ticketSnapshot(created),
      })
      return created
    })
    return { ticket, ignored: false }
  }

  /** Faults on the same station in the 24 hours up to this one, newest first. */
  private recentFaults(fault: Fault): Promise<Fault[]> {
    return this.dataSource.getRepository(Fault).find({
      where: {
        stationId: fault.stationId,
        occurredAt: Between(new Date(fault.occurredAt.getTime() - RECURRENCE_WINDOW_MS), fault.occurredAt),
      },
      order: { occurredAt: 'DESC' },
      take: RECENT_FAULT_LIMIT,
    })
  }
}
