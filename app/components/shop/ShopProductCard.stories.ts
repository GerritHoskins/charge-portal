import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ShopProductCard from './ShopProductCard.vue'

const product = {
  name: 'Wallbox Demo 11',
  image: { url: '/shop/wallbox-home-11-1600.jpg', alt: 'Wallbox Demo 11', width: 1600, height: 1600 },
}

const meta = {
  title: 'Shop/ProductCard',
  component: ShopProductCard,
  tags: ['autodocs'],
  args: {
    product,
    href: '/shop/wallbox-demo-11',
    price: '499,00 €',
    stockLabel: 'Auf Lager',
  },
} satisfies Meta<typeof ShopProductCard>

export default meta
type Story = StoryObj<typeof meta>

export const InStock: Story = {}
export const OutOfStock: Story = {
  args: {
    product: { ...product, inStock: false, stock: 0 },
    stockLabel: 'Nicht auf Lager',
  },
}
