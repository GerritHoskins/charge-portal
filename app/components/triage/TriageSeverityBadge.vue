<script setup lang="ts">
// The severity is always spelled out: colour only reinforces it (WCAG 1.4.1). Like the other triage
// components this is presentational: the caller passes the translated label.
defineProps<{
  severity: 'info' | 'minor' | 'major' | 'critical'
  /** The translated name of the severity, e.g. "Kritisch". */
  label: string
}>()
</script>

<template>
  <span class="severity-badge" :class="`severity-badge--${severity}`">{{ label }}</span>
</template>

<style scoped>
.severity-badge {
  display: inline-block;
  padding: 0 var(--space-2);
  border: 2px solid transparent;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
}
.severity-badge--info { background: var(--status-charging-bg); color: var(--status-charging-fg); }
.severity-badge--minor { background: var(--status-offline-bg); color: var(--status-offline-fg); }
.severity-badge--major { background: var(--status-faulted-bg); color: var(--status-faulted-fg); }
/* Critical also gets a border, so it differs from major in more than hue. */
.severity-badge--critical { background: var(--status-faulted-bg); color: var(--status-faulted-fg); border-color: var(--status-faulted-fg); }
</style>
