<script setup lang="ts">
import type { Station, StationStatus } from '#shared/contracts/station'

useHead({ title: 'Stationen' })

const { data: stations, error } = await useFetch<Station[]>('/api/stations', { default: () => [] })

const statusFilter = ref<StationStatus | 'all'>('all')
const filtered = computed(() =>
  statusFilter.value === 'all'
    ? stations.value
    : stations.value.filter((s) => s.status === statusFilter.value),
)
const options: { value: StationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'available', label: 'Verfügbar' },
  { value: 'charging', label: 'Lädt' },
  { value: 'faulted', label: 'Störung' },
  { value: 'offline', label: 'Offline' },
]
</script>

<template>
  <section aria-labelledby="stations-heading">
    <h1 id="stations-heading">Stationen</h1>

    <div class="filter">
      <label for="status-filter">Status</label>
      <select id="status-filter" v-model="statusFilter">
        <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
    </div>

    <p v-if="error" role="alert">Die Stationen konnten nicht geladen werden.</p>

    <!-- Polite live region so screen-reader users hear the filter result. -->
    <p class="sr-only" role="status">{{ filtered.length }} Stationen angezeigt</p>

    <table v-if="filtered.length">
      <caption class="sr-only">Ladestationen mit Status und Leistung</caption>
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Ort</th>
          <th scope="col">Status</th>
          <th scope="col">Anschlüsse</th>
          <th scope="col">Max. Leistung</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in filtered" :key="s.id">
          <th scope="row">{{ s.name }}</th>
          <td>{{ s.city }}</td>
          <td><DsStatusBadge :status="s.status" /></td>
          <td>{{ s.connectors }}</td>
          <td>{{ s.maxPowerKw }} kW</td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="!error">Keine Stationen für diesen Filter.</p>
  </section>
</template>

<style scoped>
.filter { display: flex; gap: var(--space-2); align-items: center; margin-bottom: var(--space-3); }
select { padding: var(--space-1) var(--space-2); border: 1px solid var(--color-border); border-radius: var(--radius); }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--color-border); }
thead th { background: var(--color-surface); }
</style>
