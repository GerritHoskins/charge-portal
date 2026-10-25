<script setup lang="ts">
import type { TicketState, TicketSummary } from '#shared/contracts/triage'

const { t } = useI18n()
const fmt = useFormatters()
useHead({ title: () => t('triage.title') })

const STATES: TicketState[] = ['draft', 'approved', 'edited', 'rejected']
const stateFilter = ref<TicketState | 'all'>('draft')
const options = computed(() => [
  ...STATES.map((value) => ({ value, label: t(`triage.state.${value}`) })),
  { value: 'all', label: t('triage.all') },
])

// The service filters by state; "all" sends no filter.
const { data, error } = await useFetch<{ data: TicketSummary[] }>('/api/triage/tickets', {
  query: computed(() => (stateFilter.value === 'all' ? {} : { state: stateFilter.value })),
  default: () => ({ data: [] }),
})
const tickets = computed(() => data.value?.data ?? [])

const faultLabel = (code: string) => t(`triage.taxonomy.${code}`)
</script>

<template>
  <section aria-labelledby="triage-heading">
    <h1 id="triage-heading">{{ t('triage.title') }}</h1>
    <p>{{ t('triage.intro') }}</p>

    <div class="filter">
      <label for="state-filter">{{ t('triage.filter') }}</label>
      <select id="state-filter" v-model="stateFilter">
        <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
    </div>

    <DsAlert v-if="error"><p>{{ t('triage.loadError') }}</p></DsAlert>

    <!-- Polite live region so screen-reader users hear the filter result. -->
    <p class="sr-only" role="status">{{ t('triage.shown', { n: tickets.length }) }}</p>

    <DsDataTable v-if="tickets.length" :caption="t('triage.caption')">
      <template #head>
        <tr>
          <th scope="col">{{ t('triage.col.station') }}</th>
          <th scope="col">{{ t('triage.col.fault') }}</th>
          <th scope="col">{{ t('triage.col.severity') }}</th>
          <th scope="col">{{ t('triage.col.siteVisit') }}</th>
          <th scope="col">{{ t('triage.col.provider') }}</th>
          <th scope="col">{{ t('triage.col.created') }}</th>
          <th scope="col">{{ t('triage.col.action') }}</th>
        </tr>
      </template>
      <tr v-for="ticket in tickets" :key="ticket.id">
        <th scope="row">{{ ticket.stationId }}</th>
        <td>
          {{ faultLabel(ticket.taxonomyCode) }}
          <span class="code">{{ ticket.taxonomyCode }}</span>
        </td>
        <td><TriageSeverityBadge :severity="ticket.fault.severity" :label="t(`triage.severity.${ticket.fault.severity}`)" /></td>
        <td>{{ ticket.requiresSiteVisit ? t('triage.yes') : t('triage.no') }}</td>
        <td>{{ ticket.provider }}</td>
        <td><time :datetime="ticket.createdAt">{{ fmt.dateTime(ticket.createdAt) }}</time></td>
        <td>
          <NuxtLink :to="`/portal/triage/${ticket.id}`">
            {{ t('triage.open') }}<span class="sr-only">{{ t('triage.openFor', { station: ticket.stationId, fault: faultLabel(ticket.taxonomyCode) }) }}</span>
          </NuxtLink>
        </td>
      </tr>
    </DsDataTable>
    <p v-else-if="!error">{{ t('triage.empty') }}</p>
  </section>
</template>

<style scoped>
.filter { display: flex; gap: var(--space-2); align-items: center; margin-bottom: var(--space-3); }
select { min-height: var(--control-min-height); padding: var(--space-1) var(--space-2); border: 1px solid var(--color-border); border-radius: var(--radius); }
.code { display: block; color: var(--color-text-muted); font-size: 0.875rem; }
</style>
