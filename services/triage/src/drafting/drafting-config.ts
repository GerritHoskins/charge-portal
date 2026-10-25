import { z } from 'zod'

export const DRAFTING_CONFIG = Symbol('DRAFTING_CONFIG')

export const DEFAULT_DRAFT_MODEL = 'claude-sonnet-5-5'
export const DEFAULT_DRAFT_TIMEOUT_MS = 15_000

/** A blank variable (`TRIAGE_DRAFT_MODEL=` in a compose file) means "not set". */
const blankIsUnset = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? undefined : value)

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.preprocess(blankIsUnset, z.string().trim().min(1).optional()),
  // `claude:<model>` has to fit the 100 characters of the draft's `provider` field.
  TRIAGE_DRAFT_MODEL: z.preprocess(blankIsUnset, z.string().trim().min(1).max(90).default(DEFAULT_DRAFT_MODEL)),
  TRIAGE_DRAFT_TIMEOUT_MS: z.preprocess(blankIsUnset, z.coerce.number().int().min(100).max(120_000).default(DEFAULT_DRAFT_TIMEOUT_MS)),
})

export interface DraftingConfig {
  /** Present => drafts come from Claude (with the rules provider as fallback). Never logged or persisted. */
  apiKey: string | undefined
  model: string
  timeoutMs: number
}

/** Reads the drafting environment. Error messages name variables, never values (the key is a secret). */
export function loadDraftingConfig(env: Record<string, string | undefined> = process.env): DraftingConfig {
  const parsed = envSchema.safeParse(env)
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    throw new Error(`Invalid drafting configuration: ${problems.join('; ')}`)
  }
  const { ANTHROPIC_API_KEY, TRIAGE_DRAFT_MODEL, TRIAGE_DRAFT_TIMEOUT_MS } = parsed.data
  return { apiKey: ANTHROPIC_API_KEY, model: TRIAGE_DRAFT_MODEL, timeoutMs: TRIAGE_DRAFT_TIMEOUT_MS }
}
