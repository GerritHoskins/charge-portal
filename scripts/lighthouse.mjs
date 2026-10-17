// Runs Lighthouse CI against the production build: legacy stand-in + built Nuxt
// server, with an optional config and an explicitly cookie-free public mode.
// Needs `npm run build` first.
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { chromium } from '@playwright/test'

const LEGACY_PORT = Number(process.env.LIGHTHOUSE_LEGACY_PORT ?? 8080)
if (!Number.isInteger(LEGACY_PORT) || LEGACY_PORT < 1 || LEGACY_PORT > 65535) {
  throw new Error('LIGHTHOUSE_LEGACY_PORT must be an integer from 1 to 65535')
}
const LEGACY = `http://localhost:${LEGACY_PORT}`
const APP = 'http://localhost:3000'

const parseArgs = (args) => {
  let config
  let isPublic = false
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]
    if (argument === '--public') {
      isPublic = true
    } else if (argument === '--config') {
      config = args[++index]
      if (!config) throw new Error('--config requires a file')
    } else {
      throw new Error(`Unknown argument: ${argument}`)
    }
  }
  return { config, isPublic }
}

const children = []
const start = (cmd, args, env = {}) => {
  const childEnv = { ...process.env }
  for (const [name, value] of Object.entries(env)) {
    if (value === undefined) delete childEnv[name]
    else childEnv[name] = value
  }
  const child = spawn(cmd, args, { stdio: 'inherit', env: childEnv })
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

const isPortInUse = (port) => new Promise((resolve, reject) => {
  const server = createServer()
  server.unref()
  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE' || error.code === 'EACCES') resolve(true)
    else reject(error)
  })
  server.listen({ port, exclusive: true }, () => server.close(() => resolve(false)))
})

let code = 1
try {
  const { config, isPublic } = parseArgs(process.argv.slice(2))
  for (const [url, port] of [[LEGACY, LEGACY_PORT], [APP, 3000]]) {
    if (await isPortInUse(port)) {
      throw new Error(`${url} is already in use; a stale server would be measured instead of this build. Stop it first.`)
    }
  }
  start(process.execPath, ['legacy/server.mjs'], { LEGACY_PORT: String(LEGACY_PORT) })
  start(process.execPath, ['.output/server/index.mjs'], {
    PORT: '3000',
    NITRO_PORT: '3000',
    NUXT_LEGACY_ORIGIN: LEGACY,
  })
  await Promise.all([waitFor(`${LEGACY}/login`), waitFor(`${APP}/login`)])

  let cookie
  if (!isPublic) {
    const login = await fetch(`${LEGACY}/login`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: 'demo', password: 'demo-password', next: '/portal/stations' }),
    })
    cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ')
    if (!cookie) throw new Error('login failed: no session cookie')
  }

  const lighthouseArgs = ['node_modules/@lhci/cli/src/cli.js', 'autorun']
  if (config) lighthouseArgs.push('--config', config)
  const run = start(process.execPath, lighthouseArgs, {
    LH_COOKIE: isPublic ? undefined : cookie,
    CHROME_PATH: chromium.executablePath(),
  })
  code = await new Promise((resolve) => run.on('exit', (c) => resolve(c ?? 1)))
} catch (e) {
  console.error(e.message)
} finally {
  stop()
}
process.exit(code)
