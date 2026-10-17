<script setup lang="ts">
import type { CartItem } from '#shared/cart'

definePageMeta({ layout: 'shop' })

const { t } = useI18n()
const fmt = useFormatters()
const { items, itemCount, totalCents, setQuantity, removeItem } = useCart()
const announcement = ref('')

const announceCount = () => {
  announcement.value = t('shop.cartCount', { n: itemCount.value })
}

const onQuantityChange = (item: CartItem, event: Event) => {
  const input = event.currentTarget as HTMLInputElement
  const quantity = Number(input.value)
  setQuantity(item.slug, Number.isFinite(quantity) ? quantity : item.quantity)
  announceCount()
}

const onRemove = (slug: string) => {
  removeItem(slug)
  announceCount()
}

useHead({ title: () => t('shop.cartPage.heading') })
</script>

<template>
  <section class="cart-page" aria-labelledby="cart-heading">
    <h1 id="cart-heading">{{ t('shop.cartPage.heading') }}</h1>
    <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>

    <DsDataTable v-if="items.length" :caption="t('shop.cartPage.heading')">
      <template #head>
        <tr>
          <th scope="col">{{ t('shop.listing.heading') }}</th>
          <th scope="col">{{ t('shop.product.price') }}</th>
          <th scope="col">{{ t('shop.cartPage.quantity') }}</th>
          <th scope="col">{{ t('shop.cartPage.total') }}</th>
          <th scope="col">{{ t('shop.cartPage.remove') }}</th>
        </tr>
      </template>
      <tr v-for="item in items" :key="item.slug">
        <th scope="row">{{ item.name }}</th>
        <td>{{ fmt.money(item.priceCents) }}</td>
        <td>
          <label class="sr-only" :for="`quantity-${item.slug}`">
            {{ t('shop.cartPage.quantity') }} {{ item.name }}
          </label>
          <input
            :id="`quantity-${item.slug}`"
            :value="item.quantity"
            type="number"
            min="0"
            max="10"
            step="1"
            @change="onQuantityChange(item, $event)"
          >
        </td>
        <td>{{ fmt.money(item.priceCents * item.quantity) }}</td>
        <td>
          <DsButton
            variant="secondary"
            :aria-label="`${item.name} ${t('shop.cartPage.remove').toLocaleLowerCase()}`"
            @click="onRemove(item.slug)"
          >
            {{ t('shop.cartPage.remove') }}
          </DsButton>
        </td>
      </tr>
    </DsDataTable>

    <p v-else>{{ t('shop.cartPage.empty') }}</p>
    <p v-if="items.length">
      <strong>{{ t('shop.cartPage.total') }}: {{ fmt.money(totalCents) }}</strong>
    </p>
    <p>{{ t('shop.cartPage.noCheckout') }}</p>
  </section>
</template>

<style scoped>
.cart-page {
  display: grid;
  gap: var(--space-4);
}
.cart-page input {
  min-height: var(--control-min-height);
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-bg);
  color: var(--color-text);
  font: inherit;
}
</style>
