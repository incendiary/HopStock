<template>
  <!-- Loading -->
  <div v-if="loading" class="state-message">Loading…</div>

  <!-- Error -->
  <div v-else-if="error" class="state-message state-message--error">
    {{ error }}
  </div>

  <!-- Empty -->
  <div v-else-if="items.length === 0" class="state-message">
    <p>No equipment found.</p>
    <p v-if="filtered" class="state-message__hint">Try clearing the filters.</p>
    <p v-else class="state-message__hint">Add your first item to get started.</p>
  </div>

  <!-- Grid -->
  <div v-else class="grid">
    <div
      v-for="item in items"
      :key="item.id"
      class="card-wrapper"
      :class="{ 'card-wrapper--selected': selectMode && selected.has(item.id) }"
      @click="selectMode ? emit('toggle-select', item.id) : null"
    >
      <!-- Selection checkbox overlay -->
      <label v-if="selectMode" class="card-checkbox" @click.stop>
        <input
          type="checkbox"
          :checked="selected.has(item.id)"
          @change="emit('toggle-select', item.id)"
        />
      </label>

      <EquipmentCard
        :item="item"
        :category-map="categoryMap"
        :conditions="conditions"
        @select="selectMode ? emit('toggle-select', item.id) : emit('open', item.id)"
        @updated="emit('updated', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import EquipmentCard from '../EquipmentCard.vue';

defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: null },
  filtered: { type: Boolean, default: false },
  selectMode: { type: Boolean, default: false },
  selected: { type: Set, default: () => new Set() },
  categoryMap: { type: Object, default: () => ({}) },
  conditions: { type: Array, default: () => [] },
});

const emit = defineEmits(['toggle-select', 'open', 'updated']);
</script>

<style scoped>
/* State messages */
.state-message {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--color-muted);
  font-size: 1rem;
}

.state-message--error {
  color: var(--color-danger);
}

.state-message__hint {
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

/* Grid */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.25rem;
}

/* Batch select */
.card-wrapper {
  position: relative;
}

.card-wrapper--selected {
  outline: 2px solid var(--color-primary);
  border-radius: 10px;
}

.card-checkbox {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 2;
  cursor: pointer;

  input[type='checkbox'] {
    width: 1.2rem;
    height: 1.2rem;
    cursor: pointer;
    accent-color: var(--color-primary);
  }
}

@media (max-width: 640px) {
  /* Grid — single column on very narrow screens */
  .grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
}
</style>
