// Public-shop hard gates. WP-25 promotes the measured performance warnings to errors.
const BASE = 'http://localhost:3000'
const ROUTES = [
  '/shop/c/wallboxes',
  '/shop/c/wallboxes?connector=ccs',
  '/shop/ladekabel-typ-1-10-m',
  '/shop/cart',
]
const assertions = {
  'categories:performance': ['error', { minScore: 0.9 }],
  'categories:accessibility': ['error', { minScore: 1 }],
  'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
  'total-blocking-time': ['error', { maxNumericValue: 300 }],
}

module.exports = {
  ci: {
    collect: {
      url: ROUTES.map((path) => BASE + path),
      numberOfRuns: 5,
      settings: {
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        chromeFlags: '--no-sandbox --headless=new',
      },
    },
    assert: {
      assertMatrix: ROUTES.map((path) => ({
        matchingUrlPattern: `^${(BASE + path).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
        aggregationMethod: 'median-run',
        assertions: {
          ...assertions,
          // Explicit human acceptance, 2026-10-18: only the filtered route may use 2.60s.
          'largest-contentful-paint': ['error', { maxNumericValue: path === '/shop/c/wallboxes?connector=ccs' ? 2600 : 2500 }],
        },
      })),
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci-shop' },
  },
}
