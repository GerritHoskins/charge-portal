import { ALL_FIXTURES, type FaultFixture, normalise } from '@charge-portal/fault-taxonomy'
import { describe, expect, it } from 'vitest'
import { createAnthropicMessageClient } from '../../src/drafting/claude-client'
import { ClaudeDraftProvider } from '../../src/drafting/claude-draft-provider'
import { DraftProviderError } from '../../src/drafting/draft-provider'
import { loadDraftingConfig } from '../../src/drafting/drafting-config'
import { makeFault } from '../helpers/fault-factory'
import { assessRun, type LiveOutcome } from './assess-run'

function faultFrom(fixture: FaultFixture) {
  const { fault, source, raw } = normalise(fixture.notification)
  if (!fault) throw new Error(`fixture ${fixture.label} reports no fault`)
  return makeFault({
    stationId: raw.stationId,
    connectorId: raw.connectorId,
    ocppErrorCode: raw.errorCode,
    vendorId: raw.vendorId ?? null,
    vendorErrorCode: raw.vendorErrorCode ?? null,
    taxonomyCode: fault.taxonomyCode,
    component: fault.component,
    severity: fault.severity,
    requiresSiteVisit: fault.requiresSiteVisit,
    source,
    raw,
    occurredAt: new Date(raw.timestamp),
  })
}

const config = loadDraftingConfig()

describe.skipIf(!config.apiKey)(`Claude drafter against the live API (${config.model})`, () => {
  it('drafts every vendor fixture through the real Messages API', async () => {
    const provider = new ClaudeDraftProvider(createAnthropicMessageClient(config.apiKey!), {
      model: config.model,
      timeoutMs: config.timeoutMs,
    })

    const outcomes: LiveOutcome[] = []
    for (const fixture of ALL_FIXTURES) {
      const started = Date.now()
      try {
        const draft = await provider.draft(faultFrom(fixture), { recentFaults: [] })
        outcomes.push({
          fixture: fixture.label,
          expectedTaxonomyCode: fixture.expectedTaxonomyCode,
          result: 'claude',
          taxonomyCode: draft.taxonomyCode,
          requiresSiteVisit: draft.requiresSiteVisit,
          confidence: draft.confidence,
          ms: Date.now() - started,
        })
      } catch (error) {
        if (!(error instanceof DraftProviderError)) throw error
        outcomes.push({ fixture: fixture.label, expectedTaxonomyCode: fixture.expectedTaxonomyCode, result: error.reason, ms: Date.now() - started })
      }
    }

    // Field values only, never prompt or model prose, so the table is safe to paste into the progress log.
    // eslint-disable-next-line no-console -- The opt-in live test reports field values for review.
    console.table(outcomes)
    const verdict = assessRun(outcomes)
    expect(verdict.problems, verdict.problems.join('\n')).toEqual([])
    expect(verdict.pass).toBe(true)
  })
})
