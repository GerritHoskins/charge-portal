<script setup lang="ts">
// The append-only audit trail of a ticket, oldest first, as an ordered list: who did what, when, and
// which fields changed. Text is passed in already translated and formatted.
export interface TriageAuditItem {
  id: string
  /** ISO timestamp for the <time> element. */
  datetime: string
  /** The formatted time shown to the reader. */
  time: string
  actor: string
  action: string
  /** e.g. "Geändert: Wahrscheinliche Ursache". */
  changes?: string
}

defineProps<{ entries: TriageAuditItem[] }>()
</script>

<template>
  <ol class="triage-audit">
    <li v-for="entry in entries" :key="entry.id">
      <p class="triage-audit__line">
        <strong>{{ entry.action }}</strong>
        <span>{{ entry.actor }}</span>
        <time :datetime="entry.datetime">{{ entry.time }}</time>
      </p>
      <p v-if="entry.changes" class="triage-audit__changes">{{ entry.changes }}</p>
    </li>
  </ol>
</template>

<style scoped>
.triage-audit {
  margin: 0;
  padding-left: var(--space-4);
}
li {
  padding: var(--space-1) 0;
}
p {
  margin: 0;
}
.triage-audit__line {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-3);
}
.triage-audit__changes {
  color: var(--color-text-muted);
  overflow-wrap: anywhere;
}
</style>
