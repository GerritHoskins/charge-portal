import { TAXONOMY } from '@charge-portal/fault-taxonomy'
import type { Fault } from '../faults/fault.entity'
import type { ClaudeMessageClient, ClaudeMessageParams, ClaudeMessageResponse } from './claude-client'
import { buildUserPrompt, DRAFT_TOOL_NAME, draftToolDefinition, SYSTEM_PROMPT } from './claude-prompt'
import { DEFAULT_DRAFT_MODEL } from './drafting-config'
import { DraftProviderError, type DraftContext, type DraftProvider, ticketDraftInputSchema, type TicketDraftInput } from './draft-provider'

export { DEFAULT_DRAFT_MODEL, DRAFT_TOOL_NAME }

export interface ClaudeDraftOptions {
  model: string
  /** The whole call, retries included, is abandoned after this long. */
  timeoutMs: number
}

/** Room for adaptive thinking plus the two 2000-character fields; far below the SDK's non-streaming limits. */
const MAX_TOKENS = 8192

/**
 * Models that reject `tool_choice: {type: 'tool' | 'any'}` with a 400 (Claude Sonnet 5.5, Opus 5.5, Fable 5.1 and
 * Mythos 5.1). They get `auto` plus an explicit instruction instead, and a modest `effort`: a draft is a short,
 * well-specified task. Any other model gets the tool forced. A wrong guess only costs a fallback to the rules
 * provider, which is validated and visible in the draft's `provider`.
 */
const REJECTS_FORCED_TOOL_CHOICE = /^claude-(?:sonnet-5-5|opus-5-5|fable-5-1|mythos-5-1)(?:$|-)/

/**
 * Drafts tickets with Claude (ADR 0010 decision 4). The model must answer through one tool whose input schema is
 * generated from the zod draft schema; the answer is then validated with that same schema and rejected when
 * `taxonomyCode` is outside TAXONOMY. Every failure is a `DraftProviderError` with a payload-free reason so the
 * caller can fall back to the deterministic provider. This class never logs.
 */
export class ClaudeDraftProvider implements DraftProvider {
  constructor(
    private readonly client: ClaudeMessageClient,
    private readonly options: ClaudeDraftOptions,
  ) {}

  async draft(fault: Fault, context: DraftContext): Promise<TicketDraftInput> {
    const response = await this.call(this.buildRequest(fault, context))
    return this.parse(response)
  }

  private buildRequest(fault: Fault, context: DraftContext): ClaudeMessageParams {
    const forcedAllowed = !REJECTS_FORCED_TOOL_CHOICE.test(this.options.model)
    return {
      model: this.options.model,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(fault, context.recentFaults) }],
      tools: [draftToolDefinition()],
      tool_choice: forcedAllowed ? { type: 'tool', name: DRAFT_TOOL_NAME } : { type: 'auto' },
      ...(forcedAllowed ? {} : { output_config: { effort: 'medium' as const } }),
    }
  }

  private async call(params: ClaudeMessageParams): Promise<ClaudeMessageResponse> {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        reject(new DraftProviderError('timeout'))
        controller.abort()
      }, this.options.timeoutMs)
    })
    try {
      return await Promise.race([this.client.createMessage(params, { signal: controller.signal }), timeout])
    } catch (error) {
      if (error instanceof DraftProviderError) throw error
      // The error text can echo request details, so only the HTTP status is kept.
      const status = (error as { status?: unknown } | null)?.status
      throw new DraftProviderError(typeof status === 'number' ? `api-error-${status}` : 'api-error')
    } finally {
      clearTimeout(timer)
    }
  }

  private parse(response: ClaudeMessageResponse): TicketDraftInput {
    if (response.stop_reason === 'refusal') throw new DraftProviderError('refusal')
    // A cut-off tool input is incomplete even when it happens to parse.
    if (response.stop_reason === 'max_tokens') throw new DraftProviderError('truncated')
    const block = response.content.find((part) => part.type === 'tool_use' && part.name === DRAFT_TOOL_NAME)
    if (!block) throw new DraftProviderError('no-tool-call')

    const input = block.input
    const code = (input as { taxonomyCode?: unknown } | null)?.taxonomyCode
    if (typeof code === 'string' && !Object.hasOwn(TAXONOMY, code)) throw new DraftProviderError('unknown-taxonomy-code')

    // The model never names itself: `provider` is set here, after its fields, so it cannot be spoofed.
    const parsed = ticketDraftInputSchema.safeParse({
      ...(typeof input === 'object' && input !== null ? input : {}),
      provider: `claude:${this.options.model}`,
    })
    if (!parsed.success || typeof input !== 'object' || input === null) {
      const fields = parsed.success ? ['(root)'] : parsed.error.issues.map((issue) => issue.path.join('.') || '(root)')
      throw new DraftProviderError('invalid-output', [...new Set(fields)].join(', '))
    }
    return parsed.data
  }
}
