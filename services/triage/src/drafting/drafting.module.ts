import { Module } from '@nestjs/common'
import { CLAUDE_CLIENT, type ClaudeMessageClient, createAnthropicMessageClient } from './claude-client'
import { createDraftProvider } from './create-draft-provider'
import { DRAFT_PROVIDER } from './draft-provider'
import { DRAFTING_CONFIG, type DraftingConfig, loadDraftingConfig } from './drafting-config'
import { DraftingService } from './drafting.service'
import { RulesDraftProvider } from './rules-draft-provider'

/**
 * The deterministic provider is the default. When ANTHROPIC_API_KEY is set the active provider is Claude with
 * the rules provider as fallback (ADR 0010, decision 4). Without a key no client is created at all.
 */
@Module({
  providers: [
    RulesDraftProvider,
    { provide: DRAFTING_CONFIG, useFactory: (): DraftingConfig => loadDraftingConfig() },
    {
      provide: CLAUDE_CLIENT,
      inject: [DRAFTING_CONFIG],
      useFactory: (config: DraftingConfig): ClaudeMessageClient | null =>
        config.apiKey ? createAnthropicMessageClient(config.apiKey) : null,
    },
    {
      provide: DRAFT_PROVIDER,
      inject: [DRAFTING_CONFIG, CLAUDE_CLIENT, RulesDraftProvider],
      useFactory: (config: DraftingConfig, client: ClaudeMessageClient | null, rules: RulesDraftProvider) =>
        createDraftProvider(config, client, rules),
    },
    DraftingService,
  ],
  exports: [DraftingService, DRAFT_PROVIDER],
})
export class DraftingModule {}
