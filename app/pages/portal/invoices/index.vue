<script setup lang="ts">
import type { Invoice } from '#shared/contracts/invoice'

const { t } = useI18n()
const fmt = useFormatters()
useHead({ title: () => t('invoices.title') })

const { data: invoices, error } = await useFetch<Invoice[]>('/api/invoices', { default: () => [] })
</script>

<template>
  <section aria-labelledby="invoices-heading">
    <h1 id="invoices-heading">{{ t('invoices.title') }}</h1>

    <DsAlert v-if="error"><p>{{ t('invoices.loadError') }}</p></DsAlert>

    <DsDataTable v-else-if="invoices.length" :caption="t('invoices.caption')">
      <template #head>
        <tr>
          <th scope="col">{{ t('invoices.col.number') }}</th>
          <th scope="col">{{ t('invoices.col.date') }}</th>
          <th scope="col">{{ t('invoices.col.amount') }}</th>
          <th scope="col">{{ t('invoices.col.status') }}</th>
          <th scope="col">{{ t('invoices.col.action') }}</th>
        </tr>
      </template>
      <tr v-for="inv in invoices" :key="inv.id">
        <th scope="row">{{ inv.number }}</th>
        <td><time :datetime="inv.issuedAt">{{ fmt.date(inv.issuedAt) }}</time></td>
        <td>{{ fmt.money(inv.amountCents) }}</td>
        <td>{{ t(`invoices.status.${inv.status}`) }}</td>
        <td>
          <NuxtLink v-if="inv.status === 'open'" :to="`/portal/invoices/${inv.id}/dispute`">
            {{ t('invoices.dispute') }}<span class="sr-only">{{ t('invoices.disputeFor', { number: inv.number }) }}</span>
          </NuxtLink>
          <span v-else class="sr-only">{{ t('invoices.noAction') }}</span>
        </td>
      </tr>
    </DsDataTable>
    <p v-else>{{ t('invoices.empty') }}</p>
  </section>
</template>
