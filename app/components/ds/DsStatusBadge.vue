<script setup lang="ts">
import type { StationStatus } from '#shared/contracts/station'

defineProps<{ status: StationStatus }>()

// Status is conveyed by text, not colour alone (WCAG 1.4.1).
const labels: Record<StationStatus, string> = {
  available: 'Verfügbar',
  charging: 'Lädt',
  faulted: 'Störung',
  offline: 'Offline',
}
</script>

<template>
  <span class="ds-badge" :class="`ds-badge--${status}`">{{ labels[status] }}</span>
</template>

<style scoped>
.ds-badge {
  display: inline-block;
  padding: 0 var(--space-2);
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 600;
}
.ds-badge--available { background: var(--status-available-bg); color: var(--status-available-fg); }
.ds-badge--charging { background: var(--status-charging-bg); color: var(--status-charging-fg); }
.ds-badge--faulted { background: var(--status-faulted-bg); color: var(--status-faulted-fg); }
.ds-badge--offline { background: var(--status-offline-bg); color: var(--status-offline-fg); }
</style>
