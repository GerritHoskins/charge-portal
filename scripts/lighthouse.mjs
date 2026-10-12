// Runs Lighthouse CI against the production build: legacy stand-in + built Nuxt
// server (spawned without a shell so stop() really kills them), logged in through the real legacy login. Needs `npm run build` first.
import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'

const LEGACY = 'http://localhost:8080'
const APP = 'http://localhost:3000'

const children = []
const start = (cmd, args, env = {}) => {
  const child = spawn(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } })
  children.push(child)
  return child
}
const stop = () => children.forEach((c) => c.kill())

const waitFor = async (url) => {
  for (let i = 0; i < 60; i++) {
    if (await fetch(url, { redirect: 'manual' }).then(() => true, () => false)) return
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`${url} did not start`)
}

let code = 1
try {
  for (const url of [LEGACY, APP]) {
    if (await fetch(url, { redirect: 'manual' }).then(() => true, () => false)) {
      throw new Error(`${url} is already in use; a stale server would be measured instead of this build. Stop it first.`)
    }
  }
  start(process.execPath, ['legacy/server.mjs'])
  start(process.execPath, ['.output/server/index.mjs'], { PORT: '3000', NITRO_PORT: '3000' })
  await Promise.all([waitFor(`${LEGACY}/login`), waitFor(`${APP}/login`)])

  const login = await fetch(`${LEGACY}/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: 'demo', password: 'demo-password', next: '/portal/stations' }),
  })
  const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ')
  if (!cookie) throw new Error('login failed: no session cookie')

  const run = start(process.execPath, ['node_modules/@lhci/cli/src/cli.js', 'autorun'], { LH_COOKIE: cookie, CHROME_PATH: chromium.executablePath() })
  code = await new Promise((resolve) => run.on('exit', (c) => resolve(c ?? 1)))
} catch (e) {
  console.error(e.message)
} finally {
  stop()
}
process.exit(code)
