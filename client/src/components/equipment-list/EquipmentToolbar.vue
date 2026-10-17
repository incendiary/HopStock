<template>
  <div class="toolbar">
    <h2 class="toolbar__title">Inventory</h2>

    <div class="toolbar__right">
      <div class="search-box">
        <span class="search-box__icon">🔍</span>
        <input
          v-model="searchQuery"
          class="search-box__input"
          type="search"
          placeholder="Search name, notes, serial…"
          aria-label="Search equipment"
        />
        <button
          v-if="searchQuery"
          class="search-box__clear"
          type="button"
          aria-label="Clear search"
          @click="searchQuery = ''"
        >
          ×
        </button>
      </div>

      <select v-model="filterCategory" class="filter-select" aria-label="Filter by category">
        <option value="">All categories</option>
        <option v-for="cat in categories" :key="cat.id" :value="cat.id">
          {{ cat.label }}
        </option>
      </select>

      <select v-model="filterCondition" class="filter-select" aria-label="Filter by condition">
        <option value="">All conditions</option>
        <option v-for="cond in conditions" :key="cond" :value="cond">
          {{ cond }}
        </option>
      </select>
      <select v-model="filterTag" class="filter-select" aria-label="Filter by tag">
        <option value="">All tags</option>
        <option v-for="tag in tags" :key="tag.id" :value="tag.name">
          {{ tag.name }}
        </option>
      </select>

      <select
        v-if="locations.length"
        v-model="filterLocation"
        class="filter-select"
        aria-label="Filter by location"
      >
        <option value="">All locations</option>
        <option value="none">No location</option>
        <option v-for="loc in locations" :key="loc.id" :value="loc.id">
          {{ loc.name }}
        </option>
      </select>

      <button
        class="filter-toggle"
        :class="{ 'filter-toggle--active': filterOnLoan }"
        type="button"
        @click="filterOnLoan = !filterOnLoan"
      >
        📤 On loan
      </button>

      <button
        class="filter-toggle"
        :class="{ 'filter-toggle--active': selectMode }"
        type="button"
        @click="emit('toggle-select-mode')"
      >
        ☑ Select
      </button>

      <button class="btn-add" type="button" @click="emit('add')">+ Add item</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  categories: { type: Array, default: () => [] },
  conditions: { type: Array, default: () => [] },
  tags: { type: Array, default: () => [] },
  locations: { type: Array, default: () => [] },
  selectMode: { type: Boolean, default: false },
});

const searchQuery = defineModel('searchQuery', { type: String, default: '' });
const filterCategory = defineModel('filterCategory', { type: String, default: '' });
const filterCondition = defineModel('filterCondition', { type: String, default: '' });
const filterTag = defineModel('filterTag', { type: String, default: '' });
const filterLocation = defineModel('filterLocation', { type: [String, Number], default: '' });
const filterOnLoan = defineModel('filterOnLoan', { type: Boolean, default: false });

const emit = defineEmits(['toggle-select-mode', 'add']);
</script>

<style scoped>
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

.toolbar__right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn-add {
  padding: 0.4rem 1rem;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  white-space: nowrap;
}

.btn-add:hover {
  opacity: 0.85;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-box__icon {
  position: absolute;
  left: 0.5rem;
  font-size: 0.85rem;
  pointer-events: none;
}

.search-box__input {
  background: var(--color-input-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.35rem 2rem 0.35rem 1.9rem;
  font-size: 0.875rem;
  width: 220px;

  &:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 1px;
  }

  /* Remove browser default clear button */
  &::-webkit-search-cancel-button {
    -webkit-appearance: none;
  }
}

.search-box__clear {
  position: absolute;
  right: 0.4rem;
  background: none;
  border: none;
  color: var(--color-muted);
  font-size: 1rem;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  &:hover {
    color: var(--color-text);
  }
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

.filter-toggle {
  background: var(--color-input-bg);
  color: var(--color-muted);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.35rem 0.75rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.filter-toggle--active {
  background: color-mix(in srgb, var(--color-danger) 15%, transparent);
  color: var(--color-danger);
  border-color: color-mix(in srgb, var(--color-danger) 40%, transparent);
  font-weight: 600;
}

@media (max-width: 640px) {
  /* Search box goes full-width on its own row */
  .search-box {
    flex: 1 1 100%;
    order: -1;
  }

  .search-box__input {
    width: 100%;
  }

  /* Filter selects pair up: two per row */
  .filter-select {
    flex: 1 1 calc(50% - 0.375rem);
    min-width: 0;
  }

  /* Toggle buttons and Add sit on their own row, full-width */
  .filter-toggle,
  .btn-add {
    flex: 1 1 calc(50% - 0.375rem);
    text-align: center;
  }

  /* Touch targets — meet 44px minimum */
  .filter-select,
  .filter-toggle,
  .btn-add {
    min-height: 44px;
  }
}
</style>
