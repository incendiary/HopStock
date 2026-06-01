<template>
  <div
    class="card"
    role="button"
    tabindex="0"
    @click="$emit('select', item.id)"
    @keydown.enter="$emit('select', item.id)"
    @keydown.space.prevent="$emit('select', item.id)"
  >
    <div class="card__thumb">
      <img
        v-if="firstPhotoUrl"
        :src="firstPhotoUrl"
        :alt="item.name"
        class="card__thumb-img"
      >
      <div
        v-else
        class="card__thumb-placeholder"
      >
        {{ item.icon || '📦' }}
      </div>
    </div>

    <div class="card__body">
      <h3 class="card__name">
        {{ item.name }}
      </h3>
      <p class="card__category">
        {{ categoryLabel }}
      </p>

      <!-- Inline condition select — click stops card navigation -->
      <div
        class="card__condition-wrap"
        @click.stop
        @keydown.stop
      >
        <select
          class="card__condition"
          :class="`card__condition--${conditionSlug}`"
          :value="localCondition"
          :disabled="saving"
          aria-label="Condition"
          @change="onConditionChange"
        >
          <option
            v-for="c in conditions"
            :key="c"
            :value="c"
          >
            {{ c }}
          </option>
        </select>
        <span
          v-if="saving"
          class="card__saving"
        >…</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { updateEquipment } from '../api.js';

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  categoryMap: {
    type: Object,
    default: () => ({}),
  },
  conditions: {
    type: Array,
    default: () => ['Good', 'Fair', 'Needs Repair', 'Retired'],
  },
});

const emit = defineEmits(['select', 'updated']);

// Local copy so the select reflects optimistic updates
const localCondition = ref(props.item.condition ?? 'Good');
watch(() => props.item.condition, (v) => { localCondition.value = v; });

const saving = ref(false);

const firstPhotoUrl = computed(() => props.item.photos?.[0]?.url ?? null);

const categoryLabel = computed(
  () => props.categoryMap[props.item.category] ?? props.item.category ?? '—',
);

const conditionSlug = computed(
  () => localCondition.value.toLowerCase().replace(/\s+/g, '-'),
);

async function onConditionChange(e) {
  const newCondition = e.target.value;
  const previous     = localCondition.value;
  localCondition.value = newCondition;   // optimistic
  saving.value = true;
  try {
    const updated = await updateEquipment(props.item.id, { condition: newCondition });
    emit('updated', updated);
  } catch {
    localCondition.value = previous;     // revert on error
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;
  outline: none;
}

.card:hover,
.card:focus-visible {
  border-color: var(--color-primary);
  transform: translateY(-2px);
}

/* Thumbnail */
.card__thumb {
  width: 100%;
  aspect-ratio: 4 / 3;
  background: var(--color-input-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.card__thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card__thumb-placeholder {
  font-size: 2.5rem;
  opacity: 0.4;
}

/* Body */
.card__body {
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.card__name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card__category {
  font-size: 0.8rem;
  color: var(--color-muted);
}

/* Condition select — styled to look like a badge */
.card__condition-wrap {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.25rem;
}

.card__condition {
  appearance: none;
  border: none;
  border-radius: 999px;
  padding: 0.15rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  max-width: 100%;
}

.card__condition:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

.card__condition:disabled {
  opacity: 0.6;
  cursor: default;
}

.card__condition--good {
  background: color-mix(in srgb, var(--color-accent) 20%, transparent);
  color: var(--color-accent);
}

.card__condition--fair {
  background: color-mix(in srgb, var(--color-primary) 25%, transparent);
  color: var(--color-primary);
}

.card__condition--needs-repair {
  background: color-mix(in srgb, var(--color-danger) 20%, transparent);
  color: var(--color-danger);
}

.card__condition--retired {
  background: color-mix(in srgb, var(--color-muted) 20%, transparent);
  color: var(--color-muted);
}

.card__saving {
  font-size: 0.7rem;
  color: var(--color-muted);
}
</style>
