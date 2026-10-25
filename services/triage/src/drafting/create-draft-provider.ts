import type { ClaudeMessageClient } from './claude-client'
import { ClaudeDraftProvider } from './claude-draft-provider'
import type { DraftProvider } from './draft-provider'
import type { DraftingConfig } from './drafting-config'
import { FallbackDraftProvider } from './fallback-draft-provider'

/**
 * Provider selection (ADR 0010 decision 4): Claude first with the rules provider as fallback when an API
 * key is configured, the rules provider alone otherwise.
 */
export function createDraftProvider(config: DraftingConfig, client: ClaudeMessageClient | null, rules: DraftProvider): DraftProvider {
  if (!config.apiKey) return rules
  if (!client) throw new Error('An API key is configured but no Claude client was provided')
  return new FallbackDraftProvider(new ClaudeDraftProvider(client, { model: config.model, timeoutMs: config.timeoutMs }), rules)
}
