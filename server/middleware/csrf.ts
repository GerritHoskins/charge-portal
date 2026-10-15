// Gives every HTML page request a CSRF token (cookie + value for the forms in the page).
// Only document navigations: assets, payload JSON and API calls never get one.
export default defineEventHandler((event) => {
  if (event.method !== 'GET') return
  const { pathname } = getRequestURL(event)
  if (pathname.startsWith('/api/') || pathname.startsWith('/_nuxt/') || pathname.startsWith('/__')) return
  if (!getRequestHeader(event, 'accept')?.includes('text/html')) return
  ensureCsrfToken(event)
})
