import Anthropic from '@anthropic-ai/sdk'

/** Injection token for the Claude client; `null` when no API key is configured. */
export const CLAUDE_CLIENT = Symbol('CLAUDE_CLIENT')

export type ClaudeMessageParams = Anthropic.MessageCreateParamsNonStreaming

/** The part of a Messages API response the draft provider reads. Structural, so tests need no SDK types. */
export interface ClaudeMessageResponse {
  stop_reason?: string | null
  content: readonly { type: string; id?: string; name?: string; input?: unknown; text?: string; thinking?: string }[]
}

/** The one call the provider makes. Tests pass a fake; production wraps `@anthropic-ai/sdk`. */
export interface ClaudeMessageClient {
  createMessage(params: ClaudeMessageParams, options: { signal: AbortSignal }): Promise<ClaudeMessageResponse>
}

export interface AnthropicClientOptions {
  /** Replaces the global fetch (used by tests so nothing leaves the process). */
  fetch?: typeof fetch
}

/**
 * Wraps the official SDK. Retries stay at one: the caller bounds the whole call with a timeout, and the
 * rules provider is the real fallback. The key lives only inside the SDK client.
 */
export function createAnthropicMessageClient(apiKey: string, options: AnthropicClientOptions = {}): ClaudeMessageClient {
  const sdk = new Anthropic({ apiKey, maxRetries: 1, ...(options.fetch ? { fetch: options.fetch } : {}) })
  return {
    createMessage: (params, { signal }) => sdk.messages.create(params, { signal }),
  }
}
