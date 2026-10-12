<script setup lang="ts">
import type { ChargingSession } from '#shared/contracts/session'
import type { Station } from '#shared/contracts/station'

const { t } = useI18n()
const fmt = useFormatters()
useHead({ title: () => t('sessions.title') })

const { data: sessions, error } = await useFetch<ChargingSession[]>('/api/sessions', { default: () => [] })
const { data: stations } = await useFetch<Station[]>('/api/stations', { default: () => [] })

const stationName = (id: string) => stations.value.find((s) => s.id === id)?.name ?? id
</script>

<template>
  <section aria-labelledby="sessions-heading">
    <h1 id="sessions-heading">{{ t('sessions.title') }}</h1>

    <DsAlert v-if="error"><p>{{ t('sessions.loadError') }}</p></DsAlert>

    <DsDataTable v-else-if="sessions.length" :caption="t('sessions.caption')">
      <template #head>
        <tr>
          <th scope="col">{{ t('sessions.col.id') }}</th>
          <th scope="col">{{ t('sessions.col.station') }}</th>
          <th scope="col">{{ t('sessions.col.start') }}</th>
          <th scope="col">{{ t('sessions.col.energy') }}</th>
          <th scope="col">{{ t('sessions.col.status') }}</th>
        </tr>
      </template>
      <tr v-for="s in sessions" :key="s.id">
        <th scope="row">{{ s.id }}</th>
        <td>{{ stationName(s.stationId) }}</td>
        <td><time :datetime="s.startedAt">{{ fmt.dateTime(s.startedAt) }}</time></td>
        <td>{{ fmt.kwh(s.energyKwh) }} kWh</td>
        <td>{{ t(`sessions.status.${s.status}`) }}</td>
      </tr>
    </DsDataTable>
    <p v-else>{{ t('sessions.empty') }}</p>
  </section>
</template>
