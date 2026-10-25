import { componentSchema, TAXONOMY } from '@charge-portal/fault-taxonomy'
import { describe, expect, it } from 'vitest'
import { ticketDraftInputSchema } from '../../src/drafting/draft-provider'
import { RECURRENCE_THRESHOLD, RECURRENCE_WINDOW_MS, RulesDraftProvider } from '../../src/drafting/rules-draft-provider'
import { makeFault } from '../helpers/fault-factory'

const provider = new RulesDraftProvider()
const HOUR = 60 * 60 * 1000

/** `count` earlier faults with the same class as `fault`, `step` ms apart, the first `step` before it. */
function earlier(fault: ReturnType<typeof makeFault>, count: number, step = HOUR) {
  return Array.from({ length: count }, (_, i) =>
    makeFault({
      stationId: fault.stationId,
      taxonomyCode: fault.taxonomyCode,
      occurredAt: new Date(fault.occurredAt.getTime() - (i + 1) * step),
    }),
  )
}

const remoteFault = () =>
  makeFault({ taxonomyCode: 'COM.WEAK_SIGNAL', component: 'communication', requiresSiteVisit: false })

describe('RulesDraftProvider', () => {
  it('names itself "rules" (the audit actor becomes agent:rules)', async () => {
    const draft = await provider.draft(makeFault(), { recentFaults: [] })
    expect(draft.provider).toBe('rules')
  })

  it.each([
    ['vendor-table', 0.9],
    ['ocpp-default', 0.6],
    ['unclassified', 0.3],
  ] as const)('uses confidence for source %s => %s', async (source, confidence) => {
    const draft = await provider.draft(makeFault({ source }), { recentFaults: [] })
    expect(draft.confidence).toBe(confidence)
  })

  it('takes taxonomyCode and requiresSiteVisit from the fault when nothing recurs', async () => {
    const remote = await provider.draft(remoteFault(), { recentFaults: [] })
    expect(remote).toMatchObject({ taxonomyCode: 'COM.WEAK_SIGNAL', requiresSiteVisit: false })
    const visit = await provider.draft(makeFault(), { recentFaults: [] })
    expect(visit).toMatchObject({ taxonomyCode: 'PWR.OVERCURRENT', requiresSiteVisit: true })
  })

  it('has a distinct cause and action template for every component', async () => {
    const causes = new Set<string>()
    const actions = new Set<string>()
    for (const component of componentSchema.options) {
      const draft = await provider.draft(makeFault({ component }), { recentFaults: [] })
      expect(draft.probableCause.length).toBeGreaterThan(20)
      expect(draft.suggestedAction.length).toBeGreaterThan(20)
      causes.add(draft.probableCause)
      actions.add(draft.suggestedAction)
    }
    expect(causes.size).toBe(componentSchema.options.length)
    expect(actions.size).toBe(componentSchema.options.length)
  })

  it('produces output that passes the draft schema for every taxonomy class and source', async () => {
    for (const cls of Object.values(TAXONOMY)) {
      for (const source of ['vendor-table', 'ocpp-default', 'unclassified'] as const) {
        const fault = makeFault({ ...cls, source })
        const plain = await provider.draft(fault, { recentFaults: [] })
        const recurring = await provider.draft(fault, { recentFaults: earlier(fault, 3) })
        expect(ticketDraftInputSchema.safeParse(plain).success).toBe(true)
        expect(ticketDraftInputSchema.safeParse(recurring).success).toBe(true)
      }
    }
  })

  describe('recurrence', () => {
    it('escalates when this is the 3rd occurrence on the station within 24 h', async () => {
      expect(RECURRENCE_THRESHOLD).toBe(3)
      const fault = remoteFault()
      const draft = await provider.draft(fault, { recentFaults: earlier(fault, RECURRENCE_THRESHOLD - 1) })
      expect(draft.requiresSiteVisit).toBe(true)
      expect(draft.probableCause).toMatch(/recurr/i)
      expect(draft.probableCause).toContain('3')
      expect(draft.suggestedAction).toMatch(/site visit/i)
    })

    it('does not escalate for fewer occurrences', async () => {
      const fault = remoteFault()
      const draft = await provider.draft(fault, { recentFaults: earlier(fault, RECURRENCE_THRESHOLD - 2) })
      expect(draft.requiresSiteVisit).toBe(false)
      expect(draft.probableCause).not.toMatch(/recurr/i)
    })

    it('ignores occurrences older than 24 h', async () => {
      const fault = remoteFault()
      // The first is 12 h + 1 ms back, the others are older than 24 h.
      const old = earlier(fault, 5, RECURRENCE_WINDOW_MS / 2 + 1)
      const draft = await provider.draft(fault, { recentFaults: old })
      expect(draft.requiresSiteVisit).toBe(false)
    })

    it('counts the 24 h window up to and including its boundary', async () => {
      const fault = remoteFault()
      const atBoundary = [1, 2].map(() =>
        makeFault({
          stationId: fault.stationId,
          taxonomyCode: fault.taxonomyCode,
          occurredAt: new Date(fault.occurredAt.getTime() - RECURRENCE_WINDOW_MS),
        }),
      )
      const draft = await provider.draft(fault, { recentFaults: atBoundary })
      expect(draft.requiresSiteVisit).toBe(true)
    })

    it('ignores other taxonomy codes, other stations and the fault itself', async () => {
      const fault = remoteFault()
      const noise = [
        ...earlier(fault, 2).map((f) => Object.assign(f, { taxonomyCode: 'COM.BACKEND_LINK' })),
        ...earlier(fault, 2).map((f) => Object.assign(f, { stationId: 'st-002' })),
        fault,
        fault,
      ]
      const draft = await provider.draft(fault, { recentFaults: noise })
      expect(draft.requiresSiteVisit).toBe(false)
    })

    it('ignores faults that happened after this one', async () => {
      const fault = remoteFault()
      const later = [1, 2].map((i) =>
        makeFault({
          stationId: fault.stationId,
          taxonomyCode: fault.taxonomyCode,
          occurredAt: new Date(fault.occurredAt.getTime() + i * HOUR),
        }),
      )
      const draft = await provider.draft(fault, { recentFaults: later })
      expect(draft.requiresSiteVisit).toBe(false)
    })

    it('notes the recurrence on a fault that already needs a visit', async () => {
      const fault = makeFault()
      const draft = await provider.draft(fault, { recentFaults: earlier(fault, 4) })
      expect(draft.requiresSiteVisit).toBe(true)
      expect(draft.probableCause).toContain('5')
    })

    it('does not raise confidence or change the taxonomy code', async () => {
      const fault = makeFault({ source: 'unclassified', taxonomyCode: 'UNCLASSIFIED', component: 'unknown' })
      const draft = await provider.draft(fault, { recentFaults: earlier(fault, 3) })
      expect(draft).toMatchObject({ confidence: 0.3, taxonomyCode: 'UNCLASSIFIED' })
    })
  })
})
