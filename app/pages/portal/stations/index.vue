<script setup lang="ts">
import type { Station, StationStatus } from '#shared/contracts/station'
import type { StationState } from '#shared/contracts/triage'

const { t } = useI18n()
useHead({ title: () => t('stations.title') })

const fmt = useFormatters()

const { data: stations, error } = await useFetch<Station[]>('/api/stations', { default: () => [] })

// Live state from the triage service (WP-09), fetched in the browser only: a slow or absent service must
// never hold up the legacy data, and an outage is a non-blocking alert, not a broken page. Types only
// are imported from the contract: the page ships neither zod nor the taxonomy tables.
const {
  data: live,
  error: liveError,
  status: liveStatus,
} = useFetch<{ data: StationState[] }>('/api/triage/stations/state', { server: false })
const liveByStation = computed(() => new Map((live.value?.data ?? []).map((s) => [s.stationId, s])))
// The BFF sorts by urgency (needs-visit, offline, degraded, ok): everything but "ok" needs an operator.
const attention = computed(() => (live.value?.data ?? []).filter((s) => s.state !== 'ok'))
const stationName = (id: string) => stations.value.find((s) => s.id === id)?.name ?? id

const STATUSES: StationStatus[] = ['available', 'charging', 'faulted', 'offline']
const statusFilter = ref<StationStatus | 'all'>('all')
const filtered = computed(() =>
  statusFilter.value === 'all'
    ? stations.value
    : stations.value.filter((s) => s.status === statusFilter.value),
)

// One row per station: the legacy record next to its live state (none while loading, after an outage, or for a station that never reported).
const rows = computed(() => filtered.value.map((station) => ({ station, live: liveByStation.value.get(station.id) })))
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

    <DsAlert v-if="liveError"><p>{{ t('stations.live.unavailable') }}</p></DsAlert>

    <section v-if="attention.length" class="attention" aria-labelledby="attention-heading">
      <h2 id="attention-heading">{{ t('stations.live.attention') }}</h2>
      <ul class="attention__list">
        <li v-for="s in attention" :key="s.stationId" class="attention__item">
          <p class="attention__station">
            <strong>{{ stationName(s.stationId) }}</strong>
            <span class="muted">{{ s.stationId }}</span>
            <TriageStateBadge :state="s.state" :label="t(`stations.live.state.${s.state}`)" />
          </p>
          <ul v-if="s.alerts.length">
            <li v-for="a in s.alerts" :key="a.id">{{ t(`stations.live.alert.${a.kind}`) }}</li>
          </ul>
          <NuxtLink :to="{ path: '/portal/triage', query: { station: s.stationId } }" :prefetch="false">
            {{ t('stations.live.tickets', { station: stationName(s.stationId) }) }}
          </NuxtLink>
        </li>
      </ul>
    </section>

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
          <th scope="col">{{ t('stations.col.live') }}</th>
        </tr>
      </template>
      <tr v-for="{ station: s, live: l } in rows" :key="s.id">
        <th scope="row">{{ s.name }}</th>
        <td>{{ s.city }}</td>
        <td><DsStatusBadge :status="s.status" :label="t(`stations.status.${s.status}`)" /></td>
        <td>{{ s.connectors }}</td>
        <td>{{ s.maxPowerKw }} kW</td>
        <td>
          <template v-if="l">
            <TriageStateBadge :state="l.state" :label="t(`stations.live.state.${l.state}`)" />
            <time class="muted" :datetime="l.updatedAt">{{ fmt.dateTime(l.updatedAt) }}</time>
          </template>
          <template v-else-if="liveError"><span aria-hidden="true">–</span><span class="sr-only">{{ t('stations.live.unavailableCell') }}</span></template>
          <template v-else-if="liveStatus === 'success'">{{ t('stations.live.unknown') }}</template>
          <template v-else>{{ t('stations.live.loading') }}</template>
        </td>
      </tr>
    </DsDataTable>
    <p v-else-if="!error">{{ t('stations.empty') }}</p>
  </section>
</template>

<style scoped>
.filter { display: flex; gap: var(--space-2); align-items: center; margin-bottom: var(--space-3); }
.attention { margin-bottom: var(--space-4); }
.attention__list { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-3); }
.attention__item { border: 2px solid var(--color-border); border-radius: var(--radius); padding: var(--space-3); max-width: 40rem; }
.attention__station { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; margin: 0 0 var(--space-2); }
.muted { color: var(--color-text-muted); font-size: 0.875rem; }
time.muted { display: block; }
select { min-height: var(--control-min-height); padding: var(--space-1) var(--space-2); border: 1px solid var(--color-border); border-radius: var(--radius); }
</style>
