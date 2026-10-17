// Pure helpers behind `npm run migration:status`, kept separate so they can be unit tested.

export const STATUSES = ['migrated', 'legacy', 'stays-legacy', 'nuxt-native']

// Progress counts only routes that are meant to migrate; the legacy JSON API stays.
export const summarize = (routes) => {
  const count = (status) => routes.filter((r) => r.status === status).length
  const migrated = count('migrated')
  const remaining = count('legacy')
  const total = migrated + remaining
  return { migrated, remaining, staysLegacy: count('stays-legacy'), native: count('nuxt-native'), total, percent: total ? Math.round((migrated / total) * 100) : 100 }
}

// Returns a list of human-readable problems; empty means the inventory is consistent with the repo.
export const validate = (routes, { exists, pageFiles }) => {
  const problems = []
  const seen = new Set()
  for (const r of routes) {
    if (seen.has(r.path)) problems.push(`duplicate route ${r.path}`)
    seen.add(r.path)
    if (!STATUSES.includes(r.status)) problems.push(`${r.path}: unknown status "${r.status}"`)
    if (r.status === 'migrated' || r.status === 'nuxt-native') {
      if (!r.adr) problems.push(`${r.path}: migrated and nuxt-native routes must reference the ADR that decided it`)
      if (!r.files?.length) problems.push(`${r.path}: migrated and nuxt-native routes must list the files that implement them`)
      for (const f of r.files ?? []) if (!exists(f)) problems.push(`${r.path}: listed file ${f} does not exist`)
    }
  }
  const listed = new Set(routes.flatMap((r) => r.files ?? []))
  for (const page of pageFiles) if (!listed.has(page)) problems.push(`page ${page} is not in the inventory (add its route to docs/migration-routes.json)`)
  return problems
}
