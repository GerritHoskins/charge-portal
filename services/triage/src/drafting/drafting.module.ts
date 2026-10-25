import { Module } from '@nestjs/common'
import { DRAFT_PROVIDER } from './draft-provider'
import { DraftingService } from './drafting.service'
import { RulesDraftProvider } from './rules-draft-provider'

/** The deterministic provider is the default; a model-backed one replaces the binding when configured. */
@Module({
  providers: [RulesDraftProvider, { provide: DRAFT_PROVIDER, useExisting: RulesDraftProvider }, DraftingService],
  exports: [DraftingService, DRAFT_PROVIDER],
})
export class DraftingModule {}
