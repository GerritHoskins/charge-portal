import { STUB_TICKET_ID } from './triage-stub.mjs'

export const REQUIRED_ROUTES = Object.freeze([
  '/portal/stations',
  '/portal/sessions',
  '/portal/invoices',
  '/portal/invoices/inv-0042/dispute',
  '/portal/triage',
  `/portal/triage/${STUB_TICKET_ID}`,
  '/shop/c/wallboxes',
  '/shop/wallbox-home-7-4',
  '/shop/cart',
])

export const parseLegacyPort = (value) => {
  const message = 'ROUTE_BUDGET_LEGACY_PORT must be an integer from 1 to 65535'
  if (value === undefined) return 8080
  if (typeof value !== 'string' || value.trim() === '') throw new Error(message)

  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(message)
  return port
}

const normalizeBudget = (route, value) => {
  if (!route.startsWith('/')) throw new Error(`Route budget key must start with "/": ${route}`)

  const definition = typeof value === 'number'
    ? { budgetKb: value, provisional: false }
    : value

  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
    throw new Error(`Budget for ${route} must be a number or object`)
  }
  if (!Number.isFinite(definition.budgetKb) || definition.budgetKb < 0) {
    throw new Error(`Budget for ${route} must have a non-negative finite budgetKb`)
  }
  if (definition.provisional !== undefined && typeof definition.provisional !== 'boolean') {
    throw new Error(`Budget for ${route} has a non-boolean provisional flag`)
  }

  return {
    budgetKb: definition.budgetKb,
    provisional: definition.provisional ?? false,
  }
}

export const parseBudgets = (envOrJson) => {
  const input = typeof envOrJson === 'string' ? JSON.parse(envOrJson) : envOrJson
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Route budgets must be a JSON object')
  }

  return Object.fromEntries(
    Object.entries(input).map(([route, value]) => [route, normalizeBudget(route, value)]),
  )
}

export const validateBudgetCoverage = (budgets) => {
  const parsedBudgets = parseBudgets(budgets)
  const required = new Set(REQUIRED_ROUTES)
  const extras = Object.keys(parsedBudgets)
    .filter((route) => !required.has(route))
    .sort()
  if (extras.length > 0) throw new Error(`Unexpected route budgets: ${extras.join(', ')}`)

  return REQUIRED_ROUTES.filter((route) => parsedBudgets[route] === undefined)
}

export const evaluate = (measurements, budgets) => {
  if (!Array.isArray(measurements)) throw new Error('Measurements must be an array')
  const parsedBudgets = parseBudgets(budgets)

  return measurements.map(({ route, kb }) => {
    if (typeof route !== 'string' || !route.startsWith('/')) {
      throw new Error(`Invalid measured route: ${String(route)}`)
    }
    if (!Number.isFinite(kb) || kb < 0) {
      throw new Error(`Invalid measurement for ${route}: ${String(kb)}`)
    }

    const budgetKb = parsedBudgets[route]?.budgetKb ?? null
    return { route, kb, budgetKb, ok: budgetKb !== null && kb <= budgetKb }
  })
}
