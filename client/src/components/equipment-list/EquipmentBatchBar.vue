<template>
  <Transition name="batch-bar">
    <div v-if="visible" class="batch-bar">
      <div class="batch-bar__count">
        <button class="batch-bar__select-all" @click="emit('toggle-all')">
          {{ allSelected ? 'Deselect all' : 'Select all' }}
        </button>
        <span>{{ selectedCount }} selected</span>
      </div>

      <div class="batch-bar__actions">
        <!-- Set condition -->
        <select
          v-model="batchValue"
          class="batch-select"
          :disabled="batching"
          @change="batchAction = 'condition'"
        >
          <option :value="null">Set condition…</option>
          <option v-for="c in conditions" :key="c" :value="c">
            {{ c }}
          </option>
        </select>

        <!-- Add tag -->
        <select
          v-model="batchValue"
          class="batch-select"
          :disabled="batching"
          @change="batchAction = 'tag'"
        >
          <option :value="null">Add tag…</option>
          <option v-for="tag in tags" :key="tag.id" :value="tag.id">
            {{ tag.name }}
          </option>
        </select>

        <!-- Move to location -->
        <select
          v-if="locations.length"
          v-model="batchValue"
          class="batch-select"
          :disabled="batching"
          @change="batchAction = 'location'"
        >
          <option :value="null">Move to location…</option>
          <option value="__none__">— None (unassign) —</option>
          <option v-for="loc in locations" :key="loc.id" :value="loc.id">
            {{ loc.name }}
          </option>
        </select>

        <span v-if="batchLabel" class="batch-bar__pending">{{ batchLabel }}</span>

        <button
          class="batch-bar__apply"
          :disabled="batching || !batchAction || batchValue === null"
          @click="emit('apply')"
        >
          {{ batching ? 'Working…' : 'Apply' }}
        </button>

        <button class="batch-bar__delete" :disabled="batching" @click="emit('delete')">
          🗑 Delete ({{ selectedCount }})
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  selectedCount: { type: Number, default: 0 },
  allSelected: { type: Boolean, default: false },
  batching: { type: Boolean, default: false },
  conditions: { type: Array, default: () => [] },
  tags: { type: Array, default: () => [] },
  locations: { type: Array, default: () => [] },
});

const batchAction = defineModel('batchAction', { type: String, default: '' }); // 'condition'|'tag'|'location'|'delete'
const batchValue = defineModel('batchValue', { type: [String, Number], default: null });

const emit = defineEmits(['toggle-all', 'apply', 'delete']);

const batchLabel = computed(() => {
  if (!batchAction.value || batchValue.value === null) return null;
  if (batchAction.value === 'condition') return `Set condition → ${batchValue.value}`;
  if (batchAction.value === 'tag') {
    const t = props.tags.find((tag) => tag.id === batchValue.value);
    return t ? `Add tag → ${t.name}` : null;
  }
  if (batchAction.value === 'location') {
    if (batchValue.value === '__none__') return 'Remove location';
    const l = props.locations.find((loc) => loc.id === batchValue.value);
    return l ? `Move to → ${l.name}` : null;
  }
  return null;
});
</script>

<style scoped>
/* Floating batch bar */
.batch-bar {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-surface);
  border: 1px solid var(--color-primary);
  border-radius: 12px;
  padding: 0.75rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
  z-index: 100;
  flex-wrap: wrap;
  max-width: 90vw;
}

.batch-bar__count {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.88rem;
  color: var(--color-muted);
  white-space: nowrap;
}

.batch-bar__select-all {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: 0.82rem;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.batch-bar__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.batch-select {
  background: var(--color-input-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  padding: 0.3rem 0.6rem;
  font-size: 0.82rem;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
  }
}

.batch-bar__pending {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-accent);
  white-space: nowrap;
}

.batch-bar__apply {
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.3rem 0.75rem;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.batch-bar__delete {
  background: color-mix(in srgb, var(--color-danger) 15%, transparent);
  color: var(--color-danger);
  border: 1px solid color-mix(in srgb, var(--color-danger) 35%, transparent);
  border-radius: 6px;
  padding: 0.3rem 0.75rem;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

/* Transition for batch bar */
.batch-bar-enter-active,
.batch-bar-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.batch-bar-enter-from,
.batch-bar-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(1rem);
}

@media (max-width: 640px) {
  /* Batch bar — pin to bottom edge, full width on mobile */
  .batch-bar {
    left: 0.75rem;
    right: 0.75rem;
    bottom: 0.75rem;
    transform: none;
    max-width: none;
  }

  .batch-bar-enter-from,
  .batch-bar-leave-to {
    transform: translateY(1rem);
  }
}
</style>
