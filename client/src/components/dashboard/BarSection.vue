<template>
  <DashboardSection :title="title">
    <ul class="bar-list">
      <li v-for="row in rows" :key="row.key" class="bar-row">
        <!-- A row with a group renders it after the label (the trailing space is the gap) -->
        <span class="bar-row__label" :class="`bar-row__label--${row.variant}`"
          >{{ row.group == null ? row.label : `${row.label} `
          }}<span v-if="row.group != null" class="bar-row__group">{{ row.group }}</span></span
        >
        <div class="bar-row__track">
          <div
            class="bar-row__fill"
            :class="`bar-row__fill--${row.variant}`"
            :style="{ width: pct(row.count) }"
          />
        </div>
        <span class="bar-row__count">{{ row.count }}</span>
      </li>
    </ul>
  </DashboardSection>
</template>

<script setup>
import DashboardSection from './DashboardSection.vue';

const props = defineProps({
  title: { type: String, required: true },
  // [{ key, label, group?, variant, count }]; variant picks the label and fill colour classes
  rows: { type: Array, required: true },
  total: { type: Number, required: true },
});

function pct(count) {
  if (!props.total) return '0%';
  return `${Math.round((count / props.total) * 100)}%`;
}
</script>

<style scoped>
.bar-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.bar-row {
  display: grid;
  grid-template-columns: 160px 1fr 2.5rem;
  align-items: center;
  gap: 0.75rem;
}

.bar-row__label {
  font-size: 0.85rem;
  font-weight: 600;
}

.bar-row__label--good {
  color: var(--color-accent);
}
.bar-row__label--fair {
  color: var(--color-primary);
}
.bar-row__label--needs-repair {
  color: var(--color-danger);
}
.bar-row__label--retired {
  color: var(--color-muted);
}
.bar-row__label--category {
  color: var(--color-text);
}

.bar-row__group {
  font-size: 0.72rem;
  font-weight: 400;
  color: var(--color-muted);
  margin-left: 0.35rem;
}

.bar-row__track {
  background: var(--color-input-bg);
  border-radius: 999px;
  height: 10px;
  overflow: hidden;
}

.bar-row__fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease;
}

.bar-row__fill--good {
  background: var(--color-accent);
}
.bar-row__fill--fair {
  background: var(--color-primary);
}
.bar-row__fill--needs-repair {
  background: var(--color-danger);
}
.bar-row__fill--retired {
  background: var(--color-muted);
}
.bar-row__fill--category {
  background: var(--color-primary);
  opacity: 0.6;
}
.bar-row__fill--location {
  background: var(--color-accent);
  opacity: 0.6;
}
.bar-row__label--location {
  min-width: 140px;
}

.bar-row__count {
  font-size: 0.85rem;
  color: var(--color-muted);
  text-align: right;
}

@media (max-width: 480px) {
  .bar-row {
    grid-template-columns: 1fr 2.5rem;
  }

  .bar-row__track {
    display: none;
  }
}
</style>
