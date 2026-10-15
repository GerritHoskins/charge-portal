<script setup lang="ts">
import type { Station, StationStatus } from '#shared/contracts/station'

const { t } = useI18n()
useHead({ title: () => t('stations.title') })

const { data: stations, error } = await useFetch<Station[]>('/api/stations', { default: () => [] })

const STATUSES: StationStatus[] = ['available', 'charging', 'faulted', 'offline']
const statusFilter = ref<StationStatus | 'all'>('all')
const filtered = computed(() =>
  statusFilter.value === 'all'
    ? stations.value
    : stations.value.filter((s) => s.status === statusFilter.value),
)
const options = computed(() => [
  { value: 'all', label: t('stations.all') },
  ...STATUSES.map((value) => ({ value, label: t(`stations.status.${value}`) })),
])
</script>

<template>
  <section aria-labelledby="stations-heading">
    <h1 id="stations-heading">{{ t('stations.title') }}</h1>

    <div class="filter">
      <label for="status-filter">{{ t('stations.filter') }}</label>
      <select id="status-filter" v-model="statusFilter">
        <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
    </div>

    <DsAlert v-if="error"><p>{{ t('stations.loadError') }}</p></DsAlert>

    <!-- Polite live region so screen-reader users hear the filter result. -->
    <p class="sr-only" role="status">{{ t('stations.shown', { n: filtered.length }) }}</p>

    <DsDataTable v-if="filtered.length" :caption="t('stations.caption')">
      <template #head>
        <tr>
          <th scope="col">{{ t('stations.col.name') }}</th>
          <th scope="col">{{ t('stations.col.city') }}</th>
          <th scope="col">{{ t('stations.col.status') }}</th>
          <th scope="col">{{ t('stations.col.connectors') }}</th>
          <th scope="col">{{ t('stations.col.power') }}</th>
        </tr>
      </template>
      <tr v-for="s in filtered" :key="s.id">
        <th scope="row">{{ s.name }}</th>
        <td>{{ s.city }}</td>
        <td><DsStatusBadge :status="s.status" :label="t(`stations.status.${s.status}`)" /></td>
        <td>{{ s.connectors }}</td>
        <td>{{ s.maxPowerKw }} kW</td>
      </tr>
    </DsDataTable>
    <p v-else-if="!error">{{ t('stations.empty') }}</p>
  </section>
</template>

<style scoped>
.filter { display: flex; gap: var(--space-2); align-items: center; margin-bottom: var(--space-3); }
select { min-height: var(--control-min-height); padding: var(--space-1) var(--space-2); border: 1px solid var(--color-border); border-radius: var(--radius); }
</style>
