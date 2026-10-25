import { Logger } from '@nestjs/common'
import { DraftProviderError, type DraftContext, type DraftProvider, type TicketDraftInput } from './draft-provider'
import type { Fault } from '../faults/fault.entity'

export interface WarnLogger {
  warn(message: string): void
}

const PROVIDER_MAX = 100

/**
 * Tries `primary`; if it fails for any reason, the deterministic `fallback` drafts instead and the draft's
 * `provider` records why (`rules (fallback: timeout)`, ADR 0010 decision 4). One warning is logged with the
 * reason only: no fault data, prompt or model output.
 */
export class FallbackDraftProvider implements DraftProvider {
  constructor(
    private readonly primary: DraftProvider,
    private readonly fallback: DraftProvider,
    private readonly logger: WarnLogger = new Logger(FallbackDraftProvider.name),
  ) {}

  async draft(fault: Fault, context: DraftContext): Promise<TicketDraftInput> {
    try {
      return await this.primary.draft(fault, context)
    } catch (error) {
      const failure = error instanceof DraftProviderError ? error : new DraftProviderError('unexpected-error')
      this.logger.warn(
        `Draft provider failed (${failure.reason}${failure.detail ? `: ${failure.detail}` : ''}); using the fallback provider`,
      )
      const draft = await this.fallback.draft(fault, context)
      return { ...draft, provider: `${draft.provider} (fallback: ${failure.reason})`.slice(0, PROVIDER_MAX) }
    }
  }
}
