<script setup lang="ts">
import type { ChargingSession, SessionStatus } from '#shared/contracts/session'
import type { Station } from '#shared/contracts/station'

useHead({ title: 'Ladevorgänge' })

const { data: sessions, error } = await useFetch<ChargingSession[]>('/api/sessions', { default: () => [] })
const { data: stations } = await useFetch<Station[]>('/api/stations', { default: () => [] })

const stationName = (id: string) => stations.value.find((s) => s.id === id)?.name ?? id

// Fixed locale and time zone: server and client must render identical text.
const dateFormat = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' })
const kwhFormat = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const statusLabels: Record<SessionStatus, string> = { running: 'Läuft', completed: 'Abgeschlossen' }
</script>

<template>
  <section aria-labelledby="sessions-heading">
    <h1 id="sessions-heading">Ladevorgänge</h1>

    <p v-if="error" role="alert">Die Ladevorgänge konnten nicht geladen werden.</p>

    <table v-else-if="sessions.length">
      <caption class="sr-only">Ladevorgänge mit Station, Startzeit, Energie und Status</caption>
      <thead>
        <tr>
          <th scope="col">Vorgang</th>
          <th scope="col">Station</th>
          <th scope="col">Start</th>
          <th scope="col">Energie</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in sessions" :key="s.id">
          <th scope="row">{{ s.id }}</th>
          <td>{{ stationName(s.stationId) }}</td>
          <td><time :datetime="s.startedAt">{{ dateFormat.format(new Date(s.startedAt)) }}</time></td>
          <td>{{ kwhFormat.format(s.energyKwh) }} kWh</td>
          <td>{{ statusLabels[s.status] }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else>Keine Ladevorgänge vorhanden.</p>
  </section>
</template>

<style scoped>
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--color-border); }
thead th { background: var(--color-surface); }
</style>
