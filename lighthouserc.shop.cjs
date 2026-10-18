// Public-shop hard gates. WP-25 promotes the measured performance warnings to errors.
const BASE = 'http://localhost:3000'

module.exports = {
  ci: {
    collect: {
      url: [
        '/shop/c/wallboxes',
        '/shop/c/wallboxes?connector=ccs',
        '/shop/ladekabel-typ-1-10-m',
        '/shop/cart',
      ].map((path) => BASE + path),
      numberOfRuns: 5,
      settings: {
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        chromeFlags: '--no-sandbox --headless=new',
      },
    },
    assert: {
      aggregationMethod: 'median-run',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 1 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci-shop' },
  },
}
