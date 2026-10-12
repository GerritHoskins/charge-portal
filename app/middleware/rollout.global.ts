// A route rolled back to legacy (ADR 0005) has no Nuxt page for this user, so client-side
// navigation must become a full page load that the server proxies to legacy. Without this,
// clicking a NuxtLink would render the Nuxt page and ignore the rollback.
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return
  const prefixes = useState<string[]>('rollout-legacy', () => [])
  if (prefixes.value.some((p) => to.path === p || to.path.startsWith(`${p}/`))) {
    return navigateTo(to.fullPath, { external: true })
  }
})
