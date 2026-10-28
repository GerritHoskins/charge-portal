import { describe, expect, it } from 'vitest'
import { assessRun, type LiveOutcome, MIN_TAXONOMY_AGREEMENT } from '../live/assess-run'

function outcome(overrides: Partial<LiveOutcome> = {}): LiveOutcome {
  return {
    fixture: 'fixture-1',
    expectedTaxonomyCode: 'POWER.LOSS',
    result: 'claude',
    taxonomyCode: 'POWER.LOSS',
    confidence: 0.9,
    ms: 100,
    ...overrides,
  }
}

function agreement(matches: number, total: number): LiveOutcome[] {
  return Array.from({ length: total }, (_, index) => outcome({
    fixture: `fixture-${index + 1}`,
    taxonomyCode: index < matches ? 'POWER.LOSS' : 'COMMS.LOSS',
  }))
}

describe('assessRun', () => {
  it('passes all-Claude outcomes with full taxonomy agreement', () => {
    expect(assessRun(agreement(3, 3))).toEqual({ pass: true, problems: [] })
  })

  it('reports a fallback with its fixture and reason', () => {
    expect(assessRun([outcome(), outcome({ fixture: 'fixture-2', result: 'timeout' })])).toEqual({
      pass: false,
      problems: ['fixture-2: fell back to rules (timeout)'],
    })
  })

  it('explains the ADR 0010 assumption when the API returns 400', () => {
    const verdict = assessRun([outcome({ result: 'api-error-400' })])
    expect(verdict.pass).toBe(false)
    expect(verdict.problems).toHaveLength(1)
    expect(verdict.problems[0]).toContain('fixture-1: fell back to rules (api-error-400)')
    expect(verdict.problems[0]).toContain("contradicts ADR 0010's non-forced tool_choice assumption for the configured model")
  })

  it('passes taxonomy agreement exactly at the 0.8 threshold', () => {
    expect(MIN_TAXONOMY_AGREEMENT).toBe(0.8)
    expect(assessRun(agreement(8, 10))).toEqual({ pass: true, problems: [] })
  })

  it('reports agreement just below the threshold and every mismatch', () => {
    expect(assessRun(agreement(7, 10))).toEqual({
      pass: false,
      problems: [
        'taxonomy agreement 7/10 below 0.8',
        'fixture-8: expected POWER.LOSS, got COMMS.LOSS',
        'fixture-9: expected POWER.LOSS, got COMMS.LOSS',
        'fixture-10: expected POWER.LOSS, got COMMS.LOSS',
      ],
    })
  })

  it('fails when there are no outcomes', () => {
    expect(assessRun([])).toEqual({ pass: false, problems: ['no live outcomes recorded'] })
  })

  it.each([-0.1, 1.1, NaN, Infinity, -Infinity, undefined])('rejects confidence %s', (confidence) => {
    expect(assessRun([outcome({ confidence })])).toEqual({
      pass: false,
      problems: [`fixture-1: invalid confidence ${confidence}`],
    })
  })

  it.each([0, 1])('accepts confidence at the boundary %s', (confidence) => {
    expect(assessRun([outcome({ confidence })])).toEqual({ pass: true, problems: [] })
  })

  it.each([undefined, ''])('rejects missing taxonomyCode %s', (taxonomyCode) => {
    expect(assessRun([outcome({ taxonomyCode })])).toEqual({
      pass: false,
      problems: [
        'fixture-1: missing taxonomyCode',
        'taxonomy agreement 0/1 below 0.8',
        `fixture-1: expected POWER.LOSS, got ${taxonomyCode}`,
      ],
    })
  })

  it('reports every fallback without judging Claude fields or taxonomy agreement', () => {
    expect(assessRun([
      outcome({ result: 'timeout', confidence: undefined, taxonomyCode: undefined }),
      outcome({ fixture: 'fixture-2', result: 'refusal', confidence: undefined, taxonomyCode: undefined }),
    ])).toEqual({
      pass: false,
      problems: ['fixture-1: fell back to rules (timeout)', 'fixture-2: fell back to rules (refusal)'],
    })
  })

  it('calculates taxonomy agreement over Claude outcomes only', () => {
    expect(assessRun([
      ...agreement(4, 5),
      outcome({ fixture: 'fallback', result: 'api-error', taxonomyCode: undefined }),
    ])).toEqual({ pass: false, problems: ['fallback: fell back to rules (api-error)'] })
  })

  it('does not judge site visits or elapsed time', () => {
    expect(assessRun([
      outcome({ requiresSiteVisit: true, ms: 100_000 }),
      outcome({ fixture: 'fixture-2', requiresSiteVisit: false, ms: 0 }),
    ])).toEqual({ pass: true, problems: [] })
  })
})
