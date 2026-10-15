// CSRF token for the plain HTML forms (login, logout). Minted by server/middleware/csrf.ts
// during SSR and carried to the client in the Nuxt payload; the matching cookie is HttpOnly.
export const useCsrfToken = () =>
  useState<string>('csrf-token', () =>
    import.meta.server ? ((useRequestEvent()?.context as { csrfToken?: string } | undefined)?.csrfToken ?? '') : '',
  )
