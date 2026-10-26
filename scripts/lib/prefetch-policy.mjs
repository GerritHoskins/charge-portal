// Chunks Nuxt would otherwise prefetch on every page although a successful shop view never runs
// them: the built-in error pages, and the portal layout (the shop has its own and no portal link).
// The route budgets count every JS file a page loads (ADR 0007), so these hints cost each shop
// route about 3.7 KB gz. They still load on demand when an error or a portal page needs them.
export const NO_PREFETCH = Object.freeze([
  'nuxt/dist/app/components/error-404.vue',
  'nuxt/dist/app/components/error-500.vue',
  'layouts/default.vue',
])

const matches = (key) => {
  const path = key.replaceAll('\\', '/')
  return NO_PREFETCH.some((suffix) => path === suffix || path.endsWith(`/${suffix}`))
}

// Mutates the client manifest passed to Nuxt's `build:manifest` hook; returns the changed keys.
export const applyPrefetchPolicy = (manifest) => {
  const changed = Object.keys(manifest).filter(matches)
  for (const key of changed) manifest[key].prefetch = false
  return changed
}
