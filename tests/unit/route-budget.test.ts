import { describe, expect, it } from 'vitest'

// @ts-expect-error The budget helper is an intentionally plain Node.js module.
import {
  evaluate,
  parseLegacyPort,
  parseBudgets,
  REQUIRED_ROUTES,
  validateBudgetCoverage,
} from '../../scripts/lib/route-budget.mjs'

describe('route budget evaluation', () => {
  const budgets = {
    '/under': { budgetKb: 100, provisional: false },
    '/equal': { budgetKb: 100, provisional: false },
    '/over': { budgetKb: 100, provisional: true },
  }

  it('reports measurements below, at, and above their budgets', () => {
    expect(evaluate([
      { route: '/under', kb: 99.9 },
      { route: '/equal', kb: 100 },
      { route: '/over', kb: 100.1 },
    ], budgets)).toEqual([
      { route: '/under', kb: 99.9, budgetKb: 100, ok: true },
      { route: '/equal', kb: 100, budgetKb: 100, ok: true },
      { route: '/over', kb: 100.1, budgetKb: 100, ok: false },
    ])
  })

  it('reports a measured route with no budget as an error', () => {
    expect(evaluate([{ route: '/missing', kb: 42 }], budgets)).toEqual([
      { route: '/missing', kb: 42, budgetKb: null, ok: false },
    ])
  })
})

describe('route budget parsing', () => {
  const input = {
    '/portal/stations': 115,
    '/shop/cart': { budgetKb: 98.5, provisional: true },
  }

  it('parses JSON and normalizes shorthand numeric budgets', () => {
    expect(parseBudgets(JSON.stringify(input))).toEqual({
      '/portal/stations': { budgetKb: 115, provisional: false },
      '/shop/cart': { budgetKb: 98.5, provisional: true },
    })
  })

  it('accepts an already parsed object', () => {
    expect(parseBudgets(input)).toEqual({
      '/portal/stations': { budgetKb: 115, provisional: false },
      '/shop/cart': { budgetKb: 98.5, provisional: true },
    })
  })

  it.each([
    ['not JSON'],
    [JSON.stringify({ relative: 10 })],
    [JSON.stringify({ '/negative': -1 })],
    [JSON.stringify({ '/missing-number': { provisional: true } })],
  ])('rejects an invalid budget definition', (value) => {
    expect(() => parseBudgets(value)).toThrow()
  })
})

describe('route budget legacy port parsing', () => {
  it('defaults to 8080 and accepts an explicit isolated port', () => {
    expect(parseLegacyPort(undefined)).toBe(8080)
    expect(parseLegacyPort('18081')).toBe(18081)
  })

  it.each(['', ' ', 'not-a-port', '0', '65536', '1.5'])(
    'rejects invalid ROUTE_BUDGET_LEGACY_PORT value %j',
    (value) => {
      expect(() => parseLegacyPort(value)).toThrow(
        'ROUTE_BUDGET_LEGACY_PORT must be an integer from 1 to 65535',
      )
    },
  )
})

describe('required route budget coverage', () => {
  const allBudgets = Object.fromEntries(
    REQUIRED_ROUTES.map((route: string) => [route, { budgetKb: 120, provisional: false }]),
  )

  it('defines the nine representative routes independently of threshold configuration', () => {
    expect(REQUIRED_ROUTES).toEqual([
      '/portal/stations',
      '/portal/sessions',
      '/portal/invoices',
      '/portal/invoices/inv-0042/dispute',
      '/portal/triage',
      '/portal/triage/3f0c2a8e-6a55-4a5e-9a3c-0d1f6f1d2b10',
      '/shop/c/wallboxes',
      '/shop/wallbox-home-7-4',
      '/shop/cart',
    ])
  })

  it('keeps measuring and reports a required route omitted from the budget file', () => {
    const omittedRoute = '/portal/sessions'
    const budgets = { ...allBudgets }
    delete budgets[omittedRoute]

    expect(validateBudgetCoverage(budgets)).toEqual([omittedRoute])

    const results = evaluate(
      REQUIRED_ROUTES.map((route: string) => ({ route, kb: 100 })),
      budgets,
    )
    expect(results).toHaveLength(REQUIRED_ROUTES.length)
    expect(results.map(({ route }: { route: string }) => route)).toEqual(REQUIRED_ROUTES)
    expect(results.filter(({ ok }: { ok: boolean }) => !ok)).toHaveLength(1)
    expect(results.find(({ route }: { route: string }) => route === omittedRoute)).toEqual({
      route: omittedRoute,
      kb: 100,
      budgetKb: null,
      ok: false,
    })
  })

  it('rejects extra budget keys in deterministic sorted order', () => {
    const budgets = {
      ...allBudgets,
      '/z-stale': 100,
      '/a-stale': 100,
    }

    expect(() => validateBudgetCoverage(budgets)).toThrow(
      'Unexpected route budgets: /a-stale, /z-stale',
    )
  })
})
