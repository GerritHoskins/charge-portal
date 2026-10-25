import { Inject, Injectable } from '@nestjs/common'
import type { Fault } from '../faults/fault.entity'
import { DRAFT_PROVIDER, type DraftContext, type DraftProvider, ticketDraftInputSchema, type TicketDraftInput } from './draft-provider'

/** The active provider produced something that is not a valid draft. Carries field names only. */
export class InvalidDraftError extends Error {
  constructor(provider: string, fields: string[]) {
    super(`Draft provider ${provider} returned an invalid draft (${fields.join(', ')})`)
    this.name = 'InvalidDraftError'
  }
}

/** Runs the active DraftProvider and validates its output, whichever provider that is (ADR 0010). */
@Injectable()
export class DraftingService {
  constructor(@Inject(DRAFT_PROVIDER) private readonly provider: DraftProvider) {}

  async draft(fault: Fault, context: DraftContext): Promise<TicketDraftInput> {
    const output = await this.provider.draft(fault, context)
    const parsed = ticketDraftInputSchema.safeParse(output)
    if (!parsed.success) {
      // Field names only: the output is untrusted and must not end up in logs or error messages.
      const fields = [...new Set(parsed.error.issues.map((issue) => issue.path.join('.') || '(root)'))]
      throw new InvalidDraftError(this.provider.constructor.name, fields)
    }
    return parsed.data
  }
}
