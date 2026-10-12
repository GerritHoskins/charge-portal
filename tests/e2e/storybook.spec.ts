import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const STORYBOOK = 'http://localhost:6006'

// [story id prefix, stories, a selector that proves the story rendered]
const components: [string, string[], string][] = [
  ['design-system-statusbadge', ['available', 'charging', 'faulted', 'offline'], '.ds-badge'],
  ['design-system-button', ['primary', 'secondary', 'disabled'], '.ds-button'],
  ['design-system-alert', ['error', 'info'], '.ds-alert'],
  ['design-system-textfield', ['default', 'with-hint', 'with-error', 'multiline'], '.ds-field'],
  ['design-system-datatable', ['default'], '.ds-table'],
]

// Every design-system story must be AA-clean in every tenant theme, so a token
// change that breaks contrast fails here before it reaches a page.
for (const tenant of ['default', 'stadtwerke-demo', 'fleet-demo']) {
  for (const [prefix, stories, selector] of components) {
    for (const story of stories) {
      test(`${prefix}/${story} passes axe (${tenant})`, async ({ page }) => {
        await page.goto(`${STORYBOOK}/iframe.html?id=${prefix}--${story}&viewMode=story&globals=tenant:${tenant}`)
        await expect(page.locator(selector)).toBeVisible()
        await expect(page.locator('html')).toHaveAttribute('data-tenant', tenant)
        const results = await new AxeBuilder({ page }).include('#storybook-root').withTags(['wcag2aa']).analyze()
        expect(results.violations).toEqual([])
      })
    }
  }
}
