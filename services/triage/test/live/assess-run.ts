/** What one live call produced: a Claude draft, or the fallback reason the service would have recorded. */
export interface LiveOutcome {
  fixture: string
  expectedTaxonomyCode: string
  /** `claude` when the model's draft passed validation, otherwise the DraftProviderError reason. */
  result: 'claude' | string
  taxonomyCode?: string
  requiresSiteVisit?: boolean
  confidence?: number
  ms: number
}

export interface LiveVerdict {
  pass: boolean
  /** One line per problem, shown when the run fails. */
  problems: string[]
}

export const MIN_TAXONOMY_AGREEMENT = 0.8

/**
 * Decides whether the live run shows that the Claude drafter works as ADR 0010 intends.
 * Every outcome is a real API call; `result !== 'claude'` means the service would have fallen back to rules.
 */
export function assessRun(outcomes: readonly LiveOutcome[]): LiveVerdict {
  const problems: string[] = []
  if (outcomes.length === 0) problems.push('no live outcomes recorded')

  for (const outcome of outcomes) {
    if (outcome.result !== 'claude') {
      const hint = outcome.result === 'api-error-400'
        ? "; contradicts ADR 0010's non-forced tool_choice assumption for the configured model"
        : ''
      problems.push(`${outcome.fixture}: fell back to rules (${outcome.result})${hint}`)
      continue
    }
    if (typeof outcome.confidence !== 'number' || !Number.isFinite(outcome.confidence) || outcome.confidence < 0 || outcome.confidence > 1) {
      problems.push(`${outcome.fixture}: invalid confidence ${outcome.confidence}`)
    }
    if (!outcome.taxonomyCode) problems.push(`${outcome.fixture}: missing taxonomyCode`)
  }

  const claude = outcomes.filter((outcome) => outcome.result === 'claude')
  const mismatches = claude.filter((outcome) => outcome.taxonomyCode !== outcome.expectedTaxonomyCode)
  const matches = claude.length - mismatches.length
  // Exact agreement is not the contract: the model may legitimately choose a neighbouring class.
  // Systematic disagreement signals a broken prompt or catalogue.
  if (claude.length > 0 && matches / claude.length < MIN_TAXONOMY_AGREEMENT) {
    problems.push(`taxonomy agreement ${matches}/${claude.length} below ${MIN_TAXONOMY_AGREEMENT}`)
    for (const outcome of mismatches) {
      problems.push(`${outcome.fixture}: expected ${outcome.expectedTaxonomyCode}, got ${outcome.taxonomyCode}`)
    }
  }

  return { pass: problems.length === 0, problems }
}
