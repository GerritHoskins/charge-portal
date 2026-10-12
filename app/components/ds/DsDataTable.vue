<script setup lang="ts">
// Table shell: guarantees a caption (the accessible name) and the shared look.
// Rows are slotted in with proper <th scope> markup by the caller.
defineProps<{ caption: string }>()
</script>

<template>
  <table class="ds-table">
    <caption class="sr-only">{{ caption }}</caption>
    <thead><slot name="head" /></thead>
    <tbody><slot /></tbody>
  </table>
</template>

<style scoped>
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
}
</style>
