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
