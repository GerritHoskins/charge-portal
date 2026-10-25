import { vi } from 'vitest'
import type { ClaudeMessageClient, ClaudeMessageParams, ClaudeMessageResponse } from '../../src/drafting/claude-client'

export const TOOL_NAME = 'submit_ticket_draft'

/** A draft the model could plausibly return (without `provider`: the provider adds it). */
export const modelDraft = {
  taxonomyCode: 'PWR.OVERCURRENT',
  probableCause: 'A power module tripped on over-current, which points to a failing component.',
  suggestedAction: 'Read the module diagnostics and replace the module if it is defective.',
  requiresSiteVisit: true,
  confidence: 0.8,
}

/** A response in which the model called the tool with `input`. */
export function toolUseResponse(input: unknown, extra: Partial<ClaudeMessageResponse> = {}): ClaudeMessageResponse {
  return {
    stop_reason: 'tool_use',
    content: [{ type: 'tool_use', id: 'toolu_synthetic', name: TOOL_NAME, input }],
    ...extra,
  }
}

/** A client that answers with `respond` and records every request. It never touches the network. */
export function fakeClient(respond: (params: ClaudeMessageParams, signal: AbortSignal) => Promise<ClaudeMessageResponse>) {
  const createMessage = vi.fn((params: ClaudeMessageParams, options: { signal: AbortSignal }) => respond(params, options.signal))
  const client: ClaudeMessageClient = { createMessage }
  return { client, createMessage }
}

export const answering = (response: ClaudeMessageResponse) => fakeClient(() => Promise.resolve(response))
