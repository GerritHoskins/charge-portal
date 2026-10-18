type ShopTelemetryEndpoint = '/api/events' | '/api/vitals'

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
  cancelIdleCallback?: (id: number) => void
}

const queue: Array<[ShopTelemetryEndpoint, string]> = []
let initialized = false
let startupOpen = false
let startupTimer: number | undefined
let idleTimer: number | undefined
let idleCallback: number | undefined

const sendNow = (endpoint: ShopTelemetryEndpoint, body: string): void => {
  try {
    if (navigator.sendBeacon(endpoint, body)) return
  } catch {
    // Fall back to a keepalive request when beacon delivery is unavailable.
  }

  try {
    void fetch(endpoint, {
      method: 'POST',
      body,
      headers: { 'content-type': 'text/plain' },
      keepalive: true,
      credentials: 'omit',
    }).catch(() => undefined)
  } catch {
    // Telemetry must not interfere with the shop if transport setup itself fails.
  }
}

const cancelScheduledDelivery = (): void => {
  window.clearTimeout(startupTimer as number)
  window.clearTimeout(idleTimer as number)
  if (idleCallback !== undefined) (window as IdleWindow).cancelIdleCallback?.(idleCallback)
  startupTimer = idleTimer = idleCallback = undefined
}

const drainQueue = (): void => {
  const pending = queue.splice(0)
  for (const [endpoint, body] of pending) sendNow(endpoint, body)
}

const flush = (): void => {
  startupOpen = true
  cancelScheduledDelivery()
  drainQueue()
}

const scheduleIdleFlush = (): void => {
  if (!queue.length) return
  const idleWindow = window as IdleWindow
  if (idleWindow.requestIdleCallback) {
    idleCallback = idleWindow.requestIdleCallback(() => {
      idleCallback = undefined
      flush()
    }, { timeout: 500 })
  } else {
    idleTimer = window.setTimeout(() => {
      idleTimer = undefined
      flush()
    }, 0)
  }
}

const openAfterLoad = (): void => {
  if (startupOpen) return
  startupTimer = window.setTimeout(() => {
    startupTimer = undefined
    startupOpen = true
    scheduleIdleFlush()
  }, 250)
}

const initialize = (): void => {
  if (initialized) return
  initialized = true
  if (document.visibilityState === 'hidden') {
    flush()
    return
  }

  if (document.readyState === 'complete') {
    openAfterLoad()
  } else {
    window.addEventListener('load', openAfterLoad, { once: true })
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
  window.addEventListener('pagehide', flush)
}

export const sendShopTelemetry = (
  endpoint: ShopTelemetryEndpoint,
  serializedBody: string,
  immediate = false,
): void => {
  if (immediate) {
    initialize()
    flush()
    sendNow(endpoint, serializedBody)
    return
  }

  if (startupOpen && queue.length === 0) {
    sendNow(endpoint, serializedBody)
    return
  }

  queue.push([endpoint, serializedBody])
  initialize()
}
