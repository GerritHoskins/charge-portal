<script setup lang="ts">
import TriageSeverityBadge from './TriageSeverityBadge.vue'

// A definition list of labelled facts (raw codes, draft fields, decision). Text is passed in already
// translated and formatted, so the component also runs in Storybook and Vitest without Nuxt.
export interface TriageFact {
  term: string
  value: string
  /** Renders the value as a <time> element. */
  datetime?: string
  /** Renders the value as a severity badge (the value is its translated label). */
  severity?: 'info' | 'minor' | 'major' | 'critical'
}

defineProps<{ items: TriageFact[] }>()
</script>

<template>
  <dl class="triage-facts">
    <div v-for="item in items" :key="item.term" class="triage-facts__row">
      <dt>{{ item.term }}</dt>
      <dd>
        <TriageSeverityBadge v-if="item.severity" :severity="item.severity" :label="item.value" />
        <time v-else-if="item.datetime" :datetime="item.datetime">{{ item.value }}</time>
        <template v-else>{{ item.value }}</template>
      </dd>
    </div>
  </dl>
</template>

<style scoped>
.triage-facts {
  margin: 0;
}
.triage-facts__row {
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
}
dt {
  font-weight: 600;
  color: var(--color-text-muted);
}
dd {
  margin: 0;
  white-space: pre-line;
  overflow-wrap: anywhere;
}
</style>
