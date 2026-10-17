import { describe, expect, it } from 'vitest'
import {
  addItem,
  itemCount,
  removeItem,
  setQuantity,
  totalCents,
  type CartItem,
} from '#shared/cart'

const wallbox: Omit<CartItem, 'quantity'> = {
  slug: 'wallbox-home-11',
  name: 'Wallbox Home 11',
  priceCents: 49999,
}

const cable: Omit<CartItem, 'quantity'> = {
  slug: 'ladekabel-typ-2',
  name: 'Ladekabel Typ 2',
  priceCents: 12950,
}

describe('cart item updates', () => {
  it('adds a new item without mutating the existing cart', () => {
    const cart: CartItem[] = []

    const next = addItem(cart, wallbox)

    expect(next).toEqual([{ ...wallbox, quantity: 1 }])
    expect(cart).toEqual([])
  })

  it('merges a duplicate add and caps its quantity at ten', () => {
    const cart = [{ ...wallbox, quantity: 9 }]

    expect(addItem(cart, wallbox)).toEqual([{ ...wallbox, quantity: 10 }])
    expect(addItem(addItem(cart, wallbox), wallbox)).toEqual([{ ...wallbox, quantity: 10 }])
  })

  it('sets an integer quantity and caps values above ten', () => {
    const cart = [{ ...wallbox, quantity: 1 }]

    expect(setQuantity(cart, wallbox.slug, 3.8)).toEqual([{ ...wallbox, quantity: 3 }])
    expect(setQuantity(cart, wallbox.slug, 99)).toEqual([{ ...wallbox, quantity: 10 }])
  })

  it('removes an item when its quantity is zero or lower', () => {
    const cart = [{ ...wallbox, quantity: 2 }]

    expect(setQuantity(cart, wallbox.slug, 0)).toEqual([])
    expect(setQuantity(cart, wallbox.slug, -1)).toEqual([])
  })

  it('removes only the selected item', () => {
    const cart = [{ ...wallbox, quantity: 1 }, { ...cable, quantity: 2 }]

    expect(removeItem(cart, wallbox.slug)).toEqual([{ ...cable, quantity: 2 }])
  })
})

describe('cart totals', () => {
  const cart = [
    { ...wallbox, priceCents: 1999, quantity: 3 },
    { ...cable, priceCents: 250, quantity: 2 },
  ]

  it('sums quantities for the item count', () => {
    expect(itemCount(cart)).toBe(5)
  })

  it('keeps the total in integer cents', () => {
    expect(totalCents(cart)).toBe(6497)
    expect(Number.isInteger(totalCents(cart))).toBe(true)
  })
})
