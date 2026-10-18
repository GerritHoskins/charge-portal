import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Listener = () => void
type FakeLifecycle = {
  readyState: DocumentReadyState
  visibilityState: DocumentVisibilityState
  handlers: Map<string, Set<Listener>>
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
  cancelIdleCallback?: (id: number) => void
  setTimeout: typeof window.setTimeout
  clearTimeout: typeof window.clearTimeout
  addEventListener: (type: string, listener: Listener) => void
  dispatch: (type: string) => void
}

const makeLifecycle = (readyState: DocumentReadyState = 'loading'): FakeLifecycle => {
  const handlers = new Map<string, Set<Listener>>()
  const timerWindow = window
  return {
    readyState,
    visibilityState: 'visible',
    handlers,
    setTimeout: timerWindow.setTimeout.bind(timerWindow),
    clearTimeout: timerWindow.clearTimeout.bind(timerWindow),
    addEventListener(type, listener) {
      const listeners = handlers.get(type) ?? new Set<Listener>()
      listeners.add(listener)
      handlers.set(type, listeners)
    },
    dispatch(type) {
      for (const listener of handlers.get(type) ?? []) listener()
    },
  }
}

describe('shop telemetry transport', () => {
  let documentState: FakeLifecycle
  let windowState: FakeLifecycle
  let sendBeacon: ReturnType<typeof vi.fn>
  let fetchFallback: ReturnType<typeof vi.fn>
  let sendShopTelemetry: (endpoint: '/api/events' | '/api/vitals', body: string, immediate?: boolean) => void

  beforeEach(async () => {
    vi.useFakeTimers()
    documentState = makeLifecycle()
    windowState = makeLifecycle()
    sendBeacon = vi.fn(() => true)
    fetchFallback = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })))
    vi.stubGlobal('document', documentState)
    vi.stubGlobal('window', windowState)
    vi.stubGlobal('navigator', { sendBeacon })
    fetchFallback.mockRejectedValue(new Error('network unavailable'))
    vi.stubGlobal('fetch', fetchFallback)
    vi.resetModules()
    ;({ sendShopTelemetry } = await import('../../app/utils/shop-telemetry-transport'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('waits for load, then the settling window and idle fallback before delivering queued snapshots in order', () => {
    sendShopTelemetry('/api/vitals', '{"name":"LCP","value":1}')
    sendShopTelemetry('/api/events', '{"type":"listing_view","route":"/shop/c/wallboxes","tabId":"tab-123"}')
    expect(sendBeacon).not.toHaveBeenCalled()

    windowState.dispatch('load')
    vi.advanceTimersByTime(249)
    expect(sendBeacon).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(sendBeacon).not.toHaveBeenCalled()
    vi.runOnlyPendingTimers()

    expect(sendBeacon.mock.calls.map(([endpoint, body]) => [endpoint, body])).toEqual([
      ['/api/vitals', '{"name":"LCP","value":1}'],
      ['/api/events', '{"type":"listing_view","route":"/shop/c/wallboxes","tabId":"tab-123"}'],
    ])
  })

  it('uses requestIdleCallback with a bounded timeout and cancels pending idle work on hidden flush', () => {
    let runIdle: (() => void) | undefined
    windowState.requestIdleCallback = vi.fn((callback, options) => {
      runIdle = callback
      expect(options).toEqual({ timeout: 500 })
      return 17
    })
    windowState.cancelIdleCallback = vi.fn()

    sendShopTelemetry('/api/vitals', '{"name":"LCP","value":4}')
    windowState.dispatch('load')
    vi.advanceTimersByTime(250)
    expect(windowState.requestIdleCallback).toHaveBeenCalledTimes(1)
    expect(sendBeacon).not.toHaveBeenCalled()

    documentState.visibilityState = 'hidden'
    documentState.dispatch('visibilitychange')
    expect(windowState.cancelIdleCallback).toHaveBeenCalledWith(17)
    expect(sendBeacon).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)

    runIdle?.()
    expect(sendBeacon).toHaveBeenCalledTimes(1)
  })

  it('starts the settling window when the module is first used after document load', () => {
    documentState.readyState = 'complete'
    sendShopTelemetry('/api/events', '{"type":"product_view"}')

    vi.advanceTimersByTime(249)
    expect(sendBeacon).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    vi.runOnlyPendingTimers()
    expect(sendBeacon).toHaveBeenCalledTimes(1)

    sendShopTelemetry('/api/events', '{"type":"product_view","route":"/shop/charger","tabId":"tab-456"}')
    expect(sendBeacon).toHaveBeenCalledTimes(2)
    expect(sendBeacon.mock.calls[1]?.[1]).toBe('{"type":"product_view","route":"/shop/charger","tabId":"tab-456"}')
  })

  it('flushes queued records on hidden and pagehide, then delivers late callbacks without waiting', () => {
    sendShopTelemetry('/api/vitals', '{"name":"LCP","value":2}')
    documentState.visibilityState = 'hidden'
    documentState.dispatch('visibilitychange')
    expect(sendBeacon).toHaveBeenCalledTimes(1)
    documentState.dispatch('visibilitychange')
    windowState.dispatch('pagehide')
    expect(sendBeacon).toHaveBeenCalledTimes(1)

    sendShopTelemetry('/api/vitals', '{"name":"CLS","value":0.1}')
    windowState.dispatch('pagehide')
    expect(sendBeacon).toHaveBeenCalledTimes(2)
    windowState.dispatch('pagehide')
    expect(sendBeacon).toHaveBeenCalledTimes(2)

    sendShopTelemetry('/api/vitals', '{"name":"FCP","value":3}')
    expect(sendBeacon).toHaveBeenCalledTimes(3)
  })

  it('flushes queued snapshots before an immediate action and sends subsequent records normally', () => {
    sendShopTelemetry('/api/events', '{"type":"listing_view","route":"/shop/c/wallboxes","tabId":"tab-123"}')
    sendShopTelemetry('/api/events', '{"type":"add_to_cart","route":"/shop/c/wallboxes","tabId":"tab-123"}', true)
    expect(sendBeacon.mock.calls.map(([endpoint, body]) => [endpoint, body])).toEqual([
      ['/api/events', '{"type":"listing_view","route":"/shop/c/wallboxes","tabId":"tab-123"}'],
      ['/api/events', '{"type":"add_to_cart","route":"/shop/c/wallboxes","tabId":"tab-123"}'],
    ])

    sendShopTelemetry('/api/events', '{"type":"product_view"}')
    expect(sendBeacon).toHaveBeenCalledTimes(3)
    expect(sendBeacon.mock.calls[2]?.[1]).toBe('{"type":"product_view"}')
  })

  it('uses fetch fallback when sendBeacon returns false or throws and ignores fallback rejection', async () => {
    sendBeacon.mockReturnValueOnce(false)
    sendShopTelemetry('/api/events', '{"type":"listing_view"}', true)
    sendBeacon.mockImplementationOnce(() => { throw new Error('beacon unavailable') })
    sendShopTelemetry('/api/vitals', '{"name":"LCP"}', true)

    expect(fetchFallback).toHaveBeenNthCalledWith(1, '/api/events', expect.objectContaining({
      method: 'POST',
      body: '{"type":"listing_view"}',
      keepalive: true,
      credentials: 'omit',
    }))
    expect(fetchFallback).toHaveBeenNthCalledWith(2, '/api/vitals', expect.objectContaining({
      method: 'POST',
      body: '{"name":"LCP"}',
      keepalive: true,
      credentials: 'omit',
    }))
    await Promise.resolve()
  })
})
