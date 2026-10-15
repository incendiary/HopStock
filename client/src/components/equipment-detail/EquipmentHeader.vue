<template>
  <h1 class="meta__name">
    <span v-if="item.icon" class="meta__icon">{{ item.icon }}</span
    >{{ item.name }}
  </h1>

  <div class="meta__badges">
    <!-- Inline condition selector -->
    <div class="condition-wrap">
      <select
        class="badge badge--condition"
        :class="`badge--${conditionSlug}`"
        :value="item.condition"
        :disabled="conditionSaving"
        aria-label="Condition"
        @change="emit('change-condition', $event.target.value)"
      >
        <option v-for="c in conditions" :key="c" :value="c">
          {{ c }}
        </option>
      </select>
      <Transition name="fade">
        <span v-if="conditionSaved" class="condition-saved">Saved ✓</span>
      </Transition>
    </div>
    <span v-if="categoryLabel" class="badge badge--category">{{ categoryLabel }}</span>

    <!-- Tags -->
    <span
      v-for="tag in item.tags"
      :key="tag.id"
      class="badge badge--tag"
      :style="{ '--tag-color': tag.color }"
      >{{ tag.name }}</span
    >

    <!-- Location badge -->
    <span v-if="item.location" class="badge badge--location">📍 {{ item.location.name }}</span>

    <!-- On Loan badge -->
    <span v-if="item.activeLoan" class="badge badge--loan"
      >📤 On loan — {{ item.activeLoan.borrower }}</span
    >

    <!-- Maintenance summary chips -->
    <span
      v-if="lastCleaned"
      class="badge badge--maint badge--cleaned"
      :title="`Last cleaned ${formatDateShort(lastCleaned)}`"
      >🧽 {{ daysAgo(lastCleaned) }}</span
    >
    <span
      v-if="lastServiced"
      class="badge badge--maint badge--serviced"
      :title="`Last serviced ${formatDateShort(lastServiced)}`"
      >🔧 {{ daysAgo(lastServiced) }}</span
    >
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatDateShort, daysAgo } from '../../utils/date.js';

const props = defineProps({
  item: { type: Object, required: true },
  conditions: { type: Array, default: () => [] },
  categoryLabel: { type: String, default: '' },
  conditionSaving: { type: Boolean, default: false },
  conditionSaved: { type: Boolean, default: false },
  lastCleaned: { type: String, default: null },
  lastServiced: { type: String, default: null },
});

const emit = defineEmits(['change-condition']);

const conditionSlug = computed(() =>
  (props.item.condition ?? '').toLowerCase().replace(/\s+/g, '-'),
);
</script>

<style scoped>
.meta__name {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.75rem;
  line-height: 1.2;
}

.meta__icon {
  margin-right: 0.4rem;
}

.meta__badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}

.condition-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.condition-saved {
  font-size: 0.75rem;
  color: var(--color-accent);
  font-weight: 600;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}

/* condition select uses badge styling; strip default select appearance */
select.badge {
  appearance: none;
  border: none;
  cursor: pointer;
  outline: none;
}

select.badge:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

select.badge:disabled {
  opacity: 0.6;
  cursor: default;
}

.badge--category {
  background: color-mix(in srgb, var(--color-muted) 15%, transparent);
  color: var(--color-muted);
}

.badge--good {
  background: color-mix(in srgb, var(--color-accent) 20%, transparent);
  color: var(--color-accent);
}

.badge--fair {
  background: color-mix(in srgb, var(--color-primary) 25%, transparent);
  color: var(--color-primary);
}

.badge--needs-repair {
  background: color-mix(in srgb, var(--color-danger) 20%, transparent);
  color: var(--color-danger);
}

.badge--retired {
  background: color-mix(in srgb, var(--color-muted) 20%, transparent);
  color: var(--color-muted);
}

.badge--tag {
  background: color-mix(in srgb, var(--tag-color, #6366f1) 18%, transparent);
  color: var(--tag-color, #6366f1);
  border: 1px solid color-mix(in srgb, var(--tag-color, #6366f1) 35%, transparent);
}

.badge--location {
  background: color-mix(in srgb, var(--color-muted) 12%, transparent);
  color: var(--color-muted);
}

.badge--loan {
  background: color-mix(in srgb, var(--color-danger) 15%, transparent);
  color: var(--color-danger);
  font-weight: 600;
}

.badge--maint {
  cursor: default;
}

.badge--cleaned {
  background: color-mix(in srgb, var(--color-accent) 15%, transparent);
  color: var(--color-accent);
}

.badge--serviced {
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  color: var(--color-primary);
}
</style>
