<script setup lang="ts">
import type { StationHealth } from '#shared/contracts/triage'

// The live health of a station (WP-09). Meaning is carried by the text and by the shape of the icon;
// colour only reinforces it (WCAG 1.4.1). Presentational: the caller passes the translated label.
defineProps<{
  state: StationHealth
  /** The translated name of the state, e.g. "Serviceeinsatz nötig". */
  label: string
}>()

// 16 x 16 outline icons, one shape per state: tick, warning triangle, circle with a mark, crossed-out circle.
const ICONS: Record<StationHealth, string> = {
  ok: 'M3 8.5l3.2 3.2L13 4.8',
  degraded: 'M8 2.2l6.3 11.3H1.7zM8 6.6v3.2M8 11.7v.1',
  'needs-visit': 'M8 1.8a6.2 6.2 0 1 0 0 12.4A6.2 6.2 0 0 0 8 1.8zM8 4.8v4M8 10.9v.1',
  offline: 'M8 1.8a6.2 6.2 0 1 0 0 12.4A6.2 6.2 0 0 0 8 1.8zM3.6 12.4l8.8-8.8',
}
</script>

<template>
  <span class="state-badge" :class="`state-badge--${state}`">
    <svg class="state-badge__icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <path :d="ICONS[state]" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    {{ label }}
  </span>
</template>

<style scoped>
.state-badge {
  display: inline-flex;
  gap: var(--space-1);
  align-items: center;
  padding: 0 var(--space-2);
  border: 2px solid transparent;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 600;
}
.state-badge__icon { flex: none; }
.state-badge--ok { background: var(--status-available-bg); color: var(--status-available-fg); }
.state-badge--degraded { background: var(--status-charging-bg); color: var(--status-charging-fg); }
/* Needs-visit also gets a border, so it differs from the others in more than hue. */
.state-badge--needs-visit { background: var(--status-faulted-bg); color: var(--status-faulted-fg); border-color: var(--status-faulted-fg); }
.state-badge--offline { background: var(--status-offline-bg); color: var(--status-offline-fg); border-style: dashed; border-color: var(--status-offline-fg); }
</style>
