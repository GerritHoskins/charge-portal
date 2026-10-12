import { describe, expect, it } from 'vitest'
import { validateDispute } from '#shared/contracts/dispute-rules'
import { disputeInputSchema } from '#shared/contracts/invoice'

// Form inputs are always strings; wrong types are only possible on the API, where zod alone runs.
// The browser uses the dependency-free rules, the server uses zod. They must agree.
const cases = [
  { reason: 'wrong-amount', message: 'Der Betrag stimmt nicht.' },
  { reason: 'wrong-amount', message: '  kurz  ' },
  { reason: 'wrong-amount', message: '          ' },
  { reason: 'wrong-amount', message: 'x'.repeat(500) },
  { reason: 'wrong-amount', message: 'x'.repeat(501) },
  { reason: 'bored', message: 'Der Betrag stimmt nicht.' },
  { reason: '', message: '' },
]

describe('dispute rules: browser validator vs zod schema', () => {
  for (const input of cases) {
    it(`agree on ${JSON.stringify(input).slice(0, 60)}`, () => {
      const rules = validateDispute(input)
      const zod = disputeInputSchema.safeParse(input)
      expect(!!rules.value).toBe(zod.success)
      if (zod.success) expect(rules.value).toEqual(zod.data)
      else {
        const zodFields = Object.fromEntries(zod.error.issues.map((i) => [String(i.path[0]), i.message]))
        expect(rules.fields).toEqual(zodFields)
      }
    })
  }
})
