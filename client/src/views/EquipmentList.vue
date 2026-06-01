<template>
  <div class="equipment-list">
    <!-- Toolbar -->
    <div class="toolbar">
      <h2 class="toolbar__title">
        Inventory
      </h2>

      <div class="toolbar__filters">
        <select
          v-model="filterCategory"
          class="filter-select"
          aria-label="Filter by category"
        >
          <option value="">
            All categories
          </option>
          <option
            v-for="cat in categories"
            :key="cat.id"
            :value="cat.id"
          >
            {{ cat.label }}
          </option>
        </select>

        <select
          v-model="filterCondition"
          class="filter-select"
          aria-label="Filter by condition"
        >
          <option value="">
            All conditions
          </option>
          <option
            v-for="cond in conditions"
            :key="cond"
            :value="cond"
          >
            {{ cond }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="state-message"
    >
      Loading…
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="state-message state-message--error"
    >
      {{ error }}
    </div>

    <!-- Empty -->
    <div
      v-else-if="items.length === 0"
      class="state-message"
    >
      <p>No equipment found.</p>
      <p
        v-if="filterCategory || filterCondition"
        class="state-message__hint"
      >
        Try clearing the filters.
      </p>
      <p
        v-else
        class="state-message__hint"
      >
        Add your first item to get started.
      </p>
    </div>

    <!-- Grid -->
    <div
      v-else
      class="grid"
    >
      <EquipmentCard
        v-for="item in items"
        :key="item.id"
        :item="item"
        :category-map="categoryMap"
        @select="onSelect"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { getEquipment, getCategories, getConditions } from '../api.js';
import EquipmentCard from '../components/EquipmentCard.vue';

const emit = defineEmits(['select']);

const items      = ref([]);
const categories = ref([]);
const conditions = ref([]);
const loading    = ref(false);
const error      = ref(null);

const filterCategory  = ref('');
const filterCondition = ref('');

const categoryMap = computed(() =>
  Object.fromEntries(categories.value.map((c) => [c.id, c.label])),
);

async function loadMeta() {
  const [cats, conds] = await Promise.all([getCategories(), getConditions()]);
  categories.value = cats;
  conditions.value = conds;
}

async function loadItems() {
  loading.value = true;
  error.value   = null;
  try {
    items.value = await getEquipment({
      category:  filterCategory.value  || undefined,
      condition: filterCondition.value || undefined,
    });
  } catch (err) {
    error.value = err.message ?? 'Failed to load equipment.';
  } finally {
    loading.value = false;
  }
}

watch([filterCategory, filterCondition], loadItems);

onMounted(async () => {
  await loadMeta();
  await loadItems();
});

function onSelect(id) {
  emit('select', id);
}
</script>

<style scoped>
.equipment-list {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.toolbar__title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-primary);
}

.toolbar__filters {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.filter-select {
  background: var(--color-input-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.35rem 0.75rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.filter-select:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

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
</style>
