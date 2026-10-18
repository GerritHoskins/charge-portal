import type { ShopEvent, ShopEventType } from '#shared/contracts/events'
import { sendShopTelemetry } from '../utils/shop-telemetry-transport'

const TAB_ID_KEY = 'charge-portal-shop-tab-id'
let fallbackTabId: string | undefined

const tabId = (): string => {
  try {
    const stored = sessionStorage.getItem(TAB_ID_KEY)
    if (stored && stored.length <= 64) return stored

    const created = crypto.randomUUID()
    sessionStorage.setItem(TAB_ID_KEY, created)
    return created
  } catch {
    fallbackTabId ??= crypto.randomUUID()
    return fallbackTabId
  }
}

export const useShopEvents = () => {
  const route = useRoute()

  const track = (type: ShopEventType): void => {
    if (!import.meta.client || !route.path.startsWith('/shop')) return

    // Demo telemetry only: the per-tab random id stays in sessionStorage; no identity or cookies are stored.
    const payload: ShopEvent = { type, route: route.path, tabId: tabId() }
    const body = JSON.stringify(payload)
    sendShopTelemetry('/api/events', body, type === 'add_to_cart')
  }

  return { track }
}
