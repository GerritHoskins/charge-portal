import {
  addItem as addCartItem,
  itemCount as countCartItems,
  removeItem as removeCartItem,
  setQuantity as setCartQuantity,
  totalCents as sumCartCents,
  type CartItem,
  type CartProduct,
} from '#shared/cart'

const CART_STORAGE_KEY = 'charge-portal-cart'

const isStoredCartItem = (value: unknown): value is CartItem => {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<CartItem>
  return typeof item.slug === 'string'
    && item.slug.length > 0
    && typeof item.name === 'string'
    && item.name.length > 0
    && Number.isInteger(item.priceCents)
    && Number(item.priceCents) >= 0
    && Number.isInteger(item.quantity)
    && Number(item.quantity) >= 1
    && Number(item.quantity) <= 10
}

export const useCart = () => {
  const items = useState<CartItem[]>('cart', () => [])
  const hydrated = useState<boolean>('cart-hydrated', () => false)

  const persist = () => {
    if (!import.meta.client) return
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items.value))
    } catch {
      // Storage can be unavailable (privacy mode or quota); the in-memory cart still works.
    }
  }

  onMounted(() => {
    if (hydrated.value) return
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY)
      if (stored) {
        const parsed: unknown = JSON.parse(stored)
        if (Array.isArray(parsed)) items.value = parsed.filter(isStoredCartItem)
      }
    } catch {
      // Ignore malformed or inaccessible storage and keep the empty SSR cart.
    } finally {
      hydrated.value = true
    }
  })

  return {
    items,
    hydrated: readonly(hydrated),
    itemCount: computed(() => countCartItems(items.value)),
    totalCents: computed(() => sumCartCents(items.value)),
    addItem: (product: CartProduct) => {
      items.value = addCartItem(items.value, product)
      persist()
    },
    setQuantity: (slug: string, quantity: number) => {
      items.value = setCartQuantity(items.value, slug, quantity)
      persist()
    },
    removeItem: (slug: string) => {
      items.value = removeCartItem(items.value, slug)
      persist()
    },
  }
}
