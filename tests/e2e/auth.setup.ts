import { expect, test as setup } from '@playwright/test'
import { AUTH_STATE } from '../../playwright.config'
import { DEMO_LOGIN } from './demo-login'

setup('log in through the legacy form', async ({ page }) => {
  await page.goto('/login?next=/portal/stations')
  await page.getByLabel('User').fill(DEMO_LOGIN.username)
  await page.getByLabel('Password').fill(DEMO_LOGIN.password)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page).toHaveURL('/portal/stations')
  await page.context().storageState({ path: AUTH_STATE })
})
