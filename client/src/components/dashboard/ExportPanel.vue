<template>
  <DashboardSection title="Export">
    <div class="export-buttons">
      <a :href="`${BASE}/export/csv`" class="btn btn--secondary" download="hopstock-export.csv"
        >↓ CSV</a
      >
      <a :href="`${BASE}/export/json`" class="btn btn--secondary" download="hopstock-export.json"
        >↓ JSON</a
      >
    </div>
  </DashboardSection>
</template>

<script setup>
import { BASE } from '../../api.js';
import DashboardSection from './DashboardSection.vue';
</script>

<style scoped>
.export-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}
</style>
