import { expect, test } from '@playwright/test'

test.describe('public shop security boundary', () => {
  test('keeps private BFF endpoints guarded for a logged-out request', async ({ request }) => {
    expect((await request.get('/api/me')).status()).toBe(401)
  })
})
