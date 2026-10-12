// Lighthouse CI config. Run through `npm run lighthouse` (scripts/lighthouse.mjs),
// which starts the production build + legacy stand-in and passes a logged-in
// session cookie in LH_COOKIE (the portal redirects anonymous users to /login).
const BASE = 'http://localhost:3000'

module.exports = {
  ci: {
    collect: {
      url: ['/portal/stations', '/portal/sessions', '/portal/invoices', '/portal/invoices/inv-0042/dispute'].map((p) => BASE + p),
      numberOfRuns: 3, // medians damp noise; Lighthouse default is mobile emulation + throttling
      settings: {
        extraHeaders: JSON.stringify({ cookie: process.env.LH_COOKIE ?? '' }),
        onlyCategories: ['performance', 'accessibility', 'best-practices'],
        chromeFlags: '--no-sandbox --headless=new',
      },
    },
    assert: {
      aggregationMethod: 'median-run', // default is 'optimistic' (best run), which hides regressions
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 1 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        // Core Web Vitals (lab). Thresholds are Google's "good" boundaries.
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
}
