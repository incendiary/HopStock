<template>
  <DashboardSection title="Inventory value">
    <div class="value-tiles">
      <div class="value-tile">
        <span class="value-tile__val">{{ formatCurrency(summary.total_value) }}</span>
        <span class="value-tile__label">total recorded value</span>
      </div>
      <div class="value-tile">
        <span class="value-tile__val">{{ summary.priced_count }}</span>
        <span class="value-tile__label">items with price</span>
      </div>
      <div v-if="summary.unpriced_count > 0" class="value-tile value-tile--muted">
        <span class="value-tile__val">{{ summary.unpriced_count }}</span>
        <span class="value-tile__label">items without price</span>
      </div>
    </div>
    <div class="export-buttons">
      <a
        :href="`${BASE}/export/insurance-csv`"
        class="btn btn--secondary"
        download="hopstock-insurance.csv"
        >↓ Insurance report (CSV)</a
      >
    </div>
  </DashboardSection>
</template>

<script setup>
import { BASE } from '../../api.js';
import DashboardSection from './DashboardSection.vue';

defineProps({
  // { total_value, priced_count, unpriced_count } from /stats
  summary: { type: Object, required: true },
});

function formatCurrency(val) {
  if (val == null) return '—';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(val);
}
</script>

<style scoped>
.value-tiles {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.value-tile {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.6rem 1rem;
  min-width: 120px;
}

.value-tile__val {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-accent);
  line-height: 1;
}

.value-tile__label {
  font-size: 0.75rem;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.value-tile--muted .value-tile__val {
  color: var(--color-muted);
}

.export-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}
</style>
