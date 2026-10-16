<template>
  <div class="hero-stats">
    <div class="stat-tile">
      <span class="stat-tile__value">{{ total }}</span>
      <span class="stat-tile__label">{{ total === 1 ? 'item' : 'items' }}</span>
      <span v-if="totalUnits && totalUnits !== total" class="stat-tile__sub"
        >{{ totalUnits }} units</span
      >
    </div>
    <div class="stat-tile">
      <span class="stat-tile__value">{{ photos }}</span>
      <span class="stat-tile__label">{{ photos === 1 ? 'photo' : 'photos' }}</span>
    </div>
    <div v-if="onLoan" class="stat-tile stat-tile--warning">
      <span class="stat-tile__value">{{ onLoan }}</span>
      <span class="stat-tile__label">on loan</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  total: { type: Number, required: true },
  totalUnits: { type: Number, default: 0 },
  photos: { type: Number, required: true },
  onLoan: { type: Number, default: 0 },
});
</script>

<style scoped>
.hero-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.stat-tile {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1.25rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  min-width: 120px;
}

.stat-tile__value {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1;
}

.stat-tile__label {
  font-size: 0.8rem;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-tile__sub {
  font-size: 0.72rem;
  color: var(--color-muted);
}

.stat-tile--warning .stat-tile__value {
  color: var(--color-danger);
}
</style>
