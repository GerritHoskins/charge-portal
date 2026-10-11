import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const STORYBOOK = 'http://localhost:6006'
const stories = ['available', 'charging', 'faulted', 'offline']

// Every design-system story must be AA-clean in every tenant theme, so a token
// change that breaks contrast fails here before it reaches a page.
for (const tenant of ['default', 'stadtwerke-demo', 'fleet-demo']) {
  for (const story of stories) {
    test(`StatusBadge/${story} passes axe (${tenant})`, async ({ page }) => {
      await page.goto(`${STORYBOOK}/iframe.html?id=design-system-statusbadge--${story}&viewMode=story&globals=tenant:${tenant}`)
      await expect(page.locator('.ds-badge')).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('data-tenant', tenant)
      const results = await new AxeBuilder({ page }).include('#storybook-root').withTags(['wcag2aa']).analyze()
      expect(results.violations).toEqual([])
    })
  }
}
