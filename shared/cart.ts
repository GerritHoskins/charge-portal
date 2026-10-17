export type CartItem = {
  slug: string
  name: string
  priceCents: number
  quantity: number
}

export type CartProduct = Omit<CartItem, 'quantity'>

const MAX_QUANTITY = 10

const boundedQuantity = (quantity: number) => (
  Number.isFinite(quantity)
    ? Math.min(MAX_QUANTITY, Math.max(0, Math.trunc(quantity)))
    : 0
)

export const addItem = (items: CartItem[], product: CartProduct): CartItem[] => {
  const existing = items.find(({ slug }) => slug === product.slug)
  if (!existing) return [...items, { ...product, quantity: 1 }]

  return items.map((item) => (
    item.slug === product.slug
      ? { ...item, quantity: boundedQuantity(item.quantity + 1) }
      : item
  ))
}

export const setQuantity = (items: CartItem[], slug: string, quantity: number): CartItem[] => {
  const bounded = boundedQuantity(quantity)
  if (bounded === 0) return removeItem(items, slug)
  return items.map((item) => item.slug === slug ? { ...item, quantity: bounded } : item)
}

export const removeItem = (items: CartItem[], slug: string): CartItem[] => (
  items.filter((item) => item.slug !== slug)
)

export const totalCents = (items: CartItem[]): number => (
  items.reduce((total, item) => total + item.priceCents * item.quantity, 0)
)

export const itemCount = (items: CartItem[]): number => (
  items.reduce((total, item) => total + item.quantity, 0)
)
