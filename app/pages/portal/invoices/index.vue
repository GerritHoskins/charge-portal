<script setup lang="ts">
import type { Invoice, InvoiceStatus } from '#shared/contracts/invoice'

useHead({ title: 'Rechnungen' })

const { data: invoices, error } = await useFetch<Invoice[]>('/api/invoices', { default: () => [] })

const dateFormat = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeZone: 'Europe/Berlin' })
const moneyFormat = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })

const statusLabels: Record<InvoiceStatus, string> = { open: 'Offen', paid: 'Bezahlt', disputed: 'In Klärung' }
</script>

<template>
  <section aria-labelledby="invoices-heading">
    <h1 id="invoices-heading">Rechnungen</h1>

    <p v-if="error" role="alert">Die Rechnungen konnten nicht geladen werden.</p>

    <table v-else-if="invoices.length">
      <caption class="sr-only">Rechnungen mit Nummer, Datum, Betrag und Status</caption>
      <thead>
        <tr>
          <th scope="col">Rechnung</th>
          <th scope="col">Datum</th>
          <th scope="col">Betrag</th>
          <th scope="col">Status</th>
          <th scope="col">Aktion</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="inv in invoices" :key="inv.id">
          <th scope="row">{{ inv.number }}</th>
          <td><time :datetime="inv.issuedAt">{{ dateFormat.format(new Date(inv.issuedAt)) }}</time></td>
          <td>{{ moneyFormat.format(inv.amountCents / 100) }}</td>
          <td>{{ statusLabels[inv.status] }}</td>
          <td>
            <NuxtLink v-if="inv.status === 'open'" :to="`/portal/invoices/${inv.id}/dispute`">
              Beanstanden<span class="sr-only"> Rechnung {{ inv.number }}</span>
            </NuxtLink>
            <span v-else class="sr-only">Keine Aktion verfügbar</span>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else>Keine Rechnungen vorhanden.</p>
  </section>
</template>

<style scoped>
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--color-border); }
thead th { background: var(--color-surface); }
</style>
