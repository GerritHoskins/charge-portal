<script setup lang="ts">
// Table shell: guarantees a caption (the accessible name) and the shared look.
// Rows are slotted in with proper <th scope> markup by the caller.
// On narrow screens the table keeps its real table semantics and scrolls inside its own
// region (WCAG 1.4.10 allows this for data tables); the region is focusable so keyboard
// users can scroll it, and named so screen readers announce what it contains.
defineProps<{ caption: string }>()
</script>

<template>
  <div class="ds-table-wrap" role="region" :aria-label="caption" tabindex="0">
    <table class="ds-table">
      <caption class="sr-only">{{ caption }}</caption>
      <thead><slot name="head" /></thead>
      <tbody><slot /></tbody>
    </table>
  </div>
</template>

<style scoped>
.ds-table-wrap {
  position: relative; /* contains absolutely positioned .sr-only text, which would otherwise widen the page */
  overflow-x: auto;
  max-width: 100%;
}
.ds-table {
  width: 100%;
  border-collapse: collapse;
}
.ds-table :deep(th),
.ds-table :deep(td) {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
}
.ds-table :deep(thead th) {
  background: var(--color-surface);
  white-space: nowrap;
}
</style>
